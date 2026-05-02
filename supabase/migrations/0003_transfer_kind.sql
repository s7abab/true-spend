-- Add "transfer" as a third transaction/category kind (investments, savings moves, card payments, etc.).

alter table public.categories drop constraint if exists categories_kind_check;
alter table public.categories
  add constraint categories_kind_check check (kind in ('expense', 'income', 'transfer'));

alter table public.transactions drop constraint if exists transactions_kind_check;
alter table public.transactions
  add constraint transactions_kind_check check (kind in ('expense', 'income', 'transfer'));

-- Default transfer categories for existing users (idempotent).
with defaults (kind, label, icon, tint, sort_order) as (
  values
    ('transfer', 'SIP & investments', 'trend',     '#0EA5C7', 0),
    ('transfer', 'Savings moved',   'home2',     '#5B7FFF', 1),
    ('transfer', 'Credit card bill', 'zap',      '#F5B400', 2),
    ('transfer', 'Chit / pool',     'cart',      '#7C5CFF', 3),
    ('transfer', 'Other',           'dots',      '#7A7A86', 4)
)
insert into public.categories (user_id, kind, label, icon, tint, sort_order)
select
  u.id,
  d.kind,
  d.label,
  d.icon,
  d.tint,
  d.sort_order
from auth.users u
cross join defaults d
where not exists (
  select 1
  from public.categories c
  where c.user_id = u.id
    and c.kind = d.kind
    and c.label = d.label
);

-- New signups: include transfer defaults alongside expense/income.
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
    (new.id, 'income',  'Other',      'dots',      '#7A7A86', 3),
    (new.id, 'transfer', 'SIP & investments', 'trend',     '#0EA5C7', 0),
    (new.id, 'transfer', 'Savings moved',   'home2',     '#5B7FFF', 1),
    (new.id, 'transfer', 'Credit card bill', 'zap',      '#F5B400', 2),
    (new.id, 'transfer', 'Chit / pool',     'cart',      '#7C5CFF', 3),
    (new.id, 'transfer', 'Other',           'dots',      '#7A7A86', 4);

  return new;
end;
$$;
