import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IChevLeft, IChevRight, CatIcon, IFilter, ISearch } from '@/shared/components/Icons';
import { formatMoney } from '@/utils/money';
import { useStatsAggregates } from '@/features/stats/hooks/useStatsAggregates';
import { usePeriodSummary } from '@/features/stats/hooks/usePeriodSummary';
import { usePeriodTrend } from '@/features/stats/hooks/usePeriodTrend';
import { useStatsDetailTransactions, type StatsDetailFilter } from '@/features/stats/hooks/useStatsDetailTransactions';
import { getPeriodWindow, type PeriodId } from '@/utils/periodWindows';
import type { CategoryRow } from '@/features/categories/types';
import type { TransactionKind } from '@/types/ledger';
import type { CategoryAggRow } from '@/features/stats/types';
import type { MappedTxn } from '@/utils/txnMap';
import { StatsDetailSheet } from '@/features/stats/components/ReportDetailSheet';
import { HistoryFilterSheet } from '@/features/history/components/HistoryFilterSheet';
import { defaultHistoryListFilter, hasAdvancedHistoryFilters, type HistoryFilterFields } from '@/features/history/types';
import { mergeStatsDetailFilter, type StatsDetailBase } from '@/features/stats/utils/mergeReportDetailFilter';
import '@/shared/components/loading/app-boot-loading.css';

const PERIODS: { id: PeriodId; label: string }[] = [{ id: 'daily', label: 'Day' }, { id: 'weekly', label: 'Week' }, { id: 'monthly', label: 'Month' }, { id: 'yearly', label: 'Year' }];
const KIND_OPTIONS = [{ id: 'all' as const, label: 'All' }, { id: 'expense' as const, label: 'Spent' }, { id: 'income' as const, label: 'Income' }];
type StatsKind = 'all' | 'expense' | 'income';
type ResolveCat = (id: string | null, kind: TransactionKind | string | undefined) => CategoryRow;
type BreakdownRow = { cat: CategoryRow; amt: number; rowKey: string; txnCount: number; breakdownKind: 'expense' | 'income' };
type DetailUi = { title: string; subtitle?: string | null; base: StatsDetailBase };
type StatsScreenProps = { categoriesExpense: CategoryRow[]; categoriesIncome: CategoryRow[]; resolveCat: ResolveCat; currency?: string; onTxnPress?: (txn: MappedTxn) => void };

const buildSorted = (rows: CategoryAggRow[], categories: CategoryRow[], kind: 'expense' | 'income'): BreakdownRow[] => rows.map((r) => ({ cat: (r.category_id ? categories.find((c) => c.id === r.category_id) : null) || categories.at(-1) || { id: '_other', label: 'Other', icon: 'dots', tint: '#7A7A86', kind, sort_order: 0, is_archived: false }, amt: Number(r.total) || 0, rowKey: r.category_id || 'uncat', txnCount: Number(r.txn_count) || 0, breakdownKind: kind })).filter((x) => x.amt > 0).sort((a, b) => b.amt - a.amt);
const formatDelta = (c: number, p: number) => `${((p === 0 ? (c === 0 ? 0 : 100) : ((c - p) / p) * 100) > 0 ? '+' : '')}${(p === 0 ? (c === 0 ? 0 : 100) : ((c - p) / p) * 100).toFixed(0)}%`;

const insightRowBorder: CSSProperties = { borderBottom: '1px solid #F5F5F8' };

