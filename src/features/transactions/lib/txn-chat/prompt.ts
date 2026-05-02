import type { TxnChatTurnRequest } from '@/features/transactions/lib/txn-chat/types';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar YYYY-MM-DD */
export function todayYmdLocal(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export const TXN_CHAT_RESPONSE_JSON_SCHEMA = {
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

export function buildTxnChatSystemInstruction(opts: {
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

/** Appended for providers that only support generic json_object (no JSON schema enforcement). */
export function txnChatJsonOnlyFooter(): string {
  return `

Output: respond with a single JSON object only (no markdown fences), exactly this shape:
{"reply":"string","transactions":[{"kind":"expense"|"income","title":"string","amount":number?,"category_label":"string"?,"date":"YYYY-MM-DD"?,"note":"string"?}]}
All keys in "transactions" objects are optional except kind and title. Use [] for transactions when none.`;
}

export function buildTxnChatUserPayload(req: TxnChatTurnRequest, opts: { jsonReminder: boolean }): string {
  const body = req.priorTranscript.trim()
    ? `${req.priorTranscript.trim()}\n\nUser: ${req.userMessage}`
    : req.userMessage;
  if (!opts.jsonReminder) return body;
  return `${body}${txnChatJsonOnlyFooter()}`;
}

export function txnChatInstructionArgs(req: TxnChatTurnRequest): {
  todayYmd: string;
  currency: string;
  expenseLabels: string[];
  incomeLabels: string[];
} {
  return {
    todayYmd: req.todayYmd ?? todayYmdLocal(),
    currency: req.currency,
    expenseLabels: req.expenseLabels,
    incomeLabels: req.incomeLabels,
  };
}
