/**
 * Token estimation and conversation history trimming for context window management.
 *
 * Gemma 2 2B (8192 ctx via WebLLM) / Gemma 4 E2B (LiteRT + ONNX backends).
 * We use a conservative 4096-token working budget. Without trimming,
 * long conversations silently overflow, causing incoherent or garbled responses.
 * This is a safety issue in a mental health context.
 */

/** Conservative chars-per-token ratio for English text with small LLMs */
const CHARS_PER_TOKEN = 3.5;

/** Model context window size in tokens */
export const MODEL_CONTEXT_LIMIT = 4096;

/** Tokens reserved for model generation output */
export const RESERVED_FOR_GENERATION = 384;

/** Tokens reserved for the system prompt */
export const RESERVED_FOR_SYSTEM = 600;

/** Tokens available for conversation history */
export const AVAILABLE_FOR_HISTORY =
  MODEL_CONTEXT_LIMIT - RESERVED_FOR_GENERATION - RESERVED_FOR_SYSTEM;

export interface SimpleMessage {
  role: string;
  content: string;
}

export interface TrimResult {
  messages: SimpleMessage[];
  trimmed: boolean;
  originalCount: number;
  keptCount: number;
}

/**
 * Estimate token count for a string using a character-based heuristic.
 * Intentionally conservative (overestimates) to avoid overflow.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Trim conversation history to fit within a token budget.
 *
 * Strategy: Walk backward from the most recent message, accumulating token
 * counts until the budget is exceeded. Always keeps at least the most recent
 * user-assistant exchange. Returns messages in chronological order.
 */
export function trimConversationHistory(
  messages: SimpleMessage[],
  budgetTokens: number = AVAILABLE_FOR_HISTORY
): TrimResult {
  const originalCount = messages.length;

  if (messages.length === 0) {
    return { messages: [], trimmed: false, originalCount: 0, keptCount: 0 };
  }

  if (budgetTokens <= 0) {
    return { messages: [], trimmed: originalCount > 0, originalCount, keptCount: 0 };
  }

  // Walk backward, accumulating tokens
  let tokenCount = 0;
  let keepFrom = messages.length; // index from which we keep messages

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (tokenCount + msgTokens > budgetTokens && i < messages.length - 1) {
      // This message would exceed budget, and we already have at least one message
      break;
    }
    tokenCount += msgTokens;
    keepFrom = i;
  }

  const kept = messages.slice(keepFrom);
  return {
    messages: kept,
    trimmed: kept.length < originalCount,
    originalCount,
    keptCount: kept.length,
  };
}

/**
 * Build a complete messages array for the chat API with context window management.
 *
 * 1. System message with role: "system"
 * 2. Trimmed conversation history (oldest messages dropped first)
 * 3. Current user entry
 */
export function buildManagedMessages(
  systemPrompt: string,
  currentEntry: string,
  conversationHistory: SimpleMessage[] = []
): { messages: SimpleMessage[]; trimResult: TrimResult } {
  const systemTokens = estimateTokens(systemPrompt);
  const entryTokens = estimateTokens(currentEntry);

  // Budget for history = total available minus system and current entry
  const historyBudget = Math.max(
    0,
    MODEL_CONTEXT_LIMIT - RESERVED_FOR_GENERATION - systemTokens - entryTokens
  );

  const trimResult = trimConversationHistory(conversationHistory, historyBudget);

  const messages: SimpleMessage[] = [
    { role: "system", content: systemPrompt },
    ...trimResult.messages,
    { role: "user", content: currentEntry },
  ];

  return { messages, trimResult };
}
