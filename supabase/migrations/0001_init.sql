-- Truspend production schema (Postgres / Supabase).
-- New project: Dashboard → SQL → paste this file → Run once.
--
-- Covers: profiles, categories, transactions, RLS, signup trigger,
-- RPCs required by src/features/transactions/api/transactions.ts.

-- ===========================================================================
-- Tables
-- ===========================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  currency    text not null default 'INR',
  created_at  timestamptz not null default now()
);

create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('expense', 'income')),
  label        text not null,
  icon         text not null default 'dots',
  tint         text not null default '#7A7A86',
  sort_order   int  not null default 0,
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists categories_user_kind_idx
  on public.categories (user_id, kind);

create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  category_id  uuid references public.categories (id) on delete set null,
  kind         text not null check (kind in ('expense', 'income')),
  amount       numeric(12, 2) not null check (amount > 0),
  title        text,
  note         text,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc);

comment on table public.profiles is 'One row per auth user; created by handle_new_user trigger.';
comment on table public.categories is 'User expense/income buckets; seeded on signup.';
comment on table public.transactions is 'Ledger entries scoped by user_id; RLS enforced.';

-- ===========================================================================
-- Row level security
-- ===========================================================================

alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "own categories" on public.categories;
create policy "own categories"
  on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own transactions" on public.transactions;
create policy "own transactions"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ===========================================================================
-- Signup: profile row + default categories
-- ===========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do nothing;

  insert into public.categories (user_id, kind, label, icon, tint, sort_order) values
    (new.id, 'expense', 'Food',       'coffee',    '#FF7A59', 0),
    (new.id, 'expense', 'Shopping',   'cart',      '#7C5CFF', 1),
    (new.id, 'expense', 'Transit',    'car',       '#22C2A4', 2),
    (new.id, 'expense', 'Fun',        'film',      '#FF5C8A', 3),
    (new.id, 'expense', 'Rent',       'home2',     '#5B7FFF', 4),
    (new.id, 'expense', 'Bills',      'zap',       '#F5B400', 5),
    (new.id, 'expense', 'Health',     'heart',     '#FF4D6D', 6),
    (new.id, 'expense', 'Gifts',      'gift',      '#A56BFF', 7),
    (new.id, 'expense', 'Education',  'book',      '#0EA5C7', 8),
    (new.id, 'expense', 'Other',      'dots',      '#7A7A86', 9),
    (new.id, 'income',  'Salary',     'briefcase', '#22C55E', 0),
    (new.id, 'income',  'Freelance',  'trend',     '#7C5CFF', 1),
    (new.id, 'income',  'Gift',       'gift',      '#FF5C8A', 2),
    (new.id, 'income',  'Investment', 'trend',     '#0EA5C7', 3),
    (new.id, 'income',  'Other',      'dots',      '#7A7A86', 4);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ===========================================================================
-- RPCs (security invoker: RLS applies; caller must be authenticated)
-- ===========================================================================

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
    'lifetime_income',   (select income from life),
    'lifetime_expense',  (select expense from life),
    'week_buckets',      (select buckets from week_arr),
    'prev_week_expense', (select total from prev)
  );
$$;

grant execute on function public.transaction_home_metrics(
  text, timestamptz, timestamptz, timestamptz, timestamptz
) to authenticated;

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

grant execute on function public.transaction_expense_by_category(timestamptz, timestamptz)
  to authenticated;

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

grant execute on function public.transaction_income_by_category(timestamptz, timestamptz)
  to authenticated;

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
    'total_income',       coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric,
    'total_expense',      coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::numeric,
    'income_txn_count',   count(*) filter (where t.kind = 'income')::bigint,
    'expense_txn_count', count(*) filter (where t.kind = 'expense')::bigint
  )
  from public.transactions t
  where t.user_id = auth.uid()
    and t.occurred_at >= p_from
    and t.occurred_at < p_to;
$$;

grant execute on function public.transaction_period_summary(timestamptz, timestamptz)
  to authenticated;

-- Remove legacy overloads so only one public.transactions_page exists.
drop function if exists public.transactions_page(int, timestamptz, uuid, text, text);
drop function if exists public.transactions_page(
  int, timestamptz, uuid, text, text, timestamptz, timestamptz, uuid, boolean
);

create or replace function public.transactions_page(
  p_limit int,
  p_after_occurred timestamptz,
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
    and (p_amount_min is null or t.amount >= p_amount_min)
    and (p_amount_max is null or t.amount <= p_amount_max)
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
  boolean,
  numeric,
  numeric
) to authenticated;
