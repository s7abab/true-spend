import { useEffect, useState } from 'react';
import { CATEGORIES_EXPENSE, CATEGORIES_INCOME, sanitizeCategoryIcon } from '../data/categories';

const LS_KEY = 'truspend-custom-cats';

const TINTS = ['#7C5CFF', '#22C2A4', '#FF7A59', '#0EA5C7', '#F5B400', '#FF5C8A', '#5B7FFF'];

const EMPTY = () => ({
  expense: [],
  income: [],
  overrides: { expense: {}, income: {} },
});

function migrateOverrides(raw) {
  if (!raw || typeof raw !== 'object') return { expense: {}, income: {} };
  const out = { expense: {}, income: {} };
  for (const kind of ['expense', 'income']) {
    const src = raw[kind];
    if (!src || typeof src !== 'object') continue;
    for (const [id, val] of Object.entries(src)) {
      if (typeof val === 'string') out[kind][id] = { label: val };
      else if (val && typeof val === 'object') out[kind][id] = { ...val };
    }
  }
  return out;
}

function read() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return EMPTY();
    const p = JSON.parse(raw);
    return {
      expense: Array.isArray(p.expense) ? p.expense : [],
      income: Array.isArray(p.income) ? p.income : [],
      overrides: migrateOverrides(p.overrides),
    };
  } catch {
    return EMPTY();
  }
}

function builtInOverridePatch(base, label, icon) {
  const t = label.trim();
  const ic = sanitizeCategoryIcon(icon);
  const patch = {};
  if (t !== base.label) patch.label = t;
  if (ic !== base.icon) patch.icon = ic;
  return Object.keys(patch).length ? patch : null;
}

export function useCustomCategories() {
  const [store, setStore] = useState(read);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  }, [store]);

  const addCategory = (kind, label, icon = 'dots') => {
    const t = label.trim();
    if (!t || (kind !== 'expense' && kind !== 'income')) return;
    const id = 'c' + Date.now();
    const n = store[kind].length;
    const ic = sanitizeCategoryIcon(icon);
    const cat = { id, label: t, icon: ic, tint: TINTS[n % TINTS.length] };
    setStore(prev => ({ ...prev, [kind]: [...prev[kind], cat] }));
  };

  const removeCategory = (kind, id) => {
    if (kind !== 'expense' && kind !== 'income') return;
    setStore(prev => ({ ...prev, [kind]: prev[kind].filter(c => c.id !== id) }));
  };

  const updateCategory = (kind, id, { label, icon }) => {
    if (kind !== 'expense' && kind !== 'income') return;
    const t = (label ?? '').trim();
    if (!t) return;
    const baseList = kind === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;
    const base = baseList.find(b => b.id === id);
    if (base) {
      const patch = builtInOverridePatch(base, t, icon);
      setStore(prev => {
        const o = { ...prev.overrides[kind] };
        if (patch == null) delete o[id];
        else o[id] = patch;
        return { ...prev, overrides: { ...prev.overrides, [kind]: o } };
      });
      return;
    }
    const ic = sanitizeCategoryIcon(icon);
    setStore(prev => ({
      ...prev,
      [kind]: prev[kind].map(c => (c.id === id ? { ...c, label: t, icon: ic } : c)),
    }));
  };

  return {
    custom: { expense: store.expense, income: store.income },
    overrides: store.overrides,
    addCategory,
    removeCategory,
    updateCategory,
  };
}
