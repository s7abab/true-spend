/** Linear transcript for models that want a single user blob (Gemini, OpenRouter user message). */
export function formatTxnChatTranscript(
  messages: readonly { role: 'user' | 'assistant'; text: string }[],
): string {
  const lines: string[] = [];
  for (const m of messages) {
    lines.push(m.role === 'user' ? `User: ${m.text}` : `Assistant: ${m.text}`);
  }
  return lines.join('\n\n');
}
