import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as transactionsApi from '@/features/transactions/api/transactions';
import { useAuth } from '@/features/auth/components/AuthContext';
import { mapTxnRow, type DbTransactionRow } from '@/utils/txnMap';
import { weekRangeMonday } from '@/utils/spending';
import type { HomeMetrics, MappedTxn } from '@/features/transactions/types';
import { queryKeys } from '@/shared/lib/queryKeys';

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

type HomeQueryData = { home: HomeMetrics; remoteError: string | null };

async function fetchHomeBundle(userId: string, tz: string, signal: AbortSignal): Promise<HomeQueryData> {
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

  if (signal.aborted) {
    return { home: emptyHome(), remoteError: null };
  }

  if (e1 && !aborted(e1)) console.error('home metrics failed', e1);
  if (e2 && !aborted(e2)) console.error('recent txns failed', e2);

  const remoteError = aborted(e1) || aborted(e2) ? null : (e1?.message || e2?.message || null);

  const m = metrics && typeof metrics === 'object' ? (metrics as Record<string, unknown>) : {};
  const weekBuckets = normalizeWeekBuckets(m.week_buckets);

  const home: HomeMetrics = {
    lifetimeIncome: Number(m.lifetime_income) || 0,
    lifetimeExpense: Number(m.lifetime_expense) || 0,
    weekBuckets,
    prevWeekExpense: Number(m.prev_week_expense) || 0,
    recentTxns: ((recentRows as DbTransactionRow[]) || []).map((r) => mapTxnRow(r)),
  };

  return { home, remoteError };
}

export function useTransactions() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const tz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );

  const homeQuery = useQuery({
    queryKey: userId ? queryKeys.transactions.home(userId, tz) : ['transactions', 'home', 'idle'],
    queryFn: ({ signal }) => fetchHomeBundle(userId!, tz, signal),
    enabled: Boolean(userId),
  });

  const invalidateTransactions = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...queryKeys.transactions.root] });
  }, [qc]);

  const insertMutation = useMutation({
    mutationFn: async (payload: {
      user_id: string;
      kind: string;
      category_id: string | null;
      amount: number;
      title: string | null;
      note: string | null;
      occurred_at: string;
    }) => {
      const out = await transactionsApi.insertTransaction(payload);
      if (out.error) throw out.error;
      return out.data;
    },
    onSuccess: invalidateTransactions,
  });

  const updateMutation = useMutation({
    mutationFn: async (args: {
      uid: string;
      id: string;
      row: transactionsApi.TransactionUpdateFields;
    }) => {
      const out = await transactionsApi.updateTransactionRow(args.uid, args.id, args.row);
      if (out.error) throw out.error;
      return out.data;
    },
    onSuccess: invalidateTransactions,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ uid, id }: { uid: string; id: string }) => {
      const out = await transactionsApi.deleteTransactionRow(uid, id);
      if (out.error) throw out.error;
    },
    onSuccess: invalidateTransactions,
  });

  const home = homeQuery.data?.home ?? emptyHome();
  const txnError =
    homeQuery.data?.remoteError
    ?? (homeQuery.error instanceof Error ? homeQuery.error.message : homeQuery.error ? String(homeQuery.error) : null);
  const homeLoading = homeQuery.isPending;

  const refetchTransactions = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: [...queryKeys.transactions.root] });
  }, [qc]);

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
      try {
        const data = await insertMutation.mutateAsync(payload);
        return { data, error: null as null };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
    [user, userId, insertMutation],
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      fields: {
        kind: string;
        category_id: string | null;
        amount: number;
        title: string;
        note: string | null;
        occurred_at: string;
      },
    ) => {
      if (!userId || !user) return { error: new Error('not signed in') as Error, data: null as null };
      const row: transactionsApi.TransactionUpdateFields = {
        kind: fields.kind,
        category_id: fields.category_id ?? null,
        amount: fields.amount,
        title: fields.title || null,
        note: fields.note,
        occurred_at: fields.occurred_at,
      };
      try {
        const data = await updateMutation.mutateAsync({ uid: user.id, id, row });
        return { data, error: null as null };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
    [user, userId, updateMutation],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      if (!userId || !user) return { error: new Error('not signed in') };
      try {
        await deleteMutation.mutateAsync({ uid: user.id, id });
        return { error: undefined };
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
    [user, userId, deleteMutation],
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

  return {
    home,
    homeLoading,
    loading: homeLoading,
    error: txnError,
    refetchHome: () => homeQuery.refetch(),
    refetch: refetchTransactions,
    refetchTransactions,
    addTransaction,
    updateTransaction,
    removeTransaction,
    exportAllTransactions,
  };
}
