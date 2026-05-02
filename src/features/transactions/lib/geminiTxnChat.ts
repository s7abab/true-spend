import { GoogleGenAI } from '@google/genai';

export const GEMINI_TXN_MODEL = 'gemini-2.5-flash';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar YYYY-MM-DD */
function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export type GeminiDraftTransaction = {
  kind: 'expense' | 'income';
  title: string;
  amount: number;
  category_label: string;
  date: string;
  note?: string | null;
};

export type GeminiTxnChatResult = {
  reply: string;
  transactions: GeminiDraftTransaction[];
};

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Short friendly message; summarize parsed transactions or ask a clarifying question.',
    },
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['expense', 'income'] },
          title: { type: 'string' },
          amount: { type: 'number' },
          category_label: { type: 'string' },
          date: { type: 'string', description: 'Calendar date YYYY-MM-DD' },
          note: { type: 'string' },
        },
        required: ['kind', 'title', 'amount', 'category_label', 'date'],
      },
    },
  },
  required: ['reply', 'transactions'],
} as const;

function buildSystemInstruction(opts: {
  todayYmd: string;
  currency: string;
  expenseLabels: string[];
  incomeLabels: string[];
}): string {
  const exp = opts.expenseLabels.length ? opts.expenseLabels.map((l) => `- ${l}`).join('\n') : '- (none)';
  const inc = opts.incomeLabels.length ? opts.incomeLabels.map((l) => `- ${l}`).join('\n') : '- (none)';
  return `You help users log personal income and expenses for the Truspend app.

Today is ${opts.todayYmd} (local calendar). Currency code for context: ${opts.currency}.

Valid expense category_label values (exact strings when possible):
${exp}

Valid income category_label values (exact strings when possible):
${inc}

Rules:
- Extract every separate transaction the user describes in one reply.
- kind "expense" for spending, purchases, bills, fees. kind "income" for salary, freelance pay, refunds received, interest, gifts received, etc.
- amount is always a positive number (no currency symbols in JSON).
- date is always YYYY-MM-DD; resolve "today", "yesterday", weekdays relative to ${opts.todayYmd}.
- category_label must be chosen from the list for that kind; pick the closest synonym if the user uses different wording.
- title is a short human-readable label (a few words).
- If the message is not about money or nothing can be parsed, return transactions: [] and reply explaining what you need (amount, what it was for, etc.).`;
}

function normalizeGeminiResult(raw: unknown): GeminiTxnChatResult {
  if (!raw || typeof raw !== 'object') {
    return { reply: 'Could not read the model response.', transactions: [] };
  }
  const o = raw as Record<string, unknown>;
  const reply = typeof o.reply === 'string' ? o.reply : 'Here is what I found.';
  const txs = Array.isArray(o.transactions) ? o.transactions : [];
  const out: GeminiDraftTransaction[] = [];
  for (const row of txs) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const kind = r.kind === 'income' ? 'income' : 'expense';
    const title = typeof r.title === 'string' ? r.title.trim() : '';
    const amount = typeof r.amount === 'number' ? r.amount : Number(r.amount);
    const category_label = typeof r.category_label === 'string' ? r.category_label.trim() : '';
    const date = typeof r.date === 'string' ? r.date.trim() : '';
    const note = typeof r.note === 'string' ? r.note.trim() : null;
    if (!title || !Number.isFinite(amount) || amount <= 0 || !category_label || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      continue;
    }
    out.push({ kind, title, amount, category_label, date, note: note || null });
  }
  return { reply, transactions: out };
}

export function formatTxnChatTranscript(
  messages: readonly { role: 'user' | 'assistant'; text: string }[],
): string {
  const lines: string[] = [];
  for (const m of messages) {
    lines.push(m.role === 'user' ? `User: ${m.text}` : `Assistant: ${m.text}`);
  }
  return lines.join('\n\n');
}

export async function geminiTxnChatTurn(params: {
  apiKey: string;
  priorTranscript: string;
  userMessage: string;
  expenseLabels: string[];
  incomeLabels: string[];
  currency: string;
  /** Local calendar YYYY-MM-DD */
  todayYmd?: string;
}): Promise<GeminiTxnChatResult> {
  const todayYmd = params.todayYmd ?? toYmd(new Date());
  const ai = new GoogleGenAI({ apiKey: params.apiKey });
  const systemInstruction = buildSystemInstruction({
    todayYmd,
    currency: params.currency,
    expenseLabels: params.expenseLabels,
    incomeLabels: params.incomeLabels,
  });

  const body = params.priorTranscript.trim()
    ? `${params.priorTranscript.trim()}\n\nUser: ${params.userMessage}`
    : params.userMessage;

  const response = await ai.models.generateContent({
    model: GEMINI_TXN_MODEL,
    contents: body,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseJsonSchema: { ...(RESPONSE_JSON_SCHEMA as Record<string, unknown>) },
      temperature: 0.35,
    },
  });

  const rawText = response.text;
  if (!rawText?.trim()) {
    throw new Error('Empty response from Gemini');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error('Model returned invalid JSON');
  }
  return normalizeGeminiResult(parsed);
}
