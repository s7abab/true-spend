import type { CategoryRow } from '@/features/categories/types';
import type { TransactionKind } from '@/types/ledger';

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[\s/,&]+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 1);
}

function pickList(
  kind: TransactionKind,
  categoriesExpense: CategoryRow[],
  categoriesIncome: CategoryRow[],
  categoriesTransfer: CategoryRow[],
): CategoryRow[] {
  if (kind === 'expense') return categoriesExpense;
  if (kind === 'income') return categoriesIncome;
  return categoriesTransfer;
}

/** When the model omits a label or nothing matches, avoid defaulting to the first seed category (Food). */
function pickFallbackCategoryRow(list: CategoryRow[]): CategoryRow {
  const other = list.find((c) => c.label.trim().toLowerCase() === 'other');
  if (other) return other;
  return list[list.length - 1]!;
}

/**
 * Picks the best category row for a free-text hint from the model (label synonym).
 */
export function matchCategoryRowByHint(
  hint: string,
  kind: TransactionKind,
  categoriesExpense: CategoryRow[],
  categoriesIncome: CategoryRow[],
  categoriesTransfer: CategoryRow[],
): CategoryRow {
  const list = pickList(kind, categoriesExpense, categoriesIncome, categoriesTransfer);
  if (list.length === 0) {
    throw new Error(
      kind === 'expense'
        ? 'No expense categories'
        : kind === 'income'
          ? 'No income categories'
          : 'No transfer categories',
    );
  }
  const h = hint.trim().toLowerCase();
  if (!h) return pickFallbackCategoryRow(list);

  const exact = list.find((c) => c.label.toLowerCase() === h);
  if (exact) return exact;

  const contains = list.find(
    (c) => h.includes(c.label.toLowerCase()) || c.label.toLowerCase().includes(h),
  );
  if (contains) return contains;

  const hintTokens = new Set(tokenize(h));
  let best: CategoryRow = pickFallbackCategoryRow(list);
  let bestScore = 0;
  for (const c of list) {
    const label = c.label.toLowerCase();
    let score = 0;
    for (const t of tokenize(label)) {
      if (hintTokens.has(t)) score += 2;
    }
    for (const t of tokenize(label)) {
      if (t.length > 2 && h.includes(t)) score += 1;
    }
    if (label.length > 2 && h.includes(label)) score += 3;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}
