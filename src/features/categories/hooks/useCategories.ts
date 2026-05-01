import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as categoriesApi from '@/features/categories/api/categories';
import { useAuth } from '@/features/auth/components/AuthContext';
import { sanitizeCategoryIcon, CATEGORY_TINTS } from '@/features/categories/utils/constants';
import type { CategoryRow } from '@/features/categories/types';
import type { TransactionKind } from '@/types/ledger';

const FALLBACK_CAT: CategoryRow = {
  id: '__fallback__',
  label: 'Other',
  icon: 'dots',
  tint: '#7A7A86',
  kind: 'expense',
  sort_order: 0,
  is_archived: false,
};

function rowKind(r: CategoryRow): string {
  return String(r?.kind ?? '').toLowerCase();
}

function compareCats(a: CategoryRow, b: CategoryRow): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return (a.label || '').localeCompare(b.label || '');
}

function errMessage(e: unknown): string {
  if (!e) return 'Something went wrong';
  if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as Error).message === 'string' && (e as Error).message) {
    return (e as Error).message;
  }
  return String(e);
}

export type CategoryLists = { expense: CategoryRow[]; income: CategoryRow[] };

export function useCategories() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const rowsRef = useRef(rows);
  const lastOkUserIdRef = useRef<string | null>(null);
  rowsRef.current = rows;

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
      setRows((data as CategoryRow[]) || []);
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
    void load();
  }, [load]);

  const { catsExpense, catsIncome } = useMemo(() => {
    const expense = rows.filter((r) => rowKind(r) === 'expense').sort(compareCats);
    const income = rows.filter((r) => rowKind(r) === 'income').sort(compareCats);
    return { catsExpense: expense, catsIncome: income };
  }, [rows]);

  const lists = useMemo<CategoryLists>(
    () => ({ expense: catsExpense, income: catsIncome }),
    [catsExpense, catsIncome],
  );

  const byId = useMemo(() => {
    const m = new Map<string, CategoryRow>();
    rows.forEach((r) => m.set(r.id, r));
    return m;
  }, [rows]);

  const resolveCat = useCallback(
    (id: string | null, kind: TransactionKind | string | undefined) => {
      if (id) {
        const found = byId.get(id);
        if (found) return found;
      }
      const list = kind === 'income' ? catsIncome : catsExpense;
      return list[list.length - 1] || { ...FALLBACK_CAT, kind: (kind as TransactionKind) || 'expense' };
    },
    [byId, catsExpense, catsIncome],
  );

  const addCategory = useCallback(
    async (kind: TransactionKind, label: string, icon = 'dots') => {
      if (!userId) return { error: new Error('not signed in') as Error, data: null };
      const t = (label || '').trim();
      if (!t || (kind !== 'expense' && kind !== 'income')) {
        return { error: new Error('invalid input'), data: null };
      }
      const list = kind === 'expense' ? catsExpense : catsIncome;
      const sort_order = list.length ? Math.max(...list.map((c) => c.sort_order)) + 1 : 0;
      const tint = CATEGORY_TINTS[list.length % CATEGORY_TINTS.length]!;
      const ic = sanitizeCategoryIcon(icon);
      const { data, error } = await categoriesApi.insertCategory({
        user_id: userId,
        kind,
        label: t,
        icon: ic,
        tint,
        sort_order,
      });
      if (!error && data) setRows((prev) => [...prev, data as CategoryRow]);
      return { data, error };
    },
    [userId, catsExpense, catsIncome],
  );

  const updateCategory = useCallback(
    async (kind: TransactionKind, id: string, patch: { label: string; icon: string }) => {
      if (!userId) return { error: new Error('not signed in') as Error, data: null };
      const t = (patch.label ?? '').trim();
      if (!t) return { error: new Error('label required'), data: null };
      const rowPatch = { label: t, icon: sanitizeCategoryIcon(patch.icon) };
      const { data, error } = await categoriesApi.updateCategoryRow(userId, id, rowPatch);
      if (!error && data) {
        setRows((prev) => prev.map((r) => (r.id === id ? (data as CategoryRow) : r)));
      }
      return { data, error };
    },
    [userId],
  );

  const removeCategory = useCallback(
    async (_kind: TransactionKind, id: string) => {
      if (!userId) return { error: new Error('not signed in') as Error };
      const { error } = await categoriesApi.deleteCategoryRow(userId, id);
      if (!error) setRows((prev) => prev.filter((r) => r.id !== id));
      return { error };
    },
    [userId],
  );

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
