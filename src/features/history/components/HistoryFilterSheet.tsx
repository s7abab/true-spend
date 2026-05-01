import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IClose, ICON_MAP } from '@/shared/components/Icons';
import type { CategoryRow } from '@/features/categories/types';
import type { HistoryFilterFields, HistoryKindFilter, HistoryTransactionQuery } from '@/features/history/types';
import {
  endOfLocalDayExclusiveIso,
  parseDateInput,
  startOfLocalDayIso,
  toDateInputValue,
} from '@/features/history/utils/dateRange';
import '@/features/history/styles/HistoryFilters.css';
import { OVERLAY_TRANSITION, SHEET_TRANSITION } from '@/shared/motion/sheetMotion';

type HistoryFilterSheetProps = {
  open: boolean;
  /** Current applied list + search (search is read-only in the sheet). */
  applied: HistoryTransactionQuery;
  categoriesExpense: CategoryRow[];
  categoriesIncome: CategoryRow[];
  onClose: () => void;
  onApply: (patch: HistoryFilterFields) => void;
  onClear: () => void;
  /** When `applied` has no date bounds, seed the date inputs from this window (e.g. Report period). */
  dateFallback?: { fromIso: string; toIsoExclusive: string } | null;
};

function defaultDraftFromApplied(a: HistoryTransactionQuery): HistoryFilterFields {
  const { search: _, ...rest } = a;
  return rest;
}

function kindSegIndex(kind: HistoryKindFilter): number {
  if (kind === 'all') return 0;
  if (kind === 'expense') return 1;
  return 2;
}

