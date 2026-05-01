import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { IChevLeft, IChevRight, CatIcon, IFilter, ISearch } from '@/shared/components/Icons';
import { formatMoney } from '@/utils/money';
import { useStatsAggregates } from '@/features/stats/hooks/useStatsAggregates';
import { usePeriodSummary } from '@/features/stats/hooks/usePeriodSummary';
import { useStatsDetailTransactions, type ReportDetailFilter } from '@/features/stats/hooks/useStatsDetailTransactions';
import { getPeriodWindow, type PeriodId } from '@/utils/periodWindows';
import type { CategoryRow } from '@/features/categories/types';
import type { TransactionKind } from '@/types/ledger';
import type { CategoryAggRow } from '@/features/stats/types';
import type { MappedTxn } from '@/utils/txnMap';
import { ReportDetailSheet } from '@/features/stats/components/ReportDetailSheet';
import { HistoryFilterSheet } from '@/features/history/components/HistoryFilterSheet';
import {
  defaultHistoryListFilter,
  hasAdvancedHistoryFilters,
  type HistoryFilterFields,
} from '@/features/history/types';
import { mergeReportDetailFilter, type ReportDetailBase } from '@/features/stats/utils/mergeReportDetailFilter';

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: 'daily', label: 'Day' },
  { id: 'weekly', label: 'Week' },
  { id: 'monthly', label: 'Month' },
  { id: 'yearly', label: 'Year' },
];

type ReportKind = 'all' | 'expense' | 'income';

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
  base: ReportDetailBase;
};

type StatsScreenProps = {
  categoriesExpense: CategoryRow[];
  categoriesIncome: CategoryRow[];
  resolveCat: ResolveCat;
  currency?: string;
  onTxnPress?: (txn: MappedTxn) => void;
};

function donutSlicePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startFrac: number,
  endFrac: number,
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
  const xo0 = cx + rOuter * Math.cos(a0);
  const yo0 = cy + rOuter * Math.sin(a0);
  const xo1 = cx + rOuter * Math.cos(a1);
  const yo1 = cy + rOuter * Math.sin(a1);
  const xi0 = cx + rInner * Math.cos(a0);
  const yi0 = cy + rInner * Math.sin(a0);
  const xi1 = cx + rInner * Math.cos(a1);
  const yi1 = cy + rInner * Math.sin(a1);
  return `M ${xo0} ${yo0} A ${rOuter} ${rOuter} 0 ${large} 1 ${xo1} ${yo1} L ${xi1} ${yi1} A ${rInner} ${rInner} 0 ${large} 0 ${xi0} ${yi0} Z`;
}

function buildSorted(
  aggRows: CategoryAggRow[],
  categories: CategoryRow[],
  breakdownKind: 'expense' | 'income',
): BreakdownRow[] {
  const fallback: CategoryRow =
    categories.at(-1) ?? {
      id: '_other',
      label: 'Other',
      icon: 'dots',
      tint: '#7A7A86',
      kind: breakdownKind,
      sort_order: 0,
      is_archived: false,
    };
  return aggRows
    .map((r) => {
      const id = r.category_id;
      const cat = (id ? categories.find((c) => c.id === id) : null) || fallback;
      const amt = Number(r.total) || 0;
      const txnCount = Number(r.txn_count) || 0;
      return {
        cat,
        amt,
        rowKey: id || 'uncat',
        txnCount,
        breakdownKind,
      };
    })
    .filter((s) => s.amt > 0)
    .sort((a, b) => b.amt - a.amt);
}

