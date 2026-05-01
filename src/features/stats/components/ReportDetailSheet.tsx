import { motion } from 'framer-motion';
import { OVERLAY_TRANSITION, SHEET_TRANSITION } from '@/shared/motion/sheetMotion';
import { IClose } from '@/shared/components/Icons';
import { groupTxnsByDay } from '@/utils/historyGroup';
import { TxnRow } from '@/features/history/components/HistoryScreen';
import type { CategoryRow } from '@/features/categories/types';
import type { TransactionKind } from '@/types/ledger';
import type { MappedTxn } from '@/utils/txnMap';
import { useMemo } from 'react';

type ResolveCat = (id: string | null, kind: TransactionKind | string | undefined) => CategoryRow;

type ReportDetailSheetProps = {
  open: boolean;
  title: string;
  subtitle?: string | null;
  rows: MappedTxn[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  onLoadMore: () => void;
  onClose: () => void;
  resolveCat: ResolveCat;
  currency: string;
  onTxnPress?: (txn: MappedTxn) => void;
};

export function StatsDetailSheet({
  open,
  title,
  subtitle,
  rows,
  loading,
  loadingMore,
  hasMore,
  error,
  onLoadMore,
  onClose,
  resolveCat,
  currency,
  onTxnPress,
}: ReportDetailSheetProps) {
  const groups = useMemo(() => groupTxnsByDay(rows), [rows]);

  if (!open) return null;

  return (
    <motion.div
      className="overlay overlay-above"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={OVERLAY_TRANSITION}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SHEET_TRANSITION}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px' }}>
          <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="Close">
            <IClose size={16} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: -0.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </div>
            {subtitle ? (
              <div style={{ fontSize: 12, color: '#ACACB8', marginTop: 2 }}>{subtitle}</div>
            ) : null}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#ACACB8', fontSize: 14 }}>Loading…</div>
        )}
        {error && (
          <div style={{ textAlign: 'center', padding: '12px 16px', color: '#FF4D6D', fontSize: 13 }}>{error}</div>
        )}

        <div style={{ padding: '8px 0 24px', maxHeight: 'min(70dvh, 520px)', overflowY: 'auto' }}>
          {!loading && groups.length > 0
            ? groups.map(({ dayKey, header, list }) => (
                <div key={dayKey} style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      padding: '0 20px 6px',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      color: '#ACACB8',
                    }}
                  >
                    {header}
                  </div>
                  <div style={{ margin: '0 16px', background: '#fff', borderRadius: 18, overflow: 'hidden' }}>
                    {list.map((t) => (
                      <TxnRow
                        key={t.id}
                        txn={t}
                        resolveCat={resolveCat}
                        currency={currency}
                        onPress={onTxnPress ? () => onTxnPress(t) : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))
            : null}
          {!loading && !error && groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#ACACB8', fontSize: 14 }}>
              No transactions in this view
            </div>
          ) : null}
          {hasMore && !loading && (
            <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => void onLoadMore()}
                disabled={loadingMore}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#0F0F12',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loadingMore ? 'wait' : 'pointer',
                  opacity: loadingMore ? 0.7 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
