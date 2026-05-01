# Truspend

A small expense / income tracker built with React + Vite, backed by Supabase
(auth + Postgres). Sign-in is Google-only.

## Getting started

```bash
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## Supabase setup

1. Create (or open) your Supabase project. Copy the project URL and `anon`
   public key into `.env`.
2. Open the Supabase SQL editor and run the migration in
   `supabase/migrations/0001_init.sql` once. It creates the `profiles`,
   `categories`, and `transactions` tables, enables row-level security so
   each user only sees their own rows, and installs a trigger that creates
   the user's profile and seeds the default categories on first sign-in.
3. Enable Google as an auth provider:
   - Supabase Dashboard → **Authentication → Providers → Google** → enable
     and paste your Google OAuth client ID + secret.
   - Supabase Dashboard → **Authentication → URL Configuration** → add your
     dev origin (e.g. `http://localhost:5173`) and any production origins to
     the **Redirect URLs** allow-list.
4. `npm run dev` and sign in with Google.

## Stack

- React 18 + Vite
- `@supabase/supabase-js` for auth + data
- Postgres (Supabase managed) with RLS policies for per-user isolation

## Code layout

- `src/api/` — thin Supabase wrappers (`profiles`, `categories`, `transactions`) used by hooks.
- `src/hooks/` — `useProfile`, `useCategories`, `useTransactions` fetch and mutate user data.
- `src/utils/` — `money` (Intl formatting), `spending` (week buckets / week-over-week), `historyGroup` (group by calendar day).
