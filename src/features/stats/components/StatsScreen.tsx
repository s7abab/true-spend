import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { IChevLeft, IChevRight, CatIcon, IFilter, ISearch } from '@/shared/components/Icons';
import { formatMoney } from '@/utils/money';
import { useStatsAggregates } from '@/features/stats/hooks/useStatsAggregates';
import { usePeriodSummary } from '@/features/stats/hooks/usePeriodSummary';
import { useStatsDetailTransactions, type StatsDetailFilter } from '@/features/stats/hooks/useStatsDetailTransactions';
import { getPeriodWindow, type PeriodId } from '@/utils/periodWindows';
import type { CategoryRow } from '@/features/categories/types';
import type { TransactionKind } from '@/types/ledger';
import type { CategoryAggRow } from '@/features/stats/types';
import type { MappedTxn } from '@/utils/txnMap';
import { StatsDetailSheet } from '@/features/stats/components/ReportDetailSheet';
import { HistoryFilterSheet } from '@/features/history/components/HistoryFilterSheet';
import {
  defaultHistoryListFilter,
  hasAdvancedHistoryFilters,
  type HistoryFilterFields,
} from '@/features/history/types';
import { mergeStatsDetailFilter, type StatsDetailBase } from '@/features/stats/utils/mergeReportDetailFilter';

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: 'daily', label: 'Day' },
  { id: 'weekly', label: 'Week' },
  { id: 'monthly', label: 'Month' },
  { id: 'yearly', label: 'Year' },
];

const KIND_OPTIONS = [
  { id: 'all' as const, label: 'All' },
  { id: 'expense' as const, label: 'Spent' },
  { id: 'income' as const, label: 'Income' },
];

const R_OUT = 80;
const R_IN = 56;

// ─── Types ────────────────────────────────────────────────────────────────────

type StatsKind = 'all' | 'expense' | 'income';
type ResolveCat = (id: string | null, kind: TransactionKind | string | undefined) => CategoryRow;

type BreakdownRow = {
  cat: CategoryRow;
  amt: number;
  rowKey: string;
  txnCount: number;
  breakdownKind: 'expense' | 'income';
};

type DetailUi = {
  title: string;
  subtitle?: string | null;
  base: StatsDetailBase;
};

type StatsScreenProps = {
  categoriesExpense: CategoryRow[];
  categoriesIncome: CategoryRow[];
  resolveCat: ResolveCat;
  currency?: string;
  onTxnPress?: (txn: MappedTxn) => void;
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function donutSlicePath(
  cx: number, cy: number,
  rOuter: number, rInner: number,
  startFrac: number, endFrac: number,
): string {
  if (endFrac <= startFrac) return '';
  const pad = 0.0008;
  const s = Math.min(startFrac + pad, endFrac);
  const e = Math.max(endFrac - pad, s);
  if (e <= s) return '';
  const tau = 2 * Math.PI;
  const a0 = s * tau - Math.PI / 2;
  const a1 = e * tau - Math.PI / 2;
  const large = e - s > 0.5 ? 1 : 0;
  const xo0 = cx + rOuter * Math.cos(a0), yo0 = cy + rOuter * Math.sin(a0);
  const xo1 = cx + rOuter * Math.cos(a1), yo1 = cy + rOuter * Math.sin(a1);
  const xi0 = cx + rInner * Math.cos(a0), yi0 = cy + rInner * Math.sin(a0);
  const xi1 = cx + rInner * Math.cos(a1), yi1 = cy + rInner * Math.sin(a1);
  return `M ${xo0} ${yo0} A ${rOuter} ${rOuter} 0 ${large} 1 ${xo1} ${yo1} L ${xi1} ${yi1} A ${rInner} ${rInner} 0 ${large} 0 ${xi0} ${yi0} Z`;
}

function buildSorted(
  aggRows: CategoryAggRow[],
  categories: CategoryRow[],
  breakdownKind: 'expense' | 'income',
): BreakdownRow[] {
  const fallback: CategoryRow =
    categories.at(-1) ?? {
      id: '_other', label: 'Other', icon: 'dots', tint: '#7A7A86',
      kind: breakdownKind, sort_order: 0, is_archived: false,
    };
  return aggRows
    .map((r) => {
      const id = r.category_id;
      const cat = (id ? categories.find((c) => c.id === id) : null) || fallback;
      return {
        cat,
        amt: Number(r.total) || 0,
        rowKey: id || 'uncat',
        txnCount: Number(r.txn_count) || 0,
        breakdownKind,
      };
    })
    .filter((s) => s.amt > 0)
    .sort((a, b) => b.amt - a.amt);
}

// ─── Skeleton components ──────────────────────────────────────────────────────

function SummaryCardSkeleton() {
  return (
    <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '12px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ width: '55%', height: 8, borderRadius: 4, background: '#EBEBF0' }} />
      <div style={{ width: '80%', height: 15, borderRadius: 4, background: '#EBEBF0', marginTop: 8 }} />
      <div style={{ width: '40%', height: 8, borderRadius: 4, background: '#F2F2F7', marginTop: 8 }} />
    </div>
  );
}

function DonutSkeleton() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0 4px' }}>
      <svg width={200} height={200} viewBox="0 0 200 200">
        <circle cx={100} cy={100} r={(R_OUT + R_IN) / 2} stroke="#EBEBF0" strokeWidth={R_OUT - R_IN} fill="none" />
      </svg>
    </div>
  );
}

