# Day 20 — Track D1 Tool-Calling Capability Spike (eval-only)

## Summary

Ran the kill-gated Track D1 spike: measured whether Gemma 4 E2B can reliably emit a one-line, ultra-constrained tool-call grammar without false-firing on ordinary journaling turns. **Verdict: NO-GO.** Valid-call rate **1/8 = 13%** (gate ≥80% — fail); false-call rate **0/12 = 0%** (gate ~0 — pass). Per the gate's kill clause, **Track D stops**; D2/D3 are not built. The negative result is the deliverable — it re-confirms the 2026-03-12 design decision to use client-side keyword extraction over model-side tool calling.

## What was changed and why

This is an **eval-only, greenfield** spike. All new code lands in NEW files; the freeze gate (`evalRunner.ts`, `evalScorer.ts`, `src/prompts/*`, `EVAL_CASES`) stays byte-identical (the C1 precedent). The grammar prompt beat is injected **only** by the eval runner at runtime via string concatenation — never written into `systemPrompts.ts`.

- **`src/utils/toolCalls.ts`** (new) — the one-line grammar `<<tool:NAME arg=value>>`, a pure `parseToolCalls`/`validateToolCall`, and `strippedText` (proves syntax never leaks into display prose). Three tools — `suggest_prompt`, `search_past_entries`, `log_mood` — validated against the **imported** `PromptCategory` (via `getAllCategories()`) and `MoodEmotion` domains (no divergent hardcoded sets). Plus `TOOL_GRAMMAR_INSTRUCTION` (with the load-bearing "most turns need NO tool" clause + few-shot) and `TOOL_REPROMPT_INSTRUCTION` (mirrors the `responseShaping` retry shape).
- **`src/utils/toolCallEval.ts`** (new) — 20 single-turn cases (8 tool-warranted across all 3 tools/modes + 12 ordinary, including 2 near-misses where a mood/past is *mentioned* but no tool is warranted) + `scoreToolCase` returning `validCallMade`/`argAccurate`/`falseCall`. Does **not** import evalRunner/evalScorer.
- **`scripts/run-eval.ts`** — a `--tools` flag (skips the expensive per-mode base suite when run alone), runtime grammar concatenation, one malformed-call retry on warranted cases, a `D1-tool-spike.md` per-case writer, and a `tools` block attached to `summary.json` **only** when `--tools` is passed (default shape byte-identical). `eval:tools` npm script added.

## Result

| Metric | Result | Gate | Pass? |
|---|---|---|---|
| Valid-call rate (incl. retry) | 1/8 = **13%** | ≥80% | ❌ |
| False-call rate | 0/12 = **0%** | ~0 | ✅ |
| Argument accuracy | 1/1 = 100% | — | (one call) |
| Retries fired | 0/8 | — | not load-bearing |

The model recognises tool intent but **narrates the action in prose** instead of emitting the grammar — e.g. warrant-mood-1 *claimed* "I have… logged it for you" with no call; warrant-search-3 verbally agreed to search Maya with no call. The roadmap's intended keeper `search_past_entries` scored **0/3** (worst tool); the lone success was `suggest_prompt` in gratitude mode. Because every miss was silence/prose (not a malformed call), the re-prompt retry was inert — you cannot correct a call that was never attempted. The one reassuring result: **0 false calls**, including both near-misses — the journaling-tone risk the spike was built to measure did not materialize.

Full analysis + GO/NO-GO: [`docs/eval-runs/2026-06-23/D1-tool-spike-findings.md`](../eval-runs/2026-06-23/D1-tool-spike-findings.md); per-case bodies: [`D1-tool-spike.md`](../eval-runs/2026-06-23/D1-tool-spike.md).

## Tests written

39 new deterministic (no-model) tests:
- `src/utils/__tests__/toolCalls.test.ts` — parse well-formed calls (single/multiple/quoted), `strippedText` removes every call line with no syntax leak, `validateToolCall` rejects unknown name/arg/out-of-domain category/out-of-range or non-integer intensity/missing arg/empty query and accepts all 3 tools, malformed shapes (`<<tool:>>`, unterminated, free JSON, trailing prose) are not valid calls, grammar/reprompt constants.
- `src/utils/__tests__/toolCallEval.test.ts` — exactly 20 cases, unique ids, valid modes, 8/12 split, every `expectedTool` in allow-list, every `expectedArgs` in-domain, the 2 near-misses present, tool spread (3/3/2); `scoreToolCase` valid/inaccurate/fuzzy-query/silence/invalid-only/false-call paths.

Full suite **1189/1189** green; `npm run build` (TS strict) green; freeze gate (`evalRunner.ts`/`evalScorer.ts`/`src/prompts/`) diff vs `origin/main` **EMPTY**.

## Next steps

- **None for Track D — it is stopped by the gate.** This is a valid, valuable outcome: a track killed by a few minutes of CPU + a measurement.
- The grammar/parser code is retained (committed, tested) as a record of the spike and a starting point should a *non-model-emitted* approach (deterministic intent-detection + UI card) ever be pursued — the path the 2026-03-12 design doc already recommends.
- Next roadmap pick is a planner decision: Track A6 is filler; the daily eval→tune loop continues. With Tracks A (core UX), B (input robustness), and C (long-conversation) complete and D killed, the backlog is thin — a candidate is a full-suite EVAL day to re-baseline the north star.
