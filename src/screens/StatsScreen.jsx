import { useState, useMemo } from 'react';
import { IChevLeft, IChevRight, CatIcon } from '../components/Icons';
import { fmtINR } from '../data/categories';

const PERIODS = [
  { id: 'daily',   label: 'Day' },
  { id: 'weekly',  label: 'Week' },
  { id: 'monthly', label: 'Month' },
  { id: 'yearly',  label: 'Year' },
];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const NOW = new Date(2026, 4, 1);

function getPeriodInfo(period, offset) {
  const d = new Date(NOW);
  if (period === 'daily') {
    d.setDate(d.getDate() + offset);
    if (offset === 0)  return { label: 'Today',     sub: d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) };
    if (offset === -1) return { label: 'Yesterday', sub: d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) };
    return { label: `${MONTHS[d.getMonth()]} ${d.getDate()}`, sub: d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) };
  }
  if (period === 'weekly') {
    const start = new Date(d); start.setDate(d.getDate() + offset * 7 - d.getDay());
    const end   = new Date(start); end.setDate(start.getDate() + 6);
    return {
      label: offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `${MONTHS[start.getMonth()]} ${start.getDate()}`,
      sub: `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}`,
    };
  }
  if (period === 'monthly') {
    d.setMonth(d.getMonth() + offset);
    return { label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, sub: offset === 0 ? 'This month' : offset === -1 ? 'Last month' : '' };
  }
  d.setFullYear(d.getFullYear() + offset);
  return { label: String(d.getFullYear()), sub: offset === 0 ? 'This year' : offset === -1 ? 'Last year' : '' };
}

export function StatsScreen({ txns, categoriesExpense }) {
  const [period, setPeriod] = useState('monthly');
  const [offset, setOffset] = useState(0);

  const info       = useMemo(() => getPeriodInfo(period, offset), [period, offset]);
  const scale      = { daily: 0.04, weekly: 0.25, monthly: 1, yearly: 12 }[period];
  const expTxns    = txns.filter(t => t.kind === 'expense');
  const totalSpent = Math.round(expTxns.reduce((a, b) => a + b.amount, 0) * scale);

  const byCat = {};
  expTxns.forEach(t => { byCat[t.cat] = (byCat[t.cat] || 0) + t.amount * scale; });
  const sorted = Object.entries(byCat)
    .map(([id, amt]) => ({ cat: categoriesExpense.find(c => c.id === id) || categoriesExpense.at(-1), amt }))
    .sort((a, b) => b.amt - a.amt);

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
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, marginTop: 2 }}>{fmtINR(totalSpent)}</div>
        </div>
      </div>

      {/* category list */}
      <div style={{ padding: '8px 16px 0', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2, padding: '0 4px 12px' }}>By category</div>
        <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden' }}>
          {sorted.map(s => {
            const pct = totalSpent ? (s.amt / totalSpent) * 100 : 0;
            return (
              <div key={s.cat.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid #F5F5F8' }}>
                <CatIcon cat={s.cat} size={40} radius={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{s.cat.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtINR(s.amt)}</span>
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
