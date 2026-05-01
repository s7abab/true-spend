import { useEffect, useMemo, useState } from 'react';
import * as transactionsApi from '@/features/transactions/api/transactions';
import { useAuth } from '@/features/auth/components/AuthContext';
import { getPeriodWindow, type PeriodId } from '@/utils/periodWindows';
import type { ExpenseAggRow } from '@/features/stats/types';

function aborted(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; name?: string };
  return Boolean(/aborted|AbortError/i.test(e.message || '') || e.name === 'AbortError');
}

export function useStatsAggregates(period: PeriodId, offset: number, refreshKey = 0) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ExpenseAggRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await transactionsApi.fetchExpenseByCategory(startIso, endIso, {
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (err && !aborted(err)) {
          console.error('stats fetch failed', err);
          setRows([]);
          setError(err.message || 'Could not load report');
        } else if (!err) {
          setRows((data as ExpenseAggRow[]) || []);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [userId, rangeKey, refreshKey]);

  return { loading, aggRows: rows, window, error };
}
