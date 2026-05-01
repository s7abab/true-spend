import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.95-2.18l-2.91-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l3.01-2.32z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.43 1.35l2.58-2.58A9 9 0 0 0 .96 4.97l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function SignInScreen() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const onGoogle = async () => {
    setBusy(true);
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '40px 24px max(24px, env(safe-area-inset-bottom))',
        background: '#F2F2F7',
        minHeight: '100dvh',
      }}
    >
      <div style={{ marginTop: '14vh', textAlign: 'center' }}>
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          style={{
            width: 72, height: 72, borderRadius: 22,
            background: 'linear-gradient(135deg, #0F0F12, #2A2A33)',
            color: '#fff', fontWeight: 800, fontSize: 32, letterSpacing: -1,
            display: 'grid', placeItems: 'center',
            margin: '0 auto 22px',
            boxShadow: '0 18px 40px -16px rgba(15,15,18,0.45)',
          }}
        >
          T
        </motion.div>
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6 }}>
          Welcome to Truspend
        </motion.div>
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show" style={{ fontSize: 14, color: '#6B6B80', marginTop: 8, lineHeight: 1.45 }}>
          Track every rupee. Spend with intent.
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              background: '#FFE9EE', color: '#B5304B', borderRadius: 12,
              padding: '10px 14px', fontSize: 13, fontWeight: 500,
            }}
          >
            {error}
          </motion.div>
        )}
        <motion.button
          type="button"
          onClick={onGoogle}
          disabled={busy}
          whileTap={{ scale: busy ? 1 : 0.97 }}
          whileHover={{ scale: busy ? 1 : 1.02 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          style={{
            width: '100%', height: 54,
            borderRadius: 16, border: '1px solid #E5E5EC',
            background: '#fff', color: '#0F0F12',
            fontWeight: 600, fontSize: 15, letterSpacing: -0.2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.7 : 1,
            boxShadow: '0 4px 14px -8px rgba(15,15,18,0.18)',
            fontFamily: 'inherit',
          }}
        >
          <GoogleMark />
          {busy ? 'Connecting…' : 'Continue with Google'}
        </motion.button>
        <div style={{ fontSize: 11, color: '#ACACB8', textAlign: 'center', marginTop: 4 }}>
          By continuing you agree to be a sensible spender.
        </div>
      </motion.div>
    </div>
  );
}
