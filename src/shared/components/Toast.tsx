import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ICheck } from '@/shared/components/Icons';
import { formatMoney } from '@/utils/money';

const CONFETTI_COLORS = ['#7C5CFF', '#22A06B', '#FF7A59', '#FFD23F', '#FF5C8A'];

type ConfettiPiece = { tx: string; ty: string; r: string; duration: number };

function Confetti() {
  // Positions computed once on mount via ref — stable across re-renders and React Strict Mode
  const pieces = useRef<ConfettiPiece[]>([]);
  if (pieces.current.length === 0) {
    pieces.current = Array.from({ length: 14 }, () => ({
      tx: `${Math.random() * 240 - 120}px`,
      ty: `${-(Math.random() * 180 + 60)}px`,
      r: `${Math.random() * 720 - 360}deg`,
      duration: 800 + Math.random() * 600,
    }));
  }

  return (
    <div style={{ position: 'fixed', bottom: 100, left: '50%', pointerEvents: 'none', zIndex: 201 }}>
      {pieces.current.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 8,
            height: 12,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            borderRadius: 2,
            ['--tx' as string]: p.tx,
            ['--ty' as string]: p.ty,
            ['--r' as string]: p.r,
            animation: `confettiBurst ${p.duration}ms ease-out forwards`,
          }}
        />
      ))}
    </div>
  );
}

export type ToastPayload =
  | { id: number; kind: 'error'; message?: string }
  | { id: number; kind: 'income' | 'expense'; amount: number }
  | { id: number; kind: 'done'; message: string };

type ToastProps = {
  toast: ToastPayload;
  accent: string;
  currency?: string;
};

export function Toast({ toast, accent, currency = 'INR' }: ToastProps) {
  const isError = toast.kind === 'error';
  const isDone = toast.kind === 'done';
  const isIncome = toast.kind === 'income';

  const pillClass = `toast${isError ? ' toast--error' : ''}${isDone ? ' toast--done' : ''}`;

  return (
    <motion.div
      style={{
        position: 'fixed',
        bottom: 90,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 200,
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
              background: isDone ? '#22A06B' : isIncome ? '#22A06B' : accent,
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
        ) : isDone ? (
          <span style={{ textAlign: 'center', wordBreak: 'break-word', whiteSpace: 'normal' }}>{toast.message}</span>
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
