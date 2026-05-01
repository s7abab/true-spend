import { supabase } from '../lib/supabase';

const PAGE_LIMIT = 50;

/** @param {AbortSignal} [signal] */
function withSignal(q, signal) {
  return signal ? q.abortSignal(signal) : q;
}

/**
 * @param {{ tz: string, weekStart: string, weekEnd: string, prevWeekStart: string, prevWeekEnd: string, signal?: AbortSignal }} p
 */
export async function fetchHomeMetrics(p) {
  const q = supabase.rpc('transaction_home_metrics', {
    p_tz: p.tz,
    p_week_start: p.weekStart,
    p_week_end: p.weekEnd,
    p_prev_week_start: p.prevWeekStart,
    p_prev_week_end: p.prevWeekEnd,
  });
  return withSignal(q, p.signal);
}

/**
 * @param {string} fromIso
 * @param {string} toIsoExclusive
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function fetchExpenseByCategory(fromIso, toIsoExclusive, opts = {}) {
  const q = supabase.rpc('transaction_expense_by_category', {
    p_from: fromIso,
    p_to: toIsoExclusive,
  });
  return withSignal(q, opts.signal);
}

/**
 * @param {string} userId
 * @param {number} [limit]
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function listRecentTransactions(userId, limit = 5, opts = {}) {
  const q = supabase
    .from('transactions')
    .select('id, kind, category_id, amount, title, note, occurred_at')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  return withSignal(q, opts.signal);
}

/**
 * Keyset page via RPC (null cursor = first page).
 * @param {{ limit?: number, cursor: { occurred_at: string, id: string } | null, kind: string, search: string, signal?: AbortSignal }} opts
 */
export async function fetchTransactionsPage(opts) {
  const limit = Math.min(opts.limit ?? PAGE_LIMIT, 100);
  const cur = opts.cursor;
  const q = supabase.rpc('transactions_page', {
    p_limit: limit,
    p_after_occurred: cur?.occurred_at ?? null,
    p_after_id: cur?.id ?? null,
    p_kind: opts.kind === 'all' ? 'all' : (opts.kind || 'all'),
    p_search: opts.search?.trim() ? opts.search.trim() : null,
  });
  return withSignal(q, opts.signal);
}

export async function insertTransaction(row) {
  return supabase.from('transactions').insert(row).select().maybeSingle();
}

export async function deleteTransactionRow(userId, id) {
  return supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
}
