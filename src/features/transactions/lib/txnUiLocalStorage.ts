/** Manual entry vs AI chat on the add-transaction page */
const LS_ADD_ENTRY = 'truspend:add-entry-tab';

/** Last expense/income tab on the add-transaction screen */
const LS_ADD_KIND = 'truspend:add-txn-kind';

/** AI chat transcript + draft input */
const LS_AI_CHAT = 'truspend:ai-chat';

export type PersistedAddEntryTab = 'manual' | 'ai';

export function readPersistedAddEntryTab(): PersistedAddEntryTab | null {
  try {
    const v = localStorage.getItem(LS_ADD_ENTRY);
    if (v === 'manual' || v === 'ai') return v;
  } catch {
    /* */
  }
  return null;
}

export function writePersistedAddEntryTab(tab: PersistedAddEntryTab): void {
  try {
    localStorage.setItem(LS_ADD_ENTRY, tab);
  } catch {
    /* */
  }
}

export type PersistedAddTxnKind = 'expense' | 'income';

export function readPersistedAddTxnKind(): PersistedAddTxnKind | null {
  try {
    const v = localStorage.getItem(LS_ADD_KIND);
    if (v === 'expense' || v === 'income') return v;
  } catch {
    /* quota / private mode */
  }
  return null;
}

export function writePersistedAddTxnKind(kind: PersistedAddTxnKind): void {
  try {
    localStorage.setItem(LS_ADD_KIND, kind);
  } catch {
    /* */
  }
}

export type PersistedChatDraft = {
  kind: 'expense' | 'income';
  title: string;
  amount: number;
  category_label: string;
  date: string;
  note?: string | null;
  category_id: string;
  occurred_at: string;
  resolved_category_label: string;
};

export type PersistedChatTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  drafts?: PersistedChatDraft[];
};

export type PersistedAiChatV1 = {
  v: 1;
  messages: PersistedChatTurn[];
  input: string;
};

export function readPersistedAiChat(): PersistedAiChatV1 | null {
  try {
    const raw = localStorage.getItem(LS_AI_CHAT);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object') return null;
    const o = data as Record<string, unknown>;
    if (o.v !== 1) return null;
    if (!Array.isArray(o.messages) || typeof o.input !== 'string') return null;
    return { v: 1, messages: o.messages as PersistedChatTurn[], input: o.input };
  } catch {
    return null;
  }
}

export function writePersistedAiChat(payload: PersistedAiChatV1): void {
  try {
    localStorage.setItem(LS_AI_CHAT, JSON.stringify(payload));
  } catch {
    /* */
  }
}

export function clearPersistedAiChat(): void {
  try {
    localStorage.removeItem(LS_AI_CHAT);
  } catch {
    /* */
  }
}