export function HistoryFilterSheet({
  open,
  applied,
  categoriesExpense,
  categoriesIncome,
  onClose,
  onApply,
  onClear,
  dateFallback = null,
}: HistoryFilterSheetProps) {
  const [draft, setDraft] = useState<HistoryFilterFields>(() => defaultDraftFromApplied(applied));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMinStr, setAmountMinStr] = useState('');
  const [amountMaxStr, setAmountMaxStr] = useState('');
  const [rangeError, setRangeError] = useState<string | null>(null);

  /* Sync draft only when the sheet opens (avoid resetting while open if search debounce updates `applied`). */
  useEffect(() => {
    if (!open) return;
    const d = defaultDraftFromApplied(applied);
    setDraft(d);
    setRangeError(null);
    if (d.fromIso) {
      const start = new Date(d.fromIso);
      setDateFrom(Number.isNaN(start.getTime()) ? '' : toDateInputValue(start));
    } else if (dateFallback?.fromIso) {
      const start = new Date(dateFallback.fromIso);
      setDateFrom(Number.isNaN(start.getTime()) ? '' : toDateInputValue(start));
    } else setDateFrom('');
    if (d.toIsoExclusive) {
      const endEx = new Date(d.toIsoExclusive);
      endEx.setMilliseconds(endEx.getMilliseconds() - 1);
      setDateTo(Number.isNaN(endEx.getTime()) ? '' : toDateInputValue(endEx));
    } else if (dateFallback?.toIsoExclusive) {
      const endEx = new Date(dateFallback.toIsoExclusive);
      endEx.setMilliseconds(endEx.getMilliseconds() - 1);
      setDateTo(Number.isNaN(endEx.getTime()) ? '' : toDateInputValue(endEx));
    } else setDateTo('');
    setAmountMinStr(d.amountMin != null ? String(d.amountMin) : '');
    setAmountMaxStr(d.amountMax != null ? String(d.amountMax) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally snapshot `applied` when `open` becomes true
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [open]);

  const cats = useMemo(() => {
    if (draft.kind === 'income') return categoriesIncome;
    if (draft.kind === 'expense') return categoriesExpense;
    return [...categoriesExpense, ...categoriesIncome];
  }, [draft.kind, categoriesExpense, categoriesIncome]);

  const parseAmount = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const n = parseFloat(t.replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const handleApply = () => {
    setRangeError(null);
    const df = dateFrom.trim() ? parseDateInput(dateFrom) : null;
    const dt = dateTo.trim() ? parseDateInput(dateTo) : null;
    if (df && dt && df.getTime() > dt.getTime()) {
      setRangeError('End date must be on or after start date');
      return;
    }
    const fromIso = df ? startOfLocalDayIso(df) : null;
    const toIsoExclusive = dt ? endOfLocalDayExclusiveIso(dt) : null;
    let amin = parseAmount(amountMinStr);
    let amax = parseAmount(amountMaxStr);
    if (amin != null && amax != null && amin > amax) {
      const t = amin;
      amin = amax;
      amax = t;
    }
    onApply({
      ...draft,
      fromIso,
      toIsoExclusive,
      amountMin: amin,
      amountMax: amax,
    });
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  const thumbStyle = { '--seg-i': kindSegIndex(draft.kind) } as CSSProperties;

  const tree = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="history-filter-overlay"
          className="overlay add-sheet-overlay history-filter-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={OVERLAY_TRANSITION}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="sheet history-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-filter-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SHEET_TRANSITION}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" aria-hidden />
            <div className="history-filter-sheet__scroll">
              <header className="history-filter-header">
                <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="Close">
                  <IClose size={16} />
                </button>
                <div className="history-filter-header__text">
                  <h2 id="history-filter-title" className="history-filter-header__title">
                    Filters
                  </h2>
                  <p className="history-filter-header__subtitle">Date, amount, type &amp; category</p>
                </div>
              </header>

              <div className="history-filter-section">
                <div className="history-filter-section__label">TYPE</div>
                <div className="history-filter-kind-seg">
                  <span className="history-filter-kind-thumb" style={thumbStyle} />
                  {(['all', 'expense', 'income'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={`history-filter-kind-btn${draft.kind === k ? ' history-filter-kind-btn--active' : ''}`}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          kind: k as HistoryKindFilter,
                          categoryId: null,
                          uncategorizedOnly: false,
                        }))
                      }
                    >
                      {k === 'all' ? 'All' : k === 'expense' ? 'Spent' : 'Income'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="history-filter-section">
                <div className="history-filter-section__label">DATE RANGE</div>
                <div className="history-filter-two-col">
                  <label className="history-filter-field">
                    <span>From</span>
                    <input
                      className="history-filter-date-input"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </label>
                  <label className="history-filter-field">
                    <span>To</span>
                    <input
                      className="history-filter-date-input"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </label>
                </div>
                {rangeError ? <div className="history-filter-range-error">{rangeError}</div> : null}
              </div>

              <div className="history-filter-section">
                <div className="history-filter-section__label">AMOUNT RANGE</div>
                <div className="history-filter-two-col">
                  <label className="history-filter-field">
                    <span>Min</span>
                    <input
                      className="history-filter-amount-input"
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Any"
                      value={amountMinStr}
                      onChange={(e) => setAmountMinStr(e.target.value)}
                    />
                  </label>
                  <label className="history-filter-field">
                    <span>Max</span>
                    <input
                      className="history-filter-amount-input"
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Any"
                      value={amountMaxStr}
                      onChange={(e) => setAmountMaxStr(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="history-filter-section">
                <div className="history-filter-section__label">CATEGORY</div>
                <div className="history-filter-cat-quick">
                  <button
                    type="button"
                    className={`history-filter-cat-chip${!draft.uncategorizedOnly && !draft.categoryId ? ' history-filter-cat-chip--active' : ' history-filter-cat-chip--idle'}`}
                    onClick={() => setDraft((d) => ({ ...d, categoryId: null, uncategorizedOnly: false }))}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`history-filter-cat-chip${draft.uncategorizedOnly ? ' history-filter-cat-chip--active' : ' history-filter-cat-chip--idle'}`}
                    onClick={() => setDraft((d) => ({ ...d, categoryId: null, uncategorizedOnly: true }))}
                  >
                    Uncategorized
                  </button>
                </div>
                <div className="cat-strip history-filter-cat-strip">
                  {cats.map((c) => {
                    const active = draft.categoryId === c.id && !draft.uncategorizedOnly;
                    const IconCmp = ICON_MAP[c.icon] || ICON_MAP.dots;
                    return (
                      <button
                        key={`${c.kind}-${c.id}`}
                        type="button"
                        className="cat-btn"
                        onClick={() => setDraft((d) => ({ ...d, categoryId: c.id, uncategorizedOnly: false }))}
                        style={{
                          background: active ? c.tint : '#F4F5F7',
                          color: active ? '#fff' : '#0F0F12',
                          boxShadow: active ? `0 4px 12px -4px ${c.tint}88` : 'none',
                        }}
                      >
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 7,
                            flexShrink: 0,
                            background: active ? 'rgba(255,255,255,0.2)' : `${c.tint}18`,
                            color: active ? '#fff' : c.tint,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconCmp size={13} stroke={2.2} />
                        </span>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <footer className="history-filter-sheet__footer">
              <button type="button" className="history-filter-btn-secondary" onClick={handleClear}>
                Clear all
              </button>
              <button type="button" className="history-filter-btn-primary" onClick={handleApply}>
                Apply
              </button>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return tree;
  return createPortal(tree, document.body);
}
