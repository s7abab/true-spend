import { formatDateLabel } from '@/utils/dateLabel';
import type { MappedTxn } from '@/utils/txnMap';

/** Stable `YYYY-MM-DD` in local calendar for grouping. */
export function dayKeyFromTxn(txn: MappedTxn): string {
  const d =
    txn.occurredDate instanceof Date ? txn.occurredDate : new Date(txn.occurred_at || 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function headerForDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(12, 0, 0, 0);
  return formatDateLabel(dt);
}

function txnTime(t: MappedTxn): number {
  return t.occurredDate instanceof Date
    ? t.occurredDate.getTime()
    : new Date(t.occurred_at || 0).getTime();
}

export type DayGroup = { dayKey: string; header: string; list: MappedTxn[] };

/** Groups by calendar day, newest day first; within each day, newest first. */
export function groupTxnsByDay(txns: MappedTxn[]): DayGroup[] {
  const map = new Map<string, MappedTxn[]>();
  for (const t of txns) {
    const k = dayKeyFromTxn(t);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
  return keys.map((k) => {
    const list = map.get(k)!.slice().sort((a, b) => txnTime(b) - txnTime(a));
    return { dayKey: k, header: headerForDayKey(k), list };
  });
}
