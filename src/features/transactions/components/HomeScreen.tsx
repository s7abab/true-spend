import { useMemo } from 'react';
import { IArrowDown, IArrowUp, ICTrend, IPlus, CatIcon } from '@/shared/components/Icons';
import { CountUp } from '@/shared/components/CountUp';
import { formatMoney } from '@/utils/money';
import { weekOverWeekLabel, todayIndexInCurrentWeek } from '@/utils/spending';
import type { CategoryRow } from '@/features/categories/types';
import type { TransactionKind } from '@/types/ledger';
import type { MappedTxn } from '@/utils/txnMap';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type ResolveCat = (id: string | null, kind: TransactionKind | string | undefined) => CategoryRow;

function TxnRow({ txn, resolveCat, currency }: { txn: MappedTxn; resolveCat: ResolveCat; currency: string }) {
  const cat = resolveCat(txn.cat, txn.kind);
  const isInc = txn.kind === 'income';
  const amt = formatMoney(txn.amount, currency);
  return (
    <div className="txn-row">
      <div className="txn-icon" style={{ background: `${cat.tint}18`, color: cat.tint }}>
        <CatIcon cat={cat} size={44} radius={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="txn-name"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {txn.title}
        </div>
        <div className="txn-time">{txn.time}</div>
      </div>
      <div className="txn-amount" style={{ color: isInc ? '#22A06B' : '#0F0F12' }}>
        {isInc ? '+' : '−'}
        {amt}
      </div>
    </div>
  );
}

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

  const maxSpark = Math.max(...weekBuckets, 1);
  const todayIdx = todayIndexInCurrentWeek();

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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 600,
            }}
          >
            <IPlus size={12} stroke={2.5} /> {monthShort}
          </div>
        </div>
        <div className="balance-amount" style={{ position: 'relative', zIndex: 1 }}>
          <CountUp value={balance} currency={currency} />
        </div>
        <div className="balance-pills">
          <div className="balance-pill">
            <div className="balance-pill-icon">
              <IArrowDown size={14} stroke={2.2} />
            </div>
            <div>
              <div className="balance-pill-label">Income</div>
              <div className="balance-pill-value">{formatMoney(income, currency)}</div>
            </div>
          </div>
          <div className="balance-pill">
            <div className="balance-pill-icon">
              <IArrowUp size={14} stroke={2.2} />
            </div>
            <div>
              <div className="balance-pill-label">Spent</div>
              <div className="balance-pill-value">{formatMoney(expense, currency)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="week-card">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: '#ACACB8', fontWeight: 500 }}>This week</div>
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
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 72 }}>
          {weekBuckets.map((v, i) => {
            const h = maxSpark > 0 ? Math.max(8, (v / maxSpark) * 54) : 8;
            const active = i === todayIdx;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${h}px`,
                    background: active ? '#0F0F12' : '#EBEBF0',
                    borderRadius: '5px 5px 3px 3px',
                  }}
                />
                <div
                  style={{
                    fontSize: 10,
                    color: active ? '#0F0F12' : '#ACACB8',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {DAYS[i]}
                </div>
              </div>
            );
          })}
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
        {recentTxns.map((t) => (
          <TxnRow key={t.id} txn={t} resolveCat={resolveCat} currency={currency} />
        ))}
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
