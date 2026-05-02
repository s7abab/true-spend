import type { ImportColumnMapRequest } from '@/features/transactions/lib/txn-chat/import/types';

const CELL_MAX = 56;
export const IMPORT_MAP_MAX_COLS = 18;

export function headersForImportMapPrompt(headers: string[]): string[] {
  const n = Math.min(headers.length, IMPORT_MAP_MAX_COLS);
  return headers.slice(0, n).map((h, i) => {
    const t = String(h ?? '').trim();
    return t || `Column ${i + 1}`;
  });
}

/** Gemini `responseJsonSchema`: strings only; use "" where a column is not mapped. */
export const IMPORT_COLUMN_MAP_JSON_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'One short sentence.' },
    mapping: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Exact header name, or empty.' },
        title: { type: 'string', description: 'Exact header name, or empty.' },
        amount: { type: 'string', description: 'Exact header name, or empty.' },
        kind: { type: 'string', description: 'Exact header name, or empty.' },
        note: { type: 'string', description: 'Exact header name, or empty.' },
        category_hint: { type: 'string', description: 'Exact header name, or empty.' },
      },
      required: ['date', 'title', 'amount', 'kind', 'note', 'category_hint'],
    },
    default_kind: { type: 'string', enum: ['expense', 'income', 'transfer'] },
  },
  required: ['reply', 'mapping', 'default_kind'],
} as const;

function clipCell(s: string): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > CELL_MAX ? `${t.slice(0, CELL_MAX)}…` : t;
}

/** Headers stay exact (for mapping match); only sample cells are clipped. */
function trimTable(req: ImportColumnMapRequest): { headers: string[]; rows: string[][] } {
  const headers = headersForImportMapPrompt(req.headers);
  const n = headers.length;
  const rows = req.sampleRows.map((r) => r.slice(0, n).map((c) => clipCell(String(c ?? ''))));
  return { headers, rows };
}

/** Short system text — keep token use low. */
export function buildImportColumnMapSystemMessage(currency: string): string {
  return `Map bank/ledger export columns to app fields. Currency: ${currency}.
Each mapping field is either an exact header string from the JSON "headers" array, or "" (empty) if none.
Map: date, title, amount, kind, note, category_hint. Bank exports without type column → kind "" and default_kind expense unless clearly income.
Output one JSON object only; no markdown.`;
}

export function buildImportColumnMapUserJson(req: ImportColumnMapRequest): string {
  const { headers, rows } = trimTable(req);
  return JSON.stringify({ headers, sample_rows: rows });
}

export function importColumnMapJsonFooter(): string {
  return `

Shape: {"reply":"string","mapping":{"date":string|null,"title":string|null,"amount":string|null,"kind":string|null,"note":string|null,"category_hint":string|null},"default_kind":"expense"|"income"|"transfer"}`;
}
