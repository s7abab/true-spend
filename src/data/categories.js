/* Icons users can assign in Categories (subset of ICON_MAP keys). */
export const CATEGORY_ICON_PICKER_KEYS = [
  'coffee', 'cart', 'car', 'film', 'home2', 'zap', 'heart', 'gift', 'book', 'briefcase', 'trend', 'dots',
];

/* Tints rotated through when a user adds a brand-new category. */
export const CATEGORY_TINTS = [
  '#7C5CFF', '#22C2A4', '#FF7A59', '#0EA5C7', '#F5B400', '#FF5C8A', '#5B7FFF',
];

export function sanitizeCategoryIcon(icon) {
  const k = icon && typeof icon === 'string' ? icon : 'dots';
  return CATEGORY_ICON_PICKER_KEYS.includes(k) ? k : 'dots';
}

/**
 * Render a friendly relative label for a Date — "Today", "Yesterday", or
 * "Apr 25" style fallback. Used everywhere transactions are listed.
 */
export function formatDateLabel(date) {
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const dayOnly = new Date(d); dayOnly.setHours(0, 0, 0, 0);
  if (dayOnly.getTime() === today.getTime())     return 'Today';
  if (dayOnly.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
