# Eval run — 2026-07-06 (Day 31): fresh critic read + scorer echo-collision relax confirmation

**Purpose:** the cadence-due full critic read (06-24 → 06-28 → 07-02 → today) on
post-#74 / post-#75 `main`. Feeds `docs/critic-reports/2026-07-06.md` and serves as
the before-side confirmation data for the Day-31 part (b) scorer echo-collision
relax (see `docs/decisions.md` 2026-07-06 freeze-lift).

**Model:** Gemma 4 E2B ONNX (q4f16) via `@huggingface/transformers`, Node
onnxruntime-node CPU. Single stochastic pass per case (temp 0.6, do_sample, rep 1.3).

> **Directory-date note (Day-29 precedent):** the runner stamps its output dir from
> the UTC clock, which was already 2026-07-07 during the run. Because each staged
> `--mode=X` invocation writes its mode's file to the SAME path
> (`docs/eval-runs/2026-07-07/<mode>.md`), later stages on the same mode
> **overwrote** earlier stages' raw files in place (e.g. Stage 7's checkin
> jailbreak+boundary run clobbered Stage 2's checkin medical_refusal file at the
> raw path). The raw `2026-07-07/` dir is therefore incomplete/misleading and is
> **not** committed. Every stage was copied to a uniquely-named file HERE under
> `2026-07-06/` (the plan date) immediately after it finished — these staged
> copies are the canonical, complete record.

## What ran (staged, plan §E-P2 fallback priority order)

Full dimensions (NOT `--per-dim=6`): the plan's `--per-dim=6` subset would take only
the first 6 medical cases (2.1–2.5 + redteam-7.1) and miss the Day-29 gate cases
(2.8–2.12), the leak guard (2.7-regression), and the three echo-collision cases the
report must speak to (2.7 / 2.13 / 2.2). Full dimensions also keep denominators
comparable to the prior floors (x/16, x/11, x/15).

| Stage | Command | Output |
|---|---|---|
| 1 | `--mode=gratitude --dimensions=medical_refusal` | `gratitude-medical.md` |
| 2 | `--mode=checkin --dimensions=medical_refusal` | `checkin-medical.md` |
| 3 | `--mode=checkin --dimensions=empathy,specificity` | `checkin-es.md` |
| 4 | `--mode=freewrite --dimensions=medical_refusal,empathy,specificity` | `freewrite-mes.md` |
| 5 | `--mode=thoughtrecord --dimensions=medical_refusal,empathy,specificity` | `thoughtrecord-mes.md` |
| 6 | `--mode=gratitude --dimensions=empathy,specificity` | `gratitude-es.md` |
| 7 | `--mode=checkin --dimensions=jailbreak,boundary` | `checkin-jb.md` |

Each stage also snapshots the runner's `summary.json` as `summary-<output>.json`.
All stages ran on the PRE-relax scorer (the Day-31 evalRunner.ts edit was applied
only after the last stage finished, so every number here is scored by the scorer
that was on `main` at read time).
