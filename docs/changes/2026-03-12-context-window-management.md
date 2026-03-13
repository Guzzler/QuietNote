# Context Window Management

## Summary

Added token estimation and conversation history trimming so long conversations no longer silently overflow the model's context window. Fixed the system prompt role from `"user"` to `"system"`. Added a visible UI indicator when context trimming is active. Introduced vitest as the testing framework with 19 unit tests.

## Motivation

QuietNote uses a TinyLlama 1.1B model with a 2048-token context window. Previously, `buildMessages()` sent the entire conversation history with zero truncation. After ~10-15 exchanges, the context silently overflowed, causing incoherent or garbled responses. In a mental health context, a user pouring out difficult emotions and suddenly receiving nonsensical output is actively harmful.

## User impact

- Long journaling sessions (15+ turns) now produce consistent, coherent responses instead of degrading silently.
- Users see a subtle amber notice ("Earlier messages are no longer in context") when trimming activates, building trust through transparency.
- System prompt now uses the correct `"system"` role, improving instruction-following quality.

## Technical details

**New file: `src/utils/tokenEstimator.ts`**
- `estimateTokens(text)`: Character-based heuristic (~3.5 chars/token) for conservative token counting.
- `trimConversationHistory(messages, budget)`: Walks backward from most recent messages, keeping as many as fit within the token budget. Always preserves at least the most recent message.
- `buildManagedMessages(systemPrompt, currentEntry, history)`: Orchestrates the full message array construction with budget calculation, trimming, and proper role assignment.
- Constants: `MODEL_CONTEXT_LIMIT=2048`, `RESERVED_FOR_GENERATION=512`, `RESERVED_FOR_SYSTEM=200`.

**Modified: `src/App.tsx`**
- `buildMessages()` now delegates to `buildManagedMessages()` and returns `{ messages, trimmed }`.
- System prompt role changed from `"user"` to `"system"`.
- New `contextTrimmed` state tracks whether history was trimmed, passed to ChatPanel.

**Modified: `src/components/ChatPanel.tsx`**
- Added `contextTrimmed` prop and amber notice bar when trimming is active.

**New: Testing infrastructure**
- Added vitest as dev dependency.
- Added `test` and `test:watch` npm scripts.
- 19 unit tests covering `estimateTokens`, `trimConversationHistory`, `buildManagedMessages`, and constants validation.

## Safety review

- **Why safe**: Pure logic change with no new data flows, storage, or network access. Prevents a concrete safety bug (context overflow causing incoherent responses to potentially distressed users).
- **Failure modes**: Token estimation heuristic could be inaccurate for non-English text or code, potentially trimming too aggressively or not enough. Conservative 3.5 chars/token ratio mitigates under-estimation.
- **Safeguards**: UI indicator makes trimming visible to users. Generation budget (512 tokens) is generous. System prompt budget is calculated dynamically based on actual content.
- **Mental health sensitivity**: The primary safety improvement is preventing garbled output during emotional conversations. The context-trimmed indicator uses neutral, non-alarming language.

## Validation

- **Tests run**: 19 unit tests, all passing.
  - Token estimation: empty, short, long, unicode/emoji text
  - History trimming: empty, fits-in-budget, exceeds-budget, zero-budget, single-oversized-message, chronological ordering
  - Full message building: system role, entry placement, history inclusion, long conversation trimming, empty history
  - Constants consistency
- **Type checking**: No new TypeScript errors introduced (pre-existing errors in unmodified files only).
- **Red-team checks**:
  - What if all messages are very short? Trimming won't activate — correct behavior.
  - What if a single message exceeds the entire budget? At least that one message is kept — graceful degradation.
  - What if the system prompt is very long? Budget dynamically adjusts, reducing history space — correct.
  - Could the trimming indicator cause anxiety? Uses neutral language, amber (not red) styling, and an info icon — minimal alarm.

## Rollback / limitations

- **Revert**: Remove the import and revert `buildMessages()` to the old implementation. No database or state migration needed.
- **Limitations**:
  - Token estimation is a heuristic, not exact tokenization. Works well for English but may be less accurate for other languages or code.
  - No conversation summarization — trimmed messages are simply dropped, not condensed.
  - The context-trimmed indicator is session-level, not per-message. It doesn't show exactly which messages were dropped.

## Next steps

1. Emotion extraction utility (client-side keyword matching for mood suggestion cards)
2. Conversation summarization as an alternative to simple truncation
3. Per-message token count display in debug/developer mode
4. Automated conversation quality evaluation harness
