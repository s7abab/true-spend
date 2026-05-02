import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IClose } from '@/shared/components/Icons';
import { DataErrorBanner } from '@/shared/components/DataErrorBanner';
import type { CategoryRow } from '@/features/categories/types';
import { geminiTxnChatTurn, formatTxnChatTranscript, type GeminiDraftTransaction } from '@/features/transactions/lib/geminiTxnChat';
import { matchCategoryRowByHint } from '@/features/transactions/lib/matchCategoryHint';
import type { TransactionKind } from '@/types/ledger';
import { currencyPrefix } from '@/utils/money';
import type { ToastPayload } from '@/shared/components/Toast';
import '@/features/transactions/styles/TxnChatScreen.css';

const ease = [0.22, 1, 0.36, 1] as const;

type ChatTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  drafts?: ResolvedDraft[];
};

export type ResolvedDraft = GeminiDraftTransaction & {
  category_id: string;
  occurred_at: string;
  resolved_category_label: string;
};

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

function resolveDrafts(
  txs: GeminiDraftTransaction[],
  catsExpense: CategoryRow[],
  catsIncome: CategoryRow[],
): ResolvedDraft[] {
  const out: ResolvedDraft[] = [];
  for (const t of txs) {
    const kind = t.kind as TransactionKind;
    const row = matchCategoryRowByHint(t.category_label, kind, catsExpense, catsIncome);
    out.push({
      ...t,
      kind: kind === 'income' ? 'income' : 'expense',
      category_id: row.id,
      occurred_at: localMidnightIsoFromYmd(t.date),
      resolved_category_label: row.label,
    });
  }
  return out;
}

type TxnChatScreenProps = {
  catsExpense: CategoryRow[];
  catsIncome: CategoryRow[];
  addTransaction: (t: {
    kind: string;
    category_id: string | null;
    amount: number;
    title: string;
    note: string | null;
    occurred_at: string;
  }) => Promise<{ data: unknown; error: Error | null }>;
  currency: string;
  combinedError: string | null;
  retrying: boolean;
  onRetryData: () => Promise<void>;
  setToast: (t: ToastPayload | null) => void;
  canOpenAdd: boolean;
  categoriesLoading: boolean;
  categoriesError: string | null;
};

export function TxnChatScreen(props: TxnChatScreenProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [sending, setSending] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() ?? '';

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const onClose = useCallback(() => {
    if (!sending && !savingId) navigate(-1);
  }, [navigate, sending, savingId]);

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
    if (!apiKey) {
      props.setToast({
        id: Date.now(),
        kind: 'error',
        message: 'Set VITE_GEMINI_API_KEY in your .env file (Google AI Studio API key).',
      });
      setTimeout(() => props.setToast(null), 4800);
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
      const result = await geminiTxnChatTurn({
        apiKey,
        priorTranscript: prior,
        userMessage: text,
        expenseLabels: props.catsExpense.map((c) => c.label),
        incomeLabels: props.catsIncome.map((c) => c.label),
        currency: props.currency,
      });
      const drafts =
        result.transactions.length > 0
          ? resolveDrafts(result.transactions, props.catsExpense, props.catsIncome)
          : undefined;
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
          text: `I could not reach the AI (${msg}). Check your API key and network, then try again.`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [
    apiKey,
    input,
    sending,
    messages,
    props,
  ]);

  const saveDrafts = useCallback(
    async (turnId: string, drafts: ResolvedDraft[]) => {
      if (drafts.length === 0 || savingId) return;
      setSavingId(turnId);
      try {
        for (const d of drafts) {
          const res = await props.addTransaction({
            kind: d.kind,
            category_id: d.category_id,
            amount: d.amount,
            title: d.title,
            note: d.note?.trim() || null,
            occurred_at: d.occurred_at,
          });
          if (res.error) throw res.error;
        }
        props.setToast({
          id: Date.now(),
          kind: drafts.every((x) => x.kind === 'income') ? 'income' : 'expense',
          amount: drafts.reduce((s, x) => s + x.amount, 0),
        });
        setTimeout(() => props.setToast(null), 2400);
        setMessages((prev) =>
          prev.map((m) => (m.id === turnId ? { ...m, drafts: undefined } : m)),
        );
        navigate('/');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not save';
        props.setToast({ id: Date.now(), kind: 'error', message: msg });
        setTimeout(() => props.setToast(null), 4200);
      } finally {
        setSavingId(null);
      }
    },
    [navigate, props, savingId],
  );

  const cur = currencyPrefix(props.currency);

  return (
    <div className="txn-chat-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 8px' }}>
        <button type="button" disabled={Boolean(sending || savingId)} onClick={onClose} className="sheet-close-btn" aria-label="Close">
          <IClose size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: '#0F0F12' }}>AI chat</div>
          <div style={{ fontSize: 12, color: '#9B9BA8', marginTop: 2 }}>Describe income or expenses in plain language</div>
        </div>
      </div>

      <DataErrorBanner message={props.combinedError} onRetry={props.onRetryData} busy={props.retrying} />

      {!apiKey ? (
        <div className="txn-chat-hint">
          Add <code style={{ fontSize: 11 }}>VITE_GEMINI_API_KEY</code> to <code style={{ fontSize: 11 }}>.env</code> using a key from{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            Google AI Studio
          </a>
          . For production, proxy requests through your backend so the key stays server-side.
        </div>
      ) : null}

      <div ref={scrollRef} className="txn-chat-scroll">
        {messages.length === 0 && !sending ? (
          <div className="txn-chat-hint" style={{ paddingTop: 24 }}>
            Examples: “Coffee 120 today”, “Salary 45000 on the 1st”, “Spent 80 on bus and 200 on groceries yesterday”
          </div>
        ) : null}
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease }}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div className={`txn-chat-bubble txn-chat-bubble--${m.role === 'user' ? 'user' : 'assistant'}`}>{m.text}</div>
            {m.role === 'assistant' && m.drafts && m.drafts.length > 0 ? (
              <div className="txn-chat-draft-wrap">
                {m.drafts.map((d, i) => (
                  <div key={`${m.id}-d-${i}`} className="txn-chat-draft">
                    <div className="txn-chat-draft-title">
                      {d.title} · {cur}
                      {d.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                    <div className="txn-chat-draft-meta">
                      <span style={{ textTransform: 'capitalize' }}>{d.kind}</span>
                      <span>{d.resolved_category_label}</span>
                      <span>{d.date}</span>
                    </div>
                  </div>
                ))}
                <div className="txn-chat-save-row">
                  <button
                    type="button"
                    className="txn-chat-save"
                    disabled={Boolean(savingId) || sending}
                    onClick={() => void saveDrafts(m.id, m.drafts!)}
                  >
                    {savingId === m.id ? 'Saving…' : `Save ${m.drafts.length} to ledger`}
                  </button>
                </div>
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

      <div className="txn-chat-footer">
        <textarea
          className="txn-chat-input"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message…"
          disabled={sending || Boolean(savingId)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button type="button" className="txn-chat-send" disabled={sending || !input.trim() || Boolean(savingId)} onClick={() => void send()}>
          Send
        </button>
      </div>
    </div>
  );
}
