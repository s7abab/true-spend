import { useEffect, useMemo, useState } from 'react';
import * as transactionsApi from '../api/transactions';
import { useAuth } from '../context/AuthContext';
import { getPeriodWindow } from '../utils/periodWindows';

export function useStatsAggregates(period, offset, refreshKey = 0) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const { window, rangeKey } = useMemo(() => {
    const w = getPeriodWindow(period, offset);
    return {
      window: w,
      rangeKey: `${w.start.toISOString()}\0${w.end.toISOString()}`,
    };
  }, [period, offset]);

  useEffect(() => {
    const ac = new AbortController();
    if (!userId) {
      setRows([]);
      setError(null);
      return undefined;
    }
    const [startIso, endIso] = rangeKey.split('\0');
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await transactionsApi.fetchExpenseByCategory(
          startIso,
          endIso,
          { signal: ac.signal },
        );
        if (ac.signal.aborted) return;
        const aborted = err && (/aborted|AbortError/i.test(err.message || '') || err.name === 'AbortError');
        if (err && !aborted) {
          console.error('stats fetch failed', err);
          setRows([]);
          setError(err.message || 'Could not load report');
        } else if (!err) {
          setRows(data || []);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [userId, rangeKey, refreshKey]);

  return { loading, aggRows: rows, window, error };
}
