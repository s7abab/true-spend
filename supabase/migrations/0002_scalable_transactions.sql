-- Scalable reads: aggregate on the server instead of shipping every row.

-- ---------------------------------------------------------------------------
-- Home: lifetime totals + week expense buckets (local calendar days in p_tz)
--        + previous week expense total
-- ---------------------------------------------------------------------------

create or replace function public.transaction_home_metrics(
  p_tz text,
  p_week_start timestamptz,
  p_week_end timestamptz,
  p_prev_week_start timestamptz,
  p_prev_week_end timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with life as (
    select
      coalesce(sum(amount) filter (where kind = 'income'), 0)::numeric  as income,
      coalesce(sum(amount) filter (where kind = 'expense'), 0)::numeric as expense
    from public.transactions
    where user_id = auth.uid()
  ),
  bucketed as (
    select
      ((t.occurred_at at time zone p_tz)::date
        - (p_week_start at time zone p_tz)::date)::int as di,
      sum(t.amount)::numeric as total
    from public.transactions t
    where t.user_id = auth.uid()
      and t.kind = 'expense'
      and t.occurred_at >= p_week_start
      and t.occurred_at < p_week_end
    group by 1
  ),
  week_arr as (
    select coalesce(
      to_jsonb(array_agg(coalesce(b.total, 0) order by s.di)),
      '[0,0,0,0,0,0,0]'::jsonb
    ) as buckets
    from generate_series(0, 6) as s(di)
    left join bucketed b on b.di = s.di
  ),
  prev as (
    select coalesce(sum(amount), 0)::numeric as total
    from public.transactions
    where user_id = auth.uid()
      and kind = 'expense'
      and occurred_at >= p_prev_week_start
      and occurred_at < p_prev_week_end
  )
  select jsonb_build_object(
    'lifetime_income',  (select income from life),
    'lifetime_expense', (select expense from life),
    'week_buckets',     (select buckets from week_arr),
    'prev_week_expense',(select total from prev)
  );
$$;

-- ---------------------------------------------------------------------------
-- Report: expense totals grouped by category for a time window [p_from, p_to)
-- ---------------------------------------------------------------------------

create or replace function public.transaction_expense_by_category(
  p_from timestamptz,
  p_to   timestamptz
)
returns table (
  category_id uuid,
  total       numeric,
  txn_count   bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.category_id,
    sum(t.amount)::numeric as total,
    count(*)::bigint       as txn_count
  from public.transactions t
  where t.user_id = auth.uid()
    and t.kind = 'expense'
    and t.occurred_at >= p_from
    and t.occurred_at < p_to
  group by t.category_id;
$$;

grant execute on function public.transaction_home_metrics(text, timestamptz, timestamptz, timestamptz, timestamptz) to authenticated;
grant execute on function public.transaction_expense_by_category(timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- History: keyset page (occurred_at desc, id desc). Null cursor = first page.
-- ---------------------------------------------------------------------------

create or replace function public.transactions_page(
  p_limit int,
  p_after_occurred timestamptz,
  p_after_id uuid,
  p_kind text,
  p_search text
)
returns table (
  id uuid,
  user_id uuid,
  category_id uuid,
  kind text,
  amount numeric,
  title text,
  note text,
  occurred_at timestamptz,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.id,
    t.user_id,
    t.category_id,
    t.kind,
    t.amount,
    t.title,
    t.note,
    t.occurred_at,
    t.created_at
  from public.transactions t
  where t.user_id = auth.uid()
    and (p_kind is null or btrim(p_kind) = '' or p_kind = 'all' or t.kind = p_kind)
    and (
      p_search is null or btrim(p_search) = ''
      or lower(coalesce(t.title, '')) like '%' || lower(btrim(p_search)) || '%'
      or lower(coalesce(t.note, '')) like '%' || lower(btrim(p_search)) || '%'
      or replace(t.amount::text, '.', '') like '%' || replace(replace(btrim(p_search), '.', ''), ',', '') || '%'
    )
    and (
      (p_after_occurred is null and p_after_id is null)
      or t.occurred_at < p_after_occurred
      or (t.occurred_at = p_after_occurred and t.id < p_after_id)
    )
  order by t.occurred_at desc, t.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

grant execute on function public.transactions_page(int, timestamptz, uuid, text, text) to authenticated;
