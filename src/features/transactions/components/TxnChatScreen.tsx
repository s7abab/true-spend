import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ICalendar, IClose, ISparkle } from '@/shared/components/Icons';
import { parseDateInput, toDateInputValue } from '@/features/history/utils/dateRange';
import { formatDateLabel } from '@/utils/dateLabel';
import { DataErrorBanner } from '@/shared/components/DataErrorBanner';
import type { CategoryRow } from '@/features/categories/types';
import {
  formatTxnChatTranscript,
  resolveTxnChatFromEnv,
  type TxnChatDraftTransaction,
} from '@/features/transactions/lib/txn-chat';
import { matchCategoryRowByHint } from '@/features/transactions/lib/matchCategoryHint';
import type { TransactionKind } from '@/types/ledger';
import { currencyPrefix, formatMoney } from '@/utils/money';
import type { ToastPayload } from '@/shared/components/Toast';
import type { PersistedChatDraft, PersistedChatTurn } from '@/features/transactions/lib/txnUiLocalStorage';
import {
  readPersistedAiChat,
  writePersistedAiChat,
  clearPersistedAiChat,
} from '@/features/transactions/lib/txnUiLocalStorage';
import { TXN_ASSISTANT_DISPLAY_NAME } from '@/features/transactions/lib/txnAssistantDisplayName';
import { TxnChatImportBar, type TxnChatImportBarHandle } from '@/features/transactions/components/TxnChatImportBar';
import '@/features/transactions/styles/TxnChatScreen.css';

const ease = [0.22, 1, 0.36, 1] as const;

function localCalendarDateFromYmd(ymd: string): Date {
  const p = parseDateInput(ymd);
  if (p) return p;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function localTodayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Keep every row the model returns so users can fill missing amounts on the same screen as priced lines. */
function filterTxnChatRowsForDraftUi(txs: TxnChatDraftTransaction[]): TxnChatDraftTransaction[] {
  return txs;
}

export type ChatDraftRow = {
  kind: 'expense' | 'income' | 'transfer';
  title: string;
  amount: number | null;
  dateYmd: string;
  category_id: string;
  resolved_category_label: string;
  note: string | null;
  occurred_at: string;
};

type DraftEdit = Partial<{
  kind: 'expense' | 'income' | 'transfer';
  amount: number | null;
  amountInput: string;
  dateYmd: string;
  category_id: string;
  resolved_category_label: string;
}>;

function remapDraftEditsAfterRemoval(
  prev: Record<string, DraftEdit>,
  turnId: string,
  removedIndex: number,
): Record<string, DraftEdit> {
  const next: Record<string, DraftEdit> = {};
  const prefix = `${turnId}:`;
  for (const [k, v] of Object.entries(prev)) {
    if (!k.startsWith(prefix)) {
      next[k] = v;
      continue;
    }
    const idx = Number(k.slice(prefix.length));
    if (!Number.isFinite(idx)) continue;
    if (idx === removedIndex) continue;
    const newIdx = idx > removedIndex ? idx - 1 : idx;
    next[`${turnId}:${newIdx}`] = v;
  }
  return next;
}

type ChatTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  drafts?: ChatDraftRow[];
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localMidnightIsoFromYmd(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(y, mo - 1, day, 0, 0, 0, 0);
  return dt.toISOString();
}

function mergeChatDraft(base: ChatDraftRow, edit: DraftEdit | undefined): ChatDraftRow {
  if (!edit || Object.keys(edit).length === 0) return base;
  const kind = edit.kind ?? base.kind;
  const dateYmd = edit.dateYmd ?? base.dateYmd;
  const amount = edit.amount !== undefined ? edit.amount : base.amount;
  const category_id = edit.category_id ?? base.category_id;
  const resolved_category_label = edit.resolved_category_label ?? base.resolved_category_label;
  return {
    kind,
    title: base.title,
    amount,
    dateYmd,
    category_id,
    resolved_category_label,
    note: base.note,
    occurred_at: localMidnightIsoFromYmd(dateYmd),
  };
}

function buildChatDrafts(
  txs: TxnChatDraftTransaction[],
  catsExpense: CategoryRow[],
  catsIncome: CategoryRow[],
  catsTransfer: CategoryRow[],
): ChatDraftRow[] {
  const ymd = todayYmd();
  const out: ChatDraftRow[] = [];
  for (const t of txs) {
    const kind = t.kind === 'income' ? 'income' : t.kind === 'transfer' ? 'transfer' : 'expense';
    const dateYmd =
      t.date && typeof t.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.date.trim())
        ? t.date.trim()
        : ymd;
    const hint = typeof t.category_label === 'string' ? t.category_label.trim() : '';
    const row = matchCategoryRowByHint(hint, kind as TransactionKind, catsExpense, catsIncome, catsTransfer);
    const rawAmt = t.amount;
    let amount: number | null = null;
    if (rawAmt != null && typeof rawAmt === 'number' && Number.isFinite(rawAmt) && rawAmt > 0) {
      amount = rawAmt;
    } else if (rawAmt != null && typeof rawAmt === 'string' && String(rawAmt).trim()) {
      const n = Number(rawAmt);
      if (Number.isFinite(n) && n > 0) amount = n;
    }
    out.push({
      kind,
      title: t.title.trim(),
      amount,
      dateYmd,
      category_id: row.id,
      resolved_category_label: row.label,
      note: t.note && String(t.note).trim() ? String(t.note).trim() : null,
      occurred_at: localMidnightIsoFromYmd(dateYmd),
    });
  }
  return out;
}

