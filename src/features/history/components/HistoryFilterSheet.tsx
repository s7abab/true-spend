import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IClose } from '@/shared/components/Icons';
import { ICON_MAP } from '@/shared/components/Icons';
import type { CategoryRow } from '@/features/categories/types';
import type { HistoryFilterFields, HistoryKindFilter, HistoryTransactionQuery } from '@/features/history/types';
import {
  endOfLocalDayExclusiveIso,
  parseDateInput,
  startOfLocalDayIso,
  toDateInputValue,
} from '@/features/history/utils/dateRange';

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
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="history-filter-overlay"
          className="overlay add-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
          >
        <div className="sheet-handle" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px' }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#F4F5F7',
              border: 'none',
              display: 'grid',
              placeItems: 'center',
              color: '#6B6B80',
              flexShrink: 0,
            }}
          >
            <IClose size={16} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>Filters</div>
            <div style={{ fontSize: 12, color: '#ACACB8', marginTop: 2 }}>Date, amount, type & category</div>
          </div>
        </div>

        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#ACACB8', marginBottom: 8 }}>
            TYPE
          </div>
          <div className="seg" style={{ width: '100%' }}>
            <div
              className="seg-thumb"
              style={{
                left:
                  draft.kind === 'all' ? 3 : draft.kind === 'expense' ? 'calc(33.333% + 1px)' : 'calc(66.666% + 1px)',
                width: 'calc(33.333% - 2px)',
              }}
            />
            {(['all', 'expense', 'income'] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`seg-btn${draft.kind === k ? ' active' : ''}`}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    kind: k as HistoryKindFilter,
                    categoryId: null,
                    uncategorizedOnly: false,
                  }))
                }
                style={{
                  color: draft.kind === k ? '#0F0F12' : '#ACACB8',
                  textTransform: 'capitalize',
                  fontSize: 13,
                }}
              >
                {k === 'all' ? 'All' : k === 'expense' ? 'Spent' : 'Income'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#ACACB8', marginBottom: 8 }}>
            DATE RANGE
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#6B6B80', fontWeight: 600 }}>From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid #E8E8EF',
                  padding: '0 10px',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  color: '#0F0F12',
                  background: '#fff',
                }}
              />
            </label>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#6B6B80', fontWeight: 600 }}>To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid #E8E8EF',
                  padding: '0 10px',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  color: '#0F0F12',
                  background: '#fff',
                }}
              />
            </label>
          </div>
          {rangeError ? (
            <div style={{ fontSize: 12, color: '#FF4D6D', marginTop: 8 }}>{rangeError}</div>
          ) : null}
        </div>

        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#ACACB8', marginBottom: 8 }}>
            AMOUNT RANGE
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#6B6B80', fontWeight: 600 }}>Min</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Any"
                value={amountMinStr}
                onChange={(e) => setAmountMinStr(e.target.value)}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: 'none',
                  background: '#F4F5F7',
                  padding: '0 12px',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  color: '#0F0F12',
                }}
              />
            </label>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#6B6B80', fontWeight: 600 }}>Max</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Any"
                value={amountMaxStr}
                onChange={(e) => setAmountMaxStr(e.target.value)}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: 'none',
                  background: '#F4F5F7',
                  padding: '0 12px',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  color: '#0F0F12',
                }}
              />
            </label>
          </div>
        </div>

        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#ACACB8', marginBottom: 8 }}>
            CATEGORY
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, categoryId: null, uncategorizedOnly: false }))}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: !draft.uncategorizedOnly && !draft.categoryId ? '#0F0F12' : '#F4F5F7',
                color: !draft.uncategorizedOnly && !draft.categoryId ? '#fff' : '#0F0F12',
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, categoryId: null, uncategorizedOnly: true }))}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: draft.uncategorizedOnly ? '#0F0F12' : '#F4F5F7',
                color: draft.uncategorizedOnly ? '#fff' : '#0F0F12',
              }}
            >
              Uncategorized
            </button>
          </div>
          <div className="cat-strip" style={{ marginTop: 12, borderBottom: 'none', paddingBottom: 4 }}>
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

        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '16px 16px',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={handleClear}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 14,
              border: 'none',
              background: '#F4F5F7',
              color: '#0F0F12',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={handleApply}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 14,
              border: 'none',
              background: '#0F0F12',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Apply
          </button>
        </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
