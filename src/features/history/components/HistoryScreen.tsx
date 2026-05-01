import { useEffect, useMemo, useState } from 'react';
import { ISearch, CatIcon, IFilter } from '@/shared/components/Icons';
import { formatMoney } from '@/utils/money';
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

type ResolveCat = (id: string | null, kind: TransactionKind | string | undefined) => CategoryRow;

export function TxnRow({
  txn,
  resolveCat,
  currency,
  onPress,
}: {
  txn: MappedTxn;
  resolveCat: ResolveCat;
  currency: string;
  onPress?: () => void;
}) {
  const cat = resolveCat(txn.cat, txn.kind);
  const isInc = txn.kind === 'income';
  const amt = formatMoney(txn.amount, currency);
  const body = (
    <>
      <div className="txn-icon" style={{ background: `${cat.tint}18`, color: cat.tint }}>
        <CatIcon cat={cat} size={44} radius={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="txn-name"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {txn.title}
        </div>
        <div className="txn-time">{txn.time}</div>
      </div>
      <div className="txn-amount" style={{ color: isInc ? '#22A06B' : '#0F0F12' }}>
        {isInc ? '+' : '−'}
        {amt}
      </div>
    </>
  );
  if (onPress) {
    return (
      <button type="button" className="txn-row txn-row-btn" onClick={onPress} aria-label={`Edit ${txn.title}`}>
        {body}
      </button>
    );
  }
  return <div className="txn-row">{body}</div>;
}

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

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'stretch',
          margin: '12px 16px 0',
        }}
      >
        <div className="search-wrap search-wrap--with-side" style={{ margin: 0, flex: 1, minWidth: 0 }}>
          <ISearch
            size={15}
            style={{
              position: 'absolute',
              left: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#ACACB8',
              pointerEvents: 'none',
            }}
          />
          <input
            className="search-input"
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

      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
        {(
          [
            { id: 'all' as const, label: 'All' },
            { id: 'expense' as const, label: 'Spent' },
            { id: 'income' as const, label: 'Income' },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            className={`chip ${listFilter.kind === f.id ? 'chip-active' : 'chip-idle'}`}
            onClick={() => setListFilter((prev) => ({ ...prev, kind: f.id, categoryId: null, uncategorizedOnly: false }))}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#ACACB8', fontSize: 14 }}>Loading…</div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: '12px 16px', color: '#FF4D6D', fontSize: 13 }}>{error}</div>
      )}

      <div style={{ marginTop: 16, paddingBottom: 8 }}>
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
        {!loading && groups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#ACACB8', fontSize: 14 }}>
            No transactions found
          </div>
        )}
        {hasMore && !loading && (
          <div style={{ padding: '16px 16px 24px', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => void loadMore()}
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
