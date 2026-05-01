import { weekRangeMonday } from '@/utils/spending';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

export type PeriodId = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type PeriodWindow = {
  start: Date;
  end: Date;
  label: string;
  sub: string;
};

export function getPeriodWindow(period: PeriodId, offset: number, now = new Date()): PeriodWindow {
  if (period === 'daily') {
    const start = startOfDay(now);
    start.setDate(start.getDate() + offset);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const sub = start.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    let label: string;
    if (offset === 0) label = 'Today';
    else if (offset === -1) label = 'Yesterday';
    else label = `${MONTHS[start.getMonth()]} ${start.getDate()}`;
    return { start, end, label, sub };
  }
  if (period === 'weekly') {
    const [start, end] = weekRangeMonday(offset, now);
    const lastDay = new Date(end);
    lastDay.setDate(lastDay.getDate() - 1);
    return {
      start,
      end,
      label:
        offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `${MONTHS[start.getMonth()]} ${start.getDate()}`,
      sub: `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[lastDay.getMonth()]} ${lastDay.getDate()}`,
    };
  }
  if (period === 'monthly') {
    const start = startOfMonth(now);
    start.setMonth(start.getMonth() + offset);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return {
      start,
      end,
      label: `${MONTHS[start.getMonth()]} ${start.getFullYear()}`,
      sub: offset === 0 ? 'This month' : offset === -1 ? 'Last month' : '',
    };
  }
  const start = startOfYear(now);
  start.setFullYear(start.getFullYear() + offset);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return {
    start,
    end,
    label: String(start.getFullYear()),
    sub: offset === 0 ? 'This year' : offset === -1 ? 'Last year' : '',
  };
}
