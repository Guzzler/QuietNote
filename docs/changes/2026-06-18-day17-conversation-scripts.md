# Day 17 — Track C1: Conversation-script support in the eval harness

**Date:** 2026-06-18
**Branch:** `feat/2026-06-18-conversation-scripts`
**PR:** #63
**Phase:** BUILD (`feat:` allowed)
**Roadmap:** Track **C1** → DONE. Closes the instrument gap behind Fundamental
Problem #2's residual risk ("fixed at 3-turn scale only — long-conversation
behavior is unmeasured").

## Summary

The eval harness can now run a **scripted multi-turn conversation** where the
model's **own** replies accumulate as context across 10–20 turns — instead of
the canned, author-written `priorTurns` fixtures every empathy case uses today.
This is the first time we can measure what actually degrades in a long session:
entity retention across many turns and guided-mode step coherence over a full
5-step thought record, with the model's real (imperfect) output as the
connective tissue.

This session ships the **capability**, proven deterministically with a mock
model. The live Gemma baseline run is **C2** (a later day) — no model was run
here.

## What changed and why

### New files (freeze-safe by construction)
- **`src/utils/conversationScripts.ts`** — `ConversationScript` / `ScriptTurn`
  types + `CONVERSATION_SCRIPTS`, three hand-authored scripts:
  - `script-freewrite-retention` (freewrite, ~12 turns) — establishes "sister
    Maya / dad's birthday dinner" in turns 1–2, develops the conversation, then
    places **two retention probes** (deliberately brief turns: "I don't know
    anymore." / "Yeah, exactly.") whose replies must still ground in that entity.
  - `script-thoughtrecord-steps` (thoughtrecord, intro + 5 scored steps) —
    mirrors `THOUGHT_RECORD_SEQUENCE` (situation → automatic thought → emotion →
    evidence → balanced thought); each step turn carries `stepIndex` + an
    `expect`. Drives the **step-coherence** check.
  - `script-checkin-retention` (checkin, ~10 turns) — establishes a daytime
    client presentation early, probes recall near the end.
- **`src/utils/conversationDriver.ts`** — `runConversationScript` threads the
  model's REAL reply at turn *k* into the context for turn *k+1* (the heart of
  C1), scoring each turn:
  - `expect` is scored by **reusing `evaluateResponse`** against a synthetic
    `EvalCase` whose `priorTurns` ARE the real accumulated history — so
    `mustEchoPriorTurn` now echoes the model's actual output, not fixtures.
  - retention probes are scored case-insensitively and counted separately
    (`probes` / `probesPassed`) so probe pass-rate is a first-class number.
  - **step coherence** (guided scripts only): true iff every `stepIndex` turn
    passed AND the observed step order is exactly `1,2,…,expectedSteps`
    (monotonic, contiguous, no skips/loops); `null` for non-guided scripts.
  - `scriptReportToMarkdown` emits a per-script summary table + failing-turn
    bodies (300-char truncation, mirroring `reportToMarkdown`).

### Wiring (not run live this session)
- **`scripts/run-eval.ts`** — new `--scripts` flag. When passed, after the
  per-mode case loop it runs `CONVERSATION_SCRIPTS`, builds the system
  instruction per `script.mode` via the existing `getBaseSystemInstruction`,
  writes `docs/eval-runs/<date>/conversation-scripts.md`, and attaches a
  `scripts` block to `summary.json`. **Crucially, the default `npm run eval`
  output is unchanged** — `summary.json` keeps its historical array shape unless
  `--scripts` is passed, so the existing critic loop is undisturbed. C2 will run:
  `npm run eval -- --scripts`.
- **`package.json`** — added `eval:scripts` alias.

## Why the freeze gate stays empty

All new code lives in new files and reuses `evaluateResponse` /
`getBaseSystemInstruction` **by import only**. `src/utils/evalRunner.ts`,
`src/utils/evalScorer.ts`, `src/prompts/*`, and `EVAL_CASES` are byte-identical:

```
git diff origin/main -- src/utils/evalRunner.ts src/utils/evalScorer.ts src/prompts/
# → empty
```

A freeze-lift line is recorded in `docs/decisions.md` per PHASE.md rule 3 (the
roadmap noted C1 "Needs a freeze-lift entry"), but structurally zero existing
scored cases were touched.

## Tests written (deterministic — NO model)

- **`src/utils/__tests__/conversationDriver.test.ts`** (mock-driven, 16 tests):
  - **History threading** (the single most important test): the 3rd call's
    `messages` contain the assistant text returned on the 1st call — proof the
    real conversation accumulates, which `priorTurns` could never give us.
  - First turn sees only `system` + one `user` (no prior history).
  - `mustEchoPriorTurn` PASS when the reply echoes an earlier user word, FAIL on
    a generic reply — scored against **real** history.
  - Context-only turns pass trivially and aren't scored.
  - Retention probe PASS/FAIL flips with mock output; `probes`/`probesPassed`
    counts update.
  - Step coherence: monotonic 1→5 ⇒ true; a step that fails its `expect` breaks
    coherence ⇒ false; `null` for a non-guided script.
  - Abort signal stops before any generate; inference error becomes a failed
    turn with history kept aligned.
  - `scriptReportToMarkdown` renders the summary table + failing-turn bodies.
- **`src/utils/__tests__/conversationScripts.test.ts`** (data integrity, 5 tests):
  ids unique, valid modes, ≥1 scored/probe turn per script, probe
  `mustContainAny` non-empty, **probe entities appear in an earlier user turn**
  (fairness), guided scripts have contiguous `stepIndex` 1..N each with an
  `expect`, non-guided scripts use no `stepIndex`.

## Validation

| Check | Result |
|---|---|
| `npm run build` (TS strict) | ✅ clean |
| `npm run test` | ✅ **1141/1141** (1120 baseline + 21 new) |
| Freeze gate (evalRunner/evalScorer/prompts) | ✅ empty |
| Lint (new src files) | ✅ clean (run-eval.ts's `any` errors pre-date this change, +0 new) |
| Live model run | ⏸ none — mock only, by design (C2 runs live) |

No screenshots: C1 is a harness-only change with no UI surface.

## Next steps

- **C2** — live `npm run eval -- --scripts` Gemma run; write the first
  long-conversation critic data (probe pass-rate, step-coherence, and trim
  behavior at the 4096 boundary).
- **C3** — context-fix candidates gated on C2 data (summarize-trimmed-turns into
  the recap, `RESERVED_FOR_GENERATION` tuning, per-mode compaction).
