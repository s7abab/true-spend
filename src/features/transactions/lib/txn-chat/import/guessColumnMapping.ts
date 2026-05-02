import type { ImportColumnMapping, ImportColumnMapResult } from '@/features/transactions/lib/txn-chat/import/types';

function pick(headers: string[], ...patterns: RegExp[]): string | null {
  for (const h of headers) {
    const t = h.toLowerCase();
    for (const p of patterns) {
      if (p.test(t)) return h;
    }
  }
  return null;
}

/** Regex heuristics when AI is unavailable. */
export function guessColumnMapping(headers: string[]): ImportColumnMapResult {
  const date = pick(headers, /date|time|posted|txn.?date|value date/i);
  const amount = pick(headers, /amount|debit|credit|withdraw|deposit|sum|value|balance/i);
  const title = pick(
    headers,
    /desc|narration|merchant|particular|details|payee|memo|transaction|name|info/i,
  );
  const kind = pick(headers, /type|kind|dr.?cr|txn.?type|category.?type/i);
  const note = pick(headers, /note|remark|reference|ref\.?no/i);
  const category_hint = pick(headers, /category|class|mcc|group/i);
  const mapping: ImportColumnMapping = {
    date,
    title: title ?? headers[1] ?? headers[0] ?? null,
    amount: amount ?? headers.find((h) => h !== date && h !== title) ?? headers[0] ?? null,
    kind,
    note,
    category_hint,
  };
  return {
    reply: 'Column layout guessed from headers. Adjust if needed, then confirm.',
    mapping,
    default_kind: 'expense',
  };
}
