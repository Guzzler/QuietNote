# 2026-06-19 (Day 18) — Track C2: live conversation-script baseline + trim instrumentation

## Summary

Ran the C1 conversation-script harness against the **real Gemma 4 E2B** model
for the first time and added **trim instrumentation** + selectable **context
strategies** to the driver. This produces the first hard long-conversation data
and closes the measurement half of Fundamental Problem #2 ("context management
FIXED at 3-turn scale only — long-conversation behavior unmeasured").

The live run gave a clean, falsifiable result: on a 19-turn freewrite that
provably crosses the 4096 trim boundary, the **prior-turn recap is the
load-bearing element** for entity retention — present → 2/2 probes, absent →
0/2, regardless of how much raw history is in context.

## What changed and why

All new logic lives in the **new** files from C1 + `run-eval.ts`; the freeze
gate (`evalRunner.ts` / `evalScorer.ts` / `src/prompts/`) and the
context/token utils (`tokenEstimator.ts`, `conversationContext.ts`) are
**byte-identical to origin/main** — C2 changes *what context we feed* and *what
we measure*, never the model's instructions.

### `src/utils/conversationDriver.ts` (new-file extension)
- **`ContextStrategy`** = `"raw" | "managed" | "managed-norecap"`, plus a
  `strategy?` option on `ConversationRunOptions` (default `"raw"` so C1 behavior
  is unchanged).
  - `raw` — system + FULL untrimmed history + user (the C1 mock path).
  - `managed` — the **exact** real-app send path: `buildManagedMessages`
    (prior-turn recap prepended to the user turn + oldest history trimmed to the
    4096 budget).
  - `managed-norecap` — trim only, NO recap. Replicates `buildManagedMessages`'s
    budget math locally (history budget = `MODEL_CONTEXT_LIMIT -
    RESERVED_FOR_GENERATION - systemTokens - entryTokens`) so the **only**
    difference from `managed` is the absent recap, not the budget. No
    recap-suppression flag was added to `buildManagedMessages` (that would edit a
    frozen-adjacent util's surface).
- **Per-turn `TurnContextInfo` telemetry**: `estHistoryTokens`, `trimmed`,
  `droppedTurns`, `recapPresent`, and — for probe turns — `probeEntityInWindow`
  (was the entity's establishing turn still inside the raw window fed this turn,
  *excluding* the recap? if absent-from-window but the probe still PASSES, the
  pass is attributable to the recap).
- **Summary additions**: `firstTrimTurnIndex`, `probesPassedBeforeTrim`,
  `probesPassedAfterTrim`, `probesAfterTrim`, and `strategy` on `ScriptResult`.
- **`scriptReportToMarkdown`** gains a `Strategy` / `First-Trim Turn` /
  `Probes After-Trim` summary column and a per-script **context telemetry**
  table.

### `src/utils/conversationScripts.ts` (new script)
- **`script-freewrite-longtrim`** (~19 turns): same entity family as the
  existing retention script (sister Maya + the birthday dinner, established at
  turns 1–2), then 14 substantive journaling turns so history provably crosses
  the boundary. Two retention probes at turns 16 and 18, placed *after* the
  expected first-trim point.

### `scripts/run-eval.ts`
- `--strategy=raw|managed|managed-norecap|all` (default `managed`, the real app
  path). `all` runs each script under all three strategies and writes a combined
  report — the documented C2 A/B invocation.
- `--script=<id[,id]>` to bound a live run to specific scripts (CPU is slow; the
  high-value experiment is the boundary-crossing script under all 3 strategies).
- `summary.json` `scripts` block now carries `strategy`.
- `eval:scripts:all` alias added to `package.json`.

## Live run

`npm run eval -- --mode=freewrite --limit=1 --scripts --strategy=all --script=script-freewrite-longtrim`

The Node model **loaded in-slot** (`onnx-community/gemma-4-E2B-it-ONNX`, q4f16,
onnxruntime-node CPU) and generated real output — no browser blocker. Results in
[`docs/eval-runs/2026-06-20/conversation-scripts.md`](../eval-runs/2026-06-20/conversation-scripts.md)
and the `scripts` block of
[`summary.json`](../eval-runs/2026-06-20/summary.json). (Eval-run dir is dated
`2026-06-20` because the runner stamps UTC and the machine clock is PDT.)

> The full 4-script × 3-strategy matrix (~141 CPU generations) was bounded out
> of this slot. This run is the high-value subset: the one boundary-crossing
> script under all three strategies. The remaining scripts (incl. thoughtrecord
> step-coherence under the real path) are carried into the next
> `eval:scripts:all`.

### Result

| Strategy | Probes passed | First-trim turn | Recap |
|---|---|---|---|
| raw (full history) | **0 / 2** | never | no |
| **managed** (real app path) | **2 / 2** | turn 14 (dropped up to 8 turns) | yes |
| managed-norecap (trim only) | 0 / 2 | turn 18 | no |

**The recap is necessary and (here) sufficient.** Full raw history did *not*
save the entity (0/2 — surface-word-latch persists at length); trimming without
the recap lost it (0/2); the real app path (recap + trim) recovered it on every
post-trim probe (2/2). At the probe turns the entity was in the raw window for
all three strategies, so the deciding variable is purely the recap line placed
adjacent to the latest user turn.

### C3 recommendation (gated on this data)

**Deferred, not started.** `managed` (4096 + recap) held retention 2/2 across a
conversation that crossed the trim boundary and shed 8 turns — the decay C3 was
meant to fix did not occur, because the recap (recomputed from untrimmed
history) carries the entity past the trim. No `RESERVED_FOR_GENERATION` /
context-limit change is indicated. If a future multi-script / multi-seed run
shows `managed` dropping post-trim probes, that re-opens C3 (summarize-on-trim).
Full interpretation in
[`docs/eval-runs/2026-06-20/C2-findings.md`](../eval-runs/2026-06-20/C2-findings.md).

## Tests

All deterministic (mock `generate`, no model loaded):

- `conversationDriver.test.ts` (+8 cases): raw unchanged (regression guard);
  `managed` equals `buildManagedMessages` exactly when no trim; `managed` vs
  `managed-norecap` differ only by the recap prefix; long history forces
  `trimmed:true` / `droppedTurns>0` / `firstTrimTurnIndex` set;
  `probeEntityInWindow` false when the entity turn is trimmed out (norecap) vs
  true under raw; before/after-trim probe counts partition around
  `firstTrimTurnIndex`.
- `conversationScripts.test.ts` (+3 cases): `script-freewrite-longtrim` exists
  and is freewrite; accumulated history (user turns + assumed ~200-token replies)
  exceeds `AVAILABLE_FOR_HISTORY` before the first probe; both probes sit at/after
  the first budget-crossing turn.
- Full suite: **1150/1150** green (1139 baseline + 11 new). Build clean (TS strict).
- Freeze gate `git diff origin/main -- src/utils/evalRunner.ts
  src/utils/evalScorer.ts src/prompts/` → **empty**.

## Next steps

- Run the full `npm run eval -- --scripts --strategy=all` in a longer slot to
  turn the n=1 result into a population (adds thoughtrecord step-coherence under
  the real path + the shorter retention/checkin scripts).
- Keep C3 gated; re-open only if a fuller run shows `managed` post-trim decay.
