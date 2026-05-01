import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/components/AuthContext';

function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.95-2.18l-2.91-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l3.01-2.32z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.43 1.35l2.58-2.58A9 9 0 0 0 .96 4.97l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

const ease = [0.22, 1, 0.36, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.48, ease } },
};

const GRID = [
  { emoji: '💳', title: 'Track Spends',     sub: 'Every transaction logged',   bg: '#FFF3E8', iconBg: '#FFD9AA' },
  { emoji: '📊', title: 'Visual Stats',     sub: 'Charts & weekly trends',     bg: '#EEF3FF', iconBg: '#C5D5FF' },
  { emoji: '🎯', title: 'Budget Goals',     sub: 'Stay on track monthly',      bg: '#EDFAF3', iconBg: '#B5EDD0' },
  { emoji: '🔒', title: 'Fully Private',    sub: 'Your data, only yours',      bg: '#F5F0FF', iconBg: '#D9C9FF' },
];

export function SignInScreen() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogle = async () => {
    setBusy(true);
    setError(null);
    const { error: oauthErr } = await signInWithGoogle();
    if (oauthErr) {
      setError(oauthErr.message);
      setBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#F2F2F7' }}>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        <motion.div variants={stagger} initial="hidden" animate="show" style={{ padding: '0 20px' }}>

          {/* ── Logo ── */}
          <motion.div
            variants={fadeUp}
            style={{
              paddingTop: 'max(52px, env(safe-area-inset-top, 0px) + 20px)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <div style={{
              width: 46, height: 46, borderRadius: 15, flexShrink: 0,
              background: '#0F0F12',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 8px 24px -8px rgba(15,15,18,0.45)',
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>T</span>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.5, color: '#0F0F12' }}>Truspend</div>
              <div style={{ fontSize: 11, color: '#ACACB8', fontWeight: 500, marginTop: 1 }}>Personal finance tracker</div>
            </div>
          </motion.div>

          {/* ── Headline ── */}
          <motion.div variants={fadeUp} style={{ marginTop: 28 }}>
            <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1, lineHeight: 1.16, color: '#0F0F12', margin: 0 }}>
              Know exactly where<br />your money goes.
            </h1>
            <p style={{ fontSize: 15, color: '#6B6B80', marginTop: 10, lineHeight: 1.55, margin: '10px 0 0' }}>
              Track spending, spot habits, stay in control.
            </p>
          </motion.div>

          {/* ── Balance card — redesigned ── */}
          <motion.div
            variants={fadeUp}
            style={{
              marginTop: 24,
              background: '#0F0F12',
              borderRadius: 24,
              padding: '22px 20px 20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* depth blobs */}
            <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.035)', top: -90, right: -70, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.025)', bottom: -60, left: -40, pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>

              {/* Label row */}
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>
                Total Balance
              </div>

              {/* Amount + trend badge on same row */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
                <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1.8, color: '#fff', lineHeight: 1 }}>
                  ₹24,500
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'rgba(34,160,107,0.18)',
                  border: '1px solid rgba(34,160,107,0.3)',
                  borderRadius: 999, padding: '4px 10px',
                  fontSize: 12, fontWeight: 700, color: '#4fd1a0', marginBottom: 4,
                }}>
                  ↑ 12%
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

              {/* Income / Expense row */}
              <div style={{ display: 'flex', gap: 0 }}>
                {[
                  { label: 'Income', value: '₹38,000', color: '#4fd1a0', arrow: '↑' },
                  { label: 'Expenses', value: '₹13,500', color: '#ff7b7b', arrow: '↓' },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    flex: 1,
                    paddingRight: i === 0 ? 16 : 0,
                    paddingLeft: i === 1 ? 16 : 0,
                    borderRight: i === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 6,
                        background: `${s.color}22`,
                        display: 'grid', placeItems: 'center',
                        fontSize: 10, color: s.color, fontWeight: 800,
                      }}>
                        {s.arrow}
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── 2×2 Feature grid ── */}
          <motion.div
            variants={stagger}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginTop: 10,
            }}
          >
            {GRID.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                style={{
                  background: f.bg,
                  borderRadius: 20,
                  padding: '18px 16px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: f.iconBg,
                  display: 'grid', placeItems: 'center', fontSize: 22,
                }}>
                  {f.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F0F12', letterSpacing: -0.2 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: '#6B6B80', marginTop: 3, lineHeight: 1.4 }}>{f.sub}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

        </motion.div>
      </div>

      {/* ── Sticky CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.45, ease }}
        style={{
          padding: '14px 20px max(28px, env(safe-area-inset-bottom))',
          background: 'rgba(242,242,247,0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(15,15,18,0.07)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              style={{ background: '#FFE9EE', color: '#B5304B', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 500 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust pills */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          {['Free', 'No ads', 'Private'].map((t, i) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#D1D1DB' }} />}
              <span style={{ fontSize: 12, fontWeight: 500, color: '#ACACB8' }}>{t}</span>
            </div>
          ))}
        </div>

        {/* Google button */}
        <motion.button
          type="button"
          onClick={() => void onGoogle()}
          disabled={busy}
          whileTap={{ scale: busy ? 1 : 0.975 }}
          whileHover={{ scale: busy ? 1 : 1.015 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          style={{
            width: '100%', height: 58, borderRadius: 18,
            border: '1.5px solid #E0E0E8',
            background: '#fff',
            color: '#0F0F12', fontWeight: 600, fontSize: 16, letterSpacing: -0.3,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.65 : 1,
            fontFamily: 'inherit',
            boxShadow: '0 4px 16px -6px rgba(15,15,18,0.14), 0 1px 0 rgba(255,255,255,0.8) inset',
            transition: 'opacity 0.2s',
          }}
        >
          {busy ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"
              style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <circle cx="10" cy="10" r="8" stroke="#E0E0E8" strokeWidth="2.5" />
              <path d="M10 2a8 8 0 0 1 8 8" stroke="#0F0F12" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : (
            <GoogleMark size={20} />
          )}
          {busy ? 'Connecting…' : 'Continue with Google'}
        </motion.button>

        <p style={{ fontSize: 11, color: '#BEBEC8', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
          By continuing you agree to be a sensible spender.
        </p>
      </motion.div>
    </div>
  );
}
