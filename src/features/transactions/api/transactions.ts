import { supabase } from '@/shared/lib/supabase';

const PAGE_LIMIT = 50;

function withSignal<T extends { abortSignal: (s: AbortSignal) => T }>(q: T, signal?: AbortSignal): T {
  return signal ? q.abortSignal(signal) : q;
}

export type HomeMetricsParams = {
  tz: string;
  weekStart: string;
  weekEnd: string;
  prevWeekStart: string;
  prevWeekEnd: string;
  signal?: AbortSignal;
};

export async function fetchHomeMetrics(p: HomeMetricsParams) {
  const q = supabase.rpc('transaction_home_metrics', {
    p_tz: p.tz,
    p_week_start: p.weekStart,
    p_week_end: p.weekEnd,
    p_prev_week_start: p.prevWeekStart,
    p_prev_week_end: p.prevWeekEnd,
  });
  return withSignal(q, p.signal);
}

export async function fetchExpenseByCategory(fromIso: string, toIsoExclusive: string, opts: { signal?: AbortSignal } = {}) {
  const q = supabase.rpc('transaction_expense_by_category', {
    p_from: fromIso,
    p_to: toIsoExclusive,
  });
  return withSignal(q, opts.signal);
}

export async function listRecentTransactions(userId: string, limit = 5, opts: { signal?: AbortSignal } = {}) {
  const q = supabase
    .from('transactions')
    .select('id, kind, category_id, amount, title, note, occurred_at')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  return withSignal(q, opts.signal);
}

export type TxnPageCursor = { occurred_at: string; id: string } | null;

export type FetchTransactionsPageOpts = {
  limit?: number;
  cursor: TxnPageCursor;
  kind: string;
  search: string;
  signal?: AbortSignal;
};

export async function fetchTransactionsPage(opts: FetchTransactionsPageOpts) {
  const limit = Math.min(opts.limit ?? PAGE_LIMIT, 100);
  const cur = opts.cursor;
  const q = supabase.rpc('transactions_page', {
    p_limit: limit,
    p_after_occurred: cur?.occurred_at ?? null,
    p_after_id: cur?.id ?? null,
    p_kind: opts.kind === 'all' ? 'all' : opts.kind || 'all',
    p_search: opts.search?.trim() ? opts.search.trim() : null,
  });
  return withSignal(q, opts.signal);
}

export type TransactionInsert = {
  user_id: string;
  kind: string;
  category_id: string | null;
  amount: number;
  title: string | null;
  note: string | null;
  occurred_at: string;
};

export async function insertTransaction(row: TransactionInsert) {
  return supabase.from('transactions').insert(row).select().maybeSingle();
}

export type TransactionUpdateFields = {
  kind: string;
  category_id: string | null;
  amount: number;
  title: string | null;
  note: string | null;
  occurred_at: string;
};

export async function updateTransactionRow(userId: string, id: string, row: TransactionUpdateFields) {
  return supabase.from('transactions').update(row).eq('id', id).eq('user_id', userId).select().maybeSingle();
}

export async function deleteTransactionRow(userId: string, id: string) {
  return supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
}
