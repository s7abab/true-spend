-- Truspend initial schema.
--
-- Run this once in the Supabase SQL editor for a brand new project. It is
-- safe to re-run (everything is guarded with `if not exists` / `or replace`).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  currency    text default 'INR',
  created_at  timestamptz default now()
);

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  kind        text not null check (kind in ('expense','income')),
  label       text not null,
  icon        text not null default 'dots',
  tint        text not null default '#7A7A86',
  sort_order  int  not null default 0,
  is_archived boolean not null default false,
  created_at  timestamptz default now()
);
create index if not exists categories_user_kind_idx
  on public.categories (user_id, kind);

create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  category_id  uuid references public.categories on delete set null,
  kind         text not null check (kind in ('expense','income')),
  amount       numeric(12,2) not null check (amount > 0),
  title        text,
  note         text,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz default now()
);
create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "own profile"      on public.profiles;
drop policy if exists "own categories"   on public.categories;
drop policy if exists "own transactions" on public.transactions;

create policy "own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "own categories"
  on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own transactions"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- New-user trigger: create the profile row + seed default categories.
-- ---------------------------------------------------------------------------

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