export function StatsScreen({
  categoriesExpense,
  categoriesIncome,
  resolveCat,
  currency = 'INR',
  onTxnPress,
}: StatsScreenProps) {
  const [period, setPeriod] = useState<PeriodId>('monthly');
  const [offset, setOffset] = useState(0);
  const [reportKind, setReportKind] = useState<ReportKind>('expense');
  const [reportTxnFilter, setReportTxnFilter] = useState<HistoryFilterFields>(() => ({
    ...defaultHistoryListFilter(),
    kind: 'expense',
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

  const expenseAggEnabled = reportKind !== 'income';
  const incomeAggEnabled = reportKind !== 'expense';

  const { loading: expAggLoading, aggRows: expAggRows, error: expAggErr } = useStatsAggregates(
    period,
    offset,
    'expense',
    expenseAggEnabled,
  );
  const { loading: incAggLoading, aggRows: incAggRows, error: incAggErr } = useStatsAggregates(
    period,
    offset,
    'income',
    incomeAggEnabled,
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

  const activeSorted = reportKind === 'income' ? sortedIncome : sortedExpense;
  const filterSearch = debouncedSearch.trim().toLowerCase();
  const sortedFiltered = useMemo(() => {
    if (!filterSearch) return activeSorted;
    return activeSorted.filter((s) => s.cat.label.toLowerCase().includes(filterSearch));
  }, [activeSorted, filterSearch]);

  const breakdownTotal = useMemo(
    () => sortedFiltered.reduce((a, s) => a + s.amt, 0),
    [sortedFiltered],
  );

  const denom = breakdownTotal || 1;
  let cum = 0;
  const R_OUT = 80;
  const R_IN = 56;
  const segs = sortedFiltered.map((s) => {
    const start = cum / denom;
    cum += s.amt;
    return { ...s, start, end: cum / denom };
  });

  const loading =
    summaryLoading
    || (reportKind === 'all' && (expAggLoading || incAggLoading))
    || (reportKind === 'expense' && expAggLoading)
    || (reportKind === 'income' && incAggLoading);

  const statsError = expAggErr || incAggErr || summaryErr;

  const pidx = PERIODS.findIndex((p) => p.id === period);

  const detailFilter = useMemo((): ReportDetailFilter | null => {
    if (!detailUi) return null;
    const merged = mergeReportDetailFilter(detailUi.base, reportTxnFilter);
    return { ...merged, search: debouncedSearch };
  }, [detailUi, reportTxnFilter, debouncedSearch]);

  const {
    rows: detailRows,
    loading: detailLoading,
    loadingMore: detailLoadingMore,
    hasMore: detailHasMore,
    error: detailError,
    loadMore: detailLoadMore,
  } = useStatsDetailTransactions(detailFilter);

  const net = (summary?.total_income ?? 0) - (summary?.total_expense ?? 0);

  const openDetail = (next: DetailUi) => {
    setDetailUi(next);
  };

  const closeDetail = () => setDetailUi(null);

  const mkBase = (
    kind: ReportKind,
    categoryScopeKey: string,
    categoryId: string | null,
    uncategorizedOnly: boolean,
  ): ReportDetailBase => ({
    fromIso: info.start.toISOString(),
    toIsoExclusive: info.end.toISOString(),
    kind,
    categoryScopeKey,
    categoryId,
    uncategorizedOnly,
  });

  const openIncomeTotal = () => {
    openDetail({
      title: 'Income',
      subtitle: info.sub,
      base: mkBase('income', 'totals:income', null, false),
    });
  };

  const openExpenseTotal = () => {
    openDetail({
      title: 'Expenses',
      subtitle: info.sub,
      base: mkBase('expense', 'totals:expense', null, false),
    });
  };

  const openAllTotal = () => {
    openDetail({
      title: 'All transactions',
      subtitle: info.sub,
      base: mkBase('all', 'totals:all', null, false),
    });
  };

  const openCategoryRow = (row: BreakdownRow) => {
    const uncategorizedOnly = row.rowKey === 'uncat';
    const kind = row.breakdownKind;
    openDetail({
      title: row.cat.label,
      subtitle: `${formatMoney(row.amt, currency)} · ${info.sub}`,
      base: mkBase(
        kind,
        uncategorizedOnly ? 'cat:uncat' : `cat:${row.cat.id}`,
        uncategorizedOnly ? null : row.cat.id,
        uncategorizedOnly,
      ),
    });
  };

  const openCenterTotal = () => {
    if (reportKind === 'all') {
      openAllTotal();
      return;
    }
    if (reportKind === 'income') {
      openIncomeTotal();
      return;
    }
    openExpenseTotal();
  };

  const donutLabel = reportKind === 'income' ? 'Received' : reportKind === 'expense' ? 'Spent' : '';
  const showDonut = reportKind !== 'all';

  const filterDot = hasAdvancedHistoryFilters(reportTxnFilter);
  const reportFilterSheetApplied = useMemo(
    () => ({ ...reportTxnFilter, search: '' }),
    [reportTxnFilter],
  );
  const reportDateFallback = useMemo(
    () => ({ fromIso: info.start.toISOString(), toIsoExclusive: info.end.toISOString() }),
    [info.start, info.end],
  );

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
            placeholder="Search categories…"
          />
        </div>
        <button
          type="button"
          className={`history-filter-btn${filterDot ? ' history-filter-btn--active' : ''}`}
          aria-label="Transaction filters"
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
            className={`chip ${reportKind === f.id ? 'chip-active' : 'chip-idle'}`}
            onClick={() => {
              setReportKind(f.id);
              setReportTxnFilter((prev) => ({ ...prev, kind: f.id, categoryId: null, uncategorizedOnly: false }));
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ margin: '14px 16px 0', background: '#EBEBF0', borderRadius: 12, padding: 3, display: 'flex', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 3,
            bottom: 3,
            left: `calc(${pidx * 25}% + 3px)`,
            width: 'calc(25% - 3px)',
            background: '#fff',
            borderRadius: 9,
            boxShadow: '0 1px 4px rgba(0,0,0,0.09)',
            transition: 'left 250ms cubic-bezier(.2,.8,.2,1)',
          }}
        />
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPeriod(p.id);
              setOffset(0);
            }}
            style={{
              flex: 1,
              position: 'relative',
              zIndex: 1,
              padding: '8px 0',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: 600,
              color: period === p.id ? '#0F0F12' : '#ACACB8',
              cursor: 'pointer',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 0' }}>
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: '#fff',
            border: 'none',
            display: 'grid',
            placeItems: 'center',
            color: '#0F0F12',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <IChevLeft size={16} />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>{info.label}</div>
          <div style={{ fontSize: 11, color: '#ACACB8', marginTop: 1 }}>{info.sub}</div>
        </div>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: '#fff',
            border: 'none',
            display: 'grid',
            placeItems: 'center',
            color: '#0F0F12',
            opacity: offset >= 0 ? 0.35 : 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <IChevRight size={16} />
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '12px 0', color: '#ACACB8', fontSize: 13 }}>Loading report…</div>
      )}
      {statsError && (
        <div style={{ textAlign: 'center', padding: '8px 16px', color: '#FF4D6D', fontSize: 13 }}>{statsError}</div>
      )}

      {summary && !summaryLoading ? (
        <div style={{ display: 'flex', gap: 10, padding: '16px 16px 0' }}>
          <button
            type="button"
            onClick={openIncomeTotal}
            style={{
              flex: 1,
              background: '#fff',
              borderRadius: 16,
              padding: '12px 10px',
              border: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: '#ACACB8', textTransform: 'uppercase' }}>
              Income
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: '#22A06B', letterSpacing: -0.3 }}>
              {formatMoney(summary.total_income, currency)}
            </div>
            <div style={{ fontSize: 11, color: '#ACACB8', marginTop: 4 }}>{summary.income_txn_count} txns</div>
          </button>
          <button
            type="button"
            onClick={openExpenseTotal}
            style={{
              flex: 1,
              background: '#fff',
              borderRadius: 16,
              padding: '12px 10px',
              border: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: '#ACACB8', textTransform: 'uppercase' }}>
              Expenses
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: '#0F0F12', letterSpacing: -0.3 }}>
              {formatMoney(summary.total_expense, currency)}
            </div>
            <div style={{ fontSize: 11, color: '#ACACB8', marginTop: 4 }}>{summary.expense_txn_count} txns</div>
          </button>
          <button
            type="button"
            onClick={openAllTotal}
            style={{
              flex: 1,
              background: '#0F0F12',
              borderRadius: 16,
              padding: '12px 10px',
              border: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>
              Net
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginTop: 4,
                color: net >= 0 ? '#86EFAC' : '#FDA4AF',
                letterSpacing: -0.3,
              }}
            >
              {net >= 0 ? '+' : '−'}
              {formatMoney(Math.abs(net), currency)}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Tap for all</div>
          </button>
        </div>
      ) : null}

      {reportKind === 'all' ? (
        <div style={{ padding: '14px 16px 0', color: '#ACACB8', fontSize: 12, textAlign: 'center', lineHeight: 1.45 }}>
          Use Spent or Income to see a category chart. Below: both breakdowns for this period.
        </div>
      ) : null}

      {showDonut ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18, position: 'relative' }}>
          <svg width={200} height={200} viewBox="0 0 200 200">
            <circle cx={100} cy={100} r={(R_OUT + R_IN) / 2} stroke="#F0F0F5" strokeWidth={R_OUT - R_IN} fill="none" />
            {segs.map((s, i) => (
              <path
                key={`${s.rowKey}-${i}`}
                d={donutSlicePath(100, 100, R_OUT, R_IN, s.start, s.end)}
                fill={s.cat.tint}
                style={{ cursor: 'pointer' }}
                onClick={() => openCategoryRow(s)}
              />
            ))}
          </svg>
          <div className="donut-center" style={{ pointerEvents: 'auto' }}>
            <button
              type="button"
              onClick={openCenterTotal}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 16px',
                fontFamily: 'inherit',
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: 11, color: '#ACACB8', fontWeight: 500 }}>{donutLabel}</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, marginTop: 2, color: '#0F0F12' }}>
                {formatMoney(breakdownTotal, currency)}
              </div>
              <div style={{ fontSize: 10, color: '#ACACB8', marginTop: 4 }}>Tap for list</div>
            </button>
          </div>
        </div>
      ) : null}

      {reportKind === 'all' ? (
        <>
          <BreakdownSection
            title="Spending by category"
            rows={sortedExpense}
            filterSearch={filterSearch}
            currency={currency}
            onRow={openCategoryRow}
          />
          <BreakdownSection
            title="Income by category"
            rows={sortedIncome}
            filterSearch={filterSearch}
            currency={currency}
            onRow={openCategoryRow}
          />
        </>
      ) : (
        <div style={{ padding: '8px 16px 0', marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2, padding: '0 4px 12px' }}>By category</div>
          <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden' }}>
            {sortedFiltered.length === 0 && !loading ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#ACACB8', fontSize: 14 }}>
                No {reportKind === 'income' ? 'income' : 'expenses'} in this period
              </div>
            ) : (
              sortedFiltered.map((s, idx) => (
                <CategoryListRow
                  key={`${s.rowKey}-${idx}`}
                  row={s}
                  total={breakdownTotal}
                  currency={currency}
                  onPress={() => openCategoryRow(s)}
                />
              ))
            )}
          </div>
        </div>
      )}

      <HistoryFilterSheet
        open={filterSheetOpen}
        applied={reportFilterSheetApplied}
        categoriesExpense={categoriesExpense}
        categoriesIncome={categoriesIncome}
        dateFallback={reportDateFallback}
        onClose={() => setFilterSheetOpen(false)}
        onApply={(patch) => {
          setReportTxnFilter((prev) => ({ ...prev, ...patch }));
          setReportKind(patch.kind);
        }}
        onClear={() => {
          setReportTxnFilter(defaultHistoryListFilter());
          setReportKind('all');
        }}
      />

      <AnimatePresence>
        {detailUi ? (
          <ReportDetailSheet
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
            onTxnPress={
              onTxnPress
                ? (txn) => {
                    closeDetail();
                    onTxnPress(txn);
                  }
                : undefined
            }
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function BreakdownSection({
  title,
  rows,
  filterSearch,
  currency,
  onRow,
}: {
  title: string;
  rows: BreakdownRow[];
  filterSearch: string;
  currency: string;
  onRow: (r: BreakdownRow) => void;
}) {
  const filtered = useMemo(() => {
    if (!filterSearch) return rows;
    return rows.filter((s) => s.cat.label.toLowerCase().includes(filterSearch));
  }, [rows, filterSearch]);
  const total = useMemo(() => filtered.reduce((a, s) => a + s.amt, 0), [filtered]);

  return (
    <div style={{ padding: '8px 16px 0', marginBottom: 8 }}>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2, padding: '12px 4px 10px' }}>{title}</div>
      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '20px 16px', textAlign: 'center', color: '#ACACB8', fontSize: 14 }}>Nothing here</div>
        ) : (
          filtered.map((s, idx) => (
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
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 16px',
        width: '100%',
        border: 'none',
        borderBottom: '1px solid #F5F5F8',
        background: '#fff',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <CatIcon cat={s.cat} size={40} radius={12} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{s.cat.label}</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{formatMoney(s.amt, currency)}</span>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: '#F0F0F5', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: s.cat.tint,
              borderRadius: 999,
            }}
          />
        </div>
        {s.txnCount > 0 ? (
          <div style={{ fontSize: 11, color: '#ACACB8', marginTop: 5 }}>
            {s.txnCount} transaction{s.txnCount === 1 ? '' : 's'}
          </div>
        ) : null}
      </div>
      <span style={{ fontSize: 12, color: '#ACACB8', minWidth: 32, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
    </button>
  );
}
