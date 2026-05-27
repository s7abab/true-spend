import type { ImportColumnMapRequest, ImportColumnMapResult } from '@/features/transactions/lib/txn-chat/import/types';
import type { TxnChatTurnRequest, TxnChatTurnResult } from '@/features/transactions/lib/txn-chat/types';

/** Extend this union when adding e.g. `openai` direct or `anthropic` native. */
export type TxnChatProviderId = 'openrouter' | 'gemini';

/**
 * Pluggable LLM backend for transaction chat. Swap implementations via env
 * (`VITE_AI_PROVIDER`) without changing UI code.
 */
export interface TxnChatProvider {
  readonly id: TxnChatProviderId;
  readonly label: string;
  chatTurn(req: TxnChatTurnRequest): Promise<TxnChatTurnResult>;
  /**
   * Streaming variant — yields text tokens incrementally.
   * If not implemented, the UI falls back to chatTurn.
   */
  chatTurnStream?(req: TxnChatTurnRequest, onChunk: (token: string) => void): Promise<TxnChatTurnResult>;
  /**
   * Agentic variant — can call Supabase tools before answering.
   * onStatus: called with human-readable status while tools run
   * onChunk:  called with streamed reply tokens
   */
  chatTurnAgent?(
    req: TxnChatTurnRequest,
    onStatus: (status: string) => void,
    onChunk: (token: string) => void,
  ): Promise<TxnChatTurnResult>;
  /** Single compact JSON call: headers + a few sample rows only. */
  suggestImportColumnMap(req: ImportColumnMapRequest): Promise<ImportColumnMapResult>;
}
