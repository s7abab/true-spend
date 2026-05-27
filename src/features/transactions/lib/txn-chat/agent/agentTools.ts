/**
 * Agent tool definitions (Gemini FunctionDeclarations) and their
 * Supabase-backed implementations for the Rock Ai personal finance agent.
 *
 * All queries are scoped to the signed-in user via supabase.auth.getUser().
 * RLS on the `transactions` table enforces user isolation at the DB level.
 */
import { Type, type FunctionDeclaration } from '@google/genai';
import { supabase } from '@/shared/lib/supabase';

// ─── Tool call / result types ─────────────────────────────────────────────
export type ToolName =
  | 'get_spending_summary'
  | 'get_top_categories'
  | 'get_recent_transactions'
  | 'get_monthly_breakdown'
  | 'search_transactions'
  | 'get_daily_average';

export type ToolArgs = Record<string, unknown>;
export type ToolResult = Record<string, unknown>;

// ─── Status labels (shown in assistant bubble while running) ─────────────
export const TOOL_LABELS: Record<ToolName, string> = {
  get_spending_summary:    'Checking your income & expenses…',
  get_top_categories:      'Finding your top spending categories…',
  get_recent_transactions: 'Looking at recent transactions…',
  get_monthly_breakdown:   'Analyzing monthly trends…',
  search_transactions:     'Searching your transactions…',
  get_daily_average:       'Calculating your daily spend…',
};

// ─── Gemini function declarations ─────────────────────────────────────────
export const AGENT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'get_spending_summary',
    description:
      'Returns total income, total expenses, net savings, and transaction count for a date range.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        from_date: { type: Type.STRING, description: 'Start date YYYY-MM-DD (inclusive)' },
        to_date:   { type: Type.STRING, description: 'End date YYYY-MM-DD (inclusive)' },
      },
      required: ['from_date', 'to_date'],
    },
  },
  {
    name: 'get_top_categories',
    description:
      'Returns the top spending or income categories ranked by total amount for a date range.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        from_date: { type: Type.STRING, description: 'Start date YYYY-MM-DD' },
        to_date:   { type: Type.STRING, description: 'End date YYYY-MM-DD' },
        kind:      { type: Type.STRING, description: 'Transaction kind: expense | income | transfer | all' },
        limit:     { type: Type.NUMBER, description: 'Max categories to return (default 5)' },
      },
      required: ['from_date', 'to_date'],
    },
  },
  {
    name: 'get_recent_transactions',
    description: 'Returns recent transactions, optionally filtered by kind or category name.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit:     { type: Type.NUMBER, description: 'Max transactions (default 10, max 50)' },
        kind:      { type: Type.STRING, description: 'Filter by kind: expense | income | transfer | all' },
        category:  { type: Type.STRING, description: 'Filter by category name (partial, case-insensitive)' },
        from_date: { type: Type.STRING, description: 'Optional start date YYYY-MM-DD' },
        to_date:   { type: Type.STRING, description: 'Optional end date YYYY-MM-DD' },
      },
      required: [],
    },
  },
  {
    name: 'get_monthly_breakdown',
    description:
      'Returns month-by-month income and expense totals for the last N months.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        months: { type: Type.NUMBER, description: 'Number of past months (default 3, max 12)' },
      },
      required: [],
    },
  },
  {
    name: 'search_transactions',
    description: 'Searches transactions by title keyword.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query:     { type: Type.STRING, description: 'Search keyword (case-insensitive)' },
        from_date: { type: Type.STRING, description: 'Optional start date YYYY-MM-DD' },
        to_date:   { type: Type.STRING, description: 'Optional end date YYYY-MM-DD' },
        limit:     { type: Type.NUMBER, description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_daily_average',
    description: 'Returns the average daily expense for a date range.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        from_date: { type: Type.STRING, description: 'Start date YYYY-MM-DD' },
        to_date:   { type: Type.STRING, description: 'End date YYYY-MM-DD' },
      },
      required: ['from_date', 'to_date'],
    },
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────
async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

type CategoryJoin = { label: unknown } | null;
function catLabel(join: CategoryJoin): string {
  return (join && typeof (join as { label: unknown }).label === 'string')
    ? (join as { label: string }).label
    : 'Other';
}

// ─── Tool implementations ─────────────────────────────────────────────────
async function getSpendingSummary(args: ToolArgs, currency: string): Promise<ToolResult> {
  const userId = await getUserId();
  if (!userId) return { error: 'Not signed in' };
  const from = String(args.from_date);
  const to   = String(args.to_date);
  const { data, error } = await supabase
    .from('transactions')
    .select('kind, amount')
    .eq('user_id', userId)
    .gte('occurred_at', `${from}T00:00:00`)
    .lte('occurred_at', `${to}T23:59:59`);
  if (error) return { error: error.message };
  const rows = data ?? [];
  const income   = rows.filter(r => r.kind === 'income').reduce((s, r) => s + Number(r.amount), 0);
  const expense  = rows.filter(r => r.kind === 'expense').reduce((s, r) => s + Number(r.amount), 0);
  const transfer = rows.filter(r => r.kind === 'transfer').reduce((s, r) => s + Number(r.amount), 0);
  return {
    currency, from_date: from, to_date: to,
    total_income:   Math.round(income),
    total_expense:  Math.round(expense),
    total_transfer: Math.round(transfer),
    net_savings:    Math.round(income - expense),
    saving_rate_pct: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
    transaction_count: rows.length,
  };
}

