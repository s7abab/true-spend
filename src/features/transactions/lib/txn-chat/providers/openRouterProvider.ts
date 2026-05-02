import type { TxnChatProvider } from '@/features/transactions/lib/txn-chat/providers/types';
import type { TxnChatTurnRequest, TxnChatTurnResult } from '@/features/transactions/lib/txn-chat/types';
import {
  buildTxnChatSystemInstruction,
  buildTxnChatUserPayload,
  txnChatInstructionArgs,
} from '@/features/transactions/lib/txn-chat/prompt';
import { normalizeTxnChatJson, parseJsonFromModelText } from '@/features/transactions/lib/txn-chat/normalize';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type OpenRouterTxnChatProviderOptions = {
  apiKey: string;
  /** OpenRouter model slug (see https://openrouter.ai/models); app default is google/gemini-2.0-flash-001 */
  model: string;
  /** Optional site URL for OpenRouter rankings (defaults to current origin in browser). */
  httpReferer?: string;
  appTitle?: string;
};

export function createOpenRouterTxnChatProvider(opts: OpenRouterTxnChatProviderOptions): TxnChatProvider {
  const model = opts.model.trim();
  return {
    id: 'openrouter',
    label: `OpenRouter (${model})`,
    async chatTurn(req: TxnChatTurnRequest): Promise<TxnChatTurnResult> {
      const systemContent = buildTxnChatSystemInstruction(txnChatInstructionArgs(req));
      const userContent = buildTxnChatUserPayload(req, { jsonReminder: true });

      // Many OpenRouter backends (e.g. Google Gemma via AI Studio) reject a separate `system`
      // message ("Developer instruction is not enabled"). One `user` blob keeps free + small models working.
      const combinedUser = [
        'You must follow these instructions for every reply:',
        '',
        systemContent,
        '',
        '---',
        '',
        'Conversation and current user message:',
        '',
        userContent,
      ].join('\n');

      const referer =
        opts.httpReferer?.trim() ||
        (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost');

      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': referer,
          'X-Title': opts.appTitle?.trim() || 'Truspend',
        },
        body: JSON.stringify({
          model,
          temperature: 0.35,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: combinedUser }],
        }),
      });

      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const errObj = data?.error as Record<string, unknown> | undefined;
        const msg =
          (typeof errObj?.message === 'string' && errObj.message) ||
          (typeof data?.message === 'string' && data.message) ||
          `OpenRouter error (${res.status})`;
        throw new Error(msg);
      }

      const choices = data.choices as unknown;
      const first =
        Array.isArray(choices) && choices[0] && typeof choices[0] === 'object'
          ? (choices[0] as Record<string, unknown>)
          : null;
      const message = first?.message as Record<string, unknown> | undefined;
      const rawText = typeof message?.content === 'string' ? message.content : '';
      if (!rawText.trim()) {
        throw new Error('Empty response from OpenRouter');
      }
      let parsed: unknown;
      try {
        parsed = parseJsonFromModelText(rawText);
      } catch {
        throw new Error('Model returned invalid JSON');
      }
      return normalizeTxnChatJson(parsed);
    },
  };
}
