import { useCallback, useEffect, useState } from 'react';

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isLikelyIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export type PwaInstallKind = 'standalone' | 'prompt' | 'ios-hint' | 'unavailable';

/**
 * Chromium: capture `beforeinstallprompt` and call `.prompt()` from a user tap.
 * iOS Safari: no event — show Share → Add to Home Screen hint.
 */
export function usePwaInstall() {
  const [standalone, setStandalone] = useState(isStandaloneDisplay);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setStandalone(isStandaloneDisplay());
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const stateKind: PwaInstallKind = standalone
    ? 'standalone'
    : deferred
      ? 'prompt'
      : isLikelyIos()
        ? 'ios-hint'
        : 'unavailable';

  const runInstall = useCallback(async (): Promise<boolean> => {
    if (!deferred) return false;
    setBusy(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      return outcome === 'accepted';
    } catch {
      setDeferred(null);
      return false;
    } finally {
      setBusy(false);
    }
  }, [deferred]);

  return { stateKind, busy, runInstall };
}
