/**
 * Render a friendly relative label for a Date — "Today", "Yesterday", or
 * "Apr 25" style fallback. Used everywhere transactions are listed.
 */
export function formatDateLabel(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayOnly = new Date(d);
  dayOnly.setHours(0, 0, 0, 0);
  if (dayOnly.getTime() === today.getTime()) return 'Today';
  if (dayOnly.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
