# Empathy & Format Tuning — 2026-05-26

## Summary

Tuned all five system prompts for empathy specificity and format discipline, and extended the eval harness with multi-turn empathy cases and sentence-count scoring.

## What Changed and Why

### System Prompt Tuning (src/App.tsx)

The 2026-05-25 hardening commit added safety rules (medical refusal, jailbreak resistance) but did not address the core user complaint: responses feel generic and formulaic. This change adds empathy and format guidance to all five system prompts:

- **Free-write prompt**: Added empathy guidance (echo user details, avoid generic closers), format rules (max 4 sentences, no bullets/lists), and a concrete bad/good example pair using the "Anna's wedding" scenario.
- **Four guided-mode prompts** (Gratitude, Morning Check-in, Evening Check-in, Thought Record): Added shorter empathy/format guidance (max 3 sentences, echo specifics, no generic closers).

The guidance is placed after mode-specific instructions but before the medical safety rules, keeping safety rules closest to user input where they have the most influence on small models.

### Eval Harness Extension (src/utils/evalRunner.ts, evalDriver.ts)

- Added `priorTurns` optional field to `EvalCase` interface for multi-turn scenarios
- Added `maxSentences` and `mustEchoPriorTurn` to `passCriteria`
- Added stopword-filtered echo detection scorer
- Updated `evalDriver.ts` to prepend `priorTurns` between system message and user prompt
- Added 4 multi-turn empathy cases testing contextual memory across turns
- Added 2 format cases: sentence-count enforcement on long input, bullet-list redirection
- Updated baseline-responses.json with synthetic baselines for all 6 new cases

## Tests Written

- `src/utils/__tests__/evalRunner.test.ts` (new file, 8 tests):
  - maxSentences: passes within limit, fails when exceeded, handles mixed punctuation
  - mustEchoPriorTurn: passes with content word echo, fails without echo, fails on stopword-only echo, no-op on empty priorTurns
  - EVAL_CASES integrity: unique IDs, multi-turn cases exist, sentence-count cases exist

- `src/utils/__tests__/evalDriver.test.ts` (2 new tests):
  - priorTurns passed between system and user prompt in correct order
  - Cases without priorTurns work as before (2-message arrays)

Total: 949 tests passing (10 new).

## Next Steps

- Run eval harness against real model (WebLLM Gemma 2 2B) to capture post-tuning baseline
- Compare empathy/format pass rates against pre-tuning numbers
- If medical_refusal or jailbreak regress >5pp, move empathy guidance before HARD RULES
