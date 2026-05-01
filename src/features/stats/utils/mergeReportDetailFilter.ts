import type { HistoryFilterFields } from '@/features/history/types';
import type { ReportDetailFilter } from '@/features/stats/hooks/useStatsDetailTransactions';

/** Base scope from the chart / totals row; `list` is the global Report filter sheet. */
export type ReportDetailBase = Omit<ReportDetailFilter, 'search' | 'rangeKey' | 'amountMin' | 'amountMax'>;

export function mergeReportDetailFilter(base: ReportDetailBase, list: HistoryFilterFields): Omit<ReportDetailFilter, 'search'> {
  const isCategoryDrill = base.categoryScopeKey.startsWith('cat:');
  const fromIso = list.fromIso ?? base.fromIso;
  const toIsoExclusive = list.toIsoExclusive ?? base.toIsoExclusive;
  const categoryId = isCategoryDrill ? base.categoryId : list.categoryId;
  const uncategorizedOnly = isCategoryDrill ? base.uncategorizedOnly : list.uncategorizedOnly;
  const rangeKey = JSON.stringify({
    f: fromIso,
    t: toIsoExclusive,
    k: base.kind,
    sk: base.categoryScopeKey,
    c: categoryId,
    u: uncategorizedOnly,
    amin: list.amountMin,
    amax: list.amountMax,
  });
  return {
    rangeKey,
    fromIso,
    toIsoExclusive,
    kind: base.kind,
    categoryScopeKey: base.categoryScopeKey,
    categoryId,
    uncategorizedOnly,
    amountMin: list.amountMin,
    amountMax: list.amountMax,
  };
}
