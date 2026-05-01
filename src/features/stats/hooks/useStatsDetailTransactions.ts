import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import * as transactionsApi from '@/features/transactions/api/transactions';
import { useAuth } from '@/features/auth/components/AuthContext';
import { mapTxnRow, type DbTransactionRow, type MappedTxn } from '@/utils/txnMap';
import { queryKeys } from '@/shared/lib/queryKeys';

const PAGE_SIZE = 50;

function aborted(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; name?: string };
  return Boolean(/aborted|AbortError/i.test(e.message || '') || e.name === 'AbortError');
}

export type ReportDetailFilter = {
  rangeKey: string;
  fromIso: string;
  toIsoExclusive: string;
  kind: 'all' | 'expense' | 'income';
  search: string;
  /** Stable key for React Query (e.g. "cat:uuid" | "uncat" | "all") */
  categoryScopeKey: string;
  categoryId: string | null;
  uncategorizedOnly: boolean;
  amountMin: number | null;
  amountMax: number | null;
};

export function useStatsDetailTransactions(filter: ReportDetailFilter | null) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const search = filter?.search?.trim() ?? '';

  const q = useInfiniteQuery({
    queryKey: userId && filter
      ? queryKeys.transactions.reportDetail(userId, filter.rangeKey, search)
      : ['transactions', 'reportDetail', 'idle'],
    initialPageParam: null as transactionsApi.TxnPageCursor,
    enabled: Boolean(userId && filter),
    queryFn: async ({ pageParam, signal }) => {
      if (!filter) return [];
      const { data, error: err } = await transactionsApi.fetchTransactionsPage({
        kind: filter.kind,
        search,
        cursor: pageParam,
        limit: PAGE_SIZE,
        fromIso: filter.fromIso,
        toIsoExclusive: filter.toIsoExclusive,
        categoryId: filter.uncategorizedOnly ? null : filter.categoryId,
        uncategorizedOnly: filter.uncategorizedOnly,
        amountMin: filter.amountMin,
        amountMax: filter.amountMax,
        signal,
      });
      if (err && aborted(err)) return [];
      if (err) {
        console.error('report detail page failed', err);
        throw new Error(err.message || 'Could not load transactions');
      }
      const rows = ((data as DbTransactionRow[]) || []).map((r) => mapTxnRow(r));
      return rows;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.length || lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1]!;
      if (!last.occurred_at || !last.id) return undefined;
      return { occurred_at: last.occurred_at, id: last.id };
    },
  });

  const rows: MappedTxn[] = useMemo(
    () => (q.data?.pages ?? []).flatMap((p) => p),
    [q.data?.pages],
  );

  const errorMsg =
    q.error instanceof Error ? q.error.message : q.error ? String(q.error) : null;

  return {
    rows,
    loading: q.isPending,
    loadingMore: q.isFetchingNextPage,
    hasMore: Boolean(q.hasNextPage),
    error: errorMsg,
    loadMore: () => void q.fetchNextPage(),
    refetch: q.refetch,
  };
}
