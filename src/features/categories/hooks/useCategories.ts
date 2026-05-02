import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as categoriesApi from '@/features/categories/api/categories';
import { useAuth } from '@/features/auth/components/AuthContext';
import { sanitizeCategoryIcon, CATEGORY_TINTS } from '@/features/categories/utils/constants';
import type { CategoryRow } from '@/features/categories/types';
import type { TransactionKind } from '@/types/ledger';
import { queryKeys } from '@/shared/lib/queryKeys';

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

export type CategoryLists = { expense: CategoryRow[]; income: CategoryRow[]; transfer: CategoryRow[] };

export function useCategories() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: userId ? queryKeys.categories(userId) : ['categories', 'idle'],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await categoriesApi.listCategories(userId!);
      if (error) throw error;
      return ((data as CategoryRow[]) || []) as CategoryRow[];
    },
  });

  const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const invalidate = useCallback(() => {
    if (userId) void qc.invalidateQueries({ queryKey: [...queryKeys.categories(userId)] });
  }, [qc, userId]);

  const addMutation = useMutation({
    mutationFn: async (row: Parameters<typeof categoriesApi.insertCategory>[0]) => {
      const out = await categoriesApi.insertCategory(row);
      if (out.error) throw out.error;
      return out.data;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      uid,
      id,
      patch,
    }: {
      uid: string;
      id: string;
      patch: categoriesApi.CategoryRowPatch;
    }) => {
      const out = await categoriesApi.updateCategoryRow(uid, id, patch);
      if (out.error) throw out.error;
      return out.data;
    },
    onSuccess: invalidate,
  });

  type ReorderPayload = { uid: string; updates: { id: string; sort_order: number }[] };

  const reorderMutation = useMutation({
    mutationFn: async ({ uid, updates }: ReorderPayload) => {
      for (const u of updates) {
        const out = await categoriesApi.updateCategoryRow(uid, u.id, { sort_order: u.sort_order });
        if (out.error) throw out.error;
      }
    },
    onMutate: async ({ uid, updates }) => {
      const key = queryKeys.categories(uid);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CategoryRow[]>(key);
      if (!previous) return { previous: undefined as CategoryRow[] | undefined };
      const orderById = new Map(updates.map((u) => [u.id, u.sort_order]));
      qc.setQueryData(
        key,
        previous.map((row) => {
          const so = orderById.get(row.id);
          return so !== undefined ? { ...row, sort_order: so } : row;
        }),
      );
      return { previous };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.previous && vars) qc.setQueryData(queryKeys.categories(vars.uid), ctx.previous);
    },
    onSettled: (_d, _e, vars) => {
      if (vars) void qc.invalidateQueries({ queryKey: queryKeys.categories(vars.uid) });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ uid, id }: { uid: string; id: string }) => {
      const out = await categoriesApi.deleteCategoryRow(uid, id);
      if (out.error) throw out.error;
    },
    onSuccess: invalidate,
  });

  const { catsExpense, catsIncome, catsTransfer } = useMemo(() => {
    const expense = rows.filter((r) => rowKind(r) === 'expense').sort(compareCats);
    const income = rows.filter((r) => rowKind(r) === 'income').sort(compareCats);
    const transfer = rows.filter((r) => rowKind(r) === 'transfer').sort(compareCats);
    return { catsExpense: expense, catsIncome: income, catsTransfer: transfer };
  }, [rows]);

  const lists = useMemo<CategoryLists>(
    () => ({ expense: catsExpense, income: catsIncome, transfer: catsTransfer }),
    [catsExpense, catsIncome, catsTransfer],
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
      const list =
        kind === 'income' ? catsIncome : kind === 'transfer' ? catsTransfer : catsExpense;
      return (
        list[list.length - 1] || { ...FALLBACK_CAT, kind: (kind as TransactionKind) || 'expense' }
      );
    },
    [byId, catsExpense, catsIncome, catsTransfer],
  );

  const addCategory = useCallback(
    async (kind: TransactionKind, label: string, icon = 'dots') => {
      if (!userId) return { error: new Error('not signed in') as Error, data: null };
      const t = (label || '').trim();
      if (!t || (kind !== 'expense' && kind !== 'income' && kind !== 'transfer')) {
        return { error: new Error('invalid input'), data: null };
      }
      const list = kind === 'expense' ? catsExpense : kind === 'income' ? catsIncome : catsTransfer;
      const sort_order = list.length ? Math.max(...list.map((c) => c.sort_order)) + 1 : 0;
      const tint = CATEGORY_TINTS[list.length % CATEGORY_TINTS.length]!;
      const ic = sanitizeCategoryIcon(icon);
      try {
        const data = await addMutation.mutateAsync({
          user_id: userId,
          kind,
          label: t,
          icon: ic,
          tint,
          sort_order,
        });
        return { data, error: null as null };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
    [userId, catsExpense, catsIncome, catsTransfer, addMutation],
  );

  const updateCategory = useCallback(
    async (_kind: TransactionKind, id: string, patch: { label: string; icon: string }) => {
      if (!userId) return { error: new Error('not signed in') as Error, data: null };
      const t = (patch.label ?? '').trim();
      if (!t) return { error: new Error('label required'), data: null };
      const rowPatch = { label: t, icon: sanitizeCategoryIcon(patch.icon) };
      try {
        const data = await updateMutation.mutateAsync({ uid: userId, id, patch: rowPatch });
        return { data, error: null as null };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
    [userId, updateMutation],
  );

  const reorderCategory = useCallback(
    async (kind: TransactionKind, id: string, direction: 'up' | 'down') => {
      if (!userId) return { error: new Error('not signed in') as Error };
      const key = queryKeys.categories(userId);
      const all = qc.getQueryData<CategoryRow[]>(key);
      if (!all) return { error: new Error('Categories not loaded') };
      const slice = all.filter((r) => rowKind(r) === kind).sort(compareCats);
      const idx = slice.findIndex((c) => c.id === id);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= slice.length) return { error: undefined };

      const reordered = [...slice];
      const tmp = reordered[idx]!;
      reordered[idx] = reordered[swapIdx]!;
      reordered[swapIdx] = tmp;

      const prevOrder = new Map(slice.map((r) => [r.id, r.sort_order]));
      const updates = reordered
        .map((row, i) => ({ id: row.id, sort_order: i }))
        .filter((u) => prevOrder.get(u.id) !== u.sort_order);

      if (updates.length === 0) return { error: undefined };

      try {
        await reorderMutation.mutateAsync({ uid: userId, updates });
        return { error: undefined };
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
    [userId, qc, reorderMutation],
  );

  const removeCategory = useCallback(
    async (_kind: TransactionKind, id: string) => {
      if (!userId) return { error: new Error('not signed in') as Error };
      try {
        await removeMutation.mutateAsync({ uid: userId, id });
        return { error: undefined };
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
    [userId, removeMutation],
  );

  return {
    catsExpense,
    catsIncome,
    catsTransfer,
    lists,
    loading: listQuery.isPending,
    reordering: reorderMutation.isPending,
    error:
      listQuery.error instanceof Error
        ? listQuery.error.message
        : listQuery.error
          ? String(listQuery.error)
          : null,
    resolveCat,
    refetch: listQuery.refetch,
    addCategory,
    updateCategory,
    reorderCategory,
    removeCategory,
  };
}
