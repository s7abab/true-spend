import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { IBackspace, ICheck, IClose, ICalendar, IPlus, ITrash, ICON_MAP } from '@/shared/components/Icons';
import { parseDateInput, toDateInputValue } from '@/features/history/utils/dateRange';
import { OVERLAY_TRANSITION, SHEET_TRANSITION } from '@/shared/motion/sheetMotion';
import { formatDateLabel } from '@/utils/dateLabel';
import { currencyPrefix } from '@/utils/money';
import type { CategoryRow } from '@/features/categories/types';
import type { TransactionKind } from '@/types/ledger';
import type { MappedTxn } from '@/utils/txnMap';
import {
  readPersistedAddTxnKind,
  writePersistedAddTxnKind,
  readPersistedAddEntryTab,
  writePersistedAddEntryTab,
} from '@/features/transactions/lib/txnUiLocalStorage';
import { TxnChatScreen, type TxnChatShellProps } from '@/features/transactions/components/TxnChatScreen';

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function Keypad({ onPress }: { onPress: (k: string) => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
  return (
    <div className="keypad">
      {keys.map((k) => (
        <button key={k} type="button" className="key" onClick={() => onPress(k)}>
          {k === 'del' ? <IBackspace size={20} stroke={2.1} /> : k}
        </button>
      ))}
    </div>
  );
}

function initialKindAndCat(expense: CategoryRow[], income: CategoryRow[], transfer: CategoryRow[]) {
  if (expense.length > 0) return { kind: 'expense' as TransactionKind, catId: expense[0]!.id };
  if (income.length > 0) return { kind: 'income' as TransactionKind, catId: income[0]!.id };
  if (transfer.length > 0) return { kind: 'transfer' as TransactionKind, catId: transfer[0]!.id };
  return { kind: 'expense' as TransactionKind, catId: null as string | null };
}

function kindAndCatFromStorage(
  expense: CategoryRow[],
  income: CategoryRow[],
  transfer: CategoryRow[],
): { kind: TransactionKind; catId: string | null } | null {
  const stored = readPersistedAddTxnKind();
  if (stored === 'income' && income.length > 0) {
    return { kind: 'income', catId: income[0]!.id };
  }
  if (stored === 'expense' && expense.length > 0) {
    return { kind: 'expense', catId: expense[0]!.id };
  }
  if (stored === 'transfer' && transfer.length > 0) {
    return { kind: 'transfer', catId: transfer[0]!.id };
  }
  return null;
}

function txnAmountKeypad(n: number): string {
  const v = Math.round(Number(n) * 100) / 100;
  if (!Number.isFinite(v) || v <= 0) return '0';
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export type AddTransactionSavePayload = {
  kind: TransactionKind;
  category_id: string;
  amount: number;
  title: string;
  note: string | null;
  occurred_at: string;
};

type AddTransactionScreenProps = {
  accent: string;
  categoriesExpense: CategoryRow[];
  categoriesIncome: CategoryRow[];
  categoriesTransfer: CategoryRow[];
  onClose: () => void;
  onSave: (t: AddTransactionSavePayload) => void;
  initialTxn?: MappedTxn | null;
  onDelete?: () => void;
  deleting?: boolean;
  currency?: string;
  saving?: boolean;
  asPage?: boolean;
  /** When set on a new add (`asPage` + not edit), shows Manual / AI chat tabs. */
  aiChat?: TxnChatShellProps | null;
};

export function AddTransactionScreen({
  accent,
  categoriesExpense,
  categoriesIncome,
  categoriesTransfer,
  onClose,
  onSave,
  initialTxn = null,
  onDelete,
  deleting = false,
  currency = 'INR',
  saving = false,
  asPage = false,
  aiChat = null,
}: AddTransactionScreenProps) {
  const isEdit = Boolean(initialTxn);
  const showAiEntry = Boolean(asPage && !isEdit && aiChat);
  const [entryTab, setEntryTab] = useState<'manual' | 'ai'>(() => {
    if (initialTxn) return 'manual';
    return readPersistedAddEntryTab() ?? 'manual';
  });
  const [aiBusy, setAiBusy] = useState(false);
  const onAiActivity = useCallback((v: boolean) => {
    setAiBusy(v);
  }, []);
  const [kind, setKind] = useState<TransactionKind>(() => {
    if (initialTxn) return initialTxn.kind;
    const fromLs = kindAndCatFromStorage(categoriesExpense, categoriesIncome, categoriesTransfer);
    if (fromLs) return fromLs.kind;
    return initialKindAndCat(categoriesExpense, categoriesIncome, categoriesTransfer).kind;
  });
  const [amount, setAmount] = useState(() =>
    initialTxn ? txnAmountKeypad(initialTxn.amount) : '0',
  );
  const [catId, setCatId] = useState<string | null>(() => {
    if (initialTxn) return initialTxn.cat;
    const fromLs = kindAndCatFromStorage(categoriesExpense, categoriesIncome, categoriesTransfer);
    if (fromLs) return fromLs.catId;
    return initialKindAndCat(categoriesExpense, categoriesIncome, categoriesTransfer).catId;
  });
  const [note, setNote] = useState(() =>
    initialTxn ? (initialTxn.note || initialTxn.title || '') : '',
  );
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialTxn) return new Date(initialTxn.occurredDate);
    return getToday();
  });

  // Ref map for category buttons — used to scroll the active one into view
  const catBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (asPage) return;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = ''; };
  }, [asPage]);

  // Scroll selected category into view whenever it changes
  useEffect(() => {
    if (!catId) return;
    const btn = catBtnRefs.current.get(catId);
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [catId]);

  const hasExp = categoriesExpense.length > 0;
  const hasInc = categoriesIncome.length > 0;
  const hasXfer = categoriesTransfer.length > 0;

  useLayoutEffect(() => {
    const list =
      kind === 'expense'
        ? categoriesExpense
        : kind === 'income'
          ? categoriesIncome
          : categoriesTransfer;
    const validId = catId != null && list.some((c) => c.id === catId);
    if (validId) return;
    if (list.length > 0) {
      setCatId(list[0]!.id);
      return;
    }
    const next = initialKindAndCat(categoriesExpense, categoriesIncome, categoriesTransfer);
    setKind(next.kind);
    setCatId(next.catId);
  }, [kind, catId, categoriesExpense, categoriesIncome, categoriesTransfer]);

  const cats =
    kind === 'expense'
      ? categoriesExpense
      : kind === 'income'
        ? categoriesIncome
        : categoriesTransfer;
  const cat = cats.find((c) => c.id === catId) || cats[0];
  const isExp = kind === 'expense';
  const isXfer = kind === 'transfer';
  const heroColor = isExp ? accent : isXfer ? '#6366F1' : '#22A06B';
  const curSym = currencyPrefix(currency);
  const busy = saving || deleting;

  const handleKind = (k: TransactionKind) => {
    const list =
      k === 'expense' ? categoriesExpense : k === 'income' ? categoriesIncome : categoriesTransfer;
    if (!list.length) return;
    setKind(k);
    setCatId(list[0]?.id ?? null);
    writePersistedAddTxnKind(k);
  };

  const press = (k: string) => {
    setAmount((prev) => {
      if (k === 'del') return prev.length <= 1 ? '0' : prev.slice(0, -1);
      if (k === '.') return prev.includes('.') ? prev : prev + '.';
      if (prev === '0' && k !== '.') return String(k);
      if (prev.replace('.', '').length >= 7) return prev;
      return prev + k;
    });
  };

  const numAmount = parseFloat(amount) || 0;
  const canSave = numAmount > 0;
  const dateLabel = useMemo(() => formatDateLabel(selectedDate), [selectedDate]);

  const formatted =
    amount === '0'
      ? '0'
      : `${Number(amount.split('.')[0]).toLocaleString('en-IN')}${amount.includes('.') ? `.${amount.split('.')[1]}` : ''}`;

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = parseDateInput(e.target.value);
    if (d) setSelectedDate(d);
  };

  const doSave = () => {
    if (!canSave || !cat || busy) return;
    onSave({
      kind,
      category_id: cat.id,
      amount: numAmount,
      title: note.trim() || cat.label,
      note: note.trim() || null,
      occurred_at: selectedDate.toISOString(),
    });
  };

  const sheetHandle = !asPage ? <div className="sheet-handle" /> : null;
  const dateMaxStr = toDateInputValue(getToday());

  const kindSegIdx = kind === 'expense' ? 0 : kind === 'income' ? 1 : 2;
  const threeKindSeg = (
    <div className="seg" style={{ flex: 1, minWidth: 0 }}>
      <div
        className={`seg-thumb${isExp ? ' seg-thumb--rose' : isXfer ? ' seg-thumb--violet' : ' seg-thumb--emerald'}`}
        style={{ left: kindSegIdx === 0 ? 3 : `calc(${kindSegIdx * (100 / 3)}%)`, width: 'calc(33.33% - 2px)' }}
      />
      {(['expense', 'income', 'transfer'] as const).map((t) => {
        const disabled =
          (t === 'expense' && !hasExp) || (t === 'income' && !hasInc) || (t === 'transfer' && !hasXfer);
        return (
          <button
            key={t}
            type="button"
            disabled={disabled || busy}
            className={`seg-btn${kind === t ? ' active' : ''}`}
            onClick={() => handleKind(t)}
            style={{
              color: disabled ? '#D8D8E0' : kind === t ? '#0F0F12' : '#ACACB8',
              textTransform: 'capitalize',
              opacity: disabled ? 0.55 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );

  const formScroll = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            disabled={busy || (showAiEntry && entryTab === 'ai' && aiBusy)}
            onClick={onClose}
            aria-label="Close"
            className="sheet-close-btn"
          >
            <IClose size={16} />
          </button>
          {showAiEntry ? (
            <div className="seg" style={{ flex: 1, minWidth: 0 }}>
              <div
                className="seg-thumb seg-thumb--slate"
                style={{ left: entryTab === 'manual' ? 3 : '50%', width: 'calc(50% - 3px)' }}
              />
              <button
                type="button"
                className={`seg-btn${entryTab === 'manual' ? ' active' : ''}`}
                disabled={busy}
                onClick={() => {
                  setEntryTab('manual');
                  writePersistedAddEntryTab('manual');
                }}
                style={{
                  color: entryTab === 'manual' ? '#0F0F12' : '#ACACB8',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Manual
              </button>
              <button
                type="button"
                className={`seg-btn${entryTab === 'ai' ? ' active' : ''}`}
                disabled={busy}
                onClick={() => {
                  setEntryTab('ai');
                  writePersistedAddEntryTab('ai');
                }}
                style={{
                  color: entryTab === 'ai' ? '#0F0F12' : '#ACACB8',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                AI chat
              </button>
            </div>
          ) : (
            threeKindSeg
          )}
        </div>
        {showAiEntry && entryTab === 'manual' ? (
          <div style={{ display: 'flex', width: '100%' }}>{threeKindSeg}</div>
        ) : null}
      </div>

      {(!showAiEntry || entryTab === 'manual') ? (
        <>
      <div
        style={{
          padding: '20px 24px 14px',
          textAlign: 'center',
          borderBottom: '1px solid #F5F5F8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
          <span
            style={{
              fontSize: 24, fontWeight: 600, opacity: 0.35,
              verticalAlign: 'top', marginTop: 8, display: 'inline-block',
            }}
          >
            {curSym}
          </span>
          <span
            style={{
              fontSize: 52, fontWeight: 700, letterSpacing: -2, lineHeight: 1,
              color: numAmount > 0 ? heroColor : '#D1D1DB',
              transition: 'color 200ms',
            }}
          >
            {formatted}
          </span>
        </div>

        <label
          style={{
            marginTop: 10,
            position: 'relative',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 13px', borderRadius: 999,
            background: '#F4F5F7',
            color: '#6B6B80',
            border: 'none', cursor: busy ? 'default' : 'pointer',
            fontSize: 13, fontWeight: 600,
            verticalAlign: 'middle',
          }}
        >
          <ICalendar size={13} stroke={2} />
          {dateLabel}
          <input
            type="date"
            aria-label="Transaction date"
            value={toDateInputValue(selectedDate)}
            max={dateMaxStr}
            min="1970-01-01"
            onChange={handleNativeDateChange}
            disabled={busy}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: busy ? 'default' : 'pointer',
              WebkitAppearance: 'none',
            }}
          />
        </label>
      </div>

      <div className="cat-strip" data-swipe-back-off style={{ borderBottom: '1px solid #F5F5F8' }}>
        {cats.map((c) => {
          const active = c.id === catId;
          const IconCmp = ICON_MAP[c.icon] || ICON_MAP.dots;
          return (
            <button
              key={c.id}
              type="button"
              className="cat-btn"
              disabled={busy}
              ref={(el) => {
                if (el) catBtnRefs.current.set(c.id, el);
                else catBtnRefs.current.delete(c.id);
              }}
              onClick={() => setCatId(c.id)}
              style={{
                background: active ? c.tint : '#F4F5F7',
                color: active ? '#fff' : '#0F0F12',
                boxShadow: active ? `0 4px 12px -4px ${c.tint}88` : 'none',
              }}
            >
              <span
                style={{
                  width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                  background: active ? 'rgba(255,255,255,0.2)' : `${c.tint}18`,
                  color: active ? '#fff' : c.tint,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <IconCmp size={13} stroke={2.2} />
              </span>
              {c.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          padding: '10px 16px',
          borderBottom: asPage ? 'none' : '1px solid #F5F5F8',
        }}
      >
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy}
          placeholder="Add a note (optional)"
          style={{
            width: '100%', height: 40, background: '#F4F5F7',
            border: 'none', borderRadius: 10, padding: '0 14px',
            fontSize: 14, color: '#0F0F12', outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>
        </>
      ) : null}
    </>
  );

  const keypadBlock = (
    <div style={{ opacity: busy ? 0.45 : 1, pointerEvents: busy ? 'none' : 'auto' }}>
      <Keypad onPress={press} />
    </div>
  );

  const actionsRow = (
    <div
      style={{
        display: 'flex', gap: 10, alignItems: 'stretch',
        padding: '10px 16px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      }}
    >
      {isEdit && onDelete ? (
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          aria-label={deleting ? 'Deleting…' : 'Delete transaction'}
          title="Delete"
          style={{
            flexShrink: 0, width: 54, height: 54, borderRadius: 16,
            border: 'none', background: 'rgba(255, 77, 109, 0.1)',
            color: '#D92D4A', cursor: busy ? 'default' : 'pointer',
            display: 'grid', placeItems: 'center',
            fontFamily: 'inherit', opacity: busy ? 0.55 : 1,
          }}
        >
          <ITrash size={20} stroke={2} />
        </button>
      ) : null}
      <button
        type="button"
        disabled={!canSave || busy}
        onClick={doSave}
        style={{
          flex: 1, minWidth: 0, height: 54, borderRadius: 16,
          background: canSave && !busy ? heroColor : '#F0F0F5',
          color: canSave && !busy ? '#fff' : '#ACACB8',
          border: 'none', cursor: canSave && !busy ? 'pointer' : 'default',
          fontSize: 17, fontWeight: 700, letterSpacing: -0.3,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: canSave && !busy ? `0 10px 24px -8px ${heroColor}99` : 'none',
          transition: 'background 200ms, box-shadow 200ms',
          fontFamily: 'inherit',
        }}
        onPointerDown={(e) => { if (canSave && !busy) e.currentTarget.style.transform = 'scale(0.98)'; }}
        onPointerUp={(e) => { e.currentTarget.style.transform = ''; }}
      >
        {isEdit ? <ICheck size={20} stroke={2.6} /> : <IPlus size={20} stroke={2.6} />}
        {saving
          ? 'Saving…'
          : isEdit
            ? 'Save changes'
            : `Add ${isExp ? 'expense' : isXfer ? 'transfer' : 'income'}`}
      </button>
    </div>
  );

  if (asPage) {
    return (
      <div className="add-screen">
        <div
          className="add-screen-body"
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflowY: showAiEntry && entryTab === 'ai' ? 'hidden' : undefined,
          }}
        >
          {formScroll}
          {showAiEntry && entryTab === 'ai' && aiChat ? (
            <div className="add-screen-chat-pane">
              <TxnChatScreen
                layout="embedded"
                {...aiChat}
                onTransactionsSaved={onClose}
                onActivityChange={onAiActivity}
              />
            </div>
          ) : null}
        </div>
        {showAiEntry && entryTab === 'ai' ? null : (
          <div className="add-screen-footer">
            {keypadBlock}
            {actionsRow}
          </div>
        )}
      </div>
    );
  }

  const sheetContent = (
    <>
      {sheetHandle}
      {formScroll}
      {keypadBlock}
      {actionsRow}
    </>
  );

  return (
    <motion.div
      className="overlay add-sheet-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={OVERLAY_TRANSITION}
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <motion.div
        className="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SHEET_TRANSITION}
        // Swipe-to-dismiss: drag down past 120px or fast flick closes the sheet
        drag={busy ? false : 'y'}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_, info) => {
          if (!busy && (info.offset.y > 120 || info.velocity.y > 500)) onClose();
        }}
      >
        {sheetContent}
      </motion.div>
    </motion.div>
  );
}