type PersistedDraftLoose = PersistedChatDraft & { category_label?: string };

function refreshResolvedDrafts(
  drafts: PersistedChatDraft[],
  catsExpense: CategoryRow[],
  catsIncome: CategoryRow[],
  catsTransfer: CategoryRow[],
): ChatDraftRow[] {
  const ymd = todayYmd();
  return drafts.map((raw) => {
    const d = raw as PersistedDraftLoose;
    const kind = d.kind === 'income' ? 'income' : d.kind === 'transfer' ? 'transfer' : 'expense';
    const cats = kind === 'income' ? catsIncome : kind === 'transfer' ? catsTransfer : catsExpense;
    const labelHint =
      (typeof d.resolved_category_label === 'string' && d.resolved_category_label.trim()) ||
      (typeof d.category_label === 'string' && d.category_label.trim()) ||
      '';
    let row: CategoryRow;
    if (typeof d.category_id === 'string' && cats.some((c) => c.id === d.category_id)) {
      row = cats.find((c) => c.id === d.category_id)!;
    } else {
      row = matchCategoryRowByHint(labelHint, kind as TransactionKind, catsExpense, catsIncome, catsTransfer);
    }
    const dateStr = typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : ymd;
    let amount: number | null = null;
    if (d.amount != null && typeof d.amount === 'number' && Number.isFinite(d.amount) && d.amount > 0) {
      amount = d.amount;
    }
    return {
      kind,
      title: d.title,
      amount,
      dateYmd: dateStr,
      category_id: row.id,
      resolved_category_label: row.label,
      note: d.note ?? null,
      occurred_at: localMidnightIsoFromYmd(dateStr),
    };
  });
}

function chatTurnsToPersisted(msgs: ChatTurn[]): PersistedChatTurn[] {
  return msgs.map((m) => ({
    id: m.id,
    role: m.role,
    text: m.text,
    drafts: m.drafts?.map(
      (d): PersistedChatDraft => ({
        kind: d.kind,
        title: d.title,
        amount: d.amount,
        date: d.dateYmd,
        note: d.note,
        category_id: d.category_id,
        occurred_at: d.occurred_at,
        resolved_category_label: d.resolved_category_label,
      }),
    ),
  }));
}

export type TxnChatShellProps = {
  catsExpense: CategoryRow[];
  catsIncome: CategoryRow[];
  catsTransfer: CategoryRow[];
  addTransaction: (t: {
    kind: string;
    category_id: string | null;
    amount: number;
    title: string;
    note: string | null;
    occurred_at: string;
  }) => Promise<{ data: unknown; error: Error | null }>;
  /** Preferred for AI chat: one round-trip so every line is persisted together. */
  addTransactions: (
    rows: Array<{
      kind: string;
      category_id: string | null;
      amount: number;
      title: string;
      note: string | null;
      occurred_at: string;
    }>,
  ) => Promise<{ data: unknown; error: Error | null }>;
  currency: string;
  combinedError: string | null;
  retrying: boolean;
  onRetryData: () => Promise<void>;
  setToast: (t: ToastPayload | null) => void;
  canOpenAdd: boolean;
  categoriesLoading: boolean;
  categoriesError: string | null;
};

export type TxnChatScreenProps = TxnChatShellProps & {
  layout?: 'page' | 'embedded';
  onTransactionsSaved?: () => void;
  onActivityChange?: (busy: boolean) => void;
};

