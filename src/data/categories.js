export const CATEGORIES_EXPENSE = [
  { id: 'food',     label: 'Food',      icon: 'coffee',    tint: '#FF7A59' },
  { id: 'shopping', label: 'Shopping',  icon: 'cart',      tint: '#7C5CFF' },
  { id: 'transit',  label: 'Transit',   icon: 'car',       tint: '#22C2A4' },
  { id: 'fun',      label: 'Fun',       icon: 'film',      tint: '#FF5C8A' },
  { id: 'rent',     label: 'Rent',      icon: 'home2',     tint: '#5B7FFF' },
  { id: 'bills',    label: 'Bills',     icon: 'zap',       tint: '#F5B400' },
  { id: 'health',   label: 'Health',    icon: 'heart',     tint: '#FF4D6D' },
  { id: 'gifts',    label: 'Gifts',     icon: 'gift',      tint: '#A56BFF' },
  { id: 'edu',      label: 'Education', icon: 'book',      tint: '#0EA5C7' },
  { id: 'other',    label: 'Other',     icon: 'dots',      tint: '#7A7A86' },
];

export const CATEGORIES_INCOME = [
  { id: 'salary',    label: 'Salary',     icon: 'briefcase', tint: '#22C55E' },
  { id: 'freelance', label: 'Freelance',  icon: 'trend',     tint: '#7C5CFF' },
  { id: 'gift_in',   label: 'Gift',       icon: 'gift',      tint: '#FF5C8A' },
  { id: 'invest',    label: 'Investment', icon: 'trend',     tint: '#0EA5C7' },
  { id: 'other_in',  label: 'Other',      icon: 'dots',      tint: '#7A7A86' },
];

/** Icons users can assign in Categories (subset of ICON_MAP keys) */
export const CATEGORY_ICON_PICKER_KEYS = [
  'coffee', 'cart', 'car', 'film', 'home2', 'zap', 'heart', 'gift', 'book', 'briefcase', 'trend', 'dots',
];

export function sanitizeCategoryIcon(icon) {
  const k = icon && typeof icon === 'string' ? icon : 'dots';
  return CATEGORY_ICON_PICKER_KEYS.includes(k) ? k : 'dots';
}

/** Override value: legacy string = label only, or { label?, icon? } */
export function normalizeCategoryOverride(val) {
  if (val == null || val === '') return {};
  if (typeof val === 'string') return { label: val };
  if (typeof val !== 'object') return {};
  const o = {};
  if (typeof val.label === 'string') o.label = val.label;
  if (typeof val.icon === 'string') o.icon = val.icon;
  return o;
}

function applyBuiltInOverride(base, rawOverride) {
  const o = normalizeCategoryOverride(rawOverride);
  return {
    ...base,
    label: o.label ?? base.label,
    icon: o.icon != null && o.icon !== '' ? sanitizeCategoryIcon(o.icon) : base.icon,
    isCustom: false,
  };
}

export const SEED_TXNS = [
  { id: 't1', kind: 'expense', cat: 'food',     title: 'Blue Tokai Coffee', amount: 320,   time: 'Today' },
  { id: 't2', kind: 'expense', cat: 'transit',  title: 'Uber to office',    amount: 184,   time: 'Today' },
  { id: 't3', kind: 'income',  cat: 'freelance',title: 'Design retainer',   amount: 18000, time: 'Yesterday' },
  { id: 't4', kind: 'expense', cat: 'shopping', title: 'Zara — t-shirts',   amount: 2499,  time: 'Yesterday' },
  { id: 't5', kind: 'expense', cat: 'fun',      title: 'PVR — Dune 2',      amount: 480,   time: 'Apr 28' },
  { id: 't6', kind: 'expense', cat: 'bills',    title: 'Airtel postpaid',   amount: 749,   time: 'Apr 27' },
  { id: 't7', kind: 'income',  cat: 'salary',   title: 'Monthly salary',    amount: 92000, time: 'Apr 25' },
  { id: 't8', kind: 'expense', cat: 'food',     title: 'Swiggy — dinner',   amount: 612,   time: 'Apr 25' },
];

export function mergeExpenseDisplay(customExpense = [], overridesExpense = {}) {
  return [
    ...CATEGORIES_EXPENSE.map(c => applyBuiltInOverride(c, overridesExpense[c.id])),
    ...customExpense.map(c => ({
      ...c,
      icon: sanitizeCategoryIcon(c.icon),
      isCustom: true,
    })),
  ];
}

export function mergeIncomeDisplay(customIncome = [], overridesIncome = {}) {
  return [
    ...CATEGORIES_INCOME.map(c => applyBuiltInOverride(c, overridesIncome[c.id])),
    ...customIncome.map(c => ({
      ...c,
      icon: sanitizeCategoryIcon(c.icon),
      isCustom: true,
    })),
  ];
}

export function findCatWith(
  id,
  kind,
  customExpense = [],
  customIncome = [],
  overridesExpense = {},
  overridesIncome = {},
) {
  const list =
    kind === 'income'
      ? mergeIncomeDisplay(customIncome, overridesIncome)
      : mergeExpenseDisplay(customExpense, overridesExpense);
  return list.find(c => c.id === id) || list[list.length - 1];
}

export function findCat(id, kind) {
  return findCatWith(id, kind, [], [], {}, {});
}

export function defaultLabelFor(id, kind) {
  const base = kind === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;
  return base.find(c => c.id === id)?.label ?? '';
}

export function defaultIconFor(id, kind) {
  const base = kind === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;
  return base.find(c => c.id === id)?.icon ?? 'dots';
}

export const fmtINR = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
