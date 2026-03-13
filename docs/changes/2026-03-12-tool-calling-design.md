# Tool-Calling Architecture Design Document

## Summary

Created a comprehensive design document for QuietNote's first tool-calling capability: client-side emotion extraction with mood log suggestion cards. This is a design-only change — no runtime code was modified.

## Motivation

QuietNote needs a pattern for taking structured actions based on conversation content. The plan calls for a mood log suggestion tool as the first capability. Before writing implementation code, a thorough design document ensures the architecture is safe, well-scoped, and reviewed.

This is particularly important for a mental health application where any new capability must be evaluated for safety before implementation.

## User impact

No direct user impact — this is a design artifact. When implemented, users will be able to:
- See mood log suggestions after expressing emotions in conversation
- Accept, modify, or dismiss suggestions with explicit clicks
- Disable suggestions for the current session
- Delete any logged mood entries via the Privacy Dashboard

## Technical details

The design document (`docs/design/tool-calling-architecture.md`) covers:

- **Architecture decision**: Client-side keyword extraction (not model-side tool calling) due to small model limitations
- **Emotion extraction utility**: Keyword lists mapped to existing `MoodEmotion` types, intensity estimation heuristics
- **Suggestion card UI**: Inline dismissable card with pre-filled emotion, intensity, and context
- **Data flow**: Crisis detection first, then emotion extraction, then optional suggestion card, then user-confirmed write to existing IndexedDB mood store
- **State management**: Session-level flags only, no new persistent storage
- **Safety design**: Five principles (user-initiated, observable, reversible, sandboxed, minimal) with risk analysis table
- **Explicit exclusions**: No model-side tool calling, no autonomous actions, no hidden data, no network, no profiling, no persuasion
- **Future tool ranking**: Tier 1 (safe), Tier 2 (needs safeguards), Tier 3 (rejected)
- **Implementation plan**: Three phases with estimated timelines
- **Evaluation plan**: Unit tests, manual test protocol, future automated evals

## Safety review

- **Why safe**: This is a documentation-only change with zero runtime impact. The design itself encodes conservative safety principles.
- **Failure modes**: The design could be incomplete or miss edge cases. Mitigated by requiring implementation-time safety review.
- **Mental health sensitivity**: The design explicitly addresses crisis detection priority (mood suggestions suppressed during crisis), over-suggestion risk (cooldown, session disable), and intrusion concerns (off by default, user controls).

## Validation

- Design reviewed against existing codebase: `crisisDetection.ts` pattern, `types.ts` MoodEmotion/MoodEntry types, `storage.ts` putMood API
- No code changes to validate — design document only
- Architecture follows established patterns in the codebase

## Rollback / limitations

- **Revert**: Delete `docs/design/tool-calling-architecture.md`
- **Limitations**: This is a design only. Implementation is a separate future task. The keyword-based emotion extraction approach has inherent accuracy limitations compared to model-based understanding.

## Next steps

1. Implement Phase 1: `emotionExtractor.ts` with tests
2. Implement Phase 2: `MoodSuggestionCard.tsx` UI component
3. Implement Phase 3: Integration into App.tsx message handling
