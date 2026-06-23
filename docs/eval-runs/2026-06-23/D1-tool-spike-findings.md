# Track D1 — Tool-Calling Capability Spike: Findings & Verdict

**Date:** 2026-06-22 (run stamped UTC 2026-06-23)
**Model:** Gemma 4 E2B (`onnx-community/gemma-4-E2B-it-ONNX`, q4f16, Node onnxruntime-node CPU)
**Generation:** `max_new_tokens=200, temp=0.6, rep_penalty=1.3, do_sample` (canonical eval params)
**Invocation:** `npm run eval:tools` (single-turn, 20 cases; grammar beat concatenated at runtime, freeze gate untouched)
**Raw per-case bodies:** [`D1-tool-spike.md`](D1-tool-spike.md)

---

## Verdict: ❌ **NO-GO — Track D stops here.**

The gate ([ROADMAP.md](../../ROADMAP.md) §D1) is **≥80% valid calls (with one re-prompt retry) AND ~0 false calls**. The run met one half and missed the other decisively:

| Metric | Result | Gate | Pass? |
|---|---|---|---|
| **Valid-call rate** (incl. retry) | **1/8 = 13%** | ≥80% | ❌ **FAIL** (by a wide margin) |
| **False-call rate** (ordinary turns) | **0/12 = 0%** | ~0 | ✅ pass |
| Argument accuracy (informational) | 1/1 = 100% | — | (only one call to score) |
| Retries used | 0/8 | — | retry was **not load-bearing** |

Because the valid-call rate is **13%**, not ≥80%, the gate fails. Per the roadmap's own kill clause, **the negative result is recorded and Track D stops.** D2/D3 are not built.

---

## What actually happened (the failure shape matters)

The model did **not** emit malformed calls or leak tool syntax. It simply **responded in natural language instead of emitting the grammar** — even on turns where it clearly *understood* that a tool action was wanted. Two cases are diagnostic:

- **warrant-mood-1** (asked: "log my mood as anxious, maybe a 7"):
  > "I have noted your feeling of anxiety regarding tomorrow and **logged it for you**. Thinking about how your day unfolded…"
  The model *claims to have logged the mood* — in prose — without ever emitting `<<tool:log_mood …>>`. (A real product would have silently done nothing while telling the user it had acted: a worse failure than refusing.)

- **warrant-search-3** (asked: "look back and find what I said about Maya"):
  > "**I can certainly search your past entries regarding Maya.** Could you clarify which exact period…"
  Again, semantic agreement to the tool action, expressed conversationally, with no structured call.

The remaining six misses are the same pattern: the model answers as a journaling companion (reflective question back) rather than reaching for a tool. The one success (**warrant-suggest-3**, gratitude mode) emitted a clean, correct `<<tool:suggest_prompt category=gratitude>>` — proving the grammar is *learnable in-context*, just not *reliable*.

### The retry could not help
The retry rule only fires on a **malformed-but-present** call (invalid call, no valid call). Every miss here was **silence/prose**, not a malformed call — so there was nothing to correct, and 0/8 retries fired. A re-prompt mechanism (the `responseShaping` precedent) cannot rescue a capability the model never attempts. This is an important structural finding: the malformed-call retry, central to the D2 design, would have been nearly inert.

## The one piece of genuinely good news

**False-call rate is 0/12 — perfect.** The model never emitted tool syntax during ordinary reflection, gratitude lists, check-in narration, or thought-record steps, **including both near-misses**:
- *"I felt really happy today and I'm grateful for it"* → no `log_mood` (narrating a feeling ≠ asking to log it). ✅
- *"I keep thinking about what I wrote yesterday"* → no `search_past_entries` (reflection ≠ a search request). ✅

So the headline tone risk the spike was built to measure — *a journal that emits `<<tool:…>>` in a tender moment* — **did not materialize at all.** The danger is not false-firing; it's that the capability is simply absent.

## Per-tool breakdown

| Tool | Warranted cases | Valid calls | Notes |
|---|---|---|---|
| `suggest_prompt` | 3 | 1 | the lone success (gratitude mode); the two freewrite cases got reflective prose instead |
| `search_past_entries` | 3 | 0 | the keeper per the roadmap — and it scored **zero**; warrant-search-3 verbally agreed to search but emitted no call |
| `log_mood` | 2 | 0 | warrant-mood-1 falsely *claimed* to have logged — the most dangerous prose failure |

The roadmap's hoped-for survivor (`search_past_entries`, "when did I last write about my sister?") was **the worst performer** — 0/3, with the model consistently choosing to reflect on the sister/job/Maya rather than offer to search. If only one tool were to survive, it would have been `suggest_prompt` (1/3), not the intended keeper.

## Why this re-confirms the 2026-03-12 design decision

The original [`design/tool-calling-architecture.md`](../../design/tool-calling-architecture.md) chose **client-side keyword extraction over model-side tool calling** because a small on-device model couldn't be trusted with structured output. D1 was the cheap re-test of that call against the newer Gemma 4 E2B canonical model. **The re-test confirms the original decision:** at 13% valid-call reliability, model-emitted tool grammar is not a foundation to build a framework on. If the `search_past_entries` value is ever worth pursuing, the path is the design doc's original one — **deterministic intent detection + a user-confirmed UI card**, not asking the model to emit a call.

## Caveats (honest scope)

- Single 2B-class model, CPU q4f16, one seed/case, single-turn (no in-conversation warm-up where the model might "settle into" tool use).
- The grammar beat was tuned once, not iterated — a heavier few-shot or a JSON grammar *might* lift the valid rate, but (a) that's explicitly out of a 1-day spike's scope, and (b) the design doc's whole point is that a *more* complex grammar is *less* reliable on this model class, not more.
- n is small (8 warranted). But the direction is unambiguous: 1/8 is not a near-miss on an 80% gate; it is a different regime.

## GO / NO-GO

**NO-GO.** Valid-call rate 13% ≪ 80% gate. Track D's tool-calling framework (D2/D3) is **not** built. The false-call result (0/12) is filed as the one reassuring data point, but it cannot rescue a capability the model does not exhibit. The spike did exactly its job: it killed an expensive track for a few minutes of CPU, and it did so with a measurement rather than a hunch.
