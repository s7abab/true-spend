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

1. Create a **new** Supabase project for production. Copy the project URL and
   `anon` public key into `.env`.
2. Open **SQL Editor** and run `supabase/migrations/0001_init.sql` **once**.
   That file is the whole schema: `profiles`, `categories`, `transactions`,
   row-level security, the new-user trigger (profile + default categories),
   and all RPCs used by the app. There are no follow-up migrations in this
   repo.
3. If you previously mixed in another starter’s `profiles` table (extra
   columns such as `username`, missing `email`), use a fresh project or
   align your table manually before relying on OAuth sign-up.
4. Enable Google as an auth provider:
   - Supabase Dashboard → **Authentication → Providers → Google** → enable
     and paste your Google OAuth client ID + secret.
   - Supabase Dashboard → **Authentication → URL Configuration** → add your
     dev origin (e.g. `http://localhost:5173`) and any production origins to
     the **Redirect URLs** allow-list.
5. `npm run dev` and sign in with Google.

## Stack

- React 18 + Vite
- `@supabase/supabase-js` for auth + data
- Postgres (Supabase managed) with RLS policies for per-user isolation

## Code layout

- `src/api/` — thin Supabase wrappers (`profiles`, `categories`, `transactions`) used by hooks.
- `src/hooks/` — `useProfile`, `useCategories`, `useTransactions` fetch and mutate user data.
- `src/utils/` — `money` (Intl formatting), `spending` (week buckets / week-over-week), `historyGroup` (group by calendar day).
