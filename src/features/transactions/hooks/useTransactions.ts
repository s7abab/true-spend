import { useCallback, useEffect, useMemo, useState } from 'react';
import * as transactionsApi from '@/features/transactions/api/transactions';
import { useAuth } from '@/features/auth/components/AuthContext';
import { mapTxnRow, type DbTransactionRow } from '@/utils/txnMap';
import { weekRangeMonday } from '@/utils/spending';
import type { HomeMetrics, MappedTxn } from '@/features/transactions/types';

function emptyHome(): HomeMetrics {
  return {
    lifetimeIncome: 0,
    lifetimeExpense: 0,
    weekBuckets: [0, 0, 0, 0, 0, 0, 0],
    prevWeekExpense: 0,
    recentTxns: [],
  };
}

function normalizeWeekBuckets(raw: unknown): number[] {
  const zeros = (): number[] => [0, 0, 0, 0, 0, 0, 0];
  if (Array.isArray(raw)) {
    const arr = raw.map((x) => Number(x) || 0);
    while (arr.length < 7) arr.push(0);
    return arr.slice(0, 7);
  }
  if (raw && typeof raw === 'object') {
    const keys = Object.keys(raw as object).sort((a, b) => Number(a) - Number(b));
    if (keys.length && keys.every((k) => /^\d+$/.test(k))) {
      const arr = keys.map((k) => Number((raw as Record<string, unknown>)[k]) || 0);
      while (arr.length < 7) arr.push(0);
      return arr.slice(0, 7);
    }
  }
  return zeros();
}

function aborted(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { message?: string; name?: string };
  return Boolean(/aborted|AbortError/i.test(err.message || '') || err.name === 'AbortError');
}

export function useTransactions() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [mutationGeneration, setMutationGeneration] = useState(0);
  const [home, setHome] = useState<HomeMetrics | null>(null);
  const [homeLoading, setHomeLoading] = useState(Boolean(userId));
  const [txnError, setTxnError] = useState<string | null>(null);

  const tz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );

  const loadHome = useCallback(
    async (signal: AbortSignal | undefined) => {
      if (!userId) {
        setHome(null);
        setTxnError(null);
        setHomeLoading(false);
        return;
      }
      setHomeLoading(true);
      try {
        const [w0, w1] = weekRangeMonday(0);
        const [pw0, pw1] = weekRangeMonday(-1);

        const [{ data: metrics, error: e1 }, { data: recentRows, error: e2 }] = await Promise.all([
          transactionsApi.fetchHomeMetrics({
            tz,
            weekStart: w0.toISOString(),
            weekEnd: w1.toISOString(),
            prevWeekStart: pw0.toISOString(),
            prevWeekEnd: pw1.toISOString(),
            signal,
          }),
          transactionsApi.listRecentTransactions(userId, 5, { signal }),
        ]);

        if (signal?.aborted) return;

        if (e1 && !aborted(e1)) console.error('home metrics failed', e1);
        if (e2 && !aborted(e2)) console.error('recent txns failed', e2);

        const errMsg = aborted(e1) || aborted(e2) ? null : (e1?.message || e2?.message || null);
        setTxnError(errMsg);

        const m = metrics && typeof metrics === 'object' ? (metrics as Record<string, unknown>) : {};
        const weekBuckets = normalizeWeekBuckets(m.week_buckets);

        setHome({
          lifetimeIncome: Number(m.lifetime_income) || 0,
          lifetimeExpense: Number(m.lifetime_expense) || 0,
          weekBuckets,
          prevWeekExpense: Number(m.prev_week_expense) || 0,
          recentTxns: ((recentRows as DbTransactionRow[]) || []).map((r) => mapTxnRow(r)),
        });
      } finally {
        setHomeLoading(false);
      }
    },
    [userId, tz],
  );

  useEffect(() => {
    const ac = new AbortController();
    void loadHome(ac.signal);
    return () => ac.abort();
  }, [loadHome, mutationGeneration]);

  const bump = useCallback(() => {
    setMutationGeneration((g) => g + 1);
  }, []);

  const refetchTransactions = useCallback(() => {
    setMutationGeneration((g) => g + 1);
  }, []);

  const addTransaction = useCallback(
    async ({
      kind,
      category_id,
      amount,
      title,
      note,
      occurred_at,
    }: {
      kind: string;
      category_id: string | null;
      amount: number;
      title: string;
      note: string | null;
      occurred_at: string;
    }) => {
      if (!userId || !user) return { error: new Error('not signed in') as Error, data: null };
      const payload = {
        user_id: user.id,
        kind,
        category_id: category_id ?? null,
        amount,
        title: title || null,
        note: note || null,
        occurred_at: occurred_at || new Date().toISOString(),
      };
      const { data, error } = await transactionsApi.insertTransaction(payload);
      if (!error) bump();
      return { data, error };
    },
    [user, userId, bump],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      if (!userId || !user) return { error: new Error('not signed in') };
      const { error } = await transactionsApi.deleteTransactionRow(user.id, id);
      if (!error) bump();
      return { error };
    },
    [user, userId, bump],
  );

  const exportAllTransactions = useCallback(async (): Promise<MappedTxn[]> => {
    if (!userId || !user) return [];
    const out: MappedTxn[] = [];
    let cursor: transactionsApi.TxnPageCursor = null;
    for (;;) {
      const { data, error } = await transactionsApi.fetchTransactionsPage({
        kind: 'all',
        search: '',
        cursor,
        limit: 100,
      });
      if (error) {
        console.error('export page failed', error);
        break;
      }
      const batch = (data as DbTransactionRow[]) || [];
      if (!batch.length) break;
      out.push(...batch.map((row) => mapTxnRow(row)));
      const last = batch[batch.length - 1] as { occurred_at: string; id: string };
      cursor = { occurred_at: last.occurred_at, id: last.id };
      if (batch.length < 100) break;
    }
    return out;
  }, [user, userId]);

  const homeModel = home ?? emptyHome();

  return {
    home: homeModel,
    homeLoading,
    loading: homeLoading,
    error: txnError,
    refetchHome: loadHome,
    refetch: refetchTransactions,
    refetchTransactions,
    mutationGeneration,
    addTransaction,
    removeTransaction,
    exportAllTransactions,
  };
}
