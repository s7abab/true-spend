import { CatIcon } from './Icons';
import { findCat, fmtINR } from '../data/categories';

export function TxnRow({ txn, onClick }) {
  const cat = findCat(txn.cat, txn.kind);
  const sign = txn.kind === 'income' ? '+' : '−';
  const color = txn.kind === 'income' ? '#22A06B' : '#0F0F12';
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 12px',
      borderRadius: 18,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <CatIcon cat={cat} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{txn.title}</div>
        <div style={{ fontSize: 12, color: '#8A8A93', marginTop: 2 }}>{txn.time}</div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, color }}>
        {sign}{fmtINR(txn.amount)}
      </div>
    </div>
  );
}
