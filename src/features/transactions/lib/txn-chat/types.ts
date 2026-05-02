/** One parsed line item from the model (before category id resolution in the UI). */
export type TxnChatDraftTransaction = {
  kind: 'expense' | 'income';
  title: string;
  /** Omitted or null when the user did not give an amount yet — ask, then fill on a follow-up. */
  amount?: number | null;
  category_label?: string | null;
  /** YYYY-MM-DD; omit or null → app defaults to today. */
  date?: string | null;
  note?: string | null;
};

export type TxnChatTurnResult = {
  reply: string;
  transactions: TxnChatDraftTransaction[];
};

/** One row from the signed-in user's category list (expense or income). */
export type TxnChatCategoryForPrompt = {
  label: string;
};

/** Provider-agnostic input for one user turn (after building transcript in the UI). */
export type TxnChatTurnRequest = {
  priorTranscript: string;
  userMessage: string;
  /** User's expense categories for this ledger — only these labels are valid for expense rows. */
  expenseCategories: TxnChatCategoryForPrompt[];
  /** User's income categories — only these labels are valid for income rows. */
  incomeCategories: TxnChatCategoryForPrompt[];
  currency: string;
  /** Local calendar YYYY-MM-DD */
  todayYmd?: string;
};
