import { useMemo } from 'react';
import { IArrowDown, IArrowUp, ICTrend, ICalendar } from '@/shared/components/Icons';
import { TxnRow } from '@/shared/components/TxnRow';
import { formatMoney } from '@/utils/money';
import { weekOverWeekLabel, todayIndexInCurrentWeek } from '@/utils/spending';
import type { CategoryRow } from '@/features/categories/types';
import type { TransactionKind } from '@/types/ledger';
import type { MappedTxn } from '@/utils/txnMap';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

// Two-char labels so Tue/Thu and Sat/Sun are distinguishable
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

type ResolveCat = (id: string | null, kind: TransactionKind | string | undefined) => CategoryRow;

export type HomeScreenProps = {
  income: number;
  expense: number;
  weekBuckets: number[];
  prevWeekExpense: number;
  recentTxns: MappedTxn[];
  accent?: string;
  resolveCat: ResolveCat;
  currency?: string;
  onSeeAll: () => void;
  onTxnPress?: (txn: MappedTxn) => void;
};

export function HomeScreen({
  income,
  expense,
  weekBuckets,
  prevWeekExpense,
  recentTxns,
  accent = '#0F0F12',
  resolveCat,
  currency = 'INR',
  onSeeAll,
  onTxnPress,
}: HomeScreenProps) {
  const balance = income - expense;

  const monthShort = useMemo(
    () => new Date().toLocaleDateString('en-IN', { month: 'short' }),
    [],
  );

  const { weekTotal, badge } = useMemo(() => {
    const total = weekBuckets.reduce((a, b) => a + b, 0);
    const lbl = weekOverWeekLabel(total, prevWeekExpense);
    return { weekTotal: total, badge: lbl };
  }, [weekBuckets, prevWeekExpense]);

  const todayIdx = todayIndexInCurrentWeek();
  const weeklyChartData = useMemo(
    () =>
      DAYS.map((day, idx) => ({
        day,
        amount: weekBuckets[idx] ?? 0,
      })),
    [weekBuckets],
  );

  const badgeStyle =
    badge.tone === 'good'
      ? { background: '#22A06B14', color: '#22A06B' }
      : badge.tone === 'warn'
        ? { background: '#FF4D6D14', color: '#FF4D6D' }
        : { background: '#F4F5F7', color: '#ACACB8' };

  return (
    <div style={{ paddingTop: 0 }}>
      <div className="balance-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div className="balance-label">Total Balance</div>
          {/* Month badge — calendar icon so it's clearly informational, not a button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 600,
            }}
          >
            <ICalendar size={12} stroke={2} />
            {monthShort}
          </div>
        </div>
        <div className="balance-amount" style={{ position: 'relative', zIndex: 1 }}>
          {formatMoney(balance, currency)}
        </div>
        <div className="balance-pills">
          {/* Income: arrow pointing UP (money coming in) */}
          <div className="balance-pill">
            <div className="balance-pill-icon">
              <IArrowUp size={14} stroke={2.2} />
            </div>
            <div>
              <div className="balance-pill-label">Income · all time</div>
              <div className="balance-pill-value">{formatMoney(income, currency)}</div>
            </div>
          </div>
          {/* Spent: arrow pointing DOWN (money going out) */}
          <div className="balance-pill">
            <div className="balance-pill-icon">
              <IArrowDown size={14} stroke={2.2} />
            </div>
            <div>
              <div className="balance-pill-label">Spent · all time</div>
              <div className="balance-pill-value">{formatMoney(expense, currency)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="week-card">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: '#ACACB8', fontWeight: 500 }}>This week spent</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, marginTop: 2 }}>
              {formatMoney(weekTotal, currency)}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 700,
              padding: '5px 10px',
              borderRadius: 999,
              ...badgeStyle,
            }}
          >
            <ICTrend size={13} /> {badge.text}
          </div>
        </div>
        <div style={{ height: 96 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyChartData} margin={{ top: 6, right: 2, left: 2, bottom: 0 }}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={({ x, y, payload }) => {
                  const active = payload.value === DAYS[todayIdx];
                  return (
                    <text
                      x={Number(x)}
                      y={Number(y) + 12}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={active ? 700 : 500}
                      fill={active ? '#0F0F12' : '#ACACB8'}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(15,15,18,0.03)' }}
                formatter={(value) => [formatMoney(Number(value ?? 0), currency), 'Expense']}
                contentStyle={{
                  border: 'none',
                  borderRadius: 10,
                  boxShadow: '0 10px 24px rgba(15,15,18,0.12)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0F0F12',
                }}
              />
              <Bar dataKey="amount" radius={[6, 6, 3, 3]} barSize={18} minPointSize={8}>
                {weeklyChartData.map((entry) => (
                  <Cell key={entry.day} fill={entry.day === DAYS[todayIdx] ? '#0F0F12' : '#EBEBF0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ margin: '20px 16px 0' }}>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>Recent</div>
          <button
            type="button"
            onClick={onSeeAll}
            style={{
              fontSize: 13,
              color: accent,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              fontFamily: 'inherit',
              padding: 0,
            }}
          >
            See all
          </button>
        </div>
      </div>
      <div style={{ margin: '0 16px', background: '#fff', borderRadius: 20, overflow: 'hidden' }}>
        {recentTxns.length === 0 ? (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              color: '#ACACB8',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            No transactions yet — tap + to add your first
          </div>
        ) : (
          recentTxns.map((t) => (
            <TxnRow
              key={t.id}
              txn={t}
              resolveCat={resolveCat}
              currency={currency}
              onPress={onTxnPress ? () => onTxnPress(t) : undefined}
            />
          ))
        )}
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
