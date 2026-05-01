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

export function findCat(id, kind) {
  const list = kind === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;
  return list.find(c => c.id === id) || list[list.length - 1];
}

export const fmtINR = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
