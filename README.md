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
   That file creates the schema: `profiles`, `categories`, `transactions`,
   row-level security, the new-user trigger, and all RPCs used by the app.
3. Run `supabase/migrations/0002_seed_default_categories_all_accounts.sql`
   to backfill default categories for every existing account. This is safe to
   re-run and only inserts missing defaults.
4. If you previously mixed in another starter’s `profiles` table (extra
   columns such as `username`, missing `email`), use a fresh project or
   align your table manually before relying on OAuth sign-up.
5. Enable Google as an auth provider:
   - Supabase Dashboard → **Authentication → Providers → Google** → enable
     and paste your Google OAuth client ID + secret.
   - Supabase Dashboard → **Authentication → URL Configuration** → add your
     dev origin (e.g. `http://localhost:5173`) and any production origins to
     the **Redirect URLs** allow-list.
6. `npm run dev` and sign in with Google.

## Stack

- React 18 + Vite
- `@supabase/supabase-js` for auth + data
- Postgres (Supabase managed) with RLS policies for per-user isolation

## AI transaction chat

The **AI** tab uses a small **provider interface** (`TxnChatProvider` in `src/features/transactions/lib/txn-chat/`) so you can swap OpenRouter, direct Gemini, or add OpenAI/Anthropic later without changing the UI.

Configure `.env` (see `.env.example`).

### OpenRouter pricing tiers

1. **Absolute cheapest — free models ($0)**  
   OpenRouter exposes **free** variants of several families (examples include **DeepSeek**, **Llama**, **Qwen**, and others; the exact slugs change). Browse [models with “free”](https://openrouter.ai/models?q=free) and set `VITE_OPENROUTER_MODEL` to a slug that ends with **`:free`** (or whatever OpenRouter documents for that model). **Cost: $0.** Tradeoffs: **rate limits**, possible queues, and **lower reliability** than paid routes. **Best for:** testing, hobby projects, very low traffic.

2. **Default in this repo (cheap paid)**  
   If you omit `VITE_OPENROUTER_MODEL`, the app uses **`google/gemini-2.0-flash-001`**: usually a small dollar cost and better behaved JSON for transaction parsing than the smallest free tiers.

3. **Other paid**  
   Set `VITE_OPENROUTER_MODEL` to any slug from [OpenRouter models](https://openrouter.ai/models) (e.g. other Flash/GPT/Claude tiers).

If `VITE_AI_PROVIDER` is unset, OpenRouter is used when `VITE_OPENROUTER_API_KEY` is set; otherwise direct Gemini when `VITE_GEMINI_API_KEY` is set.

### Direct Gemini

Set `VITE_AI_PROVIDER=gemini` and `VITE_GEMINI_API_KEY`; optional `VITE_GEMINI_MODEL`.

### Adding a vendor

Implement `TxnChatProvider` in `txn-chat/providers/`, then register it in `txn-chat/resolve-env.ts`.

## Code layout

- `src/api/` — thin Supabase wrappers (`profiles`, `categories`, `transactions`) used by hooks.
- `src/hooks/` — `useProfile`, `useCategories`, `useTransactions` fetch and mutate user data.
- `src/utils/` — `money` (Intl formatting), `spending` (week buckets / week-over-week), `historyGroup` (group by calendar day).
