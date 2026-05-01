import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as transactionsApi from '@/features/transactions/api/transactions';
import { useAuth } from '@/features/auth/components/AuthContext';
import { getPeriodWindow, type PeriodId } from '@/utils/periodWindows';
import type { PeriodTrendPoint } from '@/features/stats/types';
import { queryKeys } from '@/shared/lib/queryKeys';

function aborted(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; name?: string };
  return Boolean(/aborted|AbortError/i.test(e.message || '') || e.name === 'AbortError');
}

function getBucket(period: PeriodId): 'hour' | 'day' | 'month' {
  if (period === 'daily') return 'hour';
  if (period === 'yearly') return 'month';
  return 'day';
}

function parseTrend(raw: unknown): PeriodTrendPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const key = String(o.d ?? o.k ?? '');
    return {
      key,
      expense: Number(o.expense) || 0,
      income: Number(o.income) || 0,
    };
  }).filter((x) => x.key !== '');
}

export function usePeriodTrend(period: PeriodId, offset: number, tz: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const bucket = getBucket(period);

  const { window, rangeKey } = useMemo(() => {
    const w = getPeriodWindow(period, offset);
    return {
      window: w,
      rangeKey: `${w.start.toISOString()}\0${w.end.toISOString()}`,
    };
  }, [period, offset]);

  const q = useQuery({
    queryKey: userId
      ? queryKeys.transactions.periodTrend(userId, rangeKey, bucket, tz)
      : ['transactions', 'periodTrend', 'idle'],
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const [startIso, endIso] = rangeKey.split('\0');
      const { data, error: err } = await transactionsApi.fetchPeriodTimeBuckets(startIso, endIso, bucket, tz, { signal });
      if (err && !aborted(err)) {
        console.error('period trend failed', err);
        throw new Error(err.message || 'Could not load trend');
      }
      return parseTrend(data);
    },
  });

  const errorMsg =
    q.error instanceof Error ? q.error.message : q.error ? String(q.error) : null;

  return {
    loading: q.isPending,
    trend: q.data ?? [],
    bucket,
    window,
    error: errorMsg,
  };
}
