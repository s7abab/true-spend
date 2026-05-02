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
}
