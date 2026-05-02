import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { TxnChatProvider } from '@/features/transactions/lib/txn-chat/providers/types';
import type {
  ImportColumnMapping,
  ParsedImportTable,
} from '@/features/transactions/lib/txn-chat/import/types';
import { parseImportFile } from '@/features/transactions/lib/txn-chat/import/parseImportFile';
import { isImportPasswordError } from '@/features/transactions/lib/txn-chat/import/importPasswordError';
import { tableToDraftTransactions } from '@/features/transactions/lib/txn-chat/import/applyColumnMap';
import { guessColumnMapping } from '@/features/transactions/lib/txn-chat/import/guessColumnMapping';
import type { TxnChatDraftTransaction } from '@/features/transactions/lib/txn-chat/types';
import type { ToastPayload } from '@/shared/components/Toast';

const MAP_KEYS: { key: keyof ImportColumnMapping; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'title', label: 'Title / description' },
  { key: 'amount', label: 'Amount' },
  { key: 'kind', label: 'Type (optional)' },
  { key: 'note', label: 'Note (optional)' },
  { key: 'category_hint', label: 'Category hint (optional)' },
];

export type TxnChatImportBarHandle = {
  openFilePicker: () => void;
};

export type TxnChatImportBarProps = {
  provider: TxnChatProvider;
  currency: string;
  disabled: boolean;
  canOpenAdd: boolean;
  onBusy: (busy: boolean) => void;
  /** Fires when the import sheet opens or fully closes (after Cancel / done). */
  onPanelOpenChange?: (open: boolean) => void;
  setToast: (t: ToastPayload | null) => void;
  onImported: (payload: {
    fileName: string;
    reply: string;
    transactions: TxnChatDraftTransaction[];
  }) => void;
};

type Phase = 'idle' | 'work' | 'password' | 'ready';

