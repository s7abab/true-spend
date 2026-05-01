import { useMemo, useState } from 'react';
import { IChevLeft, IChevRight, CatIcon } from '../components/Icons';
import { formatMoney } from '../utils/money';
import { useStatsAggregates } from '../hooks/useStatsAggregates';
import { getPeriodWindow } from '../utils/periodWindows';

const PERIODS = [
  { id: 'daily',   label: 'Day' },
  { id: 'weekly',  label: 'Week' },
  { id: 'monthly', label: 'Month' },
  { id: 'yearly',  label: 'Year' },
];

export function StatsScreen({ categoriesExpense, currency = 'INR', refreshKey = 0 }) {
  const [period, setPeriod] = useState('monthly');
  const [offset, setOffset] = useState(0);

  const info = useMemo(() => getPeriodWindow(period, offset), [period, offset]);
  const { loading, aggRows, error: statsError } = useStatsAggregates(period, offset, refreshKey);

  const { totalSpent, sorted } = useMemo(() => {
    const total = aggRows.reduce((a, r) => a + Number(r.total), 0);
    const fallback = categoriesExpense.at(-1) || { id: '_other', label: 'Other', icon: 'dots', tint: '#7A7A86' };
    const rows = aggRows
      .map((r) => {
        const id = r.category_id;
        const cat = (id ? categoriesExpense.find(c => c.id === id) : null) || fallback;
        return { cat, amt: Number(r.total) || 0, rowKey: id || 'uncat' };
      })
      .filter(s => s.amt > 0)
      .sort((a, b) => b.amt - a.amt);
    return { totalSpent: Math.round(total), sorted: rows };
  }, [aggRows, categoriesExpense]);

  const denom = totalSpent || 1;
  let cum = 0;
  const R = 68, C = 2 * Math.PI * R;
  const segs = sorted.map(s => {
    const start = cum / denom; cum += s.amt;
    return { ...s, start, end: cum / denom };
  });

  const pidx = PERIODS.findIndex(p => p.id === period);

  return (
    <div>
      {/* period selector */}
      <div style={{ margin: '16px 16px 0', background: '#EBEBF0', borderRadius: 12, padding: 3, display: 'flex', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 3, bottom: 3,
          left: `calc(${pidx * 25}% + 3px)`, width: 'calc(25% - 3px)',
          background: '#fff', borderRadius: 9,
          boxShadow: '0 1px 4px rgba(0,0,0,0.09)',
          transition: 'left 250ms cubic-bezier(.2,.8,.2,1)',
        }} />
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => { setPeriod(p.id); setOffset(0); }} style={{
            flex: 1, position: 'relative', zIndex: 1,
            padding: '8px 0', border: 'none', background: 'transparent',
            fontSize: 13, fontWeight: 600,
            color: period === p.id ? '#0F0F12' : '#ACACB8', cursor: 'pointer',
          }}>{p.label}</button>
        ))}
      </div>

      {/* date pager */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 0' }}>
        <button onClick={() => setOffset(o => o - 1)} style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: 'none', display: 'grid', placeItems: 'center', color: '#0F0F12', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <IChevLeft size={16} />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>{info.label}</div>
          <div style={{ fontSize: 11, color: '#ACACB8', marginTop: 1 }}>{info.sub}</div>
        </div>
        <button onClick={() => setOffset(o => Math.min(0, o + 1))} disabled={offset >= 0}
          style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: 'none', display: 'grid', placeItems: 'center', color: '#0F0F12', opacity: offset >= 0 ? 0.35 : 1, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <IChevRight size={16} />
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '12px 0', color: '#ACACB8', fontSize: 13 }}>Loading report…</div>
      )}
      {statsError && (
        <div style={{ textAlign: 'center', padding: '8px 16px', color: '#FF4D6D', fontSize: 13 }}>{statsError}</div>
      )}

      {/* donut */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20, position: 'relative' }}>
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="100" cy="100" r={R} stroke="#F0F0F5" strokeWidth="24" fill="none" />
          {segs.map((s, i) => (
            <circle key={i} cx="100" cy="100" r={R}
              stroke={s.cat.tint} strokeWidth="24" fill="none"
              strokeDasharray={`${(s.end - s.start) * C} ${C}`}
              strokeDashoffset={-s.start * C} strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="donut-center">
          <div style={{ fontSize: 11, color: '#ACACB8', fontWeight: 500 }}>Spent</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, marginTop: 2 }}>{formatMoney(totalSpent, currency)}</div>
        </div>
      </div>

      {/* category list */}
      <div style={{ padding: '8px 16px 0', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2, padding: '0 4px 12px' }}>By category</div>
        <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden' }}>
          {sorted.length === 0 && !loading
            ? <div style={{ padding: '24px 16px', textAlign: 'center', color: '#ACACB8', fontSize: 14 }}>No expenses in this period</div>
            : sorted.map((s, idx) => {
              const pct = totalSpent ? (s.amt / totalSpent) * 100 : 0;
              return (
                <div key={`${s.rowKey}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid #F5F5F8' }}>
                  <CatIcon cat={s.cat} size={40} radius={12} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{s.cat.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{formatMoney(s.amt, currency)}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: '#F0F0F5', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: s.cat.tint, borderRadius: 999 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: '#ACACB8', minWidth: 28, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
