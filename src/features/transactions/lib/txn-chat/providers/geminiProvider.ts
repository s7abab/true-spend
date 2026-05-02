import { GoogleGenAI } from '@google/genai';
import type { TxnChatProvider } from '@/features/transactions/lib/txn-chat/providers/types';
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
      const body = buildTxnChatUserPayload(req, { jsonReminder: false });

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
  };
}
