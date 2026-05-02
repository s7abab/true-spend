import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePwaInstall } from '@/shared/hooks/usePwaInstall';
import { SMOOTH_DECEL } from '@/shared/motion/sheetMotion';

/**
 * Chromium: when `beforeinstallprompt` fires, show a global sheet so the user can install without opening Profile.
 */
export function PwaInstallPrompt() {
  const { stateKind, busy, runInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  const open = stateKind === 'prompt' && !dismissed;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          key="pwa-install"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
          role="presentation"
        >
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDismissed(true)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15, 15, 18, 0.45)',
              cursor: 'pointer',
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.34, ease: SMOOTH_DECEL }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 480,
              background: '#fff',
              borderRadius: '24px 24px 0 0',
              padding: '20px 20px max(20px, env(safe-area-inset-bottom, 0px))',
              boxShadow: '0 -8px 40px rgba(15, 15, 18, 0.18)',
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 99,
                background: '#E0E0E8',
                margin: '0 auto 16px',
              }}
            />
            <h2
              id="pwa-install-title"
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: -0.35,
                color: '#0F0F12',
                margin: '0 0 8px',
              }}
            >
              Install Truspend
            </h2>
            <p style={{ fontSize: 14, color: '#6B6B80', lineHeight: 1.45, margin: '0 0 20px' }}>
              Add the app to your device for quick access and a full-screen experience.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    const ok = await runInstall();
                    if (ok) setDismissed(true);
                  })();
                }}
                style={{
                  width: '100%',
                  minHeight: 48,
                  borderRadius: 14,
                  border: 'none',
                  background: '#0F0F12',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: busy ? 'wait' : 'pointer',
                  opacity: busy ? 0.75 : 1,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {busy ? 'Installing…' : 'Install'}
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                style={{
                  width: '100%',
                  minHeight: 48,
                  borderRadius: 14,
                  border: 'none',
                  background: '#F4F5F7',
                  color: '#0F0F12',
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Not now
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
