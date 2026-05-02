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
        'Short friendly message. If amounts are missing, list what you understood and ask for each amount; when transactions is empty, do not imply forms were created.',
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
- Extract every separate transaction the user describes in one reply **only when each line has a clear money amount** in ${opts.currency} (e.g. "120", "₹80", "50 rs"). Counts or quantities alone ("5 apples", "two coffees") are **not** money — do not guess a price.
- **If the user lists spending/income but no line has an explicit money amount**, return \`transactions: []\`. In \`reply\`, briefly mirror what you understood (titles/categories if clear) and ask for **each** missing amount in one short message. Do **not** emit transaction rows with missing amounts in that case — the app will show cards only when amounts exist so the user is not stuck with empty forms.
- If **some** lines have amounts and **some** do not, include only rows that have a positive \`amount\`; in \`reply\`, note any items still missing amounts and ask for those.
- kind "expense" for spending, purchases, bills, fees. kind "income" for salary, freelance pay, refunds received, interest, gifts received, etc.
- amount: positive number only when clearly stated as money for that line. Never invent or estimate amounts.
- date: YYYY-MM-DD when you can infer it ("today", "yesterday", weekdays → relative to ${opts.todayYmd}). If not mentioned, omit date or null (the app will default to today).
- category_label: pick from the list for that kind when possible; omit or null if unsure (the app will default to a category they can change).
- title is a short human-readable label (a few words).
- If the message is not about money or nothing can be parsed, return transactions: [] and reply explaining what you need.
- Follow-up messages: merge prior context; when the user sends amounts (one number, or several like "80 and 500" / "apples 50 movie 800"), emit the matching \`transactions\` with titles and amounts filled.`;
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
