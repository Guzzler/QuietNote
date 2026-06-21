# Track C — conversation-script population findings (C3 gate resolution)

**Run date (UTC):** 2026-06-21 · **Local plan day:** Day 19 (2026-06-20)
**Command:** `npm run eval -- --mode=freewrite --limit=1 --scripts --strategy=all`
**Model:** `onnx-community/gemma-4-E2B-it-ONNX` via `@huggingface/transformers` (Node onnxruntime, CPU, q4f16)
**Generation:** `do_sample:true`, `temperature:0.6`, no fixed seed → one fresh seed per cell.

This turns yesterday's **n=1** result ([`../2026-06-20/C2-findings.md`](../2026-06-20/C2-findings.md), preserved unchanged) into a **population**: all 4 conversation scripts × 3 context strategies = **12 live cells**, ~141 CPU generations (~47 min wall). It adds the two never-run-live signals — **thoughtrecord 5-step coherence** and the **checkin-retention** probe — under the real app path.

## A. The matrix

`managed` is the **real app path** (recap + trim). `raw` (no management) and `managed-norecap` (trim but recap stripped) exist only as the isolation comparison.

| Script (probes) | Strategy | Scored turns | Probes | Step-coherent | First-trim | After-trim probes |
|---|---|---|---|---|---|---|
| freewrite-retention (2) | raw | 7/7 | **1/2** | — | none | — |
| freewrite-retention (2) | **managed** | 7/7 | **2/2** | — | none | — |
| freewrite-retention (2) | norecap | 7/7 | **0/2** | — | none | — |
| freewrite-longtrim (2) | raw | 10/10 | **0/2** | — | none | — |
| freewrite-longtrim (2) | **managed** | 10/10 | **2/2** | — | **t14** | **2/2** |
| freewrite-longtrim (2) | norecap | 10/10 | **0/2** | — | t15 | **0/2** |
| checkin-retention (1) | raw | 6/6 | **1/1** | — | none | — |
| checkin-retention (1) | **managed** | 6/6 | **1/1** | — | none | — |
| checkin-retention (1) | norecap | 6/6 | **1/1** | — | none | — |
| thoughtrecord-steps (0) | raw | 5/5 | 0/0 | **yes** | none | — |
| thoughtrecord-steps (0) | **managed** | 5/5 | 0/0 | **yes** | none | — |
| thoughtrecord-steps (0) | norecap | 5/5 | 0/0 | **yes** | none | — |

## B. Probe pass-rate (population view)

On **every** probe-bearing script, `managed` is **≥ `raw` and ≥ `managed-norecap`** — it is the unique best-or-tied strategy:

- **freewrite-retention:** managed 2/2 > raw 1/2 > norecap 0/2. This script never trims (12 turns stay under the window), yet the recap *still* lifts retention — surfacing the prior-turn entity helps even before any turn is dropped.
- **freewrite-longtrim:** managed 2/2 ≫ raw 0/2 = norecap 0/2. The boundary-crossing case; see §C.
- **checkin-retention:** managed 1/1 = raw 1/1 = norecap 1/1. The single probe sits at turn 9 of a 10-turn script that **never trims**, so the entity (the 2 pm client presentation) was still inside the raw window for all three strategies — recap not exercised, all pass. This is an expected tie, not a counter-signal: no trim ⇒ recap is a no-op for retention.

No scored (non-probe) turn regressed: **all 10 warmth/banned-opener/length-scored turns passed under all three strategies** (7/7, 10/10, 5/5, 6/6 per cell). Length-management does not degrade reply quality.

## C. The decisive C3 question — post-trim probes

C3 exists to fix exactly one failure mode: a probe that lands **after the first trim turn** failing because the established entity got dropped from the window. Only **freewrite-longtrim** actually crosses the trim boundary in this matrix (the other scripts are short enough to never trim):

- **managed:** first trim at **t14**, both probes (t17, t19) sit after it → **after-trim 2/2 PASS.** The recap carried the entity across the trim.
- **managed-norecap:** first trim at t15, → **after-trim 0/2 FAIL.** Strip the recap and the post-trim probes collapse.
- **raw:** never trims but also has no recap → 0/2 (entity decayed out of attention even while nominally in-window).

This **replicates yesterday's n=1** result on a fresh seed: the prior-turn recap is the **load-bearing** element for post-trim entity retention, `managed` 2/2 vs the two controls 0/2. The literal decay condition C3 was created to address — *`managed` dropping a post-trim probe* — **did not occur**.

## D. Thoughtrecord step-coherence (new signal — never run live before)

`stepCoherent` = every `stepIndex`-bearing turn passed its `expect`, the observed step order was exactly 1,2,3,4,5 (monotonic, contiguous, no skip/loop), and the count equalled `expectedSteps: 5`.

**Result: `stepCoherent = true` under all three strategies (raw, managed, norecap).** Over a full guided CBT session the model walked situation → automatic thought → evidence-for/against → balanced thought → outcome in order, without skipping or looping a step. This was the single biggest unmeasured hole in Track C and it is now filled: the real app path (`managed`) holds 5-step coherence. (Coherence holding under `raw`/`norecap` too is consistent — the thoughtrecord script is 6 turns, never trims, so the management layer has nothing to disturb; the signal we care about is that `managed` does not *break* it, and it doesn't.)

## E. C3 decision — **DEFERRED, confirmed**

The gate-reopener was defined as: *"a fuller multi-script / multi-seed `--strategy=all` run shows `managed` dropping post-trim probes"* (or thoughtrecord coherence failing). Neither happened:

- `managed` holds **all** post-trim probes across all probe-bearing scripts (the only trim-crossing script, longtrim, is 2/2 after trim).
- `managed` is best-or-tied on every probe script's overall pass-rate.
- thoughtrecord 5-step coherence holds under `managed`.
- no scored-turn regression.

**→ C3 (summarize-trimmed-turns-into-the-recap) stays DEFERRED.** There is no observed decay to justify the added complexity. The prior-turn recap line (Day-8 `conversationContext.ts`) is sufficient at the conversation lengths these scripts cover.

**→ Fundamental Problem #2 (context management / long-conversation forgetting) is declared closed at population scale**, with these explicit caveats: single 2 B model (Gemma 4 E2B), CPU q4f16 quantization, substring-match probes (not semantic), one seed per cell, and trim is only exercised by one script (longtrim) — the others stay under the window. The residual long-conversation risk that was "unmeasured" is now measured across 4 script shapes and found acceptable on the real app path.

**Next roadmap pick:** Track C's measurement objective is complete → **D1 (tool-calling spike)** per the sequencing list.

### If C3 ever re-opens (spec only — not implemented today)
The candidate fix remains *summarize the trimmed turns into the recap line* (extend `conversationContext.ts`'s recap to fold a one-line synopsis of dropped turns rather than only surfacing the immediately-prior turn's entities). That would be its own BUILD plan, scored separately, freeze-lift-gated. The re-opener trigger is unchanged: any future run where `managed` drops a post-trim probe, or thoughtrecord coherence fails on the real path.

## F. Run hygiene

- Freeze gate empty: `git diff origin/main -- src/utils/evalRunner.ts src/utils/evalScorer.ts src/prompts/ src/utils/tokenEstimator.ts src/utils/conversationContext.ts` → no output. This was a pure measurement run; **no source changed.**
- `summary.json` `scripts` block has exactly 12 entries (one per cell); all probe counts are integers in `[0, probes]`; `conversation-scripts.md` rendered without error.
- Yesterday's `docs/eval-runs/2026-06-20/C2-findings.md` preserved unchanged as the historical n=1 record.
