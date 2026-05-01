import { useCallback, useEffect, useMemo, useState } from 'react';
import * as categoriesApi from '../api/categories';
import { useAuth } from '../context/AuthContext';
import { sanitizeCategoryIcon, CATEGORY_TINTS } from '../data/categories';

const FALLBACK_CAT = {
  id: null,
  label: 'Other',
  icon: 'dots',
  tint: '#7A7A86',
  kind: 'expense',
};

function compareCats(a, b) {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return (a.label || '').localeCompare(b.label || '');
}

export function useCategories() {
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
    const { data, error } = await categoriesApi.listCategories(user.id);
    if (error) {
      console.error('categories fetch failed', error);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const { catsExpense, catsIncome } = useMemo(() => {
    const expense = rows.filter(r => r.kind === 'expense').sort(compareCats);
    const income  = rows.filter(r => r.kind === 'income').sort(compareCats);
    return { catsExpense: expense, catsIncome: income };
  }, [rows]);

  const lists = useMemo(
    () => ({ expense: catsExpense, income: catsIncome }),
    [catsExpense, catsIncome],
  );

  const byId = useMemo(() => {
    const m = new Map();
    rows.forEach(r => m.set(r.id, r));
    return m;
  }, [rows]);

  const resolveCat = useCallback(
    (id, kind) => {
      const found = byId.get(id);
      if (found) return found;
      const list = kind === 'income' ? catsIncome : catsExpense;
      return list[list.length - 1] || { ...FALLBACK_CAT, kind: kind || 'expense' };
    },
    [byId, catsExpense, catsIncome],
  );

  const addCategory = useCallback(async (kind, label, icon = 'dots') => {
    if (!user) return { error: new Error('not signed in') };
    const t = (label || '').trim();
    if (!t || (kind !== 'expense' && kind !== 'income')) {
      return { error: new Error('invalid input') };
    }
    const list = kind === 'expense' ? catsExpense : catsIncome;
    const sort_order = list.length
      ? Math.max(...list.map(c => c.sort_order)) + 1
      : 0;
    const tint = CATEGORY_TINTS[list.length % CATEGORY_TINTS.length];
    const ic = sanitizeCategoryIcon(icon);
    const { data, error } = await categoriesApi.insertCategory({
      user_id: user.id,
      kind,
      label: t,
      icon: ic,
      tint,
      sort_order,
    });
    if (!error && data) setRows(prev => [...prev, data]);
    return { data, error };
  }, [user, catsExpense, catsIncome]);

  const updateCategory = useCallback(async (kind, id, { label, icon }) => {
    if (!user) return { error: new Error('not signed in') };
    const t = (label ?? '').trim();
    if (!t) return { error: new Error('label required') };
    const patch = { label: t, icon: sanitizeCategoryIcon(icon) };
    const { data, error } = await categoriesApi.updateCategoryRow(user.id, id, patch);
    if (!error && data) {
      setRows(prev => prev.map(r => (r.id === id ? data : r)));
    }
    return { data, error };
  }, [user]);

  const removeCategory = useCallback(async (kind, id) => {
    if (!user) return { error: new Error('not signed in') };
    const { error } = await categoriesApi.deleteCategoryRow(user.id, id);
    if (!error) setRows(prev => prev.filter(r => r.id !== id));
    return { error };
  }, [user]);

  return {
    catsExpense,
    catsIncome,
    lists,
    loading,
    resolveCat,
    refetch,
    addCategory,
    updateCategory,
    removeCategory,
  };
}
