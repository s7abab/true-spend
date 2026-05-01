import { useCallback, useEffect, useMemo, useState } from 'react';
import * as transactionsApi from '../api/transactions';
import { useAuth } from '../context/AuthContext';
import { mapTxnRow } from '../utils/txnMap';
import { weekRangeMonday } from '../utils/spending';

function emptyHome() {
  return {
    lifetimeIncome: 0,
    lifetimeExpense: 0,
    weekBuckets: [0, 0, 0, 0, 0, 0, 0],
    prevWeekExpense: 0,
    recentTxns: [],
  };
}

function normalizeWeekBuckets(raw) {
  const zeros = () => [0, 0, 0, 0, 0, 0, 0];
  if (Array.isArray(raw)) {
    const arr = raw.map((x) => Number(x) || 0);
    while (arr.length < 7) arr.push(0);
    return arr.slice(0, 7);
  }
  if (raw && typeof raw === 'object') {
    const keys = Object.keys(raw).sort((a, b) => Number(a) - Number(b));
    if (keys.length && keys.every((k) => /^\d+$/.test(k))) {
      const arr = keys.map((k) => Number(raw[k]) || 0);
      while (arr.length < 7) arr.push(0);
      return arr.slice(0, 7);
    }
  }
  return zeros();
}

export function useTransactions() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [mutationGeneration, setMutationGeneration] = useState(0);
  const [home, setHome] = useState(null);
  const [homeLoading, setHomeLoading] = useState(Boolean(userId));
  const [txnError, setTxnError] = useState(null);

  const tz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );

  const loadHome = useCallback(async (signal) => {
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

      const aborted = (e) =>
        e && (/aborted|AbortError/i.test(e.message || '') || e.name === 'AbortError');

      if (e1 && !aborted(e1)) console.error('home metrics failed', e1);
      if (e2 && !aborted(e2)) console.error('recent txns failed', e2);

      const errMsg = aborted(e1) || aborted(e2) ? null : (e1?.message || e2?.message || null);
      setTxnError(errMsg);

      const m = (metrics && typeof metrics === 'object') ? metrics : {};
      const weekBuckets = normalizeWeekBuckets(m.week_buckets);

      setHome({
        lifetimeIncome: Number(m.lifetime_income) || 0,
        lifetimeExpense: Number(m.lifetime_expense) || 0,
        weekBuckets,
        prevWeekExpense: Number(m.prev_week_expense) || 0,
        recentTxns: (recentRows || []).map(mapTxnRow),
      });
    } finally {
      setHomeLoading(false);
    }
  }, [userId, tz]);

  useEffect(() => {
    const ac = new AbortController();
    loadHome(ac.signal);
    return () => ac.abort();
  }, [loadHome, mutationGeneration]);

  const bump = useCallback(() => {
    setMutationGeneration((g) => g + 1);
  }, []);

  const refetchTransactions = useCallback(() => {
    setMutationGeneration((g) => g + 1);
  }, []);

  const addTransaction = useCallback(async ({
    kind, category_id, amount, title, note, occurred_at,
  }) => {
    if (!userId || !user) return { error: new Error('not signed in') };
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
  }, [user, userId, bump]);

  const removeTransaction = useCallback(async (id) => {
    if (!userId || !user) return { error: new Error('not signed in') };
    const { error } = await transactionsApi.deleteTransactionRow(user.id, id);
    if (!error) bump();
    return { error };
  }, [user, userId, bump]);

  const exportAllTransactions = useCallback(async () => {
    if (!userId || !user) return [];
    const out = [];
    let cursor = null;
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
      const batch = data || [];
      if (!batch.length) break;
      out.push(...batch.map(mapTxnRow));
      const last = batch[batch.length - 1];
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
