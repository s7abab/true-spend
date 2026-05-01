/** Fast start, gentle finish — no spring overshoot on sheets. */
export const SMOOTH_DECEL = [0.22, 1, 0.36, 1] as const;

export const OVERLAY_TRANSITION = {
  duration: 0.34,
  ease: SMOOTH_DECEL,
} as const;

/** `y: '100%'` ↔ `0` for bottom sheets */
export const SHEET_TRANSITION = {
  duration: 0.42,
  ease: SMOOTH_DECEL,
} as const;
