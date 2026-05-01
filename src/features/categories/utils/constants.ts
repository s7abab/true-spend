import type { CategoryIconKey } from '@/features/categories/types';

/* Icons users can assign in Categories (subset of ICON_MAP keys). */
export const CATEGORY_ICON_PICKER_KEYS: CategoryIconKey[] = [
  'coffee',
  'cart',
  'car',
  'film',
  'home2',
  'zap',
  'heart',
  'gift',
  'book',
  'briefcase',
  'trend',
  'dots',
];

/* Tints rotated through when a user adds a brand-new category. */
export const CATEGORY_TINTS = [
  '#7C5CFF',
  '#22C2A4',
  '#FF7A59',
  '#0EA5C7',
  '#F5B400',
  '#FF5C8A',
  '#5B7FFF',
];

export function sanitizeCategoryIcon(icon: unknown): string {
  const k = icon && typeof icon === 'string' ? icon : 'dots';
  return CATEGORY_ICON_PICKER_KEYS.includes(k) ? k : 'dots';
}
