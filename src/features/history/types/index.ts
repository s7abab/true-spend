export type HistoryKindFilter = 'all' | 'expense' | 'income';

/** Server-backed filters for the history transaction list (search is applied separately, debounced). */
export type HistoryTransactionQuery = {
  kind: HistoryKindFilter;
  search: string;
  fromIso: string | null;
  toIsoExclusive: string | null;
  categoryId: string | null;
  uncategorizedOnly: boolean;
  amountMin: number | null;
  amountMax: number | null;
};

/** List filters without search (search stays in the history search bar + debounce). */
export type HistoryFilterFields = Omit<HistoryTransactionQuery, 'search'>;

export function defaultHistoryQuery(): HistoryTransactionQuery {
  return {
    kind: 'all',
    search: '',
    fromIso: null,
    toIsoExclusive: null,
    categoryId: null,
    uncategorizedOnly: false,
    amountMin: null,
    amountMax: null,
  };
}

export function defaultHistoryListFilter(): HistoryFilterFields {
  const q = defaultHistoryQuery();
  return {
    kind: q.kind,
    fromIso: q.fromIso,
    toIsoExclusive: q.toIsoExclusive,
    categoryId: q.categoryId,
    uncategorizedOnly: q.uncategorizedOnly,
    amountMin: q.amountMin,
    amountMax: q.amountMax,
  };
}

export function historyQueryFingerprint(q: HistoryTransactionQuery): string {
  return JSON.stringify({
    k: q.kind,
    s: q.search,
    f: q.fromIso,
    t: q.toIsoExclusive,
    c: q.categoryId,
    u: q.uncategorizedOnly,
    amin: q.amountMin,
    amax: q.amountMax,
  });
}

/** True when any filter beyond kind=all would narrow the list (kind chip alone is not counted). */
export function hasAdvancedHistoryFilters(q: HistoryTransactionQuery | HistoryFilterFields): boolean {
  return (
    q.fromIso != null
    || q.toIsoExclusive != null
    || q.categoryId != null
    || q.uncategorizedOnly
    || q.amountMin != null
    || q.amountMax != null
  );
}