export const TxnChatImportBar = forwardRef<TxnChatImportBarHandle, TxnChatImportBarProps>(function TxnChatImportBar(
  props,
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [table, setTable] = useState<ParsedImportTable | null>(null);
  const [aiReply, setAiReply] = useState('');
  const [mapping, setMapping] = useState<ImportColumnMapping | null>(null);
  const [defaultKind, setDefaultKind] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [err, setErr] = useState<string | null>(null);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [allowPasswordTry, setAllowPasswordTry] = useState(true);

  useImperativeHandle(ref, () => ({
    openFilePicker: () => {
      if (props.disabled) return;
      inputRef.current?.click();
    },
  }));

  const onPanelOpenChange = props.onPanelOpenChange;
  useEffect(() => {
    onPanelOpenChange?.(open);
  }, [open, onPanelOpenChange]);

  const reset = useCallback(() => {
    setOpen(false);
    setPhase('idle');
    setFileName('');
    setTable(null);
    setAiReply('');
    setMapping(null);
    setDefaultKind('expense');
    setErr(null);
    setPasswordDraft('');
    setAllowPasswordTry(true);
    pendingFileRef.current = null;
    props.onBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  }, [props]);

  const runImport = useCallback(
    async (file: File, opts?: { password?: string }) => {
      if (!props.canOpenAdd) {
        props.setToast({
          id: Date.now(),
          kind: 'error',
          message: props.disabled ? 'Wait for the current action to finish.' : 'Add categories first.',
        });
        setTimeout(() => props.setToast(null), 3200);
        return;
      }
      setErr(null);
      setOpen(true);
      setPhase('work');
      props.onBusy(true);
      setFileName(file.name || 'import');
      try {
        const parsed = await parseImportFile(file, { password: opts?.password });
        if (!parsed.headers.length) throw new Error('No columns found.');
        pendingFileRef.current = null;
        setPasswordDraft('');
        setAllowPasswordTry(true);
        setTable(parsed);
        const sampleRows = parsed.rows.slice(0, 2).map((r) => [...r]);
        let result;
        try {
          result = await props.provider.suggestImportColumnMap({
            headers: parsed.headers,
            sampleRows,
            currency: props.currency,
          });
        } catch {
          result = guessColumnMapping(parsed.headers);
        }
        setAiReply(result.reply);
        setMapping(result.mapping);
        setDefaultKind(result.default_kind);
        setPhase('ready');
      } catch (e) {
        if (isImportPasswordError(e)) {
          pendingFileRef.current = file;
          setErr(e.message);
          setAllowPasswordTry(e.allowPasswordEntry);
          setPhase('password');
        } else {
          const msg = e instanceof Error ? e.message : 'Could not read file';
          setErr(msg);
          setTable(null);
          pendingFileRef.current = null;
          setPhase('idle');
        }
      } finally {
        props.onBusy(false);
      }
    },
    [props],
  );

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) void runImport(f);
    },
    [runImport],
  );

  const tryPassword = useCallback(() => {
    const f = pendingFileRef.current;
    if (!f || !allowPasswordTry) return;
    const p = passwordDraft.trim();
    if (!p) {
      props.setToast({
        id: Date.now(),
        kind: 'error',
        message: 'Enter the file password.',
      });
      setTimeout(() => props.setToast(null), 2400);
      return;
    }
    void runImport(f, { password: p });
  }, [allowPasswordTry, passwordDraft, props, runImport]);

  const confirm = useCallback(() => {
    if (!table || !mapping) return;
    const txs = tableToDraftTransactions(table.headers, table.rows, mapping, defaultKind);
    if (!txs.length) {
      props.setToast({
        id: Date.now(),
        kind: 'error',
        message: 'No rows to import. Map at least title or amount.',
      });
      setTimeout(() => props.setToast(null), 3600);
      return;
    }
    props.onImported({
      fileName,
      reply: aiReply || `Imported ${txs.length} row(s) from ${fileName}. Review and save when ready.`,
      transactions: txs,
    });
    reset();
  }, [aiReply, defaultKind, fileName, mapping, props, reset, table]);

  const preview = table?.rows.slice(0, 6) ?? [];
  const headerOpts = table?.headers ?? [];

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/pdf"
        className="txn-chat-import-input"
        aria-hidden
        tabIndex={-1}
        onChange={onFile}
      />
      {open ? (
        <div className="txn-chat-import-panel-wrap">
          <div className="txn-chat-import-panel">
            <div className="txn-chat-import-head">
              <span className="txn-chat-import-title">{fileName}</span>
              <button
                type="button"
                className="txn-chat-import-dismiss"
                disabled={props.disabled || phase === 'work'}
                onClick={() => reset()}
              >
                Cancel
              </button>
            </div>
            {phase === 'work' ? (
              <div className="txn-chat-import-status">Reading file and mapping columns…</div>
            ) : null}
            {phase === 'password' && err ? (
              <div className="txn-chat-import-password">
                <div className="txn-chat-import-password-msg">{err}</div>
                {allowPasswordTry ? (
                  <div className="txn-chat-import-password-row">
                    <label className="txn-chat-import-password-label" htmlFor="txn-import-pw">
                      File password
                    </label>
                    <input
                      id="txn-import-pw"
                      type="password"
                      className="txn-chat-import-password-input"
                      autoComplete="off"
                      disabled={props.disabled}
                      value={passwordDraft}
                      onChange={(e) => setPasswordDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          tryPassword();
                        }
                      }}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      className="txn-chat-import-password-submit"
                      disabled={props.disabled}
                      onClick={() => tryPassword()}
                    >
                      Unlock and continue
                    </button>
                  </div>
                ) : (
                  <p className="txn-chat-import-unlock-only">
                    Remove protection in Excel or your PDF app, save a copy, then use the + button to attach again.
                  </p>
                )}
              </div>
            ) : null}
            {err && phase !== 'password' ? <div className="txn-chat-import-error">{err}</div> : null}
            {phase === 'ready' && table && mapping ? (
              <>
                {aiReply ? <p className="txn-chat-import-ai">{aiReply}</p> : null}
                <div className="txn-chat-import-grid">
                  {MAP_KEYS.map(({ key, label }) => (
                    <label key={key} className="txn-chat-import-field">
                      <span>{label}</span>
                      <select
                        className="txn-chat-import-select"
                        disabled={props.disabled}
                        value={mapping[key] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMapping((prev) =>
                            prev ? { ...prev, [key]: v === '' ? null : v } : prev,
                          );
                        }}
                      >
                        <option value="">—</option>
                        {headerOpts.map((h, hi) => (
                          <option key={`${String(key)}-${hi}`} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label className="txn-chat-import-field">
                    <span>Default type</span>
                    <select
                      className="txn-chat-import-select"
                      disabled={props.disabled}
                      value={defaultKind}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'income' || v === 'transfer' || v === 'expense') setDefaultKind(v);
                      }}
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </label>
                </div>
                <div className="txn-chat-import-preview">
                  <div className="txn-chat-import-preview-label">Preview</div>
                  <div className="txn-chat-import-table-wrap">
                    <table className="txn-chat-import-table">
                      <thead>
                        <tr>
                          {table.headers.map((h, hi) => (
                            <th key={hi}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, ri) => (
                          <tr key={ri}>
                            {table.headers.map((_, ci) => (
                              <td key={`${ri}-${ci}`}>{row[ci] ?? ''}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="txn-chat-import-actions">
                  <button type="button" className="txn-chat-import-confirm" disabled={props.disabled} onClick={confirm}>
                    Add to chat
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
});
