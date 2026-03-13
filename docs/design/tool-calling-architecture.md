# QuietNote Tool-Calling Architecture Design

> **Status**: Design document (no code implementation yet)
> **Date**: 2026-03-12
> **Scope**: Client-side tool pattern for on-device mental health journaling

## Problem Statement

QuietNote needs a way to take structured actions based on conversation content (e.g., suggesting a mood log entry) without relying on model-side tool calling. The Gemma 2B / TinyLlama 1.1B models used for on-device inference are too small to produce reliable structured JSON tool-call output.

A client-side extraction pattern provides deterministic, testable behavior without depending on small-model JSON generation.

## Architecture Overview

```
User message
    │
    ▼
┌─────────────┐
│ Crisis       │ ← Always runs first (existing)
│ Detection    │
└──────┬──────┘
       │ (no crisis)
       ▼
┌─────────────┐
│ Emotion      │ ← New: client-side keyword/pattern matching
│ Extraction   │
└──────┬──────┘
       │ (emotion detected)
       ▼
┌─────────────┐
│ Suggestion   │ ← New: UI card in chat stream
│ Card         │
└──────┬──────┘
       │ (user clicks accept)
       ▼
┌─────────────┐
│ IndexedDB    │ ← Existing mood store via putMood()
│ Mood Store   │
└─────────────┘
```

### Key Design Decision: Client-Side, Not Model-Side

| Approach | Pros | Cons |
|----------|------|------|
| **Client-side extraction** | Deterministic, testable, works with any model size, no prompt engineering needed | Limited to keyword/pattern matching, can't understand nuance |
| **Model-side tool calling** | Can understand context and nuance | Unreliable with small models, requires structured output, harder to test, prompt-dependent |

**Decision**: Client-side extraction for the first tool. This follows the same pattern as `crisisDetection.ts` and provides a proven, safe foundation. Model-side tool calling can be explored later with larger models or fine-tuned outputs.

## First Tool: Mood Log Suggestion

### Purpose

Detect emotions expressed in user messages during journaling and offer to log a mood entry. The user accepts, modifies, or dismisses the suggestion.

### Emotion Extraction (`src/utils/emotionExtractor.ts`)

Follows the `crisisDetection.ts` pattern: keyword lists mapped to `MoodEmotion` values from `types.ts`.

```typescript
interface EmotionExtractionResult {
  detected: boolean;
  emotions: {
    emotion: MoodEmotion;
    intensity: number;      // estimated 1-10
    matchedKeywords: string[];
  }[];
  primaryEmotion: MoodEmotion | null;
}

function extractEmotions(text: string): EmotionExtractionResult;
```

**Emotion keyword mapping** (maps to existing `MoodEmotion` type):

| MoodEmotion | Example keywords |
|-------------|-----------------|
| `happy` | happy, joy, great, wonderful, excited, pleased, delighted |
| `sad` | sad, down, upset, crying, heartbroken, grief, loss |
| `anxious` | anxious, worried, nervous, scared, panic, dread, uneasy |
| `angry` | angry, frustrated, furious, irritated, mad, resentful |
| `calm` | calm, peaceful, relaxed, serene, at ease, tranquil |
| `excited` | excited, thrilled, pumped, energized, eager |
| `frustrated` | frustrated, stuck, blocked, stalled, annoyed |
| `content` | content, satisfied, okay, fine, good enough |
| `lonely` | lonely, isolated, alone, disconnected, left out |
| `grateful` | grateful, thankful, blessed, appreciative |

**Intensity estimation heuristic**:
- Base intensity: 5
- Amplifiers (+2): "very", "extremely", "so", "incredibly", "deeply"
- Diminishers (-2): "a little", "somewhat", "slightly", "kind of"
- Clamp to 1-10 range

**Interaction with crisis detection**: Emotion extraction MUST run AFTER crisis detection. If crisis detection triggers at medium severity or above, emotion extraction should be suppressed — the crisis flow takes priority.

### Suggestion Card (`src/components/MoodSuggestionCard.tsx`)

A dismissable inline UI card that appears below the assistant's response.

```
┌─────────────────────────────────────────┐
│ 💙 Log this mood?                       │
│                                         │
│ Emotion: [sad ▼]  Intensity: [7 ━━━━●] │
│ Context: [relationships] [personal]      │
│                                         │
│ [Save]  [Dismiss]  [Don't suggest again]│
└─────────────────────────────────────────┘
```

**Behavior**:
- Pre-filled with extracted emotion, estimated intensity, and inferred context
- User can modify any field before saving
- "Save" calls `putMood()` from `storage.ts` with the entry linked to the current session
- "Dismiss" removes the card for this message only
- "Don't suggest again" disables mood suggestions for the remainder of the session

**Rendering rules**:
- Only show after assistant responses (never during streaming)
- Maximum one suggestion card per exchange (pick the primary detected emotion)
- Cooldown: no suggestion if one was shown in the last 3 exchanges
- Minimum message length: only extract from user messages with 20+ characters
- Never show during crisis-detected conversations

### Data Flow

