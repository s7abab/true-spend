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
import { runAgentLoopStreaming } from '@/features/transactions/lib/txn-chat/agent/agentLoop';

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
    async chatTurnStream(req: TxnChatTurnRequest, onChunk: (token: string) => void): Promise<TxnChatTurnResult> {
      const args = txnChatInstructionArgs(req);
      const systemInstruction = buildTxnChatSystemInstruction(args);
      const body = buildTxnChatUserPayload(req, { jsonReminder: true });

      const ai = new GoogleGenAI({ apiKey: opts.apiKey });
      const stream = await ai.models.generateContentStream({
        model,
        contents: body,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: { ...(TXN_CHAT_RESPONSE_JSON_SCHEMA as Record<string, unknown>) },
          temperature: 0.35,
        },
      });

      let fullText = '';
      let lastEmittedReply = '';

      for await (const chunk of stream) {
        const token = chunk.text ?? '';
        fullText += token;
        // Try to extract the "reply" field as it streams and emit it progressively
        const replyMatch = /"reply"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(fullText);
        if (replyMatch) {
          const partialReply = replyMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          const newPart = partialReply.slice(lastEmittedReply.length);
          if (newPart) {
            onChunk(newPart);
            lastEmittedReply = partialReply;
          }
        }
      }

      if (!fullText.trim()) throw new Error('Empty streaming response from Gemini');
      let parsed: unknown;
      try {
        parsed = JSON.parse(fullText) as unknown;
      } catch {
        // If full JSON didn't parse cleanly, wrap reply in minimal shape
        parsed = { reply: lastEmittedReply || fullText, transactions: [] };
      }
      return normalizeTxnChatJson(parsed);
    },
    async chatTurnAgent(
      req: TxnChatTurnRequest,
      onStatus: (status: string) => void,
      onChunk: (token: string) => void,
    ): Promise<TxnChatTurnResult> {
      return runAgentLoopStreaming({
        apiKey: opts.apiKey,
        model,
        req,
        onStatus,
        onChunk,
      });
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