function BreakdownSkeleton() {
  return (
    <div style={{ padding: '8px 16px 0', marginBottom: 8 }}>
      <div style={{ width: 90, height: 12, borderRadius: 5, background: '#DCDCE4', margin: '12px 4px 10px' }} />
      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < 2 ? '1px solid #F5F5F8' : 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EBEBF0', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ width: '42%', height: 12, borderRadius: 4, background: '#EBEBF0' }} />
                <div style={{ width: '22%', height: 12, borderRadius: 4, background: '#EBEBF0' }} />
              </div>
              <div style={{ height: 5, borderRadius: 999, background: '#F0F0F5' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StatsScreen({
  categoriesExpense,
  categoriesIncome,
  resolveCat,
  currency = 'INR',
  onTxnPress,
}: StatsScreenProps) {
  const [period, setPeriod] = useState<PeriodId>('monthly');
  const [offset, setOffset] = useState(0);
  const [statsKind, setStatsKind] = useState<StatsKind>('all');
  const [statsFilter, setStatsFilter] = useState<HistoryFilterFields>(() => ({
    ...defaultHistoryListFilter(),
    kind: 'all',
  }));
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [detailUi, setDetailUi] = useState<DetailUi | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const info = useMemo(() => getPeriodWindow(period, offset), [period, offset]);

  const { loading: expAggLoading, aggRows: expAggRows, error: expAggErr } = useStatsAggregates(
    period, offset, 'expense', statsKind !== 'income',
  );
  const { loading: incAggLoading, aggRows: incAggRows, error: incAggErr } = useStatsAggregates(
    period, offset, 'income', statsKind !== 'expense',
  );
  const { loading: summaryLoading, summary, error: summaryErr } = usePeriodSummary(period, offset);

  const sortedExpense = useMemo(
    () => buildSorted(expAggRows, categoriesExpense, 'expense'),
    [expAggRows, categoriesExpense],
  );
  const sortedIncome = useMemo(
    () => buildSorted(incAggRows, categoriesIncome, 'income'),
    [incAggRows, categoriesIncome],
  );

  const filterSearch = debouncedSearch.trim().toLowerCase();

  // For single-kind views — filter by search and feed the donut
  const activeSorted = statsKind === 'income' ? sortedIncome : sortedExpense;
  const sortedFiltered = useMemo(() => {
    if (!filterSearch) return activeSorted;
    return activeSorted.filter((s) => s.cat.label.toLowerCase().includes(filterSearch));
  }, [activeSorted, filterSearch]);

  // For "All" view — each section filters independently
  const filteredExpense = useMemo(() => {
    if (!filterSearch) return sortedExpense;
    return sortedExpense.filter((s) => s.cat.label.toLowerCase().includes(filterSearch));
  }, [sortedExpense, filterSearch]);
  const filteredIncome = useMemo(() => {
    if (!filterSearch) return sortedIncome;
    return sortedIncome.filter((s) => s.cat.label.toLowerCase().includes(filterSearch));
  }, [sortedIncome, filterSearch]);

  const breakdownTotal = useMemo(
    () => sortedFiltered.reduce((a, s) => a + s.amt, 0),
    [sortedFiltered],
  );

  const segs = useMemo(() => {
    const denom = breakdownTotal || 1;
    let cum = 0;
    return sortedFiltered.map((s) => {
      const start = cum / denom;
      cum += s.amt;
      return { ...s, start, end: cum / denom };
    });
  }, [sortedFiltered, breakdownTotal]);

  const aggLoading =
    (statsKind === 'all' ? expAggLoading || incAggLoading : false) ||
    (statsKind === 'expense' ? expAggLoading : false) ||
    (statsKind === 'income' ? incAggLoading : false);

  const statsError = expAggErr || incAggErr || summaryErr;
  const net = (summary?.total_income ?? 0) - (summary?.total_expense ?? 0);
  const pidx = PERIODS.findIndex((p) => p.id === period);
  const kindIdx = KIND_OPTIONS.findIndex((k) => k.id === statsKind);
  const filterDot = hasAdvancedHistoryFilters(statsFilter);
  const dateFallback = useMemo(
    () => ({ fromIso: info.start.toISOString(), toIsoExclusive: info.end.toISOString() }),
    [info.start, info.end],
  );

  // ── Detail sheet ──────────────────────────────────────────────────────────────

  const detailFilter = useMemo((): StatsDetailFilter | null => {
    if (!detailUi) return null;
    return { ...mergeStatsDetailFilter(detailUi.base, statsFilter), search: debouncedSearch };
  }, [detailUi, statsFilter, debouncedSearch]);

  const {
    rows: detailRows, loading: detailLoading, loadingMore: detailLoadingMore,
    hasMore: detailHasMore, error: detailError, loadMore: detailLoadMore,
  } = useStatsDetailTransactions(detailFilter);

  const closeDetail = () => setDetailUi(null);

  const openTotalDetail = (kind: StatsKind) => {
    const titles: Record<StatsKind, string> = {
      income: 'Income', expense: 'Expenses', all: 'All transactions',
    };
    setDetailUi({
      title: titles[kind],
      subtitle: info.sub,
      base: {
        fromIso: info.start.toISOString(),
        toIsoExclusive: info.end.toISOString(),
        kind,
        categoryScopeKey: `totals:${kind}`,
        categoryId: null,
        uncategorizedOnly: false,
      },
    });
  };

  const openCategoryDetail = (row: BreakdownRow) => {
    const isUncat = row.rowKey === 'uncat';
    setDetailUi({
      title: row.cat.label,
      subtitle: `${formatMoney(row.amt, currency)} · ${info.sub}`,
      base: {
        fromIso: info.start.toISOString(),
        toIsoExclusive: info.end.toISOString(),
        kind: row.breakdownKind,
        categoryScopeKey: isUncat ? 'cat:uncat' : `cat:${row.cat.id}`,
        categoryId: isUncat ? null : row.cat.id,
        uncategorizedOnly: isUncat,
      },
    });
  };

  return (
    <div style={{ paddingBottom: 8 }}>

      {/* ── 1. Period tabs ──────────────────────────────────────────────────── */}
      <div style={{
        margin: '12px 16px 0', background: '#EBEBF0', borderRadius: 12,
        padding: 3, display: 'flex', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 3, bottom: 3,
          left: `calc(${pidx * 25}% + 3px)`,
          width: 'calc(25% - 3px)',
          background: '#fff', borderRadius: 9,
          boxShadow: '0 1px 4px rgba(0,0,0,0.09)',
          transition: 'left 250ms cubic-bezier(.2,.8,.2,1)',
        }} />
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => { setPeriod(p.id); setOffset(0); }}
            style={{
              flex: 1, position: 'relative', zIndex: 1,
              padding: '8px 0', border: 'none', background: 'transparent',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              color: period === p.id ? '#0F0F12' : '#ACACB8',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── 2. Date navigation ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px 0' }}>
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          style={{
            width: 36, height: 36, borderRadius: 10, background: '#fff', border: 'none',
            display: 'grid', placeItems: 'center', color: '#0F0F12', cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <IChevLeft size={16} />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>{info.label}</div>
          <div style={{ fontSize: 11, color: '#ACACB8', marginTop: 1 }}>{info.sub}</div>
        </div>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          style={{
            width: 36, height: 36, borderRadius: 10, background: '#fff', border: 'none',
            display: 'grid', placeItems: 'center', color: '#0F0F12',
            opacity: offset >= 0 ? 0.35 : 1, cursor: offset >= 0 ? 'default' : 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <IChevRight size={16} />
        </button>
      </div>

      {/* ── 3. Summary cards ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 16px 0' }}>
        {summaryLoading ? (
          <><SummaryCardSkeleton /><SummaryCardSkeleton /><SummaryCardSkeleton /></>
        ) : summary ? (
          <>
            <button type="button" onClick={() => openTotalDetail('income')}
              style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '12px 10px', border: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: '#ACACB8', textTransform: 'uppercase' }}>Income</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: '#22A06B', letterSpacing: -0.3 }}>
                {formatMoney(summary.total_income, currency)}
              </div>
              <div style={{ fontSize: 11, color: '#ACACB8', marginTop: 4 }}>{summary.income_txn_count} txns</div>
            </button>
            <button type="button" onClick={() => openTotalDetail('expense')}
              style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '12px 10px', border: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: '#ACACB8', textTransform: 'uppercase' }}>Expenses</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: '#0F0F12', letterSpacing: -0.3 }}>
                {formatMoney(summary.total_expense, currency)}
              </div>
              <div style={{ fontSize: 11, color: '#ACACB8', marginTop: 4 }}>{summary.expense_txn_count} txns</div>
            </button>
            <button type="button" onClick={() => openTotalDetail('all')}
              style={{ flex: 1, background: '#0F0F12', borderRadius: 16, padding: '12px 10px', border: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Net</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, letterSpacing: -0.3, color: net >= 0 ? '#86EFAC' : '#FDA4AF' }}>
                {net >= 0 ? '+' : '−'}{formatMoney(Math.abs(net), currency)}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Tap for all</div>
            </button>
          </>
        ) : null}
      </div>

      {/* ── 4. Kind tabs ───────────────────────────────────────────────────── */}
      <div className="seg" style={{ margin: '14px 16px 0' }}>
        <div
          className="seg-thumb"
          style={{
            left: kindIdx === 0 ? 3 : `calc(${kindIdx * (100 / 3)}%)`,
            width: 'calc(33.33% - 2px)',
          }}
        />
        {KIND_OPTIONS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`seg-btn${statsKind === k.id ? ' active' : ''}`}
            onClick={() => {
              setStatsKind(k.id);
              setStatsFilter((prev) => ({ ...prev, kind: k.id, categoryId: null, uncategorizedOnly: false }));
            }}
            style={{ color: statsKind === k.id ? '#0F0F12' : '#ACACB8', fontFamily: 'inherit' }}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* ── 5. Search + filter ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', margin: '12px 16px 0' }}>
        <div className="search-wrap search-wrap--with-side" style={{ margin: 0, flex: 1, minWidth: 0 }}>
          <ISearch
            size={15}
            style={{
              position: 'absolute', left: 13, top: '50%',
              transform: 'translateY(-50%)', color: '#ACACB8', pointerEvents: 'none',
            }}
          />
          <input
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter categories…"
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

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {statsError && (
        <div style={{ textAlign: 'center', padding: '8px 16px', color: '#FF4D6D', fontSize: 13 }}>
          {statsError}
        </div>
      )}

      {/* ── 6. Breakdown area ──────────────────────────────────────────────── */}
      {aggLoading ? (
        <>
          {statsKind !== 'all' && <DonutSkeleton />}
          <BreakdownSkeleton />
          {statsKind === 'all' && <BreakdownSkeleton />}
        </>
      ) : statsKind === 'all' ? (
        <>
          <BreakdownSection
            title="Spending by category"
            rows={filteredExpense}
            currency={currency}
            onRow={openCategoryDetail}
          />
          <BreakdownSection
            title="Income by category"
            rows={filteredIncome}
            currency={currency}
            onRow={openCategoryDetail}
          />
        </>
      ) : (
        <>
          {/* Donut chart */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18, position: 'relative' }}>
            <svg width={200} height={200} viewBox="0 0 200 200">
              <circle cx={100} cy={100} r={(R_OUT + R_IN) / 2} stroke="#F0F0F5" strokeWidth={R_OUT - R_IN} fill="none" />
              {segs.map((s, i) => (
                <path
                  key={`${s.rowKey}-${i}`}
                  d={donutSlicePath(100, 100, R_OUT, R_IN, s.start, s.end)}
                  fill={s.cat.tint}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openCategoryDetail(s)}
                />
              ))}
            </svg>
            <div className="donut-center" style={{ pointerEvents: 'auto' }}>
              <button
                type="button"
                onClick={() => openTotalDetail(statsKind)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '8px 16px', fontFamily: 'inherit', borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 11, color: '#ACACB8', fontWeight: 500 }}>
                  {statsKind === 'income' ? 'Received' : 'Spent'}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, marginTop: 2, color: '#0F0F12' }}>
                  {formatMoney(breakdownTotal, currency)}
                </div>
                <div style={{ fontSize: 12, color: '#6B6B80', marginTop: 4 }}>Tap for list</div>
              </button>
            </div>
          </div>

          {/* Category list */}
          <div style={{ padding: '12px 16px 0', marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2, padding: '0 4px 12px' }}>
              By category
            </div>
            <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden' }}>
              {sortedFiltered.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#ACACB8', fontSize: 14 }}>
                  No {statsKind === 'income' ? 'income' : 'expenses'} in this period
                </div>
              ) : (
                sortedFiltered.map((s, idx) => (
                  <CategoryListRow
                    key={`${s.rowKey}-${idx}`}
                    row={s}
                    total={breakdownTotal}
                    currency={currency}
                    onPress={() => openCategoryDetail(s)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Filter sheet ───────────────────────────────────────────────────── */}
      <HistoryFilterSheet
        open={filterSheetOpen}
        applied={{ ...statsFilter, search: debouncedSearch }}
        categoriesExpense={categoriesExpense}
        categoriesIncome={categoriesIncome}
        dateFallback={dateFallback}
        onClose={() => setFilterSheetOpen(false)}
        onApply={(patch) => {
          setStatsFilter((prev) => ({ ...prev, ...patch }));
          setStatsKind(patch.kind);
        }}
        onClear={() => {
          setStatsFilter({ ...defaultHistoryListFilter(), kind: 'all' });
          setStatsKind('all');
          setSearch('');
        }}
      />

      {/* ── Detail drill-down sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {detailUi ? (
          <StatsDetailSheet
            key={detailFilter?.rangeKey ?? detailUi.base.categoryScopeKey}
            open
            title={detailUi.title}
            subtitle={detailUi.subtitle}
            rows={detailRows}
            loading={detailLoading}
            loadingMore={detailLoadingMore}
            hasMore={detailHasMore}
            error={detailError}
            onLoadMore={detailLoadMore}
            onClose={closeDetail}
            resolveCat={resolveCat}
            currency={currency}
            onTxnPress={onTxnPress ? (txn) => { closeDetail(); onTxnPress(txn); } : undefined}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BreakdownSection({
  title,
  rows,
  currency,
  onRow,
}: {
  title: string;
  rows: BreakdownRow[];
  currency: string;
  onRow: (r: BreakdownRow) => void;
}) {
  const total = useMemo(() => rows.reduce((a, s) => a + s.amt, 0), [rows]);
  return (
    <div style={{ padding: '8px 16px 0', marginBottom: 8 }}>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2, padding: '12px 4px 10px' }}>{title}</div>
      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ padding: '20px 16px', textAlign: 'center', color: '#ACACB8', fontSize: 14 }}>Nothing here</div>
        ) : (
          rows.map((s, idx) => (
            <CategoryListRow
              key={`${s.rowKey}-${idx}`}
              row={s}
              total={total || 1}
              currency={currency}
              onPress={() => onRow(s)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CategoryListRow({
  row: s,
  total,
  currency,
  onPress,
}: {
  row: BreakdownRow;
  total: number;
  currency: string;
  onPress: () => void;
}) {
  const pct = total ? (s.amt / total) * 100 : 0;
  return (
    <button
      type="button"
      onClick={onPress}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', width: '100%',
        border: 'none', borderBottom: '1px solid #F5F5F8',
        background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
      }}
    >
      <CatIcon cat={s.cat} size={40} radius={12} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{s.cat.label}</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{formatMoney(s.amt, currency)}</span>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: '#F0F0F5', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: s.cat.tint, borderRadius: 999 }} />
        </div>
        {s.txnCount > 0 && (
          <div style={{ fontSize: 11, color: '#ACACB8', marginTop: 5 }}>
            {s.txnCount} transaction{s.txnCount === 1 ? '' : 's'}
          </div>
        )}
      </div>
      <span style={{ fontSize: 12, color: '#ACACB8', minWidth: 32, textAlign: 'right' }}>
        {pct.toFixed(0)}%
      </span>
    </button>
  );
}
