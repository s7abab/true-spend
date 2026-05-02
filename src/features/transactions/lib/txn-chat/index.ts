/**
 * Transaction AI chat: provider-agnostic entrypoints.
 *
 * Add a new backend: implement {@link TxnChatProvider}, register it in `resolve-env.ts`.
 */
export type {
  TxnChatCategoryForPrompt,
  TxnChatDraftTransaction,
  TxnChatTurnRequest,
  TxnChatTurnResult,
} from '@/features/transactions/lib/txn-chat/types';
export type { TxnChatProvider, TxnChatProviderId } from '@/features/transactions/lib/txn-chat/providers/types';
export { formatTxnChatTranscript } from '@/features/transactions/lib/txn-chat/transcript';
export { resolveTxnChatFromEnv } from '@/features/transactions/lib/txn-chat/resolve-env';
export { createGeminiTxnChatProvider } from '@/features/transactions/lib/txn-chat/providers/geminiProvider';
export { createOpenRouterTxnChatProvider } from '@/features/transactions/lib/txn-chat/providers/openRouterProvider';
