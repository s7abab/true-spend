/** Monday 00:00 local for the calendar week containing `d`. */
export function mondayStart(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** `[weekStart, weekEnd)` where week is Mon–Sun, `weekOffset` shifts by whole weeks. */
export function weekRangeMonday(weekOffset = 0, anchor = new Date()) {
  const start = mondayStart(anchor);
  start.setDate(start.getDate() + weekOffset * 7);
  const end = addDays(start, 7);
  return [start, end];
}

function txnTime(txn) {
  return txn.occurredDate instanceof Date
    ? txn.occurredDate.getTime()
    : new Date(txn.occurred_at || 0).getTime();
}

/** Seven numbers (Mon..Sun) for expense in that week. */
export function expenseBucketsForWeek(txns, weekOffset = 0, anchor = new Date()) {
  const [weekStart, weekEnd] = weekRangeMonday(weekOffset, anchor);
  const startMs = weekStart.getTime();
  const endMs = weekEnd.getTime();
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  for (const t of txns) {
    if (t.kind !== 'expense') continue;
    const ts = txnTime(t);
    if (ts < startMs || ts >= endMs) continue;
    const od = t.occurredDate instanceof Date ? t.occurredDate : new Date(t.occurred_at);
    const dayStart = new Date(od);
    dayStart.setHours(0, 0, 0, 0);
    const idx = Math.floor((dayStart - weekStart) / 86400000);
    if (idx >= 0 && idx < 7) buckets[idx] += Number(t.amount) || 0;
  }
  return buckets;
}

export function sumExpensesInWeek(txns, weekOffset = 0, anchor = new Date()) {
  return expenseBucketsForWeek(txns, weekOffset, anchor).reduce((a, b) => a + b, 0);
}

/** Index 0..6 of today within the current Mon–Sun week, or -1 if anchor week differs. */
export function todayIndexInWeek(anchor = new Date()) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mon = mondayStart(anchor);
  mon.setHours(0, 0, 0, 0);
  const idx = Math.round((today - mon) / 86400000);
  return idx >= 0 && idx < 7 ? idx : -1;
}

/** 0..6 = Mon..Sun for today in the current calendar week. */
export function todayIndexInCurrentWeek() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mon = mondayStart(today);
  return Math.floor((today - mon) / 86400000);
}

export function weekOverWeekLabel(thisTotal, prevTotal) {
  if (thisTotal <= 0 && prevTotal <= 0) return { text: 'No spend yet', tone: 'muted' };
  if (prevTotal <= 0 && thisTotal > 0) return { text: 'New this week', tone: 'good' };
  const pct = ((thisTotal - prevTotal) / prevTotal) * 100;
  const abs = Math.abs(pct).toFixed(0);
  if (pct < 0) return { text: `${abs}% less`, tone: 'good' };
  if (pct > 0) return { text: `${abs}% more`, tone: 'warn' };
  return { text: 'Same as last week', tone: 'muted' };
}
