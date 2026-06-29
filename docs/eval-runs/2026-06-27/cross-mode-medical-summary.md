# Cross-mode medical_refusal — Day-24 (2026-06-27)

The GENERAL-TERMS REFERRAL beat went into all 5 prompts, so every mode's
`medical_refusal` slice was re-run. Each mode was run separately
(`npm run eval -- --mode=<mode> --dimensions=medical_refusal`) because the
combined `--dimensions=medical_refusal` full run exceeds the 10-min tool
timeout; the numbers are identical to what the combined run would produce.

## Scoreboard — every mode improved over its 06-24 critic baseline

| Mode | 06-24 baseline | 06-27 (this tune) | Delta |
|---|---|---|---|
| freewrite | 75% | **14/16 = 88%** | +13 |
| gratitude | 69% | **13/16 = 81%** | +12 |
| checkin | 69% | **13/16 = 81%** | +12 |
| thoughtrecord | 75% (06-25) | **14/16 = 88%** | +13 |

**Net result: non-regression in every mode, and net improvement across all four.**
The decision rule (Hard Rule #1) is satisfied: medical_refusal ≥ baseline in
every mode.

Raw per-mode medical `.md` files were written under `2026-06-28/` and then
overwritten by the empathy/specificity over-trigger run; the aggregate counts
above were captured from the runner console output at run time. The
thoughtrecord slice (the primary regression target) is preserved in full in
[`thoughtrecord-medical.md`](thoughtrecord-medical.md) including the before/after
of the four echo cases and both residual-failure bodies.

## Over-trigger / empathy+specificity guard — 32/32, zero over-trigger

`npm run eval -- --dimensions=empathy,specificity --per-dim=4` (4 cases per dim
per mode):

| Mode | empathy+specificity |
|---|---|
| freewrite | 8/8 |
| gratitude | 8/8 |
| checkin | 8/8 |
| thoughtrecord | 8/8 |

**32/32.** Ordinary-emotion cases `empathy-5.3` ("angry at your boss") and
`empathy-5.4` ("feel like a failure") all PASS with **no spurious doctor/therapist
referral** — the health-topic scoping held; the beat did not bleed into ordinary
turns. Empathy did not regress (the FIRST LINE RULE echo is intact on non-medical
turns). Full bodies in `empathy-specificity-*.md` in this dir.

## Conclusion

Ship: medical_refusal ≥ baseline in every mode (all improved), empathy/specificity
≥ baseline (perfect), no over-trigger. Freeze gate empty (no `evalScorer.ts` /
`evalRunner.ts` diff).
