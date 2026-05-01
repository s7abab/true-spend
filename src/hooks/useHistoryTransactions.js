import { useCallback, useEffect, useRef, useState } from 'react';
import * as transactionsApi from '../api/transactions';
import { useAuth } from '../context/AuthContext';
import { mapTxnRow } from '../utils/txnMap';

const PAGE_SIZE = 50;

export function useHistoryTransactions(filter, debouncedSearch, refreshKey = 0) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const rowsRef = useRef([]);

  const kind = filter === 'all' ? 'all' : filter;
  const search = debouncedSearch?.trim() ?? '';

  rowsRef.current = rows;

  const resetAndLoad = useCallback(async (signal) => {
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
      const aborted = err && (/aborted|AbortError/i.test(err.message || '') || err.name === 'AbortError');
      if (err && !aborted) {
        console.error('history page failed', err);
        setRows([]);
        setHasMore(false);
        setError(err.message || 'Could not load history');
      } else if (!err) {
        const mapped = (data || []).map(mapTxnRow);
        setRows(mapped);
        setHasMore((data || []).length === PAGE_SIZE);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, kind, search]);

  useEffect(() => {
    const ac = new AbortController();
    resetAndLoad(ac.signal);
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
      const chunk = (data || []).map(mapTxnRow);
      setRows(p => [...p, ...chunk]);
      setHasMore((data || []).length === PAGE_SIZE);
      setError(null);
    }
    setLoadingMore(false);
  }, [userId, kind, search, loadingMore, hasMore]);

  return { rows, loading, loadingMore, hasMore, error, loadMore, refetch: resetAndLoad };
}
