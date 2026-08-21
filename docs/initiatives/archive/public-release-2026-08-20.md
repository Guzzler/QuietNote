# Archive: `public-release.md` — snapshot 2026-08-20

**History, not a source of truth** — see [`README.md`](README.md). Frozen when the planner
closed R13c (shipped as PR #152) and ruled R17 into the queue, replacing R17's PROPOSED
filing with a measured queue item in the live doc.

Two blocks are frozen here verbatim:

1. **R13c's closed queue-item body, its two spec-vs-code discrepancies, and its planner
   grounding section** — R13c shipped on 2026-08-19; its live record is the ledger row in
   [`../public-release.md`](../public-release.md).
2. **R17 as execute filed it (PROPOSED, 2026-08-19)** — superseded by the ruled queue item in the
   live doc, which corrects two of its claims and narrows the proposed fix on measurement.

---

## 1. R13c — closed queue item, discrepancies, and grounding (verbatim, live doc lines 128–237)

- [x] 2026-08-19 · **R13c — the Thought Record keeps the sentence you actually wrote.** Files:
  `src/types.ts`, `src/App.tsx`, `src/components/ThoughtRecordHistory.tsx` and their tests —
  **those only**. Three changes, all additive:
  1. **`types.ts:93-106`** — add `emotionsText?: string;` to `ThoughtRecord`, directly after
     `emotions`. **Optional, and therefore no migration and no DB version bump**: `storage.ts:199`
     does a whole-object `put` into a `keyPath: "id"` store, so a new field needs no schema
     change. Precedent: R9 added `Session.mode` the same way (PR #127).
  2. **`App.tsx:324-336`** — add `emotionsText: userMessages[2].content,` to the record literal.
     **Leave `emotions: parseEmotions(userMessages[2].content)` byte-for-byte as it is**, and do
     not touch `parseEmotions` (`App.tsx:61-69`). R13b's source guard
     (`ThoughtRecordCardLabels.test.ts:89`) asserts that exact line and must keep passing —
     **R13c is an addition, not a rewrite, so no existing assertion is loosened**, the same
     filing shape R16 had.
  3. **`ThoughtRecordHistory.tsx:56-59`** — the `emotions` entry's value becomes
     `record.emotionsText?.trim() || formatEmotions(record.emotions)`. `formatEmotions` and
     `avgIntensity` stay exactly as they are, so **records saved before R13c render precisely as
     they do today**. Never re-derive an old record's text: it is not in IndexedDB and it is not
     recoverable. **No label change** — R13b already ruled that "How you felt" is the question
     the user was asked, and their sentence is its answer.

  → **Verification: seven card lines, the *today* column measured this run** (`npx tsx` over a
  verbatim copy of `parseEmotions`, read-only, no `src/` diff). Assert each:

  | the step-3 answer a user typed | card today | required after R13c |
  |---|---|---|
  | `I felt completely humiliated, like everyone could see it. 9/10` | `i felt (9/10)` | **the sentence, verbatim** |
  | `Mostly dread. It sat in my chest all afternoon.` | `mostly dread (5/10)` | **verbatim** |
  | `Embarrassed and small. 6` | `embarrassed and (6/10)` | **verbatim** |
  | `Lonely, and underneath that resentful. About a 7.` | `lonely and (7/10)` | **verbatim** |
  | `Terrified. 10 out of 10.` | `terrified out (10/10)` | **verbatim** |
  | `anxious about the 3 meetings I still had left` | `anxious (3/10)` | **verbatim** |
  | *a record stored before R13c (no `emotionsText`)* | `anxious (8/10), ashamed (8/10)` | **unchanged** |

  Plus two storage assertions: a record carrying `emotionsText` round-trips through
  `saveThoughtRecord`/`listThoughtRecords` with **no DB version change**, and a record without
  the field still lists and still renders. → `npm run test` and `npm run build` green;
  screenshot the Thought Record history card after completing all five steps on
  `npx vite preview`, using a step-3 answer that is **not** one of the 16 keywords.

  **Not gate-triggering, stated so nobody re-derives it:** `types.ts`, the persistence effect in
  `App.tsx` and the history card are not `src/prompts/`, not the send path, and not
  `crisisDetection.ts` / `responseGuardrails.ts` / `responseShaping.ts` / `referralReprompt.ts` /
  `evalRunner.ts`. Nothing changes about what the model is asked or how it is sampled. **No eval
  read is spent** — which, with the gate read priced at ~2.75 h and every other initiative
  waiting on Sharang, is the whole reason this item can move now.

### Two discrepancies between R13c's spec and the code, recorded rather than glossed

The item shipped exactly as scoped — three additive changes, three files plus tests, no existing
assertion loosened. Two things the spec assumed did not survive contact, and both were built as
the honest smaller version (R13b's precedent):

1. **Asserting the seven card lines for real required exporting `entriesForRecord`.** The spec's
   verification table is a claim about *rendered values*, and the repo has no jsdom, so the only
   way to assert values rather than source strings was to export the pure builder. That trips
   `react-refresh/only-export-components`, and the obvious fix — move it to a util — is
   **forbidden**: R13b's guards (`ThoughtRecordCardLabels.test.ts:43-64`) assert that the five
   `record.*` reads live in `ThoughtRecordHistory.tsx`, in order. Resolved with a one-line scoped
   `eslint-disable-next-line` carrying that reason. **Net new lint errors: 0** (baseline 164
   problems / 158 errors, unchanged and pre-existing).
2. **The storage round-trip could not be a unit test.** The spec asked that a record carrying
   `emotionsText` round-trip through `saveThoughtRecord`/`listThoughtRecords` with no DB version
   change. The repo has **no `fake-indexeddb` and no storage tests at all**, so that assertion
   was built two ways instead: source guards (`const DB_VERSION = 4;` and the whole-object
   `put(record)`) **and a real measurement in the running app** — after the five-step walk on
   `vite preview`, IndexedDB held the new record with `emotionsText` verbatim, `emotions` still
   the lossy `[{emotion: "i felt", intensity: 9}]`, and **`db.version === 4`**, alongside three
   pre-R13c records that still render from the parse.

### R13c's grounding, measured 2026-08-19 (planner) — the filing was right and understated

Execute filed R13c off one live artifact (R13a's arm-2 record rendering
`How you felt — "the thought (5/10)"`). Running a verbatim copy of `parseEmotions`
(`App.tsx:61-69`) over twelve realistic answers to the step-3 prompt — *"What emotions did you
feel? How intense were they (1-10)?"* (`journalPrompts.ts:426`) — confirms the defect and finds
two more things, one of which changes what R13c has to fix and one of which changes what it must
not bother fixing:

1. **The loss is the common case, not the edge case.** The keyword list is **16 words**
   (`App.tsx:65`) and misses most of the vocabulary people actually use for the emotion behind an
   automatic thought — *humiliated, dread, embarrassed, lonely, hurt, rejected, terrified,
   resentful* all miss. Every miss stores `words.slice(0, 2).join(" ")`, so what reaches
   IndexedDB is a two-word fragment of a sentence that is then gone: **`i felt`**,
   **`embarrassed and`**, **`terrified out`**, **`lonely and`**, **`a sinking`**. 8 of 12 samples
   came back wrong.
2. **A second defect the filing never named: the intensity is the first number *anywhere* in the
   text.** The regex (`App.tsx:62`) has an entirely optional `/10` suffix, so
   *"anxious about the 3 meetings I still had left"* is stored as **`anxious (3/10)`** — a
   severity rating fabricated out of a count of meetings, indistinguishable from one the user
   gave. Same class as F5's fourth bug: **fabricated data written to IndexedDB**. Per-emotion
   intensities also collapse to one number — *"I felt anxious (8) and also guilty (6)"* stores
   both at 8.
3. **But the blast radius is bounded, and this is why R13c does not fix (2).** `reratings` is
   written **only** as `[]` (`App.tsx:333`) and nothing anywhere else ever populates it, so
   `hasDelta` at `ThoughtRecordHistory.tsx:162` is **always false** and the
   `initialAvg → reratedAvg` badge has never rendered for any user. The parsed intensity
   therefore reaches exactly one surface — the card line — and **once R13c renders `emotionsText`
   there, the parse becomes invisible for every new record.** Fixing `parseEmotions` would be
   changing data no one can see, on the save path, for no user-visible gain. **Recorded and
   deliberately not addressed**, the same call R16 made on the general theme tie-break.

**One thing was checked and ruled NOT a defect, so a future run does not file it.** The privacy
export (`PrivacyDashboard.tsx:101-114`) writes `sessions` and `moods` only, while `clearAll`
(`storage.ts:229-233`) erases four stores including `thoughtRecords` — export and erase are
asymmetric, which looks like data loss on the app's most trust-critical surface. It is not:
every field of a thought record is a **verbatim copy** of `userMessages[0..4]` of its session
(`App.tsx:324-336`), sessions **are** exported, and the two fields that could hold anything else
(`reratings`, `detectedDistortions`) are never written. **No user content is missing from the
export today.** If R13c lands and a rerating or distortion path is ever built, this becomes real
and should be re-checked then.

---

## 2. R17 as filed by execute, 2026-08-19 (verbatim, live doc lines 247–296)

### R17 (PROPOSED, filed by execute 2026-08-19 by the audit rule) — two common English words are read as feelings, and one of them outranks the feeling the user named

The 2026-08-19 walk drove **Check-in at 1280 px on the live origin** and wrote one entry ending
*"…and I still feel bad about it."* The sidebar summarised it as **"Sat with calm feelings."**
Sighting: `docs/screenshots/2026-08-19/audit-live-calm-from-still.png`.

Measured against the real extractor afterwards (`npx tsx`, read-only, no `src/` diff):

1. **`"still"` is a `calm` keyword** (`emotionExtractor.ts:110`) and **`"down"` is a `sad`
   keyword** (`:56`). Matching in `extractEmotions` (`:235-273`) is `\b`-anchored but
   sense-blind, so the adverb *still* and the preposition/particle *down* both count as feelings:

   | text | extracted |
   |---|---|
   | `I still feel bad about how I handled that conversation` | **calm** 0.5 [`still`] |
   | `I am still not over the argument with my brother` | **calm** 0.5 [`still`] |
   | `I sat down and wrote out everything that went wrong today` | **sad** 0.5 [`down`] |
   | `The server was down all afternoon and I got nothing done` | **sad** 0.5 [`down`] |
   | `I walked down to the store to clear my head after the argument` | **sad** 0.5 [`down`] |

2. **One incidental word is enough to clear every threshold.** Confidence is
   `matches × 0.3 + 0.2`, so a single hit scores **0.5** against `getTopEmotion`'s default and
   `ChatPanel.tsx:27`'s `EMOTION_CONFIDENCE_THRESHOLD` of **0.4**.

3. **The false emotion beats the one the user literally named.** Ties break on declaration
   order, where `sad` precedes `angry` and `anxious`. Measured:
   `Let me write this down before I forget how angry I was` → `sad 0.5 [down]` **ranked above**
   `angry 0.5 [angry]`; `I am anxious about tomorrow and I sat down to breathe` → `sad` above
   `anxious`. This is the emotion-side twin of the theme tie-break recorded under R16.

**Why this is wider than R16 was.** `extractEmotions`/`getTopEmotion` has **two** consumers, not
one: `sessionReflection.generateReflection` (the sidebar summary, the sighting above) **and**
`ChatPanel.tsx:239`, which raises the **mood-suggestion card** — so the app can offer to log
**Calm** to someone who just wrote about snapping at their roommate, or **Sad** to someone who
wrote *anxious*. `ChatPanel.tsx:265` also consults it at 0.3 to suppress gratitude prompts after
negative entries; a false `calm` defeats that suppression.

**Not gate-triggering:** `emotionExtractor.ts` is not `src/prompts/`, not the send path, and not
one of the five safety utils. Nothing changes about what the model is asked. **No eval read.**

**A proposed shape, deliberately narrow** (the planner rules it, not execute): drop bare
`"still"` from `calm` — the list keeps twelve other keywords and *still* has no unambiguous
feeling sense in journal prose — and replace bare `"down"` in `sad` with the framed forms
(`feeling down`, `feel down`, `felt down`, `down about`), alongside the `"feeling low"` that list
already carries. **`"loss"`** (`:46`) mis-fires the same way on *"the loss of the contract"* and
is **observed and deliberately left alone** as outside the walked defect. The declaration-order
tie-break is likewise recorded, not proposed — fixing the two keywords dissolves every case
measured above. Checked, so the ruling need not re-derive it: **no existing test asserts on
either word** (`emotionExtractor.test.ts`, `sessionReflection.test.ts`), so this would be test
**additions only**, nothing loosened — the same filing shape as R16 and R13c.
