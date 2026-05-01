import { useState } from 'react';
import { ISearch, CatIcon } from '../components/Icons';
import { findCat } from '../data/categories';

function TxnRow({ txn }) {
  const cat   = findCat(txn.cat, txn.kind);
  const isInc = txn.kind === 'income';
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
        {isInc ? '+' : '−'}₹{Math.round(txn.amount).toLocaleString('en-IN')}
      </div>
    </div>
  );
}

export function HistoryScreen({ txns }) {
  const [filter, setFilter] = useState('all');
  const [search,  setSearch] = useState('');

  const filtered = txns
    .filter(t => filter === 'all' || t.kind === filter)
    .filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  // group by date label
  const groups = {};
  filtered.forEach(t => { (groups[t.time] = groups[t.time] || []).push(t); });

  return (
    <div>
      {/* header */}
      <div className="screen-header" style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.7 }}>History</div>
        <button style={{ width: 38, height: 38, borderRadius: 999, background: '#fff', border: 'none', display: 'grid', placeItems: 'center', color: '#0F0F12', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <ISearch size={18} stroke={1.9} />
        </button>
      </div>

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
        {Object.entries(groups).length > 0
          ? Object.entries(groups).map(([day, list]) => (
            <div key={day} style={{ marginBottom: 8 }}>
              <div style={{ padding: '0 20px 6px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#ACACB8' }}>{day}</div>
              <div style={{ margin: '0 16px', background: '#fff', borderRadius: 18, overflow: 'hidden' }}>
                {list.map(t => <TxnRow key={t.id} txn={t} />)}
              </div>
            </div>
          ))
          : <div style={{ textAlign: 'center', padding: '60px 0', color: '#ACACB8', fontSize: 14 }}>No transactions found</div>
        }
      </div>
    </div>
  );
}
