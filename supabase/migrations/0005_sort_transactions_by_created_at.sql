-- History/recent lists should show the most recently created transactions first,
-- independent of the transaction's occurred_at date.

create index if not exists transactions_user_created_idx
  on public.transactions (user_id, created_at desc, id desc);

drop function if exists public.transactions_page(
  int, timestamptz, uuid, text, text, timestamptz, timestamptz, uuid, boolean, numeric, numeric
);

create or replace function public.transactions_page(
  p_limit int,
  p_after_created timestamptz,
  p_after_id uuid,
  p_kind text,
  p_search text,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_category_id uuid default null,
  p_uncategorized_only boolean default false,
  p_amount_min numeric default null,
  p_amount_max numeric default null
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
      or replace(t.amount::text, '.', '') like '%'
         || replace(replace(btrim(p_search), '.', ''), ',', '') || '%'
    )
    and (
      (p_after_created is null and p_after_id is null)
      or t.created_at < p_after_created
      or (t.created_at = p_after_created and t.id < p_after_id)
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
    and (p_amount_min is null or t.amount >= p_amount_min)
    and (p_amount_max is null or t.amount <= p_amount_max)
  order by t.created_at desc, t.id desc
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
  boolean,
  numeric,
  numeric
) to authenticated;