function InsightStatRow({ label, value, valueMuted, noBorder }: { label: string; value: string; valueMuted?: boolean; noBorder?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 0', ...(noBorder ? {} : insightRowBorder) }}>
      <div style={{ fontSize: 13, color: '#70707E', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: valueMuted ? '#ACACB8' : '#0F0F12', textAlign: 'right', minWidth: 0, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function KeyInsightsSection({
  topExpense,
  topIncome,
  avgSpend,
  avgIncome,
  paceUnit,
  currency,
  onCategoryPress,
}: {
  topExpense: BreakdownRow | undefined;
  topIncome: BreakdownRow | undefined;
  avgSpend: number;
  avgIncome: number;
  paceUnit: string;
  currency: string;
  onCategoryPress: (row: BreakdownRow) => void;
}) {
  const rowBtn: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '10px 0',
    border: 'none',
    borderBottom: '1px solid #F5F5F8',
    background: 'transparent',
    font: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  };
  return (
    <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 20, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Key insights</div>
      </div>
      {topExpense ? (
        <button type="button" onClick={() => onCategoryPress(topExpense)} style={rowBtn}>
          <CatIcon cat={topExpense.cat} size={36} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#70707E' }}>Top expense category</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F0F12', marginTop: 2 }}>{topExpense.cat.label}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F0F12', flexShrink: 0 }}>{formatMoney(topExpense.amt, currency)}</div>
        </button>
      ) : (
        <InsightStatRow label="Top expense category" value="No expense yet" valueMuted />
      )}
      {topIncome ? (
        <button type="button" onClick={() => onCategoryPress(topIncome)} style={rowBtn}>
          <CatIcon cat={topIncome.cat} size={36} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#70707E' }}>Top income category</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F0F12', marginTop: 2 }}>{topIncome.cat.label}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F0F12', flexShrink: 0 }}>{formatMoney(topIncome.amt, currency)}</div>
        </button>
      ) : (
        <InsightStatRow label="Top income category" value="No income yet" valueMuted />
      )}
      <InsightStatRow label="Average spending pace" value={`${formatMoney(avgSpend, currency)} / ${paceUnit}`} />
      <InsightStatRow label="Average earning pace" value={`${formatMoney(avgIncome, currency)} / ${paceUnit}`} noBorder />
    </div>
  );
}

export function StatsScreen({ categoriesExpense, categoriesIncome, resolveCat, currency = 'INR', onTxnPress }: StatsScreenProps) {
  const [period, setPeriod] = useState<PeriodId>('monthly');
  const [offset, setOffset] = useState(0);
  const [statsKind, setStatsKind] = useState<StatsKind>('all');
  const [statsFilter, setStatsFilter] = useState<HistoryFilterFields>({ ...defaultHistoryListFilter(), kind: 'all' });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [detailUi, setDetailUi] = useState<DetailUi | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 300); return () => clearTimeout(t); }, [search]);

  const info = useMemo(() => getPeriodWindow(period, offset), [period, offset]);
  const tz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );
  const summaryQ = usePeriodSummary(period, offset);
  const prevSummaryQ = usePeriodSummary(period, offset - 1);
  const trendQ = usePeriodTrend(period, offset, tz);
  const expQ = useStatsAggregates(period, offset, 'expense', statsKind !== 'income');
  const incQ = useStatsAggregates(period, offset, 'income', statsKind !== 'expense');

  const sortedExpense = useMemo(() => buildSorted(expQ.aggRows, categoriesExpense, 'expense'), [expQ.aggRows, categoriesExpense]);
  const sortedIncome = useMemo(() => buildSorted(incQ.aggRows, categoriesIncome, 'income'), [incQ.aggRows, categoriesIncome]);
  const activeSorted = statsKind === 'income' ? sortedIncome : sortedExpense;
  const term = debouncedSearch.trim().toLowerCase();
  const sortedFiltered = useMemo(() => !term ? activeSorted : activeSorted.filter((s) => s.cat.label.toLowerCase().includes(term)), [activeSorted, term]);
  const filteredExpense = useMemo(() => !term ? sortedExpense : sortedExpense.filter((s) => s.cat.label.toLowerCase().includes(term)), [sortedExpense, term]);
  const filteredIncome = useMemo(() => !term ? sortedIncome : sortedIncome.filter((s) => s.cat.label.toLowerCase().includes(term)), [sortedIncome, term]);

  const summary = summaryQ.summary;
  const net = (summary?.total_income ?? 0) - (summary?.total_expense ?? 0);
  const prevNet = (prevSummaryQ.summary?.total_income ?? 0) - (prevSummaryQ.summary?.total_expense ?? 0);
  const topExpense = sortedExpense[0];
  const topIncome = sortedIncome[0];
  const chartData = trendQ.trend.map((p, i) => ({ id: `${p.key}-${i}`, label: period === 'daily' ? `${String(Number(p.key)).padStart(2, '0')}:00` : period === 'yearly' ? new Date(p.key).toLocaleDateString('en-IN', { month: 'short' }) : new Date(p.key).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), expense: p.expense, income: p.income }));
  const paceUnit = period === 'daily' ? 'hour' : period === 'yearly' ? 'month' : 'day';
  const avgSpend = chartData.length ? (summary?.total_expense ?? 0) / chartData.length : 0;
  const avgIncome = chartData.length ? (summary?.total_income ?? 0) / chartData.length : 0;
  const savingsRate = summary?.total_income ? (net / summary.total_income) * 100 : 0;
  const breakdownTotal = sortedFiltered.reduce((a, s) => a + s.amt, 0);
  const statsError = expQ.error || incQ.error || summaryQ.error || trendQ.error || prevSummaryQ.error;

  const detailFilter = useMemo((): StatsDetailFilter | null => detailUi ? { ...mergeStatsDetailFilter(detailUi.base, statsFilter), search: debouncedSearch } : null, [detailUi, statsFilter, debouncedSearch]);
  const detailQ = useStatsDetailTransactions(detailFilter);
  const openTotalDetail = (kind: StatsKind) => setDetailUi({ title: kind === 'all' ? 'All transactions' : kind === 'income' ? 'Income' : 'Expenses', subtitle: info.sub, base: { fromIso: info.start.toISOString(), toIsoExclusive: info.end.toISOString(), kind, categoryScopeKey: `totals:${kind}`, categoryId: null, uncategorizedOnly: false } });
  const openCategoryDetail = (row: BreakdownRow) => setDetailUi({ title: row.cat.label, subtitle: `${formatMoney(row.amt, currency)} · ${info.sub}`, base: { fromIso: info.start.toISOString(), toIsoExclusive: info.end.toISOString(), kind: row.breakdownKind, categoryScopeKey: row.rowKey === 'uncat' ? 'cat:uncat' : `cat:${row.cat.id}`, categoryId: row.rowKey === 'uncat' ? null : row.cat.id, uncategorizedOnly: row.rowKey === 'uncat' } });

  const tooltipFormatter = (value: unknown, key: unknown) => [formatMoney(Number(value ?? 0), currency), String(key) === 'expense' ? 'Expense' : 'Income'] as [string, string];
  return <div style={{ paddingBottom: 8, width: '100%', minWidth: 0, flex: '1 1 auto' }}><div className="period-seg"><div className={`period-seg-thumb period-seg-thumb--${period}`} style={{ left: `calc(${PERIODS.findIndex((p) => p.id === period) * 25}% + 3px)`, width: 'calc(25% - 3px)' }} />{PERIODS.map((p) => <button key={p.id} type="button" className="period-seg-btn" onClick={() => { setPeriod(p.id); setOffset(0); }} style={{ color: period === p.id ? '#0F0F12' : '#ACACB8' }}>{p.label}</button>)}</div><div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px 0' }}><button type="button" onClick={() => setOffset((o) => o - 1)} style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: 'none', display: 'grid', placeItems: 'center' }}><IChevLeft size={16} /></button><div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: 15, fontWeight: 700 }}>{info.label}</div><div style={{ fontSize: 11, color: '#ACACB8' }}>{info.sub}</div></div><button type="button" disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(0, o + 1))} style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: 'none', display: 'grid', placeItems: 'center', opacity: offset >= 0 ? 0.35 : 1 }}><IChevRight size={16} /></button></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, padding: '14px 16px 0' }}><StatTile label="Income" value={formatMoney(summary?.total_income ?? 0, currency)} hint={formatDelta(summary?.total_income ?? 0, prevSummaryQ.summary?.total_income ?? 0)} tone="positive" onClick={() => openTotalDetail('income')} /><StatTile label="Expenses" value={formatMoney(summary?.total_expense ?? 0, currency)} hint={formatDelta(summary?.total_expense ?? 0, prevSummaryQ.summary?.total_expense ?? 0)} tone="neutral" onClick={() => openTotalDetail('expense')} /><StatTile label="Net cashflow" value={`${net >= 0 ? '+' : '−'}${formatMoney(Math.abs(net), currency)}`} hint={formatDelta(net, prevNet)} tone={net >= 0 ? 'positive' : 'negative'} onClick={() => openTotalDetail('all')} /><StatTile label="Savings rate" value={`${savingsRate.toFixed(0)}%`} hint={`${summary?.income_txn_count ?? 0} income txns`} tone={savingsRate >= 20 ? 'positive' : savingsRate < 0 ? 'negative' : 'neutral'} onClick={() => openTotalDetail('all')} /></div><div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 20, padding: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div style={{ fontSize: 15, fontWeight: 700 }}>Cashflow trend</div><div style={{ fontSize: 11, color: '#ACACB8' }}>{paceUnit === 'hour' ? 'Hourly' : paceUnit === 'day' ? 'Daily' : 'Monthly'}</div></div><div style={{ height: 210 }}>{trendQ.loading || summaryQ.loading ? <div className="loading-panel-placeholder" style={{ height: '100%', borderRadius: 12 }} /> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDEDF2" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8C8C99' }} interval="preserveStartEnd" /><YAxis tick={{ fontSize: 10, fill: '#8C8C99' }} width={42} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} /><Tooltip formatter={tooltipFormatter} /><Area type="monotone" dataKey="income" stroke="#22A06B" fill="#DCFCE7" strokeWidth={2} /><Area type="monotone" dataKey="expense" stroke="#F43F5E" fill="#FFE4E6" strokeWidth={2} /></AreaChart></ResponsiveContainer>}</div></div><KeyInsightsSection topExpense={topExpense} topIncome={topIncome} avgSpend={avgSpend} avgIncome={avgIncome} paceUnit={paceUnit} currency={currency} onCategoryPress={openCategoryDetail} /><div className="seg" style={{ margin: '14px 16px 0' }}><div className={`seg-thumb${statsKind === 'all' ? ' seg-thumb--slate' : statsKind === 'expense' ? ' seg-thumb--rose' : ' seg-thumb--emerald'}`} style={{ left: KIND_OPTIONS.findIndex((k) => k.id === statsKind) === 0 ? 3 : `calc(${KIND_OPTIONS.findIndex((k) => k.id === statsKind) * (100 / 3)}%)`, width: 'calc(33.33% - 2px)' }} />{KIND_OPTIONS.map((k) => <button key={k.id} type="button" className={`seg-btn${statsKind === k.id ? ' active' : ''}`} onClick={() => { setStatsKind(k.id); setStatsFilter((prev) => ({ ...prev, kind: k.id, categoryId: null, uncategorizedOnly: false })); }} style={{ color: statsKind === k.id ? '#0F0F12' : '#ACACB8' }}>{k.label}</button>)}</div><div style={{ display: 'flex', gap: 8, margin: '12px 16px 0' }}><div className="search-wrap search-wrap--with-side" style={{ margin: 0, flex: 1, minWidth: 0 }}><ISearch size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#ACACB8' }} /><input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter categories..." /></div><button type="button" className={`history-filter-btn${hasAdvancedHistoryFilters(statsFilter) ? ' history-filter-btn--active' : ''}`} aria-label="Filters" onClick={() => setFilterSheetOpen(true)}><IFilter size={20} stroke={2} /></button></div>{statsError && <div style={{ textAlign: 'center', padding: '8px 16px', color: '#FF4D6D', fontSize: 13 }}>{statsError}</div>}{(expQ.loading || incQ.loading) ? <div className="loading-panel-placeholder" style={{ margin: '12px 16px 0', borderRadius: 20, height: 190 }} /> : statsKind === 'all' ? <><BreakdownSection title="Spending by category" rows={filteredExpense} total={filteredExpense.reduce((a, s) => a + s.amt, 0)} currency={currency} onRow={openCategoryDetail} /><BreakdownSection title="Income by category" rows={filteredIncome} total={filteredIncome.reduce((a, s) => a + s.amt, 0)} currency={currency} onRow={openCategoryDetail} /></> : <BreakdownSection title={statsKind === 'income' ? 'Income by category' : 'Spending by category'} rows={sortedFiltered} total={breakdownTotal || 1} currency={currency} onRow={openCategoryDetail} />}<HistoryFilterSheet open={filterSheetOpen} applied={{ ...statsFilter, search: debouncedSearch }} categoriesExpense={categoriesExpense} categoriesIncome={categoriesIncome} dateFallback={{ fromIso: info.start.toISOString(), toIsoExclusive: info.end.toISOString() }} onClose={() => setFilterSheetOpen(false)} onApply={(patch) => { setStatsFilter((prev) => ({ ...prev, ...patch })); setStatsKind(patch.kind); }} onClear={() => { setStatsFilter({ ...defaultHistoryListFilter(), kind: 'all' }); setStatsKind('all'); setSearch(''); }} /><AnimatePresence>{detailUi ? <StatsDetailSheet key={detailFilter?.rangeKey ?? detailUi.base.categoryScopeKey} open title={detailUi.title} subtitle={detailUi.subtitle} rows={detailQ.rows} loading={detailQ.loading} loadingMore={detailQ.loadingMore} hasMore={detailQ.hasMore} error={detailQ.error} onLoadMore={detailQ.loadMore} onClose={() => setDetailUi(null)} resolveCat={resolveCat} currency={currency} onTxnPress={onTxnPress ? (txn) => { setDetailUi(null); onTxnPress(txn); } : undefined} /> : null}</AnimatePresence></div>;
}