async function getTopCategories(args: ToolArgs, currency: string): Promise<ToolResult> {
  const userId = await getUserId();
  if (!userId) return { error: 'Not signed in' };
  const from  = String(args.from_date);
  const to    = String(args.to_date);
  const kind  = String(args.kind ?? 'expense');
  const limit = Math.min(Number(args.limit ?? 5), 20);
  let query = supabase
    .from('transactions')
    .select('kind, amount, categories(label)')
    .eq('user_id', userId)
    .gte('occurred_at', `${from}T00:00:00`)
    .lte('occurred_at', `${to}T23:59:59`);
  if (kind !== 'all') query = query.eq('kind', kind);
  const { data, error } = await query;
  if (error) return { error: error.message };
  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    const cat = catLabel(row.categories as unknown as CategoryJoin);
    totals[cat] = (totals[cat] ?? 0) + Number(row.amount);
  }
  const sorted = Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([category, amount]) => ({ category, amount: Math.round(amount), currency }));
  return { kind, from_date: from, to_date: to, top_categories: sorted };
}

async function getRecentTransactions(args: ToolArgs, currency: string): Promise<ToolResult> {
  const userId = await getUserId();
  if (!userId) return { error: 'Not signed in' };
  const limit    = Math.min(Number(args.limit ?? 10), 50);
  const kind     = String(args.kind ?? 'all');
  const category = args.category ? String(args.category) : null;
  const from     = args.from_date ? String(args.from_date) : null;
  const to       = args.to_date ? String(args.to_date) : null;
  let query = supabase
    .from('transactions')
    .select('kind, amount, title, occurred_at, categories(label)')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (kind !== 'all') query = query.eq('kind', kind);
  if (from) query = query.gte('occurred_at', `${from}T00:00:00`);
  if (to)   query = query.lte('occurred_at', `${to}T23:59:59`);
  const { data, error } = await query;
  if (error) return { error: error.message };
  let rows = (data ?? []).map(r => ({
    title: r.title ?? '(untitled)',
    kind: r.kind,
    amount: Math.round(Number(r.amount)),
    category: catLabel(r.categories as unknown as CategoryJoin),
    date: r.occurred_at ? String(r.occurred_at).slice(0, 10) : '',
    currency,
  }));
  if (category) {
    const lower = category.toLowerCase();
    rows = rows.filter(r => r.category.toLowerCase().includes(lower));
  }
  return { transactions: rows, count: rows.length };
}

async function getMonthlyBreakdown(args: ToolArgs, currency: string): Promise<ToolResult> {
  const userId = await getUserId();
  if (!userId) return { error: 'Not signed in' };
  const months = Math.min(Number(args.months ?? 3), 12);
  const result: Array<{ month: string; income: number; expense: number; savings: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const year  = d.getFullYear();
    const month = d.getMonth() + 1;
    const from  = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to    = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    const { data } = await supabase
      .from('transactions')
      .select('kind, amount')
      .eq('user_id', userId)
      .gte('occurred_at', `${from}T00:00:00`)
      .lte('occurred_at', `${to}T23:59:59`);
    const rows = data ?? [];
    const income  = Math.round(rows.filter(r => r.kind === 'income').reduce((s, r) => s + Number(r.amount), 0));
    const expense = Math.round(rows.filter(r => r.kind === 'expense').reduce((s, r) => s + Number(r.amount), 0));
    result.push({ month: `${year}-${String(month).padStart(2, '0')}`, income, expense, savings: income - expense });
  }
  return { currency, months: result };
}

async function searchTransactions(args: ToolArgs, currency: string): Promise<ToolResult> {
  const userId = await getUserId();
  if (!userId) return { error: 'Not signed in' };
  const query = String(args.query);
  const limit = Math.min(Number(args.limit ?? 10), 50);
  const from  = args.from_date ? String(args.from_date) : null;
  const to    = args.to_date ? String(args.to_date) : null;
  let q = supabase
    .from('transactions')
    .select('kind, amount, title, occurred_at, categories(label)')
    .eq('user_id', userId)
    .ilike('title', `%${query}%`)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (from) q = q.gte('occurred_at', `${from}T00:00:00`);
  if (to)   q = q.lte('occurred_at', `${to}T23:59:59`);
  const { data, error } = await q;
  if (error) return { error: error.message };
  const rows = (data ?? []).map(r => ({
    title: r.title ?? '(untitled)',
    kind: r.kind,
    amount: Math.round(Number(r.amount)),
    category: catLabel(r.categories as unknown as CategoryJoin),
    date: r.occurred_at ? String(r.occurred_at).slice(0, 10) : '',
    currency,
  }));
  return { query, results: rows, count: rows.length };
}

async function getDailyAverage(args: ToolArgs, currency: string): Promise<ToolResult> {
  const userId = await getUserId();
  if (!userId) return { error: 'Not signed in' };
  const from = String(args.from_date);
  const to   = String(args.to_date);
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, occurred_at')
    .eq('user_id', userId)
    .eq('kind', 'expense')
    .gte('occurred_at', `${from}T00:00:00`)
    .lte('occurred_at', `${to}T23:59:59`);
  if (error) return { error: error.message };
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const days  = Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1);
  return { currency, from_date: from, to_date: to, total_expense: Math.round(total), days, daily_average: Math.round(total / days) };
}

// ─── Dispatch ─────────────────────────────────────────────────────────────
export async function executeAgentTool(name: string, args: ToolArgs, currency: string): Promise<ToolResult> {
  switch (name as ToolName) {
    case 'get_spending_summary':    return getSpendingSummary(args, currency);
    case 'get_top_categories':      return getTopCategories(args, currency);
    case 'get_recent_transactions': return getRecentTransactions(args, currency);
    case 'get_monthly_breakdown':   return getMonthlyBreakdown(args, currency);
    case 'search_transactions':     return searchTransactions(args, currency);
    case 'get_daily_average':       return getDailyAverage(args, currency);
    default: return { error: `Unknown tool: ${name}` };
  }
}
