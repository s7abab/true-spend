import type { TxnChatDraftTransaction, TxnChatTurnResult } from '@/features/transactions/lib/txn-chat/types';

/**
 * Many chat models return `transactions` as a single object when there is one row, or use a singular key.
 * Coerce to an array so we never drop valid rows.
 */
function coerceModelTransactionsArray(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    try {
      return coerceModelTransactionsArray(JSON.parse(t) as unknown);
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  const nested =
    (Array.isArray(obj.items) && obj.items) ||
    (Array.isArray(obj.rows) && obj.rows) ||
    (Array.isArray(obj.data) && obj.data) ||
    (Array.isArray(obj.entries) && obj.entries) ||
    null;
  if (nested) return nested;
  const keys = Object.keys(obj);
  if (keys.length && keys.every((k) => /^\d+$/.test(k))) {
    return keys
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => obj[k])
      .filter((v) => v && typeof v === 'object');
  }
  if (typeof obj.title === 'string' && obj.title.trim()) {
    return [raw];
  }
  return [];
}

export function normalizeTxnChatJson(raw: unknown): TxnChatTurnResult {
  if (!raw || typeof raw !== 'object') {
    return { reply: 'Could not read the model response.', transactions: [] };
  }
  const o = raw as Record<string, unknown>;
  const reply = typeof o.reply === 'string' ? o.reply : 'Here is what I found.';
  const rawTxs = o.transactions ?? o.transaction ?? o.transactions_list;
  const txs = coerceModelTransactionsArray(rawTxs);
  const out: TxnChatDraftTransaction[] = [];
  for (const row of txs) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const kind =
      r.kind === 'income' ? 'income' : r.kind === 'transfer' ? 'transfer' : 'expense';
    const title = typeof r.title === 'string' ? r.title.trim() : '';
    if (!title) continue;
    const rawAmt = r.amount;
    let amount: number | null = null;
    if (rawAmt != null && typeof rawAmt === 'number' && Number.isFinite(rawAmt) && rawAmt > 0) {
      amount = rawAmt;
    } else if (rawAmt != null && typeof rawAmt === 'string' && rawAmt.trim()) {
      const n = Number(rawAmt);
      if (Number.isFinite(n) && n > 0) amount = n;
    }
    const category_label =
      typeof r.category_label === 'string' && r.category_label.trim() ? r.category_label.trim() : null;
    const dateRaw = typeof r.date === 'string' ? r.date.trim() : '';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;
    const note = typeof r.note === 'string' ? r.note.trim() : null;
    out.push({ kind, title, amount, category_label, date, note: note || null });
  }
  return { reply, transactions: out };
}

/** Strip optional ```json fences from model output. */
export function parseJsonFromModelText(rawText: string): unknown {
  let t = rawText.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/im.exec(t);
  if (fence) t = fence[1].trim();
  return JSON.parse(t) as unknown;
}
