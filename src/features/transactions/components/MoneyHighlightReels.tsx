import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IClose, ISparkle } from '@/shared/components/Icons';
import type { CategoryRow } from '@/features/categories/types';
import type { MoneyInsightSlide } from '@/features/transactions/lib/highlightInsights';
import { generateMoneyHighlights, fetchRealTransactions } from '@/features/transactions/lib/highlightInsights';
import '@/features/transactions/styles/MoneyHighlightReels.css';

const TUTORIAL_KEY = 'mhr_tutorial_seen';

// ─── Tone config ────────────────────────────────────────────────────────────
const TONE_CONFIG = {
  good: {
    bg: 'linear-gradient(160deg, #052e16 0%, #065f46 60%, #047857 100%)',
    accent: '#34d399',
    badgeText: '#bbf7d0',
    badgeBg: 'rgba(52,211,153,0.15)',
  },
  bad: {
    bg: 'linear-gradient(160deg, #1c0a0a 0%, #7f1d1d 60%, #991b1b 100%)',
    accent: '#fca5a5',
    badgeText: '#fecaca',
    badgeBg: 'rgba(252,165,165,0.15)',
  },
  neutral: {
    bg: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)',
    accent: '#a5b4fc',
    badgeText: '#c7d2fe',
    badgeBg: 'rgba(165,180,252,0.15)',
  },
};

function slideTypeLabel(type: MoneyInsightSlide['slideType']): string {
  const map: Record<MoneyInsightSlide['slideType'], string> = {
    overview: 'Overview',
    top_expense: 'Top Spend',
    saving_rate: 'Savings',
    warning: 'Watch Out',
    praise: 'Great Job',
    tip: 'Action Tip',
    goal: 'Goal',
  };
  return map[type] ?? type;
}

// ─── Progress dots (static) ────────────────────────────────────────────────
function ProgressDots({ count, current }: { count: number; current: number }) {
  return (
    <div className="mhr-progress-strip">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`mhr-progress-dot${i === current ? ' mhr-progress-dot--active' : i < current ? ' mhr-progress-dot--done' : ''}`}
        />
      ))}
    </div>
  );
}

// ─── Tutorial Overlay ──────────────────────────────────────────────────────
function TutorialOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      className="mhr-tutorial"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mhr-tutorial-card">
        <div className="mhr-tutorial-icon">✨</div>
        <h3 className="mhr-tutorial-title">Your Money Highlights</h3>
        <p className="mhr-tutorial-sub">AI insights from your real transactions</p>

        <div className="mhr-tutorial-steps">
          <div className="mhr-tutorial-step">
            <div className="mhr-tutorial-step-icon">👈</div>
            <div className="mhr-tutorial-step-text">
              <strong>Tap left</strong>
              <span>Previous insight</span>
            </div>
          </div>
          <div className="mhr-tutorial-step">
            <div className="mhr-tutorial-step-icon">👉</div>
            <div className="mhr-tutorial-step-text">
              <strong>Tap right</strong>
              <span>Next insight</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="mhr-tutorial-btn"
          onClick={onDismiss}
        >
          Got it — Show my insights
        </button>
      </div>
    </motion.div>
  );
}

// ─── Single Slide ──────────────────────────────────────────────────────────
function HighlightSlide({ slide, direction }: { slide: MoneyInsightSlide; direction: 1 | -1 }) {
  const cfg = TONE_CONFIG[slide.tone];

  return (
    <motion.div
      className="mhr-slide"
      style={{ background: cfg.bg }}
      initial={{ opacity: 0, x: direction * 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -60 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mhr-glow" style={{ background: cfg.accent }} />

      <div className="mhr-slide-inner">
        {/* Row 1: emoji + badge */}
        <div className="mhr-slide-top">
          <motion.span
            className="mhr-emoji"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.06, type: 'spring', stiffness: 280, damping: 22 }}
          >
            {slide.emoji}
          </motion.span>
          <span className="mhr-type-badge" style={{ color: cfg.badgeText, background: cfg.badgeBg }}>
            {slideTypeLabel(slide.slideType)}
          </span>
        </div>

        {/* Row 2: hero metric */}
        <motion.div
          className="mhr-metric-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.36 }}
        >
          <span className="mhr-metric-number" style={{ color: cfg.accent }}>
            {slide.metric}
          </span>
          <span className="mhr-metric-label">{slide.metricLabel}</span>
        </motion.div>

        {/* Row 3: title */}
        <motion.h2
          className="mhr-title"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.34 }}
        >
          {slide.title}
        </motion.h2>

        {/* Row 4: coloured divider */}
        <motion.div
          className="mhr-divider"
          style={{ background: cfg.accent }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.25, duration: 0.38, ease: 'easeOut' }}
        />

        {/* Row 5: insight */}
        <motion.p
          className="mhr-insight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.34 }}
        >
          {slide.insight}
        </motion.p>

        {/* Row 6: tip */}
        <motion.div
          className="mhr-tip-box"
          style={{ borderColor: `${cfg.accent}40`, background: `${cfg.accent}10` }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.32 }}
        >
          <span className="mhr-tip-label" style={{ color: cfg.accent }}>💡 Do this</span>
          <span className="mhr-tip-text">{slide.tip}</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Loading ───────────────────────────────────────────────────────────────
