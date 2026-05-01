import { useMemo, useState } from 'react';
import { ISearch, CatIcon } from '../components/Icons';
import { formatMoney } from '../utils/money';
import { groupTxnsByDay } from '../utils/historyGroup';

function TxnRow({ txn, resolveCat, currency }) {
  const cat   = resolveCat(txn.cat, txn.kind);
  const isInc = txn.kind === 'income';
  const amt   = formatMoney(txn.amount, currency);
  return (
    <div className="txn-row">
      <div className="txn-icon" style={{ background: cat.tint + '18', color: cat.tint }}>
        <CatIcon cat={cat} size={44} radius={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="txn-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txn.title}</div>
        <div className="txn-time">{txn.time}</div>
      </div>
      <div className="txn-amount" style={{ color: isInc ? '#22A06B' : '#0F0F12' }}>
        {isInc ? '+' : '−'}{amt}
      </div>
    </div>
  );
}

export function HistoryScreen({ txns, resolveCat, currency = 'INR' }) {
  const [filter, setFilter] = useState('all');
  const [search,  setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return txns
      .filter(t => filter === 'all' || t.kind === filter)
      .filter((t) => {
        if (!q) return true;
        const title = (t.title || '').toLowerCase();
        const note  = (t.note || '').toLowerCase();
        const amt   = String(Math.round(t.amount));
        return title.includes(q) || note.includes(q) || amt.includes(q);
      });
  }, [txns, filter, search]);

  const groups = useMemo(() => groupTxnsByDay(filtered), [filtered]);

  return (
    <div>
      {/* search */}
      <div className="search-wrap">
        <ISearch size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#ACACB8', pointerEvents: 'none' }} />
        <input
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search transactions…"
        />
      </div>

      {/* filter chips */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
        {[{ id: 'all', label: 'All' }, { id: 'expense', label: 'Spent' }, { id: 'income', label: 'Income' }].map(f => (
          <button
            key={f.id}
            className={`chip ${filter === f.id ? 'chip-active' : 'chip-idle'}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* grouped list */}
      <div style={{ marginTop: 16, paddingBottom: 8 }}>
        {groups.length > 0
          ? groups.map(({ dayKey, header, list }) => (
            <div key={dayKey} style={{ marginBottom: 8 }}>
              <div style={{ padding: '0 20px 6px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#ACACB8' }}>{header}</div>
              <div style={{ margin: '0 16px', background: '#fff', borderRadius: 18, overflow: 'hidden' }}>
                {list.map(t => <TxnRow key={t.id} txn={t} resolveCat={resolveCat} currency={currency} />)}
              </div>
            </div>
          ))
          : <div style={{ textAlign: 'center', padding: '60px 0', color: '#ACACB8', fontSize: 14 }}>No transactions found</div>
        }
      </div>
    </div>
  );
}
