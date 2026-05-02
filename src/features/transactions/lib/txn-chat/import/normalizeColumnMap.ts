import type { ImportColumnMapping, ImportColumnMapResult } from '@/features/transactions/lib/txn-chat/import/types';

function resolveHeader(choice: unknown, headers: string[]): string | null {
  if (choice == null) return null;
  if (typeof choice !== 'string') return null;
  const t = choice.trim();
  if (!t || t.toLowerCase() === 'null') return null;
  if (headers.includes(t)) return t;
  const low = t.toLowerCase();
  const hit = headers.find((h) => h.toLowerCase() === low);
  return hit ?? null;
}

export function normalizeImportColumnMapJson(
  raw: unknown,
  headers: string[],
): ImportColumnMapResult {
  const fallback: ImportColumnMapResult = {
    reply: 'Pick columns below, then confirm import.',
    mapping: {
      date: null,
      title: headers[0] ?? null,
      amount: headers[1] ?? headers[0] ?? null,
      kind: null,
      note: null,
      category_hint: null,
    },
    default_kind: 'expense',
  };
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  const reply = typeof o.reply === 'string' && o.reply.trim() ? o.reply.trim() : fallback.reply;
  const dk =
    o.default_kind === 'income' || o.default_kind === 'transfer' || o.default_kind === 'expense'
      ? o.default_kind
      : 'expense';
  const m = o.mapping;
  if (!m || typeof m !== 'object') {
    return { reply, mapping: fallback.mapping, default_kind: dk };
  }
  const r = m as Record<string, unknown>;
  const mapping: ImportColumnMapping = {
    date: resolveHeader(r.date, headers),
    title: resolveHeader(r.title, headers),
    amount: resolveHeader(r.amount, headers),
    kind: resolveHeader(r.kind, headers),
    note: resolveHeader(r.note, headers),
    category_hint: resolveHeader(r.category_hint ?? r.category, headers),
  };
  return { reply, mapping, default_kind: dk };
}
