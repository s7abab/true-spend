import { useEffect, useRef } from 'react';

const EDGE_PX = 28;
const THRESHOLD_PX = 72;
const OFF_ATTR = 'data-swipe-back-off';

type UseSwipeBackOptions = {
  enabled: boolean;
  onBack: () => void;
};

/**
 * Edge swipe from the left to trigger `onBack` (e.g. navigate(-1)).
 * Opt out on subtrees with `data-swipe-back-off` (horizontal scroll strips).
 */
export function useSwipeBack({ enabled, onBack }: UseSwipeBackOptions): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0]!;
      if (t.clientX > EDGE_PX) return;
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (el?.closest(`[${OFF_ATTR}]`)) return;
      startRef.current = { x: t.clientX, y: t.clientY, t: performance.now() };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!startRef.current || e.touches.length !== 1) return;
      const t = e.touches[0]!;
      const dx = t.clientX - startRef.current.x;
      const dy = Math.abs(t.clientY - startRef.current.y);
      if (dx > 24 && dx > dy * 1.2) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const s = startRef.current;
      startRef.current = null;
      if (!s || e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0]!;
      const dx = t.clientX - s.x;
      const dy = Math.abs(t.clientY - s.y);
      const dt = Math.max(1, performance.now() - s.t);
      const vx = dx / dt;
      if (dx < THRESHOLD_PX && vx < 0.55) return;
      if (dy > 90) return;
      if (dx < 24) return;
      onBackRef.current();
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled]);
}
