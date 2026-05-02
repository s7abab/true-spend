import type { TxnChatProvider } from '@/features/transactions/lib/txn-chat/providers/types';
import { createGeminiTxnChatProvider } from '@/features/transactions/lib/txn-chat/providers/geminiProvider';
import { createOpenRouterTxnChatProvider } from '@/features/transactions/lib/txn-chat/providers/openRouterProvider';

export type TxnChatEnvResolution =
  | { ok: true; provider: TxnChatProvider }
  | { ok: false; hint: string };

/**
 * Default when `VITE_OPENROUTER_MODEL` is unset: cheap paid Flash (reliable JSON for this chat).
 *
 * Absolute cheapest: use a **:free** model from OpenRouter ($0; rate limits + lower reliability).
 * Examples families often offered free: DeepSeek, Llama, Qwen — see https://openrouter.ai/models?q=free
 *
 * Other cheap paid (set in .env): e.g. `meta-llama/llama-3.2-3b-instruct`, or sort models by price.
 */
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.0-flash-001';

/**
 * Resolves which LLM backend to use from Vite env.
 *
 * - `VITE_AI_PROVIDER`: `openrouter` | `gemini` (optional).
 * - If unset: prefer OpenRouter when `VITE_OPENROUTER_API_KEY` is set, else Gemini when `VITE_GEMINI_API_KEY` is set.
 */
export function resolveTxnChatFromEnv(): TxnChatEnvResolution {
  const explicit = import.meta.env.VITE_AI_PROVIDER?.trim().toLowerCase() ?? '';
  const orKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim() ?? '';
  const gKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() ?? '';

  let kind: 'openrouter' | 'gemini' | null = null;
  if (explicit === 'openrouter') {
    if (!orKey) {
      return {
        ok: false,
        hint: 'VITE_AI_PROVIDER is openrouter but VITE_OPENROUTER_API_KEY is missing. Add it from https://openrouter.ai/',
      };
    }
    kind = 'openrouter';
  } else if (explicit === 'gemini') {
    if (!gKey) {
      return {
        ok: false,
        hint: 'VITE_AI_PROVIDER is gemini but VITE_GEMINI_API_KEY is missing. Add a Google AI Studio key or switch to openrouter.',
      };
    }
    kind = 'gemini';
  } else if (explicit) {
    return {
      ok: false,
      hint: `Unknown VITE_AI_PROVIDER "${import.meta.env.VITE_AI_PROVIDER}". Use openrouter or gemini.`,
    };
  } else {
    if (orKey) kind = 'openrouter';
    else if (gKey) kind = 'gemini';
  }

  if (kind === 'openrouter') {
    const model = import.meta.env.VITE_OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
    return {
      ok: true,
      provider: createOpenRouterTxnChatProvider({ apiKey: orKey, model }),
    };
  }
  if (kind === 'gemini') {
    const model = import.meta.env.VITE_GEMINI_MODEL?.trim();
    return {
      ok: true,
      provider: createGeminiTxnChatProvider({ apiKey: gKey, model: model || undefined }),
    };
  }

  return {
    ok: false,
    hint: 'No AI key configured. Set VITE_OPENROUTER_API_KEY (recommended) or VITE_GEMINI_API_KEY, optionally VITE_AI_PROVIDER=openrouter|gemini.',
  };
}
