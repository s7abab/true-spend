import { useCallback, useEffect, useMemo, useState } from 'react';
import * as transactionsApi from '../api/transactions';
import { useAuth } from '../context/AuthContext';
import { formatDateLabel } from '../data/categories';

function mapRow(row) {
  const occurredAt = row.occurred_at ? new Date(row.occurred_at) : new Date();
  return {
    id: row.id,
    kind: row.kind,
    cat: row.category_id,
    amount: Number(row.amount),
    title: row.title || '',
    note: row.note || '',
    occurred_at: row.occurred_at,
    occurredDate: occurredAt,
    time: formatDateLabel(occurredAt),
  };
}

export function useTransactions() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));

  const refetch = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await transactionsApi.listTransactions(user.id);
    if (error) {
      console.error('transactions fetch failed', error);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const txns = useMemo(() => rows.map(mapRow), [rows]);

  const addTransaction = useCallback(async ({
    kind, category_id, amount, title, note, occurred_at,
  }) => {
    if (!user) return { error: new Error('not signed in') };
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
    if (!error && data) {
      setRows(prev => [data, ...prev]);
    }
    return { data, error };
  }, [user]);

  const removeTransaction = useCallback(async (id) => {
    if (!user) return { error: new Error('not signed in') };
    const { error } = await transactionsApi.deleteTransactionRow(user.id, id);
    if (!error) setRows(prev => prev.filter(r => r.id !== id));
    return { error };
  }, [user]);

  return { txns, loading, refetch, addTransaction, removeTransaction };
}
