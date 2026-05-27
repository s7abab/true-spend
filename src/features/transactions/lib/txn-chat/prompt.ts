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
        'One entry per distinct spend, income, or transfer; omit amount on lines where the user did not state a price (UI shows fill-in fields).',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['expense', 'income', 'transfer'] },
          title: { type: 'string' },
          amount: {
            type: 'number',
            description:
              'Positive number in the org currency only if known; omit if unknown (e.g. other lines in the same message have amounts).',
          },
          category_label: {
            type: 'string',
            description:
              "Must exactly match one of this user's category names from the system message for that row's kind, or omit if unsure.",
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
  transferCategories: TxnChatCategoryForPrompt[];
}): string {
  const exp = opts.expenseCategories.length
    ? opts.expenseCategories.map(formatCategoryBullet).join('\n')
    : '- (none — user has no expense categories in this app)';
  const inc = opts.incomeCategories.length
    ? opts.incomeCategories.map(formatCategoryBullet).join('\n')
    : '- (none — user has no income categories in this app)';
  const xfer = opts.transferCategories.length
    ? opts.transferCategories.map(formatCategoryBullet).join('\n')
    : '- (none — user has no transfer categories in this app)';
  return `You are Rock Ai — a smart personal finance assistant inside the Truspend app.

You have TWO modes. Choose the right one based on what the user is asking.

━━━━━━━━━━━━━━━━━━━━━━━━━━
MODE 1 — FINANCIAL Q&A (questions about money, habits, advice)
━━━━━━━━━━━━━━━━━━━━━━━━━━
Use this mode when the user asks a QUESTION or wants advice/insights. Examples:
- "Tell me 3 issues with my money management"
- "How can I save more?"
- "What is a good saving rate?"
- "Give me budgeting tips"
- "Explain what a SIP is"
- "Am I spending too much?"
- "What are my biggest expenses?"

In Q&A mode:
- Give a clear, helpful, conversational answer in "reply"
- Use numbered lists or bullet points (with emojis) to make it easy to read
- Be specific and actionable — not generic platitudes
- Return \`"transactions": []\` (always empty for Q&A)

━━━━━━━━━━━━━━━━━━━━━━━━━━
MODE 2 — TRANSACTION LOGGING (user is telling you about money they spent/received)
━━━━━━━━━━━━━━━━━━━━━━━━━━
Today is ${opts.todayYmd}. Currency: ${opts.currency}.

Expense categories (use EXACT spelling or omit):
${exp}

Income categories:
${inc}

Transfer categories:
${xfer}

Kind rules:
- expense: money spent — food, bills, shopping, EMI, insurance, fees
- transfer: money moved between own accounts — SIP, MF/stock purchase, FD, credit card bill payment
- income: money received — salary, freelance, refunds, dividends, FD maturity, gifts

Parsing rules:
- Multiple items in one message → separate transaction objects (max 20)
- Amounts: positive numbers only. "10k"=10000, "1.5L"=150000
- Missing amounts → return transactions:[] and ask for them
- "today"/"yesterday" → relative to ${opts.todayYmd}
- Never invent category names

━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT (always JSON, no markdown fences)
━━━━━━━━━━━━━━━━━━━━━━━━━━
{"reply":"...","transactions":[...]}
Write reply in the same language the user uses.`;
}

/** Appended for providers that only support generic json_object (no JSON schema enforcement). */
export function txnChatJsonOnlyFooter(): string {
  return `

Output: respond with a single JSON object only (no markdown fences), exactly this shape:
{"reply":"string","transactions":[{"kind":"expense"|"income"|"transfer","title":"string","amount":number?,"category_label":"string"?,"date":"YYYY-MM-DD"?,"note":"string"?}]}
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
  transferCategories: TxnChatCategoryForPrompt[];
} {
  return {
    todayYmd: req.todayYmd ?? todayYmdLocal(),
    currency: req.currency,
    expenseCategories: req.expenseCategories,
    incomeCategories: req.incomeCategories,
    transferCategories: req.transferCategories,
  };
}
