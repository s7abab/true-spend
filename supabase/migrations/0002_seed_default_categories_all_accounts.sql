-- Backfill default categories for all existing accounts.
-- Safe to run multiple times: inserts only missing (user_id, kind, label) rows.

with defaults (kind, label, icon, tint, sort_order) as (
  values
    ('expense', 'Food',       'coffee',    '#FF7A59', 0),
    ('expense', 'Shopping',   'cart',      '#7C5CFF', 1),
    ('expense', 'Transit',    'car',       '#22C2A4', 2),
    ('expense', 'Fun',        'film',      '#FF5C8A', 3),
    ('expense', 'Rent',       'home2',     '#5B7FFF', 4),
    ('expense', 'Bills',      'zap',       '#F5B400', 5),
    ('expense', 'Health',     'heart',     '#FF4D6D', 6),
    ('expense', 'Gifts',      'gift',      '#A56BFF', 7),
    ('expense', 'Education',  'book',      '#0EA5C7', 8),
    ('expense', 'Other',      'dots',      '#7A7A86', 9),
    ('income',  'Salary',     'briefcase', '#22C55E', 0),
    ('income',  'Freelance',  'trend',     '#7C5CFF', 1),
    ('income',  'Gift',       'gift',      '#FF5C8A', 2),
    ('income',  'Investment', 'trend',     '#0EA5C7', 3),
    ('income',  'Other',      'dots',      '#7A7A86', 4)
)
insert into public.categories (user_id, kind, label, icon, tint, sort_order)
select
  u.id as user_id,
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
