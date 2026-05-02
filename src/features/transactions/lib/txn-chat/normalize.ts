import type { TxnChatDraftTransaction, TxnChatTurnResult } from '@/features/transactions/lib/txn-chat/types';

export function normalizeTxnChatJson(raw: unknown): TxnChatTurnResult {
  if (!raw || typeof raw !== 'object') {
    return { reply: 'Could not read the model response.', transactions: [] };
  }
  const o = raw as Record<string, unknown>;
  const reply = typeof o.reply === 'string' ? o.reply : 'Here is what I found.';
  const txs = Array.isArray(o.transactions) ? o.transactions : [];
  const out: TxnChatDraftTransaction[] = [];
  for (const row of txs) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const kind = r.kind === 'income' ? 'income' : 'expense';
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
