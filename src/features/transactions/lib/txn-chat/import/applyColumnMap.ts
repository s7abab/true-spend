import type { ImportColumnMapping } from '@/features/transactions/lib/txn-chat/import/types';
import type { TxnChatDraftTransaction } from '@/features/transactions/lib/txn-chat/types';

const MAX_ROWS = 250;

function colIndex(headers: string[], name: string | null): number {
  if (!name) return -1;
  return headers.indexOf(name);
}

function parseAmount(raw: string): number | null {
  const t = raw.replace(/[\s₹$€£]/g, '').replace(/,/g, '');
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY when unambiguous. */
function parseDateYmd(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (dmy) {
    let d = Number(dmy[1]);
    let mo = Number(dmy[2]);
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    // If first part > 12, treat as DMY
    if (d > 12) {
      /* d is day */
    } else if (mo > 12) {
      const tmp = d;
      d = mo;
      mo = tmp;
    }
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1970 && y <= 2100) {
      const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
      return `${y}-${pad(mo)}-${pad(d)}`;
    }
  }
  return null;
}

function parseKindCell(raw: string, fallback: 'expense' | 'income' | 'transfer'): 'expense' | 'income' | 'transfer' {
  const t = raw.toLowerCase();
  if (/\b(income|credit|salary|deposit received|received)\b/.test(t)) return 'income';
  if (/\b(transfer|xfer|sip|investment|debit transfer)\b/.test(t)) return 'transfer';
  if (/\b(expense|debit|dr|paid|purchase)\b/.test(t)) return 'expense';
  if (t.includes('income') || t.includes('credit')) return 'income';
  if (t.includes('transfer')) return 'transfer';
  if (t.includes('expense') || t.includes('debit')) return 'expense';
  return fallback;
}

export function tableToDraftTransactions(
  headers: string[],
  rows: string[][],
  mapping: ImportColumnMapping,
  defaultKind: 'expense' | 'income' | 'transfer',
): TxnChatDraftTransaction[] {
  const iDate = colIndex(headers, mapping.date);
  const iTitle = colIndex(headers, mapping.title);
  const iAmt = colIndex(headers, mapping.amount);
  const iKind = colIndex(headers, mapping.kind);
  const iNote = colIndex(headers, mapping.note);
  const iCat = colIndex(headers, mapping.category_hint);

  if (iTitle < 0 && iAmt < 0) return [];

  const out: TxnChatDraftTransaction[] = [];
  const slice = rows.slice(0, MAX_ROWS);
  for (const row of slice) {
    let title = iTitle >= 0 ? String(row[iTitle] ?? '').trim() : '';
    const amountStr = iAmt >= 0 ? String(row[iAmt] ?? '').trim() : '';
    const amount = amountStr ? parseAmount(amountStr) : null;
    const dateRaw = iDate >= 0 ? String(row[iDate] ?? '').trim() : '';
    const date = dateRaw ? parseDateYmd(dateRaw) : null;
    const noteParts: string[] = [];
    if (iNote >= 0) {
      const n = String(row[iNote] ?? '').trim();
      if (n) noteParts.push(n);
    }
    const catHint = iCat >= 0 ? String(row[iCat] ?? '').trim() : '';
    if (!title) title = catHint || (noteParts[0] ?? '') || '';
    if (!title.trim() && amount == null) continue;
    const displayTitle = title.trim() || 'Imported line';
    let kind: 'expense' | 'income' | 'transfer' = defaultKind;
    if (iKind >= 0) {
      kind = parseKindCell(String(row[iKind] ?? ''), defaultKind);
    }

    out.push({
      kind,
      title: displayTitle,
      amount,
      category_label: catHint || null,
      date,
      note: noteParts.length ? noteParts.join(' · ') : null,
    });
  }
  return out;
}
