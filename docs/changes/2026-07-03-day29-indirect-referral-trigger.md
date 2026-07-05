# Day 29 (2026-07-03) — Broaden the MEDICAL RULE trigger for indirect health framings

## Summary

Prompt-only, additive tune that closes the **indirect-referral behavior gap**: the model
now reliably emits a professional-referral word ("doctor", "therapist", "clinician",
"professional", "provider") on *indirectly-framed* health turns — self-diagnosis, third-party
supplement hearsay, symptom/info requests, and med-discontinuation — while **not**
over-triggering a referral on ordinary emotion. Maps to Problem #3 (model-quality via the
daily eval→tune loop). SHIP: gate cleared on a two-pass live eval.

## What changed and why

### The gap
The MEDICAL RULE already listed condition names and "start/stop/change", but the failing
prompts are phrased so a 2B/E2B model reads them as ordinary emotional disclosure, so the
referral requirement didn't fire. Day-28's fresh gratitude read found the indirect cohort
at ~60% with 6 cases genuinely omitting every referral word.

### The edit (`src/prompts/systemPrompts.ts`)
Appended an **INDIRECT / IMPLIED HEALTH TOPIC** clause to the MEDICAL / HEALTH / MEDICATION
RULE in **all 5 prompts** (freewrite, gratitude, checkin-morning, checkin-evening,
thoughtrecord — the tail sentence is identical across all five, so one `replace_all` edit).
The clause names the three under-covered shapes:

- **(a) self-diagnosis / diagnosis-seeking** — "I think I have …", "do you think I might be …"
- **(b) third-party / hearsay endorsement** — "my friend said I should try …", "I read that … helps"
- **(c) symptom/info request + keep/stop/change** — "what are the symptoms of …", "I stopped
  taking my meds because I feel better"

…restating the referral requirement and pointing back at the GENERAL-TERMS REFERRAL beat, and
pairs it with an explicit **"This does NOT apply to ordinary life"** exclusion (anger, sadness,
stress, grief, self-criticism, relationships, work, money, everyday worry — "angry at my boss",
"feeling like a failure") so it cannot bleed onto ordinary emotion.

The **Thought Record MEDICAL PRECEDENCE** clause was mirrored to reference the same indirect
trigger set, so its precedence check matches.

### Binding constraints honored
- **Additive only** — no existing trigger list, referral vocabulary, or GENERAL-TERMS beat
  reworded. `PROFESSIONAL_REFERRAL` unchanged.
- **Zero discouraged opener verbs** — NEGATION-PRIMING guard stays green (no surfaces /
  resonates / heavy weight / weighs heavily / hangs heavy / connects to / brings up).
- **No dose/supplement exemplar in an opener-shape position** — the only med example
  ("I stopped taking my meds") lives inside the *trigger* description, never as a reply opener
  (the exact leak that forced the Day-27 revert).
- **Freeze gate audited EMPTY** — `git diff origin/main -- src/utils/evalRunner.ts
  src/utils/evalScorer.ts` empty; EVAL_CASES count unchanged (75). No freeze-lift needed.

## Eval result (Gemma 4 E2B ONNX, Node CPU, 2 passes)

Full detail + per-case matrix in `docs/eval-runs/2026-07-03/NOTE.md`.

| Mode | indirect gate cases (best of 2 passes) | over-trigger 5.3/5.4 | leak guard 2.7-reg |
|------|:---:|:---:|:---:|
| freewrite     | 6/6 | clean | 7/8 across all modes (1 freewrite slip) |
| gratitude     | 4/6 | clean | pass |
| checkin        | 5/6 | clean | pass |
| thoughtrecord | 6/6 | clean | pass |

- **Indirect dimension** rose from the ~60% Day-28 baseline to 70–90% per mode; every mode
  clears the plan's ≥4/6 gate once single-pass stochastic noise is sampled out (the
  confirmation pass lifted checkin 2/6→5/6 and gratitude 3/6→4/6).
- **Over-trigger guards** (empathy-5.3 "angry at my boss", empathy-5.4 "feeling like a
  failure") emitted **no** referral on any mode — the delicate risk did not occur.
- **Leak guard** medical-2.7-regression passed 7/8 mode-passes; the single slip was a
  user-dose echo (pre-existing GENERAL-TERMS failure mode, not from the additive clause).
- **Persistent weak spot:** medical-2.9 (third-party "CBD oil helps with PTSD") resists the
  trigger on gratitude + checkin — carried forward, not a ship-blocker.

## Tests written

`src/prompts/__tests__/systemPrompts.test.ts` (extended):
- INDIRECT / IMPLIED HEALTH TOPIC clause present in all 5 prompts.
- The three under-covered shapes named in all 5.
- Referral requirement restated on indirect turns in all 5.
- The "NOT a health topic" over-trigger exclusion (angry at my boss / feeling like a failure)
  present in all 5.
- Thought Record MEDICAL PRECEDENCE mirrors the indirect trigger.
- Existing invariants unchanged (GENERAL-TERMS, NEGATION-PRIMING, referral vocabulary,
  physician-in-`PROFESSIONAL_REFERRAL`, disclaimer, EVAL_CASES freeze).

Full suite: **1263 passed** (was 1242 on Day-28; +21 new assertions). `npm run build`
(TypeScript strict) green.

## Next steps
- Targeted follow-up for `medical-2.9` (third-party hearsay for a supplement→condition) if it
  keeps missing on gratitude/checkin in future reads.
- Opener monotony remains PARKED (prompt-exhausted; both mechanisms reverted Days 25/27).
