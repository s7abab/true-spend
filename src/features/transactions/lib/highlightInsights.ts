import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/shared/lib/supabase';
import type { CategoryRow } from '@/features/categories/types';

export type MoneyInsightSlide = {
  id: string;
  emoji: string;
  /** Big number/metric displayed as the hero — e.g. "₹12,400" or "34%" */
  metric: string;
  /** Short label under the metric — e.g. "spent this month" */
  metricLabel: string;
  /** One-liner title — max 6 words */
  title: string;
  /** One plain-english sentence. No jargon. Max 20 words. */
  insight: string;
  /** Short action tip — max 12 words */
  tip: string;
  /** good | bad | neutral — drives color scheme */
  tone: 'good' | 'bad' | 'neutral';
  slideType:
    | 'overview'
    | 'top_expense'
    | 'saving_rate'
    | 'warning'
    | 'praise'
    | 'tip'
    | 'goal';
};

export type HighlightInsightsResult = {
  slides: MoneyInsightSlide[];
};

export type TransactionSummary = {
  kind: 'expense' | 'income' | 'transfer';
  title: string;
  amount: number;
  category: string;
  date: string;
};

export async function fetchRealTransactions(
  allCategories: CategoryRow[],
): Promise<TransactionSummary[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const catMap: Record<string, string> = {};
  for (const c of allCategories) {
    catMap[c.id] = c.label;
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data, error } = await supabase
    .from('transactions')
    .select('id, kind, category_id, amount, title, occurred_at')
    .eq('user_id', user.id)
    .gte('occurred_at', sixMonthsAgo.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(500);

  if (error || !data) return [];

  return data.map((row) => {
    const catLabel = row.category_id ? (catMap[row.category_id] ?? 'Other') : 'Other';
    const kind: TransactionSummary['kind'] =
      row.kind === 'income' ? 'income' : row.kind === 'transfer' ? 'transfer' : 'expense';
    const occurred = row.occurred_at ? new Date(row.occurred_at) : new Date();
    const ymd = `${occurred.getFullYear()}-${String(occurred.getMonth() + 1).padStart(2, '0')}-${String(occurred.getDate()).padStart(2, '0')}`;
    return {
      kind,
      title: row.title || '(untitled)',
      amount: Number(row.amount) || 0,
      category: catLabel,
      date: ymd,
    };
  });
}

const SCHEMA = {
  type: 'object',
  properties: {
    slides: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          emoji: { type: 'string' },
          metric: { type: 'string' },
          metricLabel: { type: 'string' },
          title: { type: 'string' },
          insight: { type: 'string' },
          tip: { type: 'string' },
          tone: { type: 'string', enum: ['good', 'bad', 'neutral'] },
          slideType: {
            type: 'string',
            enum: ['overview', 'top_expense', 'saving_rate', 'warning', 'praise', 'tip', 'goal'],
          },
        },
        required: ['id', 'emoji', 'metric', 'metricLabel', 'title', 'insight', 'tip', 'tone', 'slideType'],
      },
    },
  },
  required: ['slides'],
} as const;

const SYSTEM_PROMPT = `You are a personal finance coach inside "Rock Ai" app.
Generate 5–6 short, simple money insight cards from the user's transaction data.

RULES — follow strictly:
- "metric": the single most important number for this slide (e.g. "₹8,400" or "23%" or "₹340/day"). Always include currency symbol.
- "metricLabel": 3–5 words describing what the metric is (e.g. "spent on food" or "saving rate" or "biggest expense")
- "title": max 5 words, plain English, no jargon (e.g. "Food is eating your money" or "You saved well!")
- "insight": exactly 1 sentence, plain English, max 20 words. Real numbers only. No jargon.
- "tip": one clear action, max 12 words, starts with a verb (e.g. "Try cooking at home 3 days a week")
- "tone": "good" if positive, "bad" if concerning, "neutral" for informational
- Use "bad" tone sparingly — only if genuinely problematic

REQUIRED slide types (one each):
1. overview — total income vs total spent this period
2. top_expense — biggest spending category  
3. saving_rate — how much they saved (income minus expenses)
4. warning — one real problem from the data (be specific)
5. praise — one genuine win from the data
6. tip — one powerful action they should take

Keep it SHORT. A 10-year-old should understand every slide. Output JSON only.`;

export async function generateMoneyHighlights(opts: {
  apiKey: string;
  transactions: TransactionSummary[];
  currency: string;
}): Promise<HighlightInsightsResult> {
  const { apiKey, transactions, currency } = opts;

  if (!transactions.length) return getFallbackSlides(currency);

  const totalIncome = transactions.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalTransfer = transactions.filter((t) => t.kind === 'transfer').reduce((s, t) => s + t.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(0) : '0';

  const expensesByCategory: Record<string, number> = {};
  transactions.filter((t) => t.kind === 'expense').forEach((t) => {
    expensesByCategory[t.category] = (expensesByCategory[t.category] ?? 0) + t.amount;
  });

  const topCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([cat, amt]) => {
      const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(0) : '0';
      return `${cat}: ${currency}${amt.toFixed(0)} (${pct}%)`;
    });

  const daysWithData = new Set(transactions.map((t) => t.date)).size;
  const avgDailyExpense = daysWithData > 0 ? (totalExpense / daysWithData).toFixed(0) : '0';

  const prompt = `Transaction data — last 6 months:

Currency: ${currency}
Total Income: ${currency}${totalIncome.toFixed(0)}
Total Expenses: ${currency}${totalExpense.toFixed(0)}
Investments/Transfers: ${currency}${totalTransfer.toFixed(0)}
Net Savings: ${currency}${netSavings.toFixed(0)}
Saving Rate: ${savingRate}%
Daily Avg Spend: ${currency}${avgDailyExpense}
Transaction count: ${transactions.length}

Top spending categories:
${topCategories.join('\n') || 'No expense data'}

Generate 5–6 simple insight slides. Use the exact numbers above. Keep every sentence under 20 words.`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseJsonSchema: { ...(SCHEMA as Record<string, unknown>) },
      temperature: 0.5,
    },
  });

  const rawText = response.text;
  if (!rawText?.trim()) throw new Error('Empty response from Gemini');
  return JSON.parse(rawText) as HighlightInsightsResult;
}

function getFallbackSlides(currency: string): HighlightInsightsResult {
  return {
    slides: [
      {
        id: 'empty',
        emoji: '📭',
        metric: '0',
        metricLabel: 'transactions found',
        title: 'No data yet',
        insight: 'Start logging transactions to see your personalized money insights.',
        tip: 'Add your first transaction using the chat',
        tone: 'neutral',
        slideType: 'overview',
      },
      {
        id: 'tip1',
        emoji: '💡',
        metric: '20%',
        metricLabel: 'more savings on average',
        title: 'Tracking works',
        insight: `People who track spending save ${currency}200 more every month on average.`,
        tip: 'Log your next 5 expenses to get started',
        tone: 'good',
        slideType: 'tip',
      },
    ],
  };
}