```
User sends message
  → crisisDetection.detectCrisis(text)
  → if no crisis: emotionExtractor.extractEmotions(text)
  → if emotion detected AND cooldown passed AND feature enabled:
      → render MoodSuggestionCard with pre-filled data
      → user clicks Save:
          → putMood({ id: uuid(), sessionId, emotion, intensity, contexts, ts })
      → user clicks Dismiss:
          → card removed, no data written
      → user clicks "Don't suggest again":
          → session-level flag set, no more suggestions this session
```

### State Management

New state in `App.tsx`:
- `moodSuggestionsEnabled: boolean` — session-level toggle, defaults to `true` (or respects `UserSettings.enableMoodTracking`)
- `lastSuggestionExchange: number` — exchange index of last suggestion, for cooldown
- `pendingSuggestion: EmotionExtractionResult | null` — current suggestion to display

No new persistent storage. The only write is to the existing mood store via `putMood()`.

## Safety Design

### Principles

1. **User-initiated only**: The LLM and extraction system suggest; the user confirms with an explicit click. No automatic data writes.
2. **Observable**: Every suggestion is a visible UI card. No hidden processing or silent data storage.
3. **Reversible**: Mood entries are deletable via the existing Privacy Dashboard.
4. **Sandboxed**: Writes only to the existing IndexedDB mood store. No new storage, no network, no new APIs.
5. **Minimal**: One tool first. No framework, no registry, no plugin system.

### Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Over-suggesting feels like surveillance | Medium | Cooldown (3 exchanges), session disable, minimum message length |
| Incorrect emotion detection | Low | User can modify before saving; wrong suggestions are just dismissed |
| Suggestions during crisis | High | Suppressed when crisis detection triggers at medium+ severity |
| Feature feels intrusive to new users | Medium | Respects `enableMoodTracking` setting; off by default until user enables |
| Data accumulation concerns | Low | Existing delete/export/clear-all in Privacy Dashboard applies to mood entries |
| Keyword matching misinterprets context | Medium | Conservative keyword lists; user always reviews before saving |

### What This Architecture Explicitly Does NOT Do

- **No model-side tool calling**: The LLM does not generate tool calls or structured output.
- **No autonomous actions**: Nothing happens without a user click.
- **No hidden data collection**: Dismissed suggestions are not logged or stored.
- **No network access**: Everything stays on-device.
- **No profiling**: Emotion extraction runs per-message, has no memory of past extractions.
- **No persuasion**: Suggestions are neutral UI cards, not emotionally persuasive prompts.

## Future Tool Candidates

Ranked by safety and feasibility:

### Tier 1: Safe to Build Next
- **Journal Prompt Recommendation**: Suggest a relevant journaling prompt based on detected conversation themes. Read-only, draws from existing curated `journalPrompts.ts` data. Must be suppressed during crisis.

### Tier 2: Needs Safeguards First
- **Session Summary**: Generate a brief summary when user ends a session. Requires LLM output, so quality depends on model capability. Needs opt-in, review-before-save, and edit/delete.

### Tier 3: Rejected
- Internet search, contact recommendations, diagnosis suggestions, medication tracking, social sharing, therapist matching, AI-generated affirmations without user request, background processing, hidden memory.

## Implementation Plan

### Phase 1: Emotion Extraction (est. 1 day)
1. Create `src/utils/emotionExtractor.ts` with keyword lists and `extractEmotions()`
2. Create `src/utils/__tests__/emotionExtractor.test.ts` with comprehensive tests
3. Ensure crisis detection takes priority over emotion extraction

### Phase 2: Suggestion Card UI (est. 1 day)
1. Create `src/components/MoodSuggestionCard.tsx`
2. Wire into `ChatPanel.tsx` after assistant messages
3. Implement cooldown and session-disable logic
4. Connect "Save" to existing `putMood()`

### Phase 3: Integration and Testing (est. 1 day)
1. Wire extraction into message handling in `App.tsx`
2. Respect `enableMoodTracking` setting
3. Manual testing: various emotional messages, crisis messages, long sessions
4. Edge cases: empty messages, very short messages, mixed emotions

## Evaluation Plan

### Unit Tests
- Emotion keyword detection accuracy for each `MoodEmotion`
- Intensity amplifier/diminisher logic
- Crisis detection priority (emotion extraction suppressed during crisis)
- Cooldown enforcement
- Minimum message length enforcement

### Manual Test Protocol
1. Express a clear emotion ("I'm feeling really anxious about my presentation") → suggestion card appears
2. Express multiple emotions → primary emotion selected correctly
3. Short message ("hi") → no suggestion
4. Crisis keyword ("I want to end my life") → crisis flow, no mood suggestion
5. Dismiss a suggestion → card removed, no data written
6. Click "Don't suggest again" → no more suggestions for session
7. Accept a suggestion → mood entry appears in Privacy Dashboard
8. Modify emotion/intensity before saving → modified values saved correctly

### Future Automated Evals
- Precision/recall of emotion detection against labeled conversation dataset
- False positive rate on neutral/factual messages
- Interaction with crisis detection (zero false negatives — crisis must always take priority)
