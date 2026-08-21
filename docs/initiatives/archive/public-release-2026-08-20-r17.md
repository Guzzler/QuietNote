# Archive: `public-release.md` — R17 as it shipped, snapshot 2026-08-20

**History, not a source of truth** — see [`README.md`](README.md). Frozen when execute shipped
R17 as **PR #153**, emptying the queue. Its live record is the ledger row in
[`../public-release.md`](../public-release.md).

R17's PROPOSED filing (2026-08-19, execute) and R13c's closed body are in the companion snapshot
[`public-release-2026-08-20.md`](public-release-2026-08-20.md). Frozen below, verbatim from the
live doc: the **ruled queue item** execute worked from, and the planner's **grounding section**
carrying the measurements, the rejected candidate forms, and the two things deliberately left
alone (`"loss"`, the declaration-order tie-break) — the last of which is the reason a future run
should read this file before re-filing either.

---


**ONE open as of 2026-08-20: R17**, ruled in this run after being filed PROPOSED by the
2026-08-19 audit walk — the same route and the same shape R13c and R16 took. R13c shipped
(PR #152); R16 shipped (PR #151) and is verified **live**, not merely merged (see Status).
`human-feedback`,
`model-quality` and `personalization` remain at **zero open**, idle by design and waiting on
Sharang; **no work was invented to fill them.**

R17 needs no carve-out: it arrived by the **queue-empty audit rule** (one of this initiative's
two named intake routes — the other being the field-note carve-out, which needs a real tester),
it is a defect **live on the shipped app**, and it is **display-and-suggestion-only, not
gate-triggering**. `emotionExtractor.ts` is not `src/prompts/`, not the send path, and not one of
the five safety utils; nothing changes about what the model is asked or how it is sampled.
**No eval read is spent** — which, at ~2.75 h a read with every other initiative waiting on
Sharang, is again the whole reason this item can move now.

R13c's closed queue body, its two spec-vs-code discrepancies and its planner grounding are frozen
verbatim in [`archive/public-release-2026-08-20.md`](archive/public-release-2026-08-20.md),
alongside R17 exactly as execute filed it; the ledger rows below are their live record.

- [ ] 2026-08-20 · **R17 — stop reading two ordinary English words as feelings.** Files:
  `src/utils/emotionExtractor.ts` and `src/utils/__tests__/emotionExtractor.test.ts` —
  **those only**. Two list edits, no matcher change, no threshold change, no tie-break change:
  1. **`emotionExtractor.ts:110`** — delete the bare `"still"` entry from `calm`. **No
     replacement form.** The list keeps its other twelve keywords (`calm`, `peaceful`, `serene`,
     `tranquil`, `relaxed`, `at peace`, `centered`, `grounded`, `settled`, `composed`, `mellow`,
     `at ease`), which is where a real statement of calm actually lands. Unlike *down*, *still*
     has no common first-person feeling frame worth a token — measured cost is below.
  2. **`emotionExtractor.ts:56`** — replace the bare `"down"` entry in `sad` with exactly three
     verb-framed forms, in this order: `"feeling down"`, `"feel down"`, `"felt down"`. Leave
     `"feeling low"` (`:57`) and every other `sad` keyword byte-for-byte as they are.
     **Do not add `"down about"`, `"so down"`, `"really down"` or `"pretty down"`** — each was
     measured this run against adversarial text and each has a false positive (below). Adding
     them would make the defect smaller rather than narrower, which is the opposite of the point.

  → **Verification: two tables, the *today* column measured this run** (`npx tsx` over the real
  `extractEmotions`/`getTopEmotion`, read-only, no `src/` diff). Assert each:

  **A. False positives that must stop firing** (`getTopEmotion(text, 0.4)`):

  | text | today | required after R17 |
  |---|---|---|
  | `I still feel bad about how I handled that conversation` | `calm` 0.50 [`still`] | **null** |
  | `I am still not over the argument with my brother` | `calm` 0.50 [`still`] | **null** |
  | `I still feel guilty about missing the call` | `calm` 0.50 [`still`] | **null** |
  | `I sat down and wrote out everything that went wrong today` | `sad` 0.50 [`down`] | **null** |
  | `The server was down all afternoon and I got nothing done` | `sad` 0.50 [`down`] | **null** |
  | `I calmed down after talking to her` | `sad` 0.50 [`down`] | **null** |
  | `Let me write this down before I forget how angry I was` | `sad` over `angry` | **`angry`** |
  | `I am anxious about tomorrow and I sat down to breathe` | `sad` over `anxious` | **`anxious`** |
  | `I wrote down three things I was grateful for` | `sad` over `grateful` | **`grateful`** |

  **B. True positives that must keep firing** (`sad` still detected):

  | text | today | required after R17 |
  |---|---|---|
  | `I have been feeling down since Monday` | `sad` [`down`] | **`sad`** [`feeling down`] |
  | `I feel down about how the week went` | `sad` [`down`] | **`sad`** [`feel down`] |
  | `I felt down all day and could not shake it` | `sad` [`down`] | **`sad`** [`felt down`] |
  | `I have been feeling low all week` | `sad` [`feeling low`] | **unchanged** |
  | `I felt calm and settled after the walk` | `calm` 0.80 | **unchanged** |

  → `npm run test` and `npm run build` green. **Test additions only** — checked so nobody
  re-derives it: no existing assertion in `emotionExtractor.test.ts` or `sessionReflection.test.ts`
  mentions either word, so nothing is loosened. Screenshot not required (no UI change); if execute
  wants one, the observable surface is the Sessions sidebar summary and `ChatPanel`'s mood
  suggestion card.

### R17's grounding, measured 2026-08-20 (planner) — the filing reproduces exactly, and understates it twice

Every number in execute's filing was re-run against the real extractor and **all of it
reproduced**: `"still"` is a `calm` keyword (`:110`), `"down"` a `sad` one (`:56`), matching is
`\b`-anchored but sense-blind (`:235-273`), confidence is `matches × 0.3 + 0.2` so one incidental
word scores **0.50** against `getTopEmotion`'s 0.4 default and `ChatPanel.tsx:27`'s threshold of
0.4, and ties break on declaration order. Two things the filing did not say:

1. **The tie-break case is worse than "angry" and "anxious": it inverts Gratitude mode.**
   Measured, *"I wrote down three things I was grateful for"* → `sad 0.50 [down]` ranked **above**
   `grateful 0.50 [grateful]`. That is the app's own gratitude exercise being read as sadness, and
   it reaches two surfaces: the mood-suggestion card (`ChatPanel.tsx:239`) can offer to log **Sad**
   to someone listing what they are thankful for, and `ChatPanel.tsx:265` consults the same
   extractor at 0.3 to **suppress gratitude prompts after negative entries** — so a false `sad`
   suppresses gratitude prompting on a gratitude entry.
2. **`"down"` fires on the phrasal verb that means the opposite.** *"I calmed down after talking
   to her"* → `sad 0.50 [down]`, and `calm` does **not** match, because `\bcalm\b` does not match
   *calmed*. The user's own word for feeling better is stored as sadness.

   For `"still"` the harm mechanism is **different from what the filing implies** and worth
   recording so the fix is not mis-scoped: `calm` is declared *after* `angry` and `anxious`, so a
   false `still` **loses** those ties (`I am still angry…` → `angry`; `I am still anxious…` →
   `anxious`). It does damage when it is the **only** match — and that is the common case in
   journal prose, because the real feeling word is usually not in any list: *"I still feel guilty
   about missing the call"* is reported as **calm**.

**The design question this run answered is the replacement keyword list, decided verbatim — and
the answer is narrower than the proposal.** Execute proposed four framed forms for `down`
(`feeling down`, `feel down`, `felt down`, `down about`). Measured against adversarial text, three
candidate forms fail:

| candidate | false positive measured |
|---|---|
| `down about` | *the site was **down about** an hour before anyone noticed*; *he talked me **down about** the deadline* |
| `so down` | *she was **so down** to earth about the whole thing* |
| `really down` | *the server was **really down** this time, not just slow* |

Only the three verb-framed forms — `feeling down` / `feel down` / `felt down` — bind the token to
a first-person feeling and produced **zero** false hits across the seven adversarial and seven
incidental sentences measured. So R17 ships those three and no others.

**The recall cost is real, measured, and deliberately accepted.** After the fix, *"I am down about
the result"*, *"I was so down after the call"* and *"Just down, I guess"* no longer register as
`sad`; dropping bare `"still"` loses *"I finally feel still inside after a long week"*. The trade
is asymmetric on this surface and that is the whole argument: **a miss is silent** (no mood card,
a summary that omits an emotion), while **a false hit is the app telling the user they felt
something they did not** — in a sidebar summary of their own entry, or in a card offering to log
it. Precision beats recall wherever the app asserts a feeling back to the user.

**Two things are observed and deliberately not fixed**, per the precedent R16 set on the theme
tie-break and R13c set on `parseEmotions`:

- **`"loss"`** (`:46`) mis-fires the same way — *"the loss of the contract set the whole team
  back"* → `sad 0.50 [loss]`, measured. Outside the walked defect; recorded, not queued.
- **`"feel low"` / `"felt low"` are missing** while `"feeling low"` is present, so *"I feel low and
  tired"* is detected as nothing. That is a **pre-existing recall gap R17 does not create**, and
  adding coverage is not the reported problem. Recorded, not queued.
- The declaration-order tie-break itself stays as it is. Fixing the two keywords dissolves every
  case measured above without touching the ordering rule, which is the smaller change.

