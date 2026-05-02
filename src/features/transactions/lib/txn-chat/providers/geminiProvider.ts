import { GoogleGenAI } from '@google/genai';
import type { TxnChatProvider } from '@/features/transactions/lib/txn-chat/providers/types';
import type { ImportColumnMapRequest, ImportColumnMapResult } from '@/features/transactions/lib/txn-chat/import/types';
import {
  IMPORT_COLUMN_MAP_JSON_SCHEMA,
  buildImportColumnMapSystemMessage,
  buildImportColumnMapUserJson,
  headersForImportMapPrompt,
} from '@/features/transactions/lib/txn-chat/import/columnMapPrompt';
import { normalizeImportColumnMapJson } from '@/features/transactions/lib/txn-chat/import/normalizeColumnMap';
import type { TxnChatTurnRequest, TxnChatTurnResult } from '@/features/transactions/lib/txn-chat/types';
import {
  TXN_CHAT_RESPONSE_JSON_SCHEMA,
  buildTxnChatSystemInstruction,
  buildTxnChatUserPayload,
  txnChatInstructionArgs,
} from '@/features/transactions/lib/txn-chat/prompt';
import { normalizeTxnChatJson } from '@/features/transactions/lib/txn-chat/normalize';

const DEFAULT_MODEL = 'gemini-2.5-flash';

export type GeminiTxnChatProviderOptions = {
  apiKey: string;
  /** Override model id (Google AI direct, not OpenRouter). */
  model?: string;
};

export function createGeminiTxnChatProvider(opts: GeminiTxnChatProviderOptions): TxnChatProvider {
  const model = opts.model?.trim() || DEFAULT_MODEL;
  return {
    id: 'gemini',
    label: `Gemini (${model})`,
    async chatTurn(req: TxnChatTurnRequest): Promise<TxnChatTurnResult> {
      const args = txnChatInstructionArgs(req);
      const systemInstruction = buildTxnChatSystemInstruction(args);
      // Same tail as OpenRouter: exact JSON shape at end of contents (recency + matches system text).
      const body = buildTxnChatUserPayload(req, { jsonReminder: true });

      const ai = new GoogleGenAI({ apiKey: opts.apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: body,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: { ...(TXN_CHAT_RESPONSE_JSON_SCHEMA as Record<string, unknown>) },
          temperature: 0.35,
        },
      });

      const rawText = response.text;
      if (!rawText?.trim()) {
        throw new Error('Empty response from Gemini');
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText) as unknown;
      } catch {
        throw new Error('Model returned invalid JSON');
      }
      return normalizeTxnChatJson(parsed);
    },
    async suggestImportColumnMap(req: ImportColumnMapRequest): Promise<ImportColumnMapResult> {
      const hdrs = headersForImportMapPrompt(req.headers);
      const systemInstruction = buildImportColumnMapSystemMessage(req.currency);
      const body = buildImportColumnMapUserJson(req);

      const ai = new GoogleGenAI({ apiKey: opts.apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: body,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: { ...(IMPORT_COLUMN_MAP_JSON_SCHEMA as Record<string, unknown>) },
          temperature: 0.2,
        },
      });

      const rawText = response.text;
      if (!rawText?.trim()) throw new Error('Empty response from Gemini');
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText) as unknown;
      } catch {
        throw new Error('Model returned invalid JSON');
      }
      return normalizeImportColumnMapJson(parsed, hdrs);
    },
  };
}
