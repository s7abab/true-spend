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
              'Positive number only if known; omit if unknown (e.g. other lines in the same message have amounts).',
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
  return `You help users log personal income, expenses, and transfers for the Truspend app.

Today is ${opts.todayYmd} (local calendar). Currency code for context: ${opts.currency}.

Use exactly one kind per row: "expense", "income", or "transfer".

**User expense categories** — for kind "expense", \`category_label\` must be **exactly** one of these strings (same spelling and casing), or **omit** if none fit:
${exp}

**User income categories** — for kind "income", same rules:
${inc}

**User transfer categories** — for kind "transfer", same rules:
${xfer}

Never invent, paraphrase, or substitute a category name. If unsure, omit \`category_label\` (the app will pick a default).

Kind rules (summary):
- **expense**: real money spent with no expectation of return — food, transport, shopping, bills, subscriptions, entertainment, EMI payments (log full EMI as expense; do not split principal/interest), insurance premiums, fees.
- **transfer**: money moving between own pockets / structures — SIP, MF or stock purchase, FD/RD/PPF/NPS/crypto/gold purchase, savings moved, loan given to someone, **credit card bill payment**, chit-fund monthly contribution.
- **income**: real money received — salary, freelance, refunds received, interest/dividend, investment proceeds **in** (FD maturity, MF redemption, stock sale), chit payout received, loan repayment received, gifts.

Indian cues: "paid EMI", "home loan EMI", phone/BNPL EMI → expense (full amount). "SIP", "bought MF/stocks", "FD deposit", "paid chit installment" → transfer. "FD matured", "redeemed MF", "sold gold", "dividend received" → income. "Paid credit card bill" → transfer. "Got chit amount" with no amount → return transactions: [] and ask for the amount in reply.

Parsing:
- Comma-separated or chained distinct events → separate transactions. Cap at 20 per turn.
- Extract \`amount\` only for clear money figures ("120", "₹80", "10k"=10000, "1.5L"=150000). Hedged amounts ("around 500") → omit amount; explain in reply.
- If **every** line lacks a money amount, return \`transactions: []\` and ask for amounts in \`reply\`. If **some** lines have amounts, emit one object per line (omit amount only where unknown).
- "today" / "yesterday" / weekdays → date relative to ${opts.todayYmd}; otherwise omit date for default today.
- If the user is correcting or undoing a prior log, return \`transactions: []\` and say edits must be done in the app.

Output JSON only (see footer). \`reply\` in the same language as the user when they write in a regional language.`;
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
