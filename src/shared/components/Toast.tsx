import { motion } from 'framer-motion';
import { ICheck } from '@/shared/components/Icons';
import { formatMoney } from '@/utils/money';

const CONFETTI_COLORS = ['#7C5CFF', '#22A06B', '#FF7A59', '#FFD23F', '#FF5C8A'];

function Confetti() {
  return (
    <div style={{ position: 'fixed', bottom: 100, left: '50%', pointerEvents: 'none', zIndex: 100 }}>
      {Array.from({ length: 14 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 8,
            height: 12,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            borderRadius: 2,
            ['--tx' as string]: `${Math.random() * 240 - 120}px`,
            ['--ty' as string]: `${-(Math.random() * 180 + 60)}px`,
            ['--r' as string]: `${Math.random() * 720 - 360}deg`,
            animation: `confettiBurst ${800 + Math.random() * 600}ms ease-out forwards`,
          }}
        />
      ))}
    </div>
  );
}

export type ToastPayload =
  | { id: number; kind: 'error'; message?: string }
  | { id: number; kind: 'income' | 'expense'; amount: number };

type ToastProps = {
  toast: ToastPayload;
  accent: string;
  currency?: string;
};

export function Toast({ toast, accent, currency = 'INR' }: ToastProps) {
  const isError = toast.kind === 'error';
  const isIncome = toast.kind === 'income';

  const pillClass = `toast${isError ? ' toast--error' : ''}`;

  return (
    <motion.div
      style={{
        position: 'fixed',
        bottom: 90,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 99,
        pointerEvents: 'none',
        padding: '0 16px',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
    >
      <div className={pillClass} style={{ pointerEvents: 'auto', maxWidth: '100%' }}>
        {!isError && (
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              background: isIncome ? '#22A06B' : accent,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <ICheck size={13} stroke={2.6} />
          </div>
        )}
        {isError ? (
          <span style={{ textAlign: 'left', wordBreak: 'break-word' }}>
            {toast.message || 'Something went wrong'}
          </span>
        ) : (
          <>
            {isIncome ? 'Income added' : 'Expense added'} · {formatMoney(toast.amount, currency)}
          </>
        )}
      </div>
      {isIncome && !isError && <Confetti />}
    </motion.div>
  );
}