function LoadingScreen({ phase }: { phase: 'fetching' | 'analyzing' }) {
  const [dot, setDot] = useState(0);
  const texts = phase === 'fetching'
    ? ['Reading your transactions…', 'Loading your ledger…', 'Fetching 6 months of data…']
    : ['Analyzing spending patterns…', 'Finding your insights…', 'Almost ready…'];

  useEffect(() => {
    const t = setInterval(() => setDot((d) => (d + 1) % texts.length), 1800);
    return () => clearInterval(t);
  }, [texts.length]);

  return (
    <div className="mhr-loading">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="mhr-loading-spinner"
      >
        <ISparkle size={36} stroke={1.5} />
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.p
          key={`${phase}-${dot}`}
          className="mhr-loading-text"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28 }}
        >
          {texts[dot]}
        </motion.p>
      </AnimatePresence>
      <div className="mhr-loading-steps">
        <div className={`mhr-step ${phase === 'fetching' ? 'mhr-step--active' : 'mhr-step--done'}`}>
          {phase === 'analyzing' ? '✓' : '1'} Fetch data
        </div>
        <div className="mhr-step-arrow">→</div>
        <div className={`mhr-step ${phase === 'analyzing' ? 'mhr-step--active' : ''}`}>
          2 AI analysis
        </div>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export type MoneyHighlightReelsProps = {
  allCategories: CategoryRow[];
  currency: string;
  geminiApiKey: string;
  onClose: () => void;
};

export function MoneyHighlightReels({ allCategories, currency, geminiApiKey, onClose }: MoneyHighlightReelsProps) {
  const [slides, setSlides] = useState<MoneyInsightSlide[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [loadPhase, setLoadPhase] = useState<'fetching' | 'analyzing' | 'done'>('fetching');
  const [error, setError] = useState<string | null>(null);

  // Tutorial: show only first time ever
  const [showTutorial, setShowTutorial] = useState(() => {
    try { return !localStorage.getItem(TUTORIAL_KEY); }
    catch { return true; }
  });

  const dismissTutorial = useCallback(() => {
    try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* ignore */ }
    setShowTutorial(false);
  }, []);

  // Fetch + analyze
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoadPhase('fetching');
        const txns = await fetchRealTransactions(allCategories);
        if (cancelled) return;
        setLoadPhase('analyzing');
        const result = await generateMoneyHighlights({ apiKey: geminiApiKey, transactions: txns, currency });
        if (cancelled) return;
        setSlides(result.slides);
        setLoadPhase('done');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to generate insights');
        setLoadPhase('done');
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [allCategories, geminiApiKey, currency]);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= slides.length) return;
    setDirection(idx > currentIdx ? 1 : -1);
    setCurrentIdx(idx);
  }, [slides.length, currentIdx]);

  // Tap left / right — NO auto-advance
  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (loadPhase !== 'done' || !slides.length) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;
    if (x < width * 0.4) {
      goTo(currentIdx - 1);
    } else {
      goTo(currentIdx + 1);
    }
  }, [loadPhase, slides.length, currentIdx, goTo]);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goTo(currentIdx + 1);
      if (e.key === 'ArrowLeft') goTo(currentIdx - 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [currentIdx, goTo, onClose]);

  const loading = loadPhase !== 'done';
  const current = slides[currentIdx];

  return (
    <div className="mhr-overlay" role="dialog" aria-modal aria-label="Money Highlights">
      {/* Header */}
      <div className="mhr-header">
        <div className="mhr-header-left">
          <ISparkle size={15} stroke={2} />
          <span className="mhr-header-title">Money Highlights</span>
        </div>
        <button type="button" className="mhr-close-btn" onClick={onClose} aria-label="Close">
          <IClose size={18} stroke={2.4} />
        </button>
      </div>

      {/* Progress dots */}
      {!loading && slides.length > 0 && (
        <ProgressDots count={slides.length} current={currentIdx} />
      )}

      {/* Slide counter */}
      {!loading && slides.length > 1 && (
        <div className="mhr-counter">{currentIdx + 1} / {slides.length}</div>
      )}

      {/* Content */}
      <div className="mhr-content" onClick={handleTap}>
        {loading ? (
          <LoadingScreen phase={loadPhase === 'fetching' ? 'fetching' : 'analyzing'} />
        ) : error ? (
          <div className="mhr-error">
            <p className="mhr-error-emoji">⚠️</p>
            <p className="mhr-error-title">Could not load insights</p>
            <p className="mhr-error-msg">{error}</p>
            <button type="button" className="mhr-error-btn" onClick={onClose}>Close</button>
          </div>
        ) : current ? (
          <AnimatePresence mode="wait" custom={direction}>
            <HighlightSlide key={current.id + currentIdx} slide={current} direction={direction} />
          </AnimatePresence>
        ) : null}
      </div>

      {/* Left / Right tap zones visual hint (shown when loaded) */}
      {!loading && slides.length > 0 && !showTutorial && (
        <>
          {currentIdx > 0 && (
            <div className="mhr-tap-zone mhr-tap-zone--left" onClick={() => goTo(currentIdx - 1)}>
              <span className="mhr-tap-arrow">‹</span>
            </div>
          )}
          {currentIdx < slides.length - 1 && (
            <div className="mhr-tap-zone mhr-tap-zone--right" onClick={() => goTo(currentIdx + 1)}>
              <span className="mhr-tap-arrow">›</span>
            </div>
          )}
        </>
      )}

      {/* Tutorial overlay — first time only */}
      <AnimatePresence>
        {showTutorial && !loading && slides.length > 0 && (
          <TutorialOverlay onDismiss={dismissTutorial} />
        )}
      </AnimatePresence>
    </div>
  );
}