export function TxnChatScreen(props: TxnChatScreenProps) {
  const layout = props.layout ?? 'page';
  const onTransactionsSaved = props.onTransactionsSaved;
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const importBarRef = useRef<TxnChatImportBarHandle>(null);
  const restoreAttempted = useRef(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [draftEdits, setDraftEdits] = useState<Record<string, DraftEdit>>({});
  const [chatHydrated, setChatHydrated] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  const txnAi = useMemo(() => resolveTxnChatFromEnv(), []);

  const updateDraftEdit = useCallback((key: string, patch: DraftEdit) => {
    setDraftEdits((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  useEffect(() => {
    if (restoreAttempted.current) return;
    if (
      props.catsExpense.length === 0 &&
      props.catsIncome.length === 0 &&
      props.catsTransfer.length === 0
    )
      return;
    restoreAttempted.current = true;
    const saved = readPersistedAiChat();
    if (saved?.messages?.length) {
      setMessages(
        saved.messages.map((m) => ({
          ...m,
          drafts: m.drafts?.length
            ? refreshResolvedDrafts(m.drafts, props.catsExpense, props.catsIncome, props.catsTransfer)
            : undefined,
        })),
      );
    }
    if (saved && typeof saved.input === 'string') setInput(saved.input);
    setChatHydrated(true);
  }, [props.catsExpense, props.catsIncome, props.catsTransfer]);

  useEffect(() => {
    if (!chatHydrated) return;
    writePersistedAiChat({ v: 1, messages: chatTurnsToPersisted(messages), input });
  }, [chatHydrated, messages, input]);

  const busy = Boolean(sending || savingId || importBusy);
  const onActivityChange = props.onActivityChange;
  useEffect(() => {
    onActivityChange?.(busy);
    return () => {
      onActivityChange?.(false);
    };
  }, [busy, onActivityChange]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const onClose = useCallback(() => {
    if (!sending && !savingId) navigate(-1);
  }, [navigate, sending, savingId]);

  const finishSave = useCallback(() => {
    if (onTransactionsSaved) onTransactionsSaved();
    else navigate('/');
  }, [navigate, onTransactionsSaved]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (!props.canOpenAdd) {
      const msg = props.categoriesLoading
        ? 'Still loading categories…'
        : props.categoriesError
          ? 'Fix the data connection, then try again.'
          : 'Add a category first (Profile → Categories).';
      props.setToast({ id: Date.now(), kind: 'error', message: msg });
      setTimeout(() => props.setToast(null), 3200);
      return;
    }
    if (!txnAi.ok) {
      props.setToast({
        id: Date.now(),
        kind: 'error',
        message: txnAi.hint,
      });
      setTimeout(() => props.setToast(null), 5200);
      return;
    }

    const userTurn: ChatTurn = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userTurn]);
    setInput('');
    setSending(true);

    try {
      const prior = formatTxnChatTranscript(
        messages.map((m) => ({ role: m.role, text: m.text })),
      );
      const result = await txnAi.provider.chatTurn({
        priorTranscript: prior,
        userMessage: text,
        expenseCategories: props.catsExpense.map((c) => ({ label: c.label })),
        incomeCategories: props.catsIncome.map((c) => ({ label: c.label })),
        transferCategories: props.catsTransfer.map((c) => ({ label: c.label })),
        currency: props.currency,
      });
      const txsForDrafts = filterTxnChatRowsForDraftUi(result.transactions);
      const built =
        txsForDrafts.length > 0
          ? buildChatDrafts(txsForDrafts, props.catsExpense, props.catsIncome, props.catsTransfer)
          : undefined;
      // Show every parsed row so users can fill missing amounts on the same screen as priced lines.
      const drafts = built && built.length > 0 ? built : undefined;
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: result.reply, drafts },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `Could not reach ${TXN_ASSISTANT_DISPLAY_NAME} (${msg}). Check your API key and network, then try again.`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [txnAi, input, sending, messages, props]);

  const removeDraftAtTurn = useCallback((turnId: string, draftIndex: number) => {
    if (sending || savingId) return;
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== turnId || !msg.drafts?.length) return msg;
        const nextDrafts = msg.drafts.filter((_, j) => j !== draftIndex);
        return nextDrafts.length ? { ...msg, drafts: nextDrafts } : { ...msg, drafts: undefined };
      }),
    );
    setDraftEdits((prev) => remapDraftEditsAfterRemoval(prev, turnId, draftIndex));
  }, [sending, savingId]);

  const saveDrafts = useCallback(
    async (turnId: string, drafts: ChatDraftRow[]) => {
      if (drafts.length === 0 || savingId) return;
      const merged = drafts.map((d, i) => mergeChatDraft(d, draftEdits[`${turnId}:${i}`]));
      const missing = merged.some((d) => d.amount == null || !(d.amount > 0));
      if (missing) {
        props.setToast({
          id: Date.now(),
          kind: 'error',
          message: 'Enter a positive amount for each item before saving.',
        });
        setTimeout(() => props.setToast(null), 3600);
        return;
      }
      setSavingId(turnId);
      try {
        const batch = merged.map((d) => ({
          kind: d.kind,
          category_id: d.category_id,
          amount: d.amount!,
          title: d.title,
          note: d.note?.trim() || null,
          occurred_at: d.occurred_at,
        }));
        const res = await props.addTransactions(batch);
        if (res.error) throw res.error;
        const allInc = merged.every((x) => x.kind === 'income');
        const allXfer = merged.every((x) => x.kind === 'transfer');
        props.setToast({
          id: Date.now(),
          kind: allInc ? 'income' : allXfer ? 'transfer' : 'expense',
          amount: merged.reduce((s, x) => s + (x.amount ?? 0), 0),
        });
        setTimeout(() => props.setToast(null), 2400);
        clearPersistedAiChat();
        setMessages([]);
        setInput('');
        setDraftEdits({});
        finishSave();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not save';
        props.setToast({ id: Date.now(), kind: 'error', message: msg });
        setTimeout(() => props.setToast(null), 4200);
      } finally {
        setSavingId(null);
      }
    },
    [draftEdits, finishSave, props, savingId],
  );

  const cur = currencyPrefix(props.currency);

  return (
    <div className={`txn-chat-page${layout === 'embedded' ? ' txn-chat-page--embedded' : ''}`}>
      {layout === 'page' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            paddingLeft: 16,
            paddingRight: 16,
            paddingBottom: 8,
            paddingTop: 'max(12px, calc(env(safe-area-inset-top, 0px) + 10px))',
            flexShrink: 0,
          }}
        >
          <span className="txn-chat-title-icon" aria-hidden>
            <ISparkle size={18} stroke={2.2} />
          </span>
          <div style={{ flex: 1, fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: '#0F0F12' }}>
            {TXN_ASSISTANT_DISPLAY_NAME}
          </div>
        </div>
      ) : null}

      {layout === 'page' ? (
        <DataErrorBanner message={props.combinedError} onRetry={props.onRetryData} busy={props.retrying} />
      ) : null}

      {!txnAi.ok ? (
        <div className="txn-chat-hint" style={{ textAlign: 'left', maxWidth: 420, margin: '0 auto' }}>
          {txnAi.hint}{' '}
          <a href="https://openrouter.ai/" target="_blank" rel="noreferrer">
            OpenRouter
          </a>{' '}
          or{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            Google AI Studio
          </a>
          . Set <code style={{ fontSize: 11 }}>VITE_AI_PROVIDER</code> to <code style={{ fontSize: 11 }}>openrouter</code> or{' '}
          <code style={{ fontSize: 11 }}>gemini</code>. For production, proxy requests through your backend so API keys stay server-side.
        </div>
      ) : null}

      <div ref={scrollRef} className="txn-chat-scroll">
        {messages.length === 0 && !sending ? (
          <div className="txn-chat-hint" style={{ paddingTop: 24 }}>
            Type below or tap a starter. Include amounts in {cur} when you can — e.g. “Coffee 120 today”. Use + to
            attach CSV, Excel, or PDF for import data.
          </div>
        ) : null}
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease }}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, width: '100%' }}
          >
            <div className={`txn-chat-bubble txn-chat-bubble--${m.role === 'user' ? 'user' : 'assistant'}`}>{m.text}</div>
            {m.role === 'assistant' && m.drafts && m.drafts.length > 0 ? (
              <div className={`txn-chat-draft-wrap${m.drafts.length >= 2 ? ' txn-chat-draft-wrap--multi' : ''}`}>
                {(() => {
                  const mergedAll = m.drafts!.map((d, i) => mergeChatDraft(d, draftEdits[`${m.id}:${i}`]));
                  const allIncome = mergedAll.every((x) => x.kind === 'income');
                  const allTransfer = mergedAll.every((x) => x.kind === 'transfer');
                  const allReady = mergedAll.every((x) => x.amount != null && x.amount > 0);
                  const multiDraft = m.drafts!.length >= 2;
                  return (
                    <>
                      {m.drafts!.map((d, i) => {
                        const key = `${m.id}:${i}`;
                        const edit = draftEdits[key];
                        const display = mergeChatDraft(d, edit);
                        const amountInput =
                          edit?.amountInput ?? (display.amount == null ? '' : String(display.amount));
                        const catOptions =
                          display.kind === 'income'
                            ? props.catsIncome
                            : display.kind === 'transfer'
                              ? props.catsTransfer
                              : props.catsExpense;
                        const removeBtn = (
                          <button
                            type="button"
                            className="txn-chat-draft-remove"
                            aria-label={`Remove "${display.title}" from this list`}
                            disabled={Boolean(savingId) || sending}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDraftAtTurn(m.id, i);
                            }}
                          >
                            <IClose size={14} stroke={2.2} />
                          </button>
                        );
                        const noteBlock = display.note ? (
                          <div className="txn-chat-draft-note" style={{ color: '#6B6B80', fontSize: 12 }}>
                            {display.note}
                          </div>
                        ) : null;
                        const fields = (
                          <div className="txn-chat-draft-fields">
                            <label className="txn-chat-draft-field">
                              <span className="txn-chat-draft-label">Amount ({cur})</span>
                              <input
                                className={`txn-chat-draft-input${display.amount == null || !(display.amount > 0) ? ' txn-chat-draft-input--needs-amount' : ''}`}
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.01"
                                placeholder={`Amount (${cur})`}
                                aria-invalid={display.amount == null || !(display.amount > 0)}
                                value={amountInput}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === '') updateDraftEdit(key, { amount: null, amountInput: '' });
                                  else {
                                    const n = Number(v);
                                    updateDraftEdit(key, {
                                      amount: Number.isFinite(n) && n > 0 ? n : null,
                                      amountInput: v,
                                    });
                                  }
                                }}
                              />
                            </label>
                            <label className="txn-chat-draft-field">
                              <span className="txn-chat-draft-label">Date</span>
                              <span className="txn-chat-draft-date-native">
                                <ICalendar size={12} stroke={2} aria-hidden />
                                <span className="txn-chat-draft-date-native-label">
                                  {formatDateLabel(localCalendarDateFromYmd(display.dateYmd))}
                                </span>
                                <input
                                  type="date"
                                  className="txn-chat-draft-date-native-input"
                                  aria-label="Transaction date"
                                  value={display.dateYmd}
                                  max={toDateInputValue(localTodayDate())}
                                  min="1970-01-01"
                                  disabled={Boolean(savingId) || sending}
                                  onChange={(e) => {
                                    const y = e.target.value;
                                    if (/^\d{4}-\d{2}-\d{2}$/.test(y)) updateDraftEdit(key, { dateYmd: y });
                                  }}
                                />
                              </span>
                            </label>
                            <label className="txn-chat-draft-field">
                              <span className="txn-chat-draft-label">Type</span>
                              <select
                                className="txn-chat-draft-input txn-chat-draft-select"
                                value={display.kind}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const nk: TransactionKind =
                                    v === 'income' ? 'income' : v === 'transfer' ? 'transfer' : 'expense';
                                  const row = matchCategoryRowByHint(
                                    '',
                                    nk,
                                    props.catsExpense,
                                    props.catsIncome,
                                    props.catsTransfer,
                                  );
                                  updateDraftEdit(key, {
                                    kind: nk,
                                    category_id: row.id,
                                    resolved_category_label: row.label,
                                  });
                                }}
                              >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                                <option value="transfer">Transfer</option>
                              </select>
                            </label>
                            <label className="txn-chat-draft-field">
                              <span className="txn-chat-draft-label">Category</span>
                              <select
                                className="txn-chat-draft-input txn-chat-draft-select"
                                value={display.category_id}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  const cat = catOptions.find((c) => c.id === id);
                                  if (!cat) return;
                                  updateDraftEdit(key, {
                                    category_id: cat.id,
                                    resolved_category_label: cat.label,
                                  });
                                }}
                              >
                                {catOptions.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        );
                        const amountSummary =
                          display.amount != null && display.amount > 0
                            ? formatMoney(display.amount, props.currency)
                            : 'Amount needed';

                        if (multiDraft) {
                          return (
                            <details
                              key={key}
                              className="txn-chat-draft txn-chat-draft--editable txn-chat-draft--collapsible"
                              // React: initial open state for first row (valid DOM prop; eslint rule lags on <details>)
                              {...(i === 0 ? { defaultOpen: true } : {})}
                            >
                              <summary className="txn-chat-draft-summary">
                                <span className="txn-chat-draft-chevron" aria-hidden>
                                  ›
                                </span>
                                <span className="txn-chat-draft-summary-main">
                                  <span className="txn-chat-draft-title txn-chat-draft-title--one-line">{display.title}</span>
                                  <span className="txn-chat-draft-summary-meta">
                                    {amountSummary} · {display.resolved_category_label}
                                  </span>
                                </span>
                                {removeBtn}
                              </summary>
                              <div className="txn-chat-draft-body">
                                {noteBlock}
                                {fields}
                              </div>
                            </details>
                          );
                        }

                        return (
                          <div key={key} className="txn-chat-draft txn-chat-draft--editable">
                            <div className="txn-chat-draft-head">
                              <div className="txn-chat-draft-title">{display.title}</div>
                              {removeBtn}
                            </div>
                            {noteBlock}
                            {fields}
                          </div>
                        );
                      })}
                      <div className="txn-chat-save-row">
                        <button
                          type="button"
                          className="txn-chat-save"
                          disabled={Boolean(savingId) || sending || !allReady}
                          onClick={() => void saveDrafts(m.id, m.drafts!)}
                          style={{
                            background: allIncome ? '#22A06B' : allTransfer ? '#6366F1' : '#0F0F12',
                            boxShadow:
                              savingId === m.id || sending
                                ? 'none'
                                : `0 10px 24px -8px ${
                                    allIncome ? '#22A06B99' : allTransfer ? '#6366F199' : '#0F0F1299'
                                  }`,
                          }}
                        >
                          {savingId === m.id
                            ? 'Saving…'
                            : m.drafts!.length === 1
                              ? 'Save to ledger'
                              : `Save ${m.drafts!.length} to ledger`}
                        </button>
                        {!allReady ? (
                          <p className="txn-chat-save-hint" role="status">
                            Enter a positive amount for each line to enable save.
                          </p>
                        ) : null}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}
          </motion.div>
        ))}
        {sending ? (
          <div className="txn-chat-bubble txn-chat-bubble--assistant" style={{ opacity: 0.7 }}>
            …
          </div>
        ) : null}
      </div>

      <div className="txn-chat-footer-stack">
        {txnAi.ok ? (
          <TxnChatImportBar
            ref={importBarRef}
            provider={txnAi.provider}
            currency={props.currency}
            disabled={busy}
            canOpenAdd={props.canOpenAdd}
            onBusy={setImportBusy}
            setToast={props.setToast}
            onImported={({ fileName, reply, transactions }) => {
              const txsForDrafts = filterTxnChatRowsForDraftUi(transactions);
              const built =
                txsForDrafts.length > 0
                  ? buildChatDrafts(txsForDrafts, props.catsExpense, props.catsIncome, props.catsTransfer)
                  : undefined;
              const uid = `u-${Date.now()}`;
              const aid = `a-${Date.now()}`;
              setMessages((prev) => [
                ...prev,
                { id: uid, role: 'user', text: `File import: ${fileName}` },
                { id: aid, role: 'assistant', text: reply, drafts: built && built.length > 0 ? built : undefined },
              ]);
            }}
          />
        ) : null}
        {txnAi.ok ? (
          <div className="txn-chat-composer">
            <div className="txn-chat-footer txn-chat-footer--composer">
              <button
                type="button"
                className="txn-chat-attach"
                aria-label="Attach CSV, Excel, or PDF"
                disabled={busy}
                onClick={() => importBarRef.current?.openFilePicker()}
              >
                +
              </button>
              <textarea
                ref={textareaRef}
                className="txn-chat-input txn-chat-input--composer"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything…"
                disabled={sending || Boolean(savingId) || importBusy}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="button"
                className="txn-chat-send"
                disabled={sending || !input.trim() || Boolean(savingId) || importBusy}
                onClick={() => void send()}
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="txn-chat-footer">
            <textarea
              ref={textareaRef}
              className="txn-chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message…"
              disabled={sending || Boolean(savingId) || importBusy}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button
              type="button"
              className="txn-chat-send"
              disabled={sending || !input.trim() || Boolean(savingId) || importBusy}
              onClick={() => void send()}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
