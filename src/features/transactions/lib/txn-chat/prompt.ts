import type { TxnChatCategoryForPrompt, TxnChatTurnRequest } from '@/features/transactions/lib/txn-chat/types';

function formatCategoryBullet(c: TxnChatCategoryForPrompt): string {
  return `- ${JSON.stringify(c.label)}`;
}

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
      description:
        'One entry per distinct spend/income; omit amount on lines where the user did not state a price (UI shows fill-in fields).',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['expense', 'income'] },
          title: { type: 'string' },
          amount: { type: 'number', description: 'Positive number only if known; omit if unknown (e.g. other lines in the same message have amounts).' },
          category_label: {
            type: 'string',
            description:
              'Must exactly match one of this user\'s category names from the system message for that row\'s kind (expense vs income), or omit if unsure.',
          },
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
  expenseCategories: TxnChatCategoryForPrompt[];
  incomeCategories: TxnChatCategoryForPrompt[];
}): string {
  const exp = opts.expenseCategories.length
    ? opts.expenseCategories.map(formatCategoryBullet).join('\n')
    : '- (none — user has no expense categories in this app)';
  const inc = opts.incomeCategories.length
    ? opts.incomeCategories.map(formatCategoryBullet).join('\n')
    : '- (none — user has no income categories in this app)';
  return `You help users log personal income and expenses for the Truspend app.

Today is ${opts.todayYmd} (local calendar). Currency code for context: ${opts.currency}.

**User expense categories** (names they configured in Truspend — these are not fixed defaults; they differ per user).
For any row with kind "expense", \`category_label\` must be **exactly** one of these strings (same spelling and casing), or **omit** \`category_label\` if none fit:
${exp}

**User income categories** (same rules — exact match or omit):
${inc}

Never invent, paraphrase, or substitute a category name that is not in the matching list for that row's kind. If unsure, omit \`category_label\` (the app will pick a default they can edit).

Rules:
- Treat comma-separated or chained phrases ("coffee, tea, movie 500") as **separate** candidate transactions when each chunk is clearly a different spend or income event.
- Extract every separate transaction the user describes. Use a positive \`amount\` only when that line has a clear money figure in ${opts.currency} (e.g. "120", "₹80", "10k", "50 rs"). Counts or quantities alone ("5 apples", "two coffees") are **not** money — do not guess a price; **omit** \`amount\` (or null) for that line.
- **If the user lists spending/income but no line has an explicit money amount**, return \`transactions: []\`. In \`reply\`, mirror what you understood and ask for each missing amount. Do **not** emit rows when **every** line lacks a money amount (no empty draft cards for an all-vague message).
- If **some** lines have amounts and **some** do not: emit **one object per item** for **all** of them — include \`title\` (and \`kind\` when clear); use a positive \`amount\` only where stated; **omit** \`amount\` for lines still unknown so the app can show fill-in cards next to the priced rows.
- kind "expense" for spending, purchases, bills, fees, entertainment, food, transport, and **money put into investments / savings** ("invested", "SIP", "bought MF", "stocks") — that is cash going out of the wallet. kind "income" for salary, freelance pay, refunds received, interest, gifts received, **proceeds from selling** investments, dividends, etc. Never label "invested X" as income unless they explicitly received that money.
- amount: positive number only when clearly stated as money for that line. Never invent or estimate amounts.
- date: YYYY-MM-DD when you can infer it ("today", "yesterday", weekdays → relative to ${opts.todayYmd}). If not mentioned, omit date or null (the app will default to today).
- category_label: only from the **user expense** or **user income** lists above for that row's kind; exact string match; omit if unsure.
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
  expenseCategories: TxnChatCategoryForPrompt[];
  incomeCategories: TxnChatCategoryForPrompt[];
} {
  return {
    todayYmd: req.todayYmd ?? todayYmdLocal(),
    currency: req.currency,
    expenseCategories: req.expenseCategories,
    incomeCategories: req.incomeCategories,
  };
}
