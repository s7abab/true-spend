import { IArrowDown, IArrowUp, ICTrend, IPlus, CatIcon } from '../components/Icons';
import { CountUp } from '../components/CountUp';
import { fmtINR } from '../data/categories';

const SPARK = [0.4, 0.7, 0.55, 0.9, 0.3, 0.65, 0.5];
const DAYS  = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function TxnRow({ txn, resolveCat }) {
  const cat   = resolveCat(txn.cat, txn.kind);
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

export function HomeScreen({ txns, accent = '#0F0F12', resolveCat }) {
  const income  = txns.filter(t => t.kind === 'income').reduce((a, b)  => a + b.amount, 0);
  const expense = txns.filter(t => t.kind === 'expense').reduce((a, b) => a + b.amount, 0);
  const balance = income - expense;
  const recent  = txns.slice(0, 5);
  const maxSpark = Math.max(...SPARK);

  return (
    <div style={{ paddingTop: 0 }}>
      {/* ── Balance card ── */}
      <div className="balance-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div className="balance-label">Total Balance</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            <IPlus size={12} stroke={2.5} /> May
          </div>
        </div>
        <div className="balance-amount" style={{ position: 'relative', zIndex: 1 }}>
          <CountUp value={balance} />
        </div>
        <div className="balance-pills">
          <div className="balance-pill">
            <div className="balance-pill-icon">
              <IArrowDown size={14} stroke={2.2} />
            </div>
            <div>
              <div className="balance-pill-label">Income</div>
              <div className="balance-pill-value">₹{Math.round(income).toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="balance-pill">
            <div className="balance-pill-icon">
              <IArrowUp size={14} stroke={2.2} />
            </div>
            <div>
              <div className="balance-pill-label">Spent</div>
              <div className="balance-pill-value">₹{Math.round(expense).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── This week ── */}
      <div className="week-card">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: '#ACACB8', fontWeight: 500 }}>This week</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, marginTop: 2 }}>{fmtINR(4845)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#22A06B14', color: '#22A06B', fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 999 }}>
            <ICTrend size={13} /> 12% less
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 72 }}>
          {SPARK.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{
                width: '100%',
                height: `${Math.max(8, (v / maxSpark) * 54)}px`,
                background: i === 3 ? '#0F0F12' : '#EBEBF0',
                borderRadius: '5px 5px 3px 3px',
              }} />
              <div style={{ fontSize: 10, color: i === 3 ? '#0F0F12' : '#ACACB8', fontWeight: i === 3 ? 700 : 500 }}>{DAYS[i]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent ── */}
      <div style={{ margin: '20px 16px 0' }}>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>Recent</div>
          <div style={{ fontSize: 13, color: accent, fontWeight: 600, cursor: 'pointer' }}>See all</div>
        </div>
      </div>
      <div style={{ margin: '0 16px', background: '#fff', borderRadius: 20, overflow: 'hidden' }}>
        {recent.map(t => <TxnRow key={t.id} txn={t} resolveCat={resolveCat} />)}
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
