import { useEffect, useMemo, useRef, useState } from 'react';
import { ISearch, IFilter } from '@/shared/components/Icons';
import { TxnRow } from '@/shared/components/TxnRow';
import { groupTxnsByDay } from '@/utils/historyGroup';
import { useHistoryTransactions } from '@/features/history/hooks/useHistoryTransactions';
import { HistoryFilterSheet } from '@/features/history/components/HistoryFilterSheet';
import type { CategoryRow } from '@/features/categories/types';
import type { TransactionKind } from '@/types/ledger';
import type { MappedTxn } from '@/utils/txnMap';
import {
  defaultHistoryListFilter,
  hasAdvancedHistoryFilters,
  type HistoryFilterFields,
  type HistoryTransactionQuery,
} from '@/features/history/types';
import '@/features/history/styles/HistoryFilters.css';
import { TxnListSkeletonGroup, LoadingSpinner } from '@/shared/components/loading';

/** Same labels/order as Stats kind segment (All / Spent / Income). */
const HISTORY_KIND_SEG = [
  { id: 'all' as const, label: 'All' },
  { id: 'expense' as const, label: 'Spent' },
  { id: 'income' as const, label: 'Income' },
] as const;

export { TxnRow } from '@/shared/components/TxnRow';

type ResolveCat = (id: string | null, kind: TransactionKind | string | undefined) => CategoryRow;

type HistoryScreenProps = {
  resolveCat: ResolveCat;
  categoriesExpense: CategoryRow[];
  categoriesIncome: CategoryRow[];
  currency?: string;
  onTxnPress?: (txn: MappedTxn) => void;
};

export function HistoryScreen({
  resolveCat,
  categoriesExpense,
  categoriesIncome,
  currency = 'INR',
  onTxnPress,
}: HistoryScreenProps) {
  const [listFilter, setListFilter] = useState<HistoryFilterFields>(() => defaultHistoryListFilter());
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fullQuery: HistoryTransactionQuery = useMemo(
    () => ({ ...listFilter, search: debouncedSearch }),
    [listFilter, debouncedSearch],
  );

  const { rows, loading, loadingMore, hasMore, error, loadMore } = useHistoryTransactions(fullQuery);
  const groups = useMemo(() => groupTxnsByDay(rows), [rows]);
  const filterDot = hasAdvancedHistoryFilters(listFilter);
  const historyKindSegIdx = HISTORY_KIND_SEG.findIndex((k) => k.id === listFilter.kind);

  // Auto-load more when the sentinel scrolls into view
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { threshold: 0.5 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  return (
    <div>
      <div className="history-toolbar">
        <div className="history-toolbar__search-wrap">
          <span className="history-toolbar__search-icon" aria-hidden>
            <ISearch size={15} />
          </span>
          <input
            className="history-toolbar__search-input"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions…"
          />
        </div>
        <button
          type="button"
          className={`history-filter-btn${filterDot ? ' history-filter-btn--active' : ''}`}
          aria-label="Filters"
          onClick={() => setFilterSheetOpen(true)}
        >
          <IFilter size={20} stroke={2} />
        </button>
      </div>

      <div className="seg" style={{ margin: '14px 16px 0' }}>
        <div
          className={`seg-thumb${listFilter.kind === 'all' ? ' seg-thumb--slate' : listFilter.kind === 'expense' ? ' seg-thumb--rose' : ' seg-thumb--emerald'}`}
          style={{
            left: historyKindSegIdx === 0 ? 3 : `calc(${historyKindSegIdx * (100 / 3)}%)`,
            width: 'calc(33.33% - 2px)',
          }}
        />
        {HISTORY_KIND_SEG.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`seg-btn${listFilter.kind === f.id ? ' active' : ''}`}
            onClick={() =>
              setListFilter((prev) => ({ ...prev, kind: f.id, categoryId: null, uncategorizedOnly: false }))
            }
            style={{ color: listFilter.kind === f.id ? '#0F0F12' : '#ACACB8' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ textAlign: 'center', padding: '12px 16px', color: '#FF4D6D', fontSize: 13 }}>{error}</div>
      )}

      <div style={{ marginTop: 16, paddingBottom: 8 }}>
        {loading ? (
          <>
            <TxnListSkeletonGroup />
            <TxnListSkeletonGroup />
          </>
        ) : groups.length > 0 ? (
          groups.map(({ dayKey, header, list }) => (
            <div key={dayKey} style={{ marginBottom: 8 }}>
              <div
                style={{
                  padding: '0 20px 6px', fontSize: 11, fontWeight: 700,
                  letterSpacing: 0.5, textTransform: 'uppercase', color: '#ACACB8',
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
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#ACACB8', fontSize: 14 }}>
            No transactions found
          </div>
        )}

        {/* Sentinel for IntersectionObserver — also shows a loading indicator */}
        {hasMore && (
          <div
            ref={sentinelRef}
            style={{
              padding: '16px 16px 24px',
              display: 'flex',
              justifyContent: 'center',
              color: '#ACACB8',
              fontSize: 13,
            }}
          >
            {loadingMore ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <LoadingSpinner size="sm" />
                Loading more…
              </span>
            ) : (
              ''
            )}
          </div>
        )}
      </div>

      <HistoryFilterSheet
        open={filterSheetOpen}
        applied={fullQuery}
        categoriesExpense={categoriesExpense}
        categoriesIncome={categoriesIncome}
        onClose={() => setFilterSheetOpen(false)}
        onApply={(patch) => setListFilter((prev) => ({ ...prev, ...patch }))}
        onClear={() => {
          setListFilter(defaultHistoryListFilter());
          setSearch('');
        }}
      />
    </div>
  );
}
