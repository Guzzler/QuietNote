# M20 — verbatim-repeat rate on the shipped (MediaPipe) path over 10-turn arcs

Run 2026-08-15 (execute). **Measurement only — no `src/` diff, no gate read, no Colab, no API.**

Engine **MediaPipe**, model label `gemma-4-e2b-mediapipe` — the R7 default, i.e. the path a
stranger actually meets. Driven through the existing EvalPanel "Run M1 baseline" button on
`npm run dev` at `http://127.0.0.1:5173/QuietNote/?eval` (the `import.meta.env.DEV` +
`?eval` gating M19 recorded). **The instrument was not touched**: no edits to
`m1BrowserRunner.ts`, `qualityBarScenarios.ts`, `qualityBarRubric.ts` or `echoEvalCases.ts`.

## The denominator, stated first because it is the whole point

M14a/b/c measured **turn 2 repeating turn 1**, n = 10 per engine, and MediaPipe scored **0 of 3**
there. That measurement is not comparable to this one and the numbers must never be presented side
by side as if it were:

| | M14a/b/c | **M20** |
|---|---|---|
| unit | one *reply pair* (turn 2 vs turn 1) | one **10-turn arc** |
| what counts as a hit | turn 2 reproduces turn 1 | **any** turn reproduces a sentence from **any** earlier turn |
| ordered turn pairs examined per unit | 1 | **45** |
| MediaPipe result | 0 / 3 | **2 of 6 arcs contain ≥ 1 verbatim cross-turn repeat** |

## Method

Scratch scanner (not committed; scratchpad only) over the committed transcripts. Sentences are
split on `.!?`, normalised (lowercase, curly quotes folded, whitespace collapsed, trailing
punctuation dropped) and compared. Sentences under 4 words are ignored so that fragments cannot
inflate the count. Three quantities are reported per arc: **verbatim cross-turn repeats**, the
subset that are **final-sentence-to-final-sentence** (the shape M19 saw), and **near-miss pairs**
by token-set Jaccard.

## Step 1 — the on-disk half (M19's three arcs, 2026-08-13)

| arc | verbatim cross-turn repeats | final→final | near-miss (J ≥ 0.7) |
|---|---|---|---|
| qb-freewrite-arc | 0 | 0 | 0 |
| qb-checkin-days | **1** | 1 | 0 |
| qb-thoughtrecord-arc | 0 | 0 | 0 |

The single hit is the one M19 already reported: turns **5 → 8**, distance **3** —
*"How can you offer yourself some gentle kindness right now?"*, closing both replies.

**Step 1 came out exactly at the item's ambiguity trigger: one known hit and nothing near it.**
Lowering the near-miss threshold from 0.7 to 0.45 added **zero** pairs in any of the three arcs, so
the on-disk data is a clean cliff, not a distribution — one hit, and no second-place candidate to
argue about. Per the item, step 2 was therefore required rather than optional.

## Step 2 — three fresh arcs on the same instrument (run A, 2026-08-15)

Full report, all three transcripts and the per-turn rubric tables:
[`m20-run-a-m1baseline.md`](m20-run-a-m1baseline.md). Screenshot with the model label visible:
`docs/screenshots/2026-08-15/m20-eval-panel.png`.

| arc | verbatim cross-turn repeats (pairs) | distinct sentences repeated | final→final | near-miss (J ≥ 0.7) |
|---|---|---|---|---|
| qb-freewrite-arc | 0 | 0 | 0 | 0 |
| qb-checkin-days | 0 | 0 | 0 | 0 |
| qb-thoughtrecord-arc | **19** | **3** | 3 | 1 |

The thoughtrecord arc collapses into a loop from turn 4 onward. The three sentences and their
spread:

| sentence | turns it appears in | max distance |
|---|---|---|
| *"Let's develop a more balanced perspective."* | **4, 5, 6, 7, 8, 9** — six consecutive turns | 5 |
| *"How could you rephrase the thought about the standup to be more accurate to what you've observed?"* | 6, 7, 8 | 2 |
| *"What might be a more realistic way to look at this situation?"* | 4, 9 | 5 |

Turns 6–9 additionally open with near-identical reflections (Jaccard 0.60–**0.96**), the worst pair
being turns 8 → 9, which differ by one word:

> **turn 8:** *"I hear that you are reconnecting this conversation about Marcus to the current
> situation and asking for a **more** balanced perspective on the thought about the standup?"*
>
> **turn 9:** *"I hear that you are reconnecting this conversation about Marcus to the current
> situation and asking for a balanced perspective on the thought about the standup?"*

Turn 9 also asks the same question twice inside one reply, once bare and once with a clause
appended (*"What might be a more realistic way to look at this situation? What might be a more
realistic way to look at this situation when you walk into that room tomorrow morning?"*).

**The arc still passes the rubric** at 89 % (floor 85 %), with zero turns scoring 0 on continuity or
support. That is worth stating plainly: the quality bar M19 measured does **not** catch this, which
is why a rate was needed rather than a rubric score.

## Combined result

**Across 6 arcs / 60 replies on the default engine: 2 arcs (33 %) contain at least one verbatim
cross-turn repeat.** Both hits are in *guided* modes — checkin once, thoughtrecord once — and the
freewrite arcs are clean in both runs.

Run-to-run spread is large and is itself a finding: the **same** thoughtrecord scenario, on the
same engine and the same weights, produced **0** repeats on 2026-08-13 and **19** on 2026-08-15. A
single arc is not a measurement of this defect.

## Does M14's demotion still stand?

**No — not as stated.** M14 was "resolved by demotion" on the reasoning that verbatim repetition is
a WebLLM property and the default engine was clean, and the MediaPipe evidence for that was M14c's
**0 of 3 at two turns**. That reading survives only at two-turn exposure. At the ten-turn exposure a
real conversation has, the class is **live on the default engine**, in **2 of 6** arcs, and in the
worse of the two it is not a stray sentence but six consecutive turns sharing a stock line.

**No fix is ruled here, per step 4 of the item.** MediaPipe exposes no repetition-penalty knob
(`LlmInferenceOptions` is maxTokens/topK/temperature/randomSeed), so an engine-side fix does not
exist, and a prompt-side one is gate-triggering and belongs to F8's batch rather than to a 2.75 h
read of its own. The output of this item is the number above and the recommendation that M14's
status line be rewritten from *resolved by demotion* to *live on the default engine at
conversation length*.
