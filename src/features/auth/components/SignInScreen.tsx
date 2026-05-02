import { useState } from 'react';
import type React from 'react';
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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.52, ease } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const FEATURES = [
  { label: 'Instant tracking', color: '#6C47FF', bg: '#DDD6FE' },
  { label: 'Smart charts',     color: '#00956B', bg: '#D1FAE5' },
  { label: 'Budget goals',     color: '#B45309', bg: '#FEF3C7' },
  { label: '100% private',     color: '#1D63D4', bg: '#DBEAFE' },
];

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 340 268"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="phoneGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2D1B69" />
          <stop offset="100%" stopColor="#0F0F1E" />
        </linearGradient>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B6FFF" />
          <stop offset="100%" stopColor="#6C47FF" />
        </linearGradient>
        <linearGradient id="greenLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00C896" />
          <stop offset="100%" stopColor="#00E5B0" />
        </linearGradient>
        <linearGradient id="bgBlob" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EDE9FF" />
          <stop offset="100%" stopColor="#E0EFFE" />
        </linearGradient>
        <filter id="phoneShadow" x="-25%" y="-15%" width="150%" height="130%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#1A0A3D" floodOpacity="0.28" />
        </filter>
        <filter id="floatShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.10" />
        </filter>
      </defs>

      {/* Single soft centered background blob */}
      <ellipse cx="170" cy="140" rx="130" ry="118" fill="url(#bgBlob)" opacity="0.30" />

      {/* Phone shell */}
      <rect x="102" y="10" width="136" height="244" rx="26" fill="url(#phoneGrad)" filter="url(#phoneShadow)" />
      <rect x="109" y="17" width="122" height="230" rx="20" fill="#13132A" />
      <rect x="154" y="20" width="32" height="7" rx="3.5" fill="#0E0E22" />

      {/* Balance card */}
      <rect x="118" y="38" width="104" height="72" rx="14" fill="#1D1D3A" />
      <rect x="128" y="48" width="38" height="4" rx="2" fill="rgba(255,255,255,0.16)" />
      <rect x="128" y="58" width="66" height="12" rx="6" fill="rgba(255,255,255,0.84)" />
      <rect x="198" y="55" width="16" height="16" rx="8" fill="rgba(0,200,150,0.18)" />
      <rect x="202" y="59" width="8" height="6" rx="3" fill="#00C896" opacity="0.88" />
      <rect x="128" y="78" width="96" height="1" fill="rgba(255,255,255,0.07)" />
      <rect x="128" y="85" width="7" height="7" rx="2.5" fill="rgba(0,200,150,0.22)" />
      <rect x="138" y="85" width="20" height="3.5" rx="1.75" fill="rgba(255,255,255,0.16)" />
      <rect x="138" y="91" width="34" height="7" rx="3.5" fill="rgba(255,255,255,0.72)" />
      <rect x="178" y="85" width="7" height="7" rx="2.5" fill="rgba(255,91,122,0.22)" />
      <rect x="188" y="85" width="22" height="3.5" rx="1.75" fill="rgba(255,255,255,0.16)" />
      <rect x="188" y="91" width="28" height="7" rx="3.5" fill="rgba(255,255,255,0.72)" />

      {/* Chart area */}
      <rect x="118" y="118" width="104" height="72" rx="14" fill="#1D1D3A" />
      <rect x="129" y="168" width="8"  height="13" rx="2.5" fill="url(#barGrad)" opacity="0.38" />
      <rect x="141" y="160" width="8"  height="21" rx="2.5" fill="url(#barGrad)" opacity="0.55" />
      <rect x="153" y="164" width="8"  height="17" rx="2.5" fill="url(#barGrad)" opacity="0.44" />
      <rect x="165" y="152" width="8"  height="29" rx="2.5" fill="url(#barGrad)" opacity="0.72" />
      <rect x="177" y="156" width="8"  height="25" rx="2.5" fill="url(#barGrad)" opacity="0.60" />
      <rect x="189" y="144" width="8"  height="37" rx="2.5" fill="url(#barGrad)" />
      <rect x="201" y="150" width="8"  height="31" rx="2.5" fill="url(#barGrad)" opacity="0.68" />
      <polyline
        points="133,165 145,156 157,160 169,148 181,152 193,139 205,144"
        stroke="url(#greenLine)" strokeWidth="2" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="193" cy="139" r="3.5" fill="#00C896" />
      <circle cx="193" cy="139" r="7"   fill="#00C896" opacity="0.18" />

      {/* Transaction row */}
      <rect x="118" y="198" width="104" height="24" rx="10" fill="#1D1D3A" />
      <circle cx="131" cy="210" r="7" fill="#252548" />
      <rect x="127" y="207" width="8" height="6" rx="2" fill="#8B6FFF" opacity="0.55" />
      <rect x="142" y="205" width="36" height="4" rx="2" fill="rgba(255,255,255,0.20)" />
      <rect x="142" y="212" width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.10)" />
      <rect x="192" y="205" width="24" height="9" rx="4.5" fill="rgba(255,91,122,0.32)" />

      {/* Floating card LEFT – Savings */}
      <rect x="12" y="90" width="80" height="46" rx="16" fill="white" filter="url(#floatShadow)" />
      <rect x="22" y="100" width="14" height="14" rx="6" fill="#D1FAE5" />
      <rect x="25" y="104" width="8" height="6" rx="2" fill="#00C896" opacity="0.75" />
      <rect x="40" y="101" width="36" height="4" rx="2" fill="#EBEBF5" />
      <rect x="40" y="110" width="42" height="8" rx="4" fill="#D1FAE5" />
      <rect x="42" y="112" width="28" height="4" rx="2" fill="#00956B" opacity="0.65" />

      {/* Floating card RIGHT – Expense */}
      <rect x="252" y="148" width="80" height="46" rx="16" fill="white" filter="url(#floatShadow)" />
      <rect x="262" y="158" width="14" height="14" rx="6" fill="#FEE2E2" />
      <rect x="265" y="162" width="8" height="6" rx="2" fill="#FF5B7A" opacity="0.75" />
      <rect x="280" y="159" width="36" height="4" rx="2" fill="#EBEBF5" />
      <rect x="280" y="168" width="40" height="8" rx="4" fill="#FEE2E2" />
      <rect x="282" y="170" width="26" height="4" rx="2" fill="#E0003E" opacity="0.55" />

    </svg>
  );
}

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
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#F5F4F1',
      overflow: 'hidden',
    }}>

      {/* ── Scrollable content (flex-1, no actual scroll needed) ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >

        {/* Logo */}
        <motion.div
          variants={fadeUp}
          style={{
            padding: 'max(44px, env(safe-area-inset-top, 0px) + 16px) 20px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <img
            src="/logo.svg"
            alt="Truspend"
            width={44}
            height={44}
            decoding="async"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'block',
              boxShadow: '0 8px 24px -8px rgba(15,15,18,0.45)',
            }}
          />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.5, color: '#0F0F12' }}>Truspend</div>
            <div style={{ fontSize: 11, color: '#A0A0B0', fontWeight: 500, marginTop: 1 }}>Personal finance tracker</div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div variants={fadeUp} style={{ padding: '18px 20px 0', flexShrink: 0 }}>
          <h1 style={{
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: -1.2,
            lineHeight: 1.14,
            color: '#0F0F12',
            margin: 0,
          }}>
            Know exactly where<br />your money goes.
          </h1>
          <p style={{
            fontSize: 14,
            color: '#6B6B80',
            lineHeight: 1.55,
            margin: '10px 0 0',
          }}>
            Track spending, spot habits, stay in control.
          </p>
        </motion.div>

        {/* Hero Illustration — grows to fill remaining space */}
        <motion.div
          variants={fadeUp}
          style={{ flex: 1, minHeight: 0, padding: '4px 8px 0' }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ height: '100%' }}
          >
            <HeroIllustration />
          </motion.div>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          variants={fadeUp}
          style={{
            display: 'flex',
            gap: 7,
            padding: '6px 20px 8px',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            flexShrink: 0,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}
        >
          {FEATURES.map((f) => (
            <div
              key={f.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: f.bg,
                borderRadius: 999,
                padding: '7px 13px',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: f.color, flexShrink: 0,
              }} />
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: f.color, letterSpacing: -0.2,
              }}>
                {f.label}
              </span>
            </div>
          ))}
        </motion.div>

      </motion.div>

      {/* ── Sticky CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.44, duration: 0.46, ease }}
        style={{
          flexShrink: 0,
          padding: '12px 20px max(24px, env(safe-area-inset-bottom))',
          background: 'rgba(245,244,241,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(15,15,18,0.07)',
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
        }}
      >
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              style={{
                background: '#FFE9EE', color: '#B5304B',
                borderRadius: 12, padding: '10px 14px',
                fontSize: 13, fontWeight: 500,
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust pills */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          alignItems: 'center', gap: 6,
        }}>
          {['Free', 'No ads', 'Private'].map((t, i) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && (
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#D1D1DB' }} />
              )}
              <span style={{ fontSize: 12, fontWeight: 500, color: '#ACACB8' }}>{t}</span>
            </div>
          ))}
        </div>

        {/* Google button */}
        <motion.button
          type="button"
          onClick={() => void onGoogle()}
          disabled={busy}
          whileTap={{ scale: busy ? 1 : 0.974 }}
          whileHover={{ scale: busy ? 1 : 1.012 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          style={{
            width: '100%', height: 58, borderRadius: 20,
            border: 'none',
            background: '#0F0F12',
            color: '#fff', fontWeight: 600, fontSize: 16, letterSpacing: -0.3,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.65 : 1,
            fontFamily: 'inherit',
            boxShadow: '0 10px 30px -8px rgba(15,15,18,0.35)',
            transition: 'opacity 0.2s',
          }}
        >
          {busy ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"
              style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
              <path d="M10 2a8 8 0 0 1 8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : (
            <GoogleMark size={20} />
          )}
          {busy ? 'Connecting…' : 'Continue with Google'}
        </motion.button>

        <p style={{
          fontSize: 11, color: '#BEBEC8', textAlign: 'center',
          margin: 0, lineHeight: 1.6,
        }}>
          By continuing you agree to be a sensible spender.
        </p>
      </motion.div>
    </div>
  );
}
