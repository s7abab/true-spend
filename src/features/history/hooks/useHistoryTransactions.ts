import { useCallback, useEffect, useRef, useState } from 'react';
import * as transactionsApi from '@/features/transactions/api/transactions';
import { useAuth } from '@/features/auth/components/AuthContext';
import { mapTxnRow, type DbTransactionRow, type MappedTxn } from '@/utils/txnMap';
import type { HistoryKindFilter } from '@/features/history/types';

const PAGE_SIZE = 50;

function aborted(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; name?: string };
  return Boolean(/aborted|AbortError/i.test(e.message || '') || e.name === 'AbortError');
}

export function useHistoryTransactions(
  filter: HistoryKindFilter,
  debouncedSearch: string,
  refreshKey = 0,
) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [rows, setRows] = useState<MappedTxn[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rowsRef = useRef<MappedTxn[]>([]);

  const kind = filter === 'all' ? 'all' : filter;
  const search = debouncedSearch?.trim() ?? '';

  rowsRef.current = rows;

  const resetAndLoad = useCallback(
    async (signal: AbortSignal | undefined) => {
      if (!userId) {
        setRows([]);
        setHasMore(false);
        setError(null);
        return;
      }
      setLoading(true);
      setHasMore(true);
      setError(null);
      try {
        const { data, error: err } = await transactionsApi.fetchTransactionsPage({
          kind,
          search,
          cursor: null,
          limit: PAGE_SIZE,
          signal,
        });
        if (signal?.aborted) return;
        if (err && !aborted(err)) {
          console.error('history page failed', err);
          setRows([]);
          setHasMore(false);
          setError(err.message || 'Could not load history');
        } else if (!err) {
          const mapped = ((data as DbTransactionRow[]) || []).map((r) => mapTxnRow(r));
          setRows(mapped);
          setHasMore(((data as unknown[]) || []).length === PAGE_SIZE);
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [userId, kind, search],
  );

  useEffect(() => {
    const ac = new AbortController();
    void resetAndLoad(ac.signal);
    return () => ac.abort();
  }, [resetAndLoad, refreshKey]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore) return;
    const prev = rowsRef.current;
    if (!prev.length) return;
    const last = prev[prev.length - 1];
    if (!last?.occurred_at || !last?.id) return;
    setLoadingMore(true);
    const { data, error: err } = await transactionsApi.fetchTransactionsPage({
      kind,
      search,
      cursor: { occurred_at: last.occurred_at, id: last.id },
      limit: PAGE_SIZE,
    });
    if (err) {
      console.error('history loadMore failed', err);
      setError(err.message || 'Could not load more');
    } else {
      const chunk = ((data as DbTransactionRow[]) || []).map((r) => mapTxnRow(r));
      setRows((p) => [...p, ...chunk]);
      setHasMore(((data as unknown[]) || []).length === PAGE_SIZE);
      setError(null);
    }
    setLoadingMore(false);
  }, [userId, kind, search, loadingMore, hasMore]);

  return { rows, loading, loadingMore, hasMore, error, loadMore, refetch: resetAndLoad };
}
