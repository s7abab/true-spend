import { ICheck } from './Icons';
import { formatMoney } from '../utils/money';

const CONFETTI_COLORS = ['#7C5CFF', '#22A06B', '#FF7A59', '#FFD23F', '#FF5C8A'];

function Confetti() {
  return (
    <div style={{ position: 'fixed', bottom: 100, left: '50%', pointerEvents: 'none', zIndex: 100 }}>
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', width: 8, height: 12,
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length], borderRadius: 2,
          '--tx': `${Math.random() * 240 - 120}px`,
          '--ty': `${-(Math.random() * 180 + 60)}px`,
          '--r':  `${Math.random() * 720 - 360}deg`,
          animation: `confettiBurst ${800 + Math.random() * 600}ms ease-out forwards`,
        }} />
      ))}
    </div>
  );
}

export function Toast({ toast, accent, currency = 'INR' }) {
  const isIncome = toast.kind === 'income';
  return (
    <>
      <div className="toast">
        <div style={{ width: 22, height: 22, borderRadius: 999, background: isIncome ? '#22A06B' : accent, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <ICheck size={13} stroke={2.6} />
        </div>
        {isIncome ? 'Income added' : 'Expense added'} · {formatMoney(toast.amount, currency)}
      </div>
      {isIncome && <Confetti />}
    </>
  );
}
