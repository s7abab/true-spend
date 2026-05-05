import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import * as transactionsApi from '@/features/transactions/api/transactions';
import { useAuth } from '@/features/auth/components/AuthContext';
import { mapTxnRow, type DbTransactionRow, type MappedTxn } from '@/utils/txnMap';
import { historyQueryFingerprint, type HistoryTransactionQuery } from '@/features/history/types';
import { queryKeys } from '@/shared/lib/queryKeys';

const PAGE_SIZE = 50;

function aborted(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; name?: string };
  return Boolean(/aborted|AbortError/i.test(e.message || '') || e.name === 'AbortError');
}

export function useHistoryTransactions(query: HistoryTransactionQuery) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const kind = query.kind === 'all' ? 'all' : query.kind;
  const search = query.search?.trim() ?? '';
  const fingerprint = historyQueryFingerprint(query);

  const q = useInfiniteQuery({
    queryKey: userId ? queryKeys.transactions.history(userId, fingerprint) : ['transactions', 'history', 'idle'],
    initialPageParam: null as transactionsApi.TxnPageCursor,
    enabled: Boolean(userId),
    queryFn: async ({ pageParam, signal }) => {
      const { data, error: err } = await transactionsApi.fetchTransactionsPage({
        kind,
        search,
        cursor: pageParam,
        limit: PAGE_SIZE,
        fromIso: query.fromIso,
        toIsoExclusive: query.toIsoExclusive,
        categoryId: query.uncategorizedOnly ? null : query.categoryId,
        uncategorizedOnly: query.uncategorizedOnly,
        amountMin: query.amountMin,
        amountMax: query.amountMax,
        signal,
      });
      if (err && aborted(err)) return [];
      if (err) {
        console.error('history page failed', err);
        throw new Error(err.message || 'Could not load history');
      }
      const rows = ((data as DbTransactionRow[]) || []).map((r) => mapTxnRow(r));
      return rows;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.length || lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1]!;
      if (!last.created_at || !last.id) return undefined;
      return { created_at: last.created_at, id: last.id };
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
