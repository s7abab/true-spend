import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/components/AuthContext';
import { LegalFooterLinks } from '@/features/legal/components/LegalFooterLinks';
import './SignInScreen.css';

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

function IconTrend() {
  return (
    <svg className="sign-in__feature-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 16l5-5 4 4 7-9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 6h4v4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAI() {
  return (
    <svg className="sign-in__feature-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.8 2.8M16.2 16.2L19 19M5 19l2.8-2.8M16.2 7.8L19 5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.25" fill="currentColor" />
    </svg>
  );
}

function IconInsight() {
  return (
    <svg className="sign-in__feature-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 18h16M6 14l3-8 4 10 3-6 2 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.48, ease } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

const FEATURES = [
  { label: 'Track spend', Icon: IconTrend },
  { label: 'AI assistant', Icon: IconAI },
  { label: 'Insights', Icon: IconInsight },
] as const;

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
    <div className="sign-in">
      <div className="sign-in__inner">
        <motion.div
          className="sign-in__main"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.header variants={fadeUp} className="sign-in__brand">
            <img
              className="sign-in__brand-logo"
              src="/logo.svg"
              alt=""
              width={56}
              height={56}
              decoding="async"
            />
            <div className="sign-in__brand-text">
              <h1 className="sign-in__name">TrueSpend</h1>
              <p className="sign-in__tagline">Know your money</p>
            </div>
          </motion.header>

          <motion.h2 variants={fadeUp} className="sign-in__headline">
            Spend with <em>clarity</em>, not guesswork
          </motion.h2>

          <motion.div variants={fadeUp} className="sign-in__features">
            {FEATURES.map(({ label, Icon }) => (
              <div key={label} className="sign-in__feature">
                <Icon />
                <span className="sign-in__feature-label">{label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <motion.footer
        className="sign-in__footer"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.42, ease }}
      >
        <AnimatePresence>
          {error && (
            <motion.div
              className="sign-in__error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          className="sign-in__btn"
          onClick={() => void onGoogle()}
          disabled={busy}
          whileTap={{ scale: busy ? 1 : 0.98 }}
          transition={{ type: 'spring', stiffness: 520, damping: 30 }}
        >
          {busy ? (
            <svg
              className="sign-in__spinner"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
              <path
                d="M10 2a8 8 0 0 1 8 8"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <GoogleMark size={20} />
          )}
          {busy ? 'Connecting…' : 'Continue with Google'}
        </motion.button>

        <div className="sign-in__divider" aria-hidden="true">
          <span>free to start</span>
        </div>

        <div className="sign-in__legal-links">
          <LegalFooterLinks variant="footer" />
        </div>

        <p className="sign-in__legal">
          By continuing, you agree to our{' '}
          <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </motion.footer>
    </div>
  );
}
