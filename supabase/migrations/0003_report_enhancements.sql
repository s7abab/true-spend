-- Report dashboard: period totals, income breakdown, filtered transaction pages.

-- ---------------------------------------------------------------------------
-- Period totals (income / expense / counts) for [p_from, p_to)
-- ---------------------------------------------------------------------------

create or replace function public.transaction_period_summary(
  p_from timestamptz,
  p_to   timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total_income',  coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric,
    'total_expense', coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::numeric,
    'income_txn_count',  count(*) filter (where t.kind = 'income')::bigint,
    'expense_txn_count', count(*) filter (where t.kind = 'expense')::bigint
  )
  from public.transactions t
  where t.user_id = auth.uid()
    and t.occurred_at >= p_from
    and t.occurred_at < p_to;
$$;

grant execute on function public.transaction_period_summary(timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Report: income totals grouped by category (mirror of expense RPC)
-- ---------------------------------------------------------------------------

create or replace function public.transaction_income_by_category(
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
    and t.kind = 'income'
    and t.occurred_at >= p_from
    and t.occurred_at < p_to
  group by t.category_id;
$$;

grant execute on function public.transaction_income_by_category(timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- History / report: extend keyset page with optional window + category
-- ---------------------------------------------------------------------------

drop function if exists public.transactions_page(int, timestamptz, uuid, text, text);

create or replace function public.transactions_page(
  p_limit int,
  p_after_occurred timestamptz,
  p_after_id uuid,
  p_kind text,
  p_search text,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_category_id uuid default null,
  p_uncategorized_only boolean default false
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
    and (p_from is null or t.occurred_at >= p_from)
    and (p_to is null or t.occurred_at < p_to)
    and (
      case
        when coalesce(p_uncategorized_only, false) then t.category_id is null
        when p_category_id is not null then t.category_id = p_category_id
        else true
      end
    )
  order by t.occurred_at desc, t.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

grant execute on function public.transactions_page(
  int,
  timestamptz,
  uuid,
  text,
  text,
  timestamptz,
  timestamptz,
  uuid,
  boolean
) to authenticated;
