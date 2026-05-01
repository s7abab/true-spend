import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as transactionsApi from '@/features/transactions/api/transactions';
import { useAuth } from '@/features/auth/components/AuthContext';
import { getPeriodWindow, type PeriodId } from '@/utils/periodWindows';
import type { PeriodSummary } from '@/features/stats/types';
import { queryKeys } from '@/shared/lib/queryKeys';

function aborted(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; name?: string };
  return Boolean(/aborted|AbortError/i.test(e.message || '') || e.name === 'AbortError');
}

function parseSummary(raw: unknown): PeriodSummary {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    total_income: Number(o.total_income) || 0,
    total_expense: Number(o.total_expense) || 0,
    income_txn_count: Number(o.income_txn_count) || 0,
    expense_txn_count: Number(o.expense_txn_count) || 0,
  };
}

export function usePeriodSummary(period: PeriodId, offset: number) {
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
    queryKey: userId ? queryKeys.transactions.periodSummary(userId, rangeKey) : ['transactions', 'periodSummary', 'idle'],
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const [startIso, endIso] = rangeKey.split('\0');
      const { data, error: err } = await transactionsApi.fetchPeriodSummary(startIso, endIso, { signal });
      if (err && !aborted(err)) {
        console.error('period summary failed', err);
        throw new Error(err.message || 'Could not load summary');
      }
      return parseSummary(data);
    },
  });

  const errorMsg =
    q.error instanceof Error ? q.error.message : q.error ? String(q.error) : null;

  return {
    loading: q.isPending,
    summary: q.data ?? null,
    window,
    error: errorMsg,
  };
}
