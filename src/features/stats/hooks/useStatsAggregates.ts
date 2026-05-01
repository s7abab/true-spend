import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as transactionsApi from '@/features/transactions/api/transactions';
import { useAuth } from '@/features/auth/components/AuthContext';
import { getPeriodWindow, type PeriodId } from '@/utils/periodWindows';
import type { ExpenseAggRow } from '@/features/stats/types';
import { queryKeys } from '@/shared/lib/queryKeys';

function aborted(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; name?: string };
  return Boolean(/aborted|AbortError/i.test(e.message || '') || e.name === 'AbortError');
}

export function useStatsAggregates(period: PeriodId, offset: number) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { window, rangeKey } = useMemo(() => {
    const w = getPeriodWindow(period, offset);
    return {
      window: w,
      rangeKey: `${w.start.toISOString()}\0${w.end.toISOString()}`,
    };
  }, [period, offset]);

  const q = useQuery({
    queryKey: userId ? queryKeys.transactions.stats(userId, rangeKey) : ['transactions', 'stats', 'idle'],
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const [startIso, endIso] = rangeKey.split('\0');
      const { data, error: err } = await transactionsApi.fetchExpenseByCategory(startIso, endIso, { signal });
      if (err && !aborted(err)) {
        console.error('stats fetch failed', err);
        throw new Error(err.message || 'Could not load report');
      }
      return (data as ExpenseAggRow[]) || [];
    },
  });

  const errorMsg =
    q.error instanceof Error ? q.error.message : q.error ? String(q.error) : null;

  return {
    loading: q.isPending,
    aggRows: q.data ?? [],
    window,
    error: errorMsg,
  };
}
