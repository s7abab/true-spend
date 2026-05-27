/**
 * Agentic loop for Rock Ai.
 *
 * Uses a dedicated system prompt that forces tool calls for data questions.
 * Simplified: when Gemini answers without tools, we emit that text directly
 * (no second API call). Tool results → another generateContent round.
 */
import { GoogleGenAI, type Content } from '@google/genai';
import type { TxnChatTurnRequest, TxnChatTurnResult } from '@/features/transactions/lib/txn-chat/types';
import {
  todayYmdLocal,
} from '@/features/transactions/lib/txn-chat/prompt';
import { normalizeTxnChatJson } from '@/features/transactions/lib/txn-chat/normalize';
import {
  AGENT_TOOL_DECLARATIONS,
  executeAgentTool,
  TOOL_LABELS,
  type ToolName,
} from '@/features/transactions/lib/txn-chat/agent/agentTools';

const MAX_TOOL_ROUNDS = 6;

export type AgentStatusCallback = (status: string) => void;
export type AgentChunkCallback  = (token: string) => void;

function buildAgentSystemPrompt(req: TxnChatTurnRequest): string {
  const today = req.todayYmd ?? todayYmdLocal();
  const exp   = req.expenseCategories.map(c => `- ${c.label}`).join('\n') || '- (none)';
  const inc   = req.incomeCategories.map(c => `- ${c.label}`).join('\n') || '- (none)';
  const xfer  = req.transferCategories.map(c => `- ${c.label}`).join('\n') || '- (none)';

  return `You are Rock Ai — a personal finance assistant inside the Truspend app.
Today is ${today}. Currency: ${req.currency}.

You have SIX tools that query the user's real transaction data from the database. USE THEM.

══════════════════════════════════
WHEN TO CALL TOOLS (MANDATORY)
══════════════════════════════════
You MUST call a tool before answering ANY question about the user's:
- spending amounts, totals, or budgets
- income or savings
- top expense categories
- monthly or weekly trends
- specific transactions or merchants
- money management issues or problems
- financial health assessment

If you answer without calling a tool for these questions, you are WRONG.
You do NOT have the user's data in your context — it is only in the tools.

Tool date defaults (use these when user does not specify):
- "this month"  → from=${today.slice(0, 7)}-01, to=${today}
- "last month"  → calculate previous month's first and last day
- "this year"   → from=${today.slice(0, 4)}-01-01, to=${today}
- "last 3 months" → from=3 months before ${today}, to=${today}

══════════════════════════════════
WHEN NOT TO CALL TOOLS
══════════════════════════════════
Skip tools ONLY for:
1. Logging transactions ("spent 200 on coffee", "received salary 50000")
2. Pure concept questions ("what is a SIP?", "explain compound interest")

For transaction logging, output JSON: {"reply":"...","transactions":[{...}]}
Use these exact category names (or omit category_label if unsure):
  Expenses: ${exp}
  Income:   ${inc}
  Transfers: ${xfer}

══════════════════════════════════
FINAL ANSWER FORMAT
══════════════════════════════════
After getting tool results, output JSON only (no markdown fences):
{"reply":"your answer here","transactions":[]}

Make the reply clear and friendly. Use bullet points or numbered lists.
Include real numbers from the tool data. Write in the user's language.`;
}

function buildHistory(req: TxnChatTurnRequest): Content[] {
  const history: Content[] = [];
  if (req.priorTranscript.trim()) {
    for (const line of req.priorTranscript.trim().split('\n')) {
      if (line.startsWith('User: '))
        history.push({ role: 'user', parts: [{ text: line.slice(6) }] });
      else if (line.startsWith('Assistant: '))
        history.push({ role: 'model', parts: [{ text: line.slice(11) }] });
    }
  }
  history.push({ role: 'user', parts: [{ text: req.userMessage }] });
  return history;
}

/** Simulate streaming by emitting one character at a time */
async function emitChars(text: string, onChunk: AgentChunkCallback) {
  for (const char of text) {
    onChunk(char);
    await new Promise(r => setTimeout(r, 0)); // yield to keep UI responsive
  }
}

/**
 * Main agent loop — streaming.
 * Each round uses generateContent (supports tool calling).
 * When Gemini produces a text answer (no more tool calls), we emit it directly.
 */
export async function runAgentLoopStreaming(opts: {
  apiKey: string;
  model: string;
  req: TxnChatTurnRequest;
  onStatus: AgentStatusCallback;
  onChunk:  AgentChunkCallback;
}): Promise<TxnChatTurnResult> {
  const { apiKey, model, req, onStatus, onChunk } = opts;
  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = buildAgentSystemPrompt(req);
  let currentHistory = buildHistory(req);
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    const response = await ai.models.generateContent({
      model,
      contents: currentHistory,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
        temperature: 0.3,
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error('No response from Gemini agent');

    const parts = candidate.content?.parts ?? [];
    const toolCalls = parts.filter(p => p.functionCall != null);
    const textParts = parts.filter(p => typeof p.text === 'string' && p.text.length > 0);

    // ── No tool calls → final answer ──────────────────────────────────────
    if (toolCalls.length === 0) {
      onStatus('');
      const rawText = textParts.map(p => p.text ?? '').join('');

      // Extract "reply" from JSON if present, else treat whole text as reply
      let replyText = rawText;
      try {
        const parsed = JSON.parse(rawText) as { reply?: string; transactions?: unknown[] };
        if (parsed.reply) replyText = parsed.reply;
        await emitChars(replyText, onChunk);
        return normalizeTxnChatJson(parsed);
      } catch {
        // Not JSON — just emit the text directly
        await emitChars(replyText, onChunk);
        return { reply: replyText, transactions: [] };
      }
    }

    // ── Execute tool calls ─────────────────────────────────────────────────
    currentHistory.push({ role: 'model', parts });
    const toolResultParts: Content['parts'] = [];

    for (const part of toolCalls) {
      const call = part.functionCall!;
      const name = call.name as ToolName;
      onStatus(TOOL_LABELS[name] ?? `Running ${name}…`);
      const args = (call.args ?? {}) as Record<string, unknown>;
      const result = await executeAgentTool(name, args, req.currency);
      toolResultParts.push({ functionResponse: { name, response: result } });
    }

    currentHistory.push({ role: 'user', parts: toolResultParts });
    onStatus('Analyzing your data…');
  }

  return { reply: "I couldn't complete the analysis. Please try again.", transactions: [] };
}

/** Alias kept for import compatibility */
export const runAgentLoop = runAgentLoopStreaming;
