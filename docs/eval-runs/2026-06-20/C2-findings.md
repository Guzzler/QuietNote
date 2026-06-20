# Track C2 — Long-conversation findings (2026-06-19 / UTC 2026-06-20)

First **live** run of the conversation-script harness against the real
**Gemma 4 E2B** (`onnx-community/gemma-4-E2B-it-ONNX`, q4f16, Node
onnxruntime-node CPU) with the new **trim instrumentation** and three
**context strategies**. This closes the measurement half of Fundamental
Problem #2 ("context management FIXED at 3-turn scale only — long-conversation
behavior unmeasured").

## What was run

`npm run eval -- --mode=freewrite --limit=1 --scripts --strategy=all --script=script-freewrite-longtrim`

- One new **19-turn boundary-crossing** script, `script-freewrite-longtrim`
  (sister **Maya** + the **birthday dinner** established at turns 1–2; two
  retention probes at turns 16 and 18, placed *after* the expected trim point).
- Run under all three strategies:
  - **raw** — system + FULL untrimmed history + user (the C1 mock path).
  - **managed** — the EXACT real-app send path: `buildManagedMessages`
    (prior-turn recap prepended to the user turn + oldest history trimmed to the
    4096 budget).
  - **managed-norecap** — trim only, NO recap (isolates the recap's effect).

> Scope honesty: the full 4-script × 3-strategy matrix was bounded out of this
> CPU slot (each generation is ~10–15 s; the matrix is ~141 generations). This
> run is **n = 1 script, 2 probes, freewrite, single seed** — enough to isolate
> the mechanism cleanly, **not** enough to declare Problem #2 universally
> closed. The remaining scripts are the natural follow-up (`eval:scripts:all`).

## Headline result — probe pass-rate by strategy

| Strategy | Probes passed | First-trim turn | After-trim probes | Recap present |
|---|---|---|---|---|
| raw | **0 / 2** | never (raw doesn't trim) | — | no |
| **managed** (real app path) | **2 / 2** | turn 14 | **2 / 2** | yes |
| managed-norecap | 0 / 2 | turn 18 | 0 / 1 | no |

All three strategies passed **10/10** scored (non-probe) turns — warmth,
banned-opener, and length criteria held at length under every strategy. The
*entire* signal is in the retention probes.

## Interpretation — the recap is the load-bearing element

1. **Full history is NOT sufficient.** Under `raw`, the entire conversation was
   in context (`probe in window = yes` at both probe turns) and the model
   *still* dropped Maya/the dinner on both brief follow-ups ("I really don't
   know what to do here." / "Yeah. I think you're right."). This is exactly the
   surface-word-latch failure the Day-8 recap was built to defeat — and it
   **persists at length** with raw accumulation. More raw context does not fix
   it.

2. **The recap recovers the entity — even after the trim.** `managed` first
   trims at turn 14 and drops up to 8 history messages by turn 18, yet passes
   **both** post-trim probes. The recap is recomputed from the **untrimmed**
   history every turn (`buildManagedMessages` derives it from the full
   `conversationHistory`), so the turn-1 entity survives even when its raw turn
   is trimmed out of the window. The instrumentation confirms the Day-8 design
   claim empirically at 19-turn length.

3. **It is the recap, not residual raw presence, that does the work.** At the
   probe turns, the entity was in the raw window for `managed`, `managed-norecap`
   *and* `raw` (`probe in window = yes` in all three). The only thing that
   differs between the 2/2 case and the 0/2 cases is the **recap line placed
   adjacent to the latest user turn**. Salience injection — not how much history
   is present — is the deciding variable. This is the cleanest possible
   isolation of the mechanism.

## Explicit C3 recommendation (gated on this data)

**C3's "summarize-trimmed-turns into the recap" is NOT justified by this data —
mark it deferred, not started.**

- `managed` (4096 + recap) held entity retention **2/2** across a conversation
  that provably crossed the trim boundary and shed up to 8 turns. The failure
  mode C3 was meant to address (entity lost after trim) **did not occur** —
  because the recap already carries the entity past the trim. There is no decay
  to fix here.
- The data is a **falsifiable claim**: *on this 19-turn freewrite, removing the
  recap (raw or managed-norecap) drops entity-probe pass-rate from 2/2 to 0/2;
  adding it restores 2/2 regardless of trim.* If a future multi-script /
  multi-seed `--strategy=all` run shows `managed` dropping probes after the trim
  point, **that** would re-open C3 (summarize-on-trim). Until then C3 stays
  gated.
- No `RESERVED_FOR_GENERATION` or `MODEL_CONTEXT_LIMIT` change is indicated:
  retention held at the current 4096 budget. Any context-limit change remains
  gated on data showing decay, per ROADMAP C3 — and this run shows none.
- Smallest defensible hardening (optional, not required): because the recap is
  now demonstrably load-bearing, keep it structurally un-trimmable (it already
  is — it rides inside the user entry, not the trimmable history) and consider a
  unit guard asserting the recap is always derived from untrimmed history.

## Caveats / threats to validity

- Single script, single mode (freewrite), single seed, two probes. Direction is
  unambiguous and the mechanism is isolated, but the magnitude (2/2 vs 0/2)
  should not be read as a population pass-rate.
- The thoughtrecord step-coherence question (the real path under `managed`) was
  **not** measured this slot — `script-thoughtrecord-steps` was not in the
  bounded run. Carry it into the next `eval:scripts:all`.
- CPU-only, q4f16. Probe pass/fail is a substring match on the reply, so it
  measures *grounding in the entity keyword*, not full semantic recall.

## Next step

Run the full matrix when a longer slot is available:
`npm run eval -- --scripts --strategy=all` (all 4 scripts × 3 strategies) —
adds the thoughtrecord step-coherence signal and the shorter retention/checkin
scripts under the real path, turning this n=1 result into a population.
