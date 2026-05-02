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
  /** Omitted or null when the user did not give an amount yet — ask, then fill on a follow-up. */
  amount?: number | null;
  category_label?: string | null;
  /** YYYY-MM-DD; omit or null → app defaults to today. */
  date?: string | null;
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
      description:
        'Short friendly message. If amount is missing, ask one clear question (e.g. how much?). Otherwise summarize.',
    },
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['expense', 'income'] },
          title: { type: 'string' },
          amount: { type: 'number', description: 'Positive number only if known; omit if unknown.' },
          category_label: { type: 'string', description: 'Best match from list, or omit if unsure.' },
          date: { type: 'string', description: 'YYYY-MM-DD or omit for today.' },
          note: { type: 'string' },
        },
        required: ['kind', 'title'],
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
- amount: include a positive number only when the user gave a clear amount in money (not counts like "5 apples" unless they also gave a price). If they did not give a money amount, omit amount or set null and ask in reply what the amount was.
- date: YYYY-MM-DD when you can infer it ("today", "yesterday", weekdays → relative to ${opts.todayYmd}). If not mentioned, omit date or null (the app will default to today).
- category_label: pick from the list for that kind when possible; omit or null if unsure (the app will default to a category they can change).
- title is a short human-readable label (a few words).
- If the message is not about money or nothing can be parsed, return transactions: [] and reply explaining what you need.
- Follow-up messages: merge prior context; when the user only sends a number, treat it as the missing amount for the last open item when obvious.`;
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
    if (!title) continue;
    const rawAmt = r.amount;
    let amount: number | null = null;
    if (rawAmt != null && typeof rawAmt === 'number' && Number.isFinite(rawAmt) && rawAmt > 0) {
      amount = rawAmt;
    } else if (rawAmt != null && typeof rawAmt === 'string' && rawAmt.trim()) {
      const n = Number(rawAmt);
      if (Number.isFinite(n) && n > 0) amount = n;
    }
    const category_label =
      typeof r.category_label === 'string' && r.category_label.trim() ? r.category_label.trim() : null;
    const dateRaw = typeof r.date === 'string' ? r.date.trim() : '';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;
    const note = typeof r.note === 'string' ? r.note.trim() : null;
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