function StatTile({ label, value, hint, tone, onClick }: { label: string; value: string; hint: string; tone: 'positive' | 'negative' | 'neutral'; onClick: () => void }) {
  const color = tone === 'positive' ? '#15803D' : tone === 'negative' ? '#BE123C' : '#0F0F12';
  return <button type="button" onClick={onClick} style={{ background: '#fff', border: 'none', borderRadius: 16, padding: '12px 10px', textAlign: 'left' }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: '#ACACB8', textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color }}>{value}</div><div style={{ fontSize: 11, color: '#8C8C99', marginTop: 4 }}>{hint}</div></button>;
}
function BreakdownSection({ title, rows, total, currency, onRow }: { title: string; rows: BreakdownRow[]; total: number; currency: string; onRow: (r: BreakdownRow) => void }) {
  return <div style={{ padding: '8px 16px 0', marginBottom: 8 }}><div style={{ fontSize: 15, fontWeight: 700, padding: '12px 4px 10px' }}>{title}</div><div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden' }}>{rows.length === 0 ? <div style={{ padding: '20px 16px', textAlign: 'center', color: '#ACACB8', fontSize: 14 }}>Nothing here yet</div> : rows.map((s, idx) => <button key={`${s.rowKey}-${idx}`} type="button" onClick={() => onRow(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', width: '100%', border: 'none', borderBottom: '1px solid #F5F5F8', background: '#fff', textAlign: 'left' }}><CatIcon cat={s.cat} size={40} radius={12} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{s.cat.label}</span><span style={{ fontSize: 14, fontWeight: 700 }}>{formatMoney(s.amt, currency)}</span></div><div style={{ height: 5, borderRadius: 999, background: '#F0F0F5', overflow: 'hidden' }}><div style={{ height: '100%', width: `${(s.amt / total) * 100}%`, background: s.cat.tint, borderRadius: 999 }} /></div>{s.txnCount > 0 && <div style={{ fontSize: 11, color: '#ACACB8', marginTop: 5 }}>{s.txnCount} transaction{s.txnCount === 1 ? '' : 's'}</div>}</div><span style={{ fontSize: 12, color: '#ACACB8', minWidth: 32, textAlign: 'right' }}>{((s.amt / total) * 100).toFixed(0)}%</span></button>)}</div></div>;
}
