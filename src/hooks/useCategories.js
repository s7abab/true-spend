import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function rowKind(r) {
  return String(r?.kind ?? '').toLowerCase();
}

function compareCats(a, b) {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return (a.label || '').localeCompare(b.label || '');
}

function errMessage(e) {
  if (!e) return 'Something went wrong';
  if (typeof e.message === 'string' && e.message) return e.message;
  return String(e);
}

export function useCategories() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(null);
  const rowsRef = useRef(rows);
  const lastOkUserIdRef = useRef(null);
  rowsRef.current = rows;

  // Depend on userId only — Supabase often replaces `session.user` with a new object
  // reference on TOKEN_REFRESHED etc. Using `user` here retriggered fetch + setLoading(true)
  // on every auth tick, which kept the add FAB disabled even after categories loaded.
  //
  // Background refetch: if we already have rows for this user, do not flip `loading` back on
  // so the add button stays usable during retry / duplicate effect runs.
  const load = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      setError(null);
      lastOkUserIdRef.current = null;
      return;
    }
    const background = lastOkUserIdRef.current === userId && rowsRef.current.length > 0;
    if (!background) {
      setLoading(true);
      setRows([]);
    }
    setError(null);
    try {
      const { data, error: qErr } = await categoriesApi.listCategories(userId);
      if (qErr) throw qErr;
      setRows(data || []);
      lastOkUserIdRef.current = userId;
    } catch (e) {
      console.error('categories load', e);
      setRows([]);
      setError(errMessage(e));
      lastOkUserIdRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const { catsExpense, catsIncome } = useMemo(() => {
    const expense = rows.filter(r => rowKind(r) === 'expense').sort(compareCats);
    const income  = rows.filter(r => rowKind(r) === 'income').sort(compareCats);
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
    if (!userId) return { error: new Error('not signed in') };
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
      user_id: userId,
      kind,
      label: t,
      icon: ic,
      tint,
      sort_order,
    });
    if (!error && data) setRows(prev => [...prev, data]);
    return { data, error };
  }, [userId, catsExpense, catsIncome]);

  const updateCategory = useCallback(async (kind, id, { label, icon }) => {
    if (!userId) return { error: new Error('not signed in') };
    const t = (label ?? '').trim();
    if (!t) return { error: new Error('label required') };
    const patch = { label: t, icon: sanitizeCategoryIcon(icon) };
    const { data, error } = await categoriesApi.updateCategoryRow(userId, id, patch);
    if (!error && data) {
      setRows(prev => prev.map(r => (r.id === id ? data : r)));
    }
    return { data, error };
  }, [userId]);

  const removeCategory = useCallback(async (kind, id) => {
    if (!userId) return { error: new Error('not signed in') };
    const { error } = await categoriesApi.deleteCategoryRow(userId, id);
    if (!error) setRows(prev => prev.filter(r => r.id !== id));
    return { error };
  }, [userId]);

  return {
    catsExpense,
    catsIncome,
    lists,
    loading,
    error,
    resolveCat,
    refetch: load,
    addCategory,
    updateCategory,
    removeCategory,
  };
}
