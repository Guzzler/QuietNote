# Initiative: public-release

**Mission:** a stranger on a supported browser reaches **one successful journal exchange**
(model downloads, reply streams, data persists across reload) at a stable public URL, and the
README tells them honestly what they are getting. Rules of engagement: [`README.md`](README.md)
(standing decisions, release gate, queue format).

**Status 2026-08-19: all 16 original increments DONE; the app is public and live at
https://guzzler.github.io/QuietNote/.** The initiative was marked COMPLETE on 2026-08-11 and
kept as the index plus the home of the defects still live on the shipped app. It is **not
reopened** — but it remains the only initiative with an intake route that does not need a human,
and it carries the one open queue item in the project: **R13c**, ruled and queued this run after
sitting PROPOSED since 2026-08-10. `human-feedback`, `model-quality` and `personalization` are
all at zero and idle by design, waiting on Sharang.

**R16 is live, not merely merged (verified 2026-08-19, planner).** Shipping to `main` is not
shipping to a tester — the same discipline the F-series was held to — so the deployed bundle was
read rather than assumed: `gh run list` shows the Pages deploy at 01:48 UTC 2026-08-19
(`32206237334`) **completed success**, and the live bundle fetched anonymously from
`https://guzzler.github.io/QuietNote/assets/index-BG_bhA0m.js` (500,367 bytes) contains R16's
three fingerprints minified — the synonym lookup, the `a[1]` fall-through, and the valence split
(`` `${ih.includes(i.emotion)?`Noticed`:`Worked through`} ${i.emotion} feelings around ${t}.` ``).
**A stranger opening the link today gets the fixed summary line.**

**Pruned 2026-08-11 (1,223 → this).** The full doc — the R4 live-URL smoke matrix, R10a's desync
table, both R13a arms, the R15/R15a/R15b rulings, four audit walks, and the unabridged ledger
rows — is at
[`archive/public-release-2026-08-11.md`](archive/public-release-2026-08-11.md), verbatim. Cite it
as evidence, never as a current fact.

## Grounding (durable facts — re-verify before acting on any of them)

- Client-only Vite app; `vite.config.ts` sets `base: "/QuietNote/"`, **confirmed correct on the
  real origin** (anonymous `curl` of the live URL returns 200 and serves `index-*.js` /
  `index-*.css` under `/QuietNote/`, 2026-08-08).
- **Repo is PUBLIC** (`visibility: PUBLIC`, `licenseInfo: MIT`), Pages is live
  (`build_type: workflow`, `source: main /`, `https_enforced: true`), description and homepage
  are set. **Repo visibility remains untouchable by the loop in both directions — never flip it
  back either.** Two standing consequences: production behaviour is verifiable on the live URL
  rather than only via `vite preview`, and **anything wrong in this repo is wrong in public**
  (which is how R14 was found).
- **Default engine is MediaPipe / Gemma 4 E2B** since R7 (PR #125). Both halves —
  `createEngine`'s default parameter (`src/inference/index.ts`) and `getStoredRuntime()`'s
  no-key fallback (`src/hooks/useInferenceEngine.ts`) — are pinned together by
  `src/inference/__tests__/DefaultEngine.test.ts` so they cannot drift apart again, along with
  `TASKS_GENAI_VERSION` ↔ `package.json`.
- **Measured first-run downloads, per backend:** WebLLM / Gemma 2 2B **1.49 GB**,
  Transformers.js / Gemma 4 E2B ONNX **3.15 GB**, MediaPipe / Gemma 4 E2B LiteRT **2.00 GB** —
  the last being what a first-time visitor pays. **The authoritative numbers are
  `MODEL_DOWNLOAD_SIZES` (`src/inference/types.ts`), not this doc** — re-read them there at
  write time. All three resident is ~6.65 GB.
- **Transformers.js is not WASM-capable with the shipped model** — ONNX q4f16 needs
  `com.microsoft.GatherBlockQuantized`, which has no CPU kernel. This is why R2a shipped as
  copy-only and why "just switch to Transformers.js" is **not** an unsupported-browser fix.
  Re-check before anyone proposes it again.
- **MediaPipe model caching is app-owned** (R1e, PR #84): `mediapipe-cache` in Cache Storage,
  streamed into `modelAssetBuffer`, real byte-level progress. Browsers whose origin quota can't
  hold it skip the cache and stream directly (still works, re-downloads per visit). Verified on
  the Pages origin at R4 — **no COOP/COEP problem materialised**, which was the known risk.
- **Known risk, not yet retired:** GitHub Pages cannot set COOP/COEP headers. WebGPU paths don't
  need cross-origin isolation; WASM *threading* might. If a backend breaks on the live origin,
  the fix ladder is `coi-serviceworker` shim (self-contained, privacy-neutral) → honest
  per-backend UI note. Never silently ship a broken backend picker.
- **The copy of record is `src/` and its tests, not this doc.** R2a's `WebGPUFallback` wording,
  R2b's loading-card size line (as amended by R11), R12's `GUIDE_SCAFFOLD_NOTE` and R13b's five
  card headers are each pinned by a test. Read the test, not a quoted string here.
- `.github/workflows/deploy.yml`'s `deploy` job carries
  `if: ${{ !github.event.repository.private }}` — dormant while private, un-gated itself
  automatically at R4 exactly as designed. The `build` job runs on every push, so doc-only
  pushes to `main` don't fail CI.
- 1270+ Vitest tests; `npm run build` is TS-strict and must stay green.

## Increments

| id | what | status |
|---|---|---|
| R1a | Pages deploy workflow, gated to skip while private (+ Vite `base`) | DONE (PR #79) |
| R1b | Production-build smoke of all 3 backends + persistence on local `vite preview` | DONE (PR #80) |
| R1c | Lora font missing from production build | DONE (PR #82) |
| R1d | MediaPipe backend fails at inference under production build | DONE (PR #83) |
| R1e | Cache the MediaPipe model in Cache Storage | DONE (PR #84) |
| R2 | Cold-start audit (download UX, failure states, browser matrix, unsupported-browser state, mobile honesty) | DONE (PR #86) |
| R2a | Honest unsupported-browser fallback (copy-only) + truthful `checkSupport` | DONE (PR #87) |
| R2b | Download-size honesty on the loading card | DONE (PR #88) |
| R3a | README rewrite for strangers | DONE (PR #81) |
| R3b | In-app footer link to the repo ("open source — verify it yourself") | DONE (PR #90) |
| R5 | Continuity card splices 8 raw words of the previous entry mid-sentence | DONE (PR #122) |
| R7 | Land the default-engine swap + `tasks-genai` bump, and pin the default with a test | DONE (PR #125) |
| R8 | Size + engine honesty sweep for the new default | DONE (PR #126) |
| R9 | Guided sessions not resumable; a mid-exercise reload loses the Thought Record | DONE (PR #127) |
| R10 | The guided step banner and the model contradict each other | **CONFIRMED, UNFIXED — see below** |
| R10a | Measure the guided desync rate on the post-R7 default | DONE (PR #129) — **0 of 7 scoreable turns aligned** |
| R11 | "After that, it loads instantly" is false for a cold browser process | DONE (PR #130) |
| R12 | The guided banner reads as the AI's question, which it never was | DONE (PR #131) |
| R4 | **Release-day activation (Sharang-triggered)** | **DONE 2026-08-07** — repo public, Pages live, smoked end-to-end on a genuine fresh-origin cold start |
| R6 | MIT LICENSE | DONE (PR #132) |
| R13a | Does the saved Thought Record match its labels? (measurement) | DONE (PR #134) — scaffold-followed 3/3 correct; conversation-followed 2/3 mislabelled |
| R14 | The public front page still said the app wasn't live; repo had no description | DONE (PR #136) |
| R15 | A benign entry containing "cutting" fires the full 988 crisis intervention | DONE via R15b |
| R15a | Word-boundary the crisis keyword match | **REJECTED 2026-08-09** — measured: fixes nothing R15 listed |
| R15b | Retire the bare `"cutting"` keyword in favour of self-directed forms | DONE (PR #137) |
| R13b | The Thought Record card drops two captured fields and asserts unsupportable labels | DONE (PR #138) |
| R13c | The Thought Record's third answer is destroyed at save time, not merely hidden | **QUEUED 2026-08-19** — ruled in, re-measured, spec below |
| R16 | The session summary is a tautology in Gratitude mode, and discards the entry's subject | DONE (PR #151) — display-only, no gate read spent |

## Task queue

**ONE open as of 2026-08-19 — R13c, ruled in this run.** R16 shipped (PR #151) and is **live**
(see Status). The item that replaces it is not new work and was not invented: **R13c has been
sitting in this doc as PROPOSED since 2026-08-10**, filed by execute while shipping R13b, with
the words *"awaiting a planner ruling"* against it. Ruling it is this run's job, and the ruling
is **queue it** — the reasoning and the re-measurement are below the item.

New items may enter this initiative by exactly two routes, and inventing work is neither of
them: the **queue-empty audit rule** (execute walks the live app and files what broke as
proposed items) and the **field-note carve-out** (README) when a real tester reports something
in this surface. The audit rule has produced seven real defects across four walks (R5, R9, R10,
R11, R15, R16, **R13c**), so it is the mechanism, not a formality.

R16's closed queue-item body and its planner grounding section are frozen verbatim in
[`archive/public-release-2026-08-19.md`](archive/public-release-2026-08-19.md); the ledger row
below is its live record.

- [ ] 2026-08-19 · **R13c — the Thought Record keeps the sentence you actually wrote.** Files:
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

## Still live on the shipped app (not queued — read before proposing a fix)

Three things are true of the app a stranger uses today. **One of them (R13c) stopped being
unqueued on 2026-08-19** and is now the open item above; the other two stay unqueued for the
stated reasons, and all three should be re-read before anyone opens an item against them.
**R17 (PROPOSED 2026-08-19, below) is a fourth**, filed by that day's audit walk and awaiting a
planner ruling.

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

### What else the 2026-08-19 walk found (nothing queueable)

The stranger's path was otherwise healthy at 1280 px: R16 **verified live** in the deployed
bundle (`assets/index-BG_bhA0m.js` carries the `Noticed`/`Worked through` split and the synonym
dedupe), Check-in's banner and Step 1→2 advance correct, the AI-limitations disclaimer and
**Crisis resources** rendered on the exchange, the reply coherent and on-subject, the session
persisted, and reopening it from the sidebar restored **mode and step** intact. **0 console
errors** (2 benign MediaPipe/Chromium WebGPU warnings). Three non-items, recorded so nobody
re-files them:

- **The reply ended a declarative clause with a question mark** (*"…it is okay to acknowledge
  that part of the day?"*). Model output, not app code — `responseShaping.ts` only *reads* for
  `"?"` (`:57`) and never rewrites punctuation. Prompt/model territory, i.e. **F8**, which is
  blocked.
- **The reply opened with *"It sounds like"***, the FIRST LINE RULE break already carried as F8
  evidence. Not new.
- **One mode-radio click was swallowed** during the render churn seconds after the 2.0 GB model
  finished loading; it did not reproduce on a settled page, where real clicks select correctly.
  **One sighting on an automation profile** — same class as the R4 `about:blank` sighting, and it
  should not be written up as a defect until someone sees it in a real browser.

Old sessions keep their stored reflection after a fix like R16 or R17 — `shouldRegenerate`
(`sessionReflection.ts`) only re-runs when the session itself updates. That is by design, not a
missed migration.

**1. R10 — the guided banner promises a structure the reply does not follow. 100 % of the
time.** Structural, and unfixed by design. `getSystemInstruction`
(`src/prompts/systemPrompts.ts`) takes no step argument and the four `*_SEQUENCE` constants
(`src/data/journalPrompts.ts`) are imported **only** by the three guide display components —
nothing carries the step to the model. R10a measured the consequence on the shipped default:
**0 of 7 scoreable turns aligned** across all three guided modes.

Four fixes are REJECTED with reasons, and the reasons still bind:
- *Tell the model the step.* Rejected on **coverage, not cost**: every eval path reads
  `getBaseSystemInstruction` while the app's `getSystemInstruction` is read by nothing outside
  `App.tsx`, so a step directive in the app branch ships a prompt path **no gate read can see** —
  a 3-seed generate read would reproduce byte-identically (M11/M12's 900-of-900) and certify
  nothing. Making it visible is a much larger item (the step must reach
  `getBaseSystemInstruction`, and eval cases would have to carry a step — new eval cases, parked
  by standing decision, plus `run-eval.ts`, itself gate-triggering).
- *Hide the banner during a reply.* Conceals the contradiction without making the guidance true.
- *Drop the sequences.* Would re-open the data loss R9 closed — the Thought Record save is
  defined in terms of the step.
- R12 is what shipped instead, and it makes the surface honest at zero gate cost: the step is a
  writing scaffold the user acts on, not a promise about the reply. **What R12 does not claim:**
  it does not make the model follow the sequence. If human feedback says the guided modes need
  the AI to actually run the exercise, that is a priced, scoped item for after the soft launch,
  and it starts with making the eval read able to see the app's system instruction at all.

**2. R13c — the Thought Record's third answer is destroyed at save time, not merely hidden.
QUEUED 2026-08-19; still live until it ships.** `App.tsx:61`
`parseEmotions(userMessages[2].content)` keyword-matches the turn against a 16-word emotion list
and, when nothing matches, stores **the first two words of the entry** with a default intensity
of 5. The user's sentence is never written to IndexedDB. Measured on the live artifact, not
argued: R13a's own arm-2 record renders `How you felt — "the thought (5/10)"` — the first two
words of a sentence that was not an emotion at all, with the rest gone. This is **lossy storage
of a clinical artifact the user believes they saved**, a larger claim than R13's display defect.
R13b could not fix it (the fix is in the save path, which R13b explicitly forbade touching).

**The migration ruling it was waiting on, made 2026-08-19: there is no migration, and there must
not be one.** Records saved before the fix cannot be repaired — the text is not in IndexedDB and
nothing can re-derive it — so old records render exactly as they do today and the new optional
field simply does not exist on them. The shape execute proposed (raw turn text alongside the
parse, in a new optional field) is the one that was adopted; the spec, the seven measured card
lines, and the two things it deliberately does **not** fix are in the queue item above. **Not
gate-triggering** either way. This entry stays here, per the doc-size rule's "never prune a
defect still live on the shipped app", until the PR lands.

**3. Two measurement gaps that are not defects but are not evidence of health either.**
- **The WebGPU-less state has never been read in real Firefox or Safari.** R2 simulated it by
  deleting `navigator.gpu` — the exact check `checkSupport` uses, but still a simulation. It is
  the one R2 claim the live URL has not tested.
- **One `about:blank` sighting at R4**, immediately after the first reply generated, during a
  screenshot call under a freshly-loaded 2.0 GB model. Both messages were already in IndexedDB
  and the reload recovered cleanly. Most likely a Playwright/headless memory ceiling rather than
  an app fault. **It is one sighting on an automation profile, not a reproduction on a human's
  browser, and it should not be written up as a defect until someone sees it in a real Chrome.**

## The release gate, as it applies here

The gate itself lives in [`README.md`](README.md) and that is the authority — floors, the
multi-seed rule (seeds 11/22/33, `min ≥ floor`), and the replay rule (`--rescore` vs fresh
generate). Two things this initiative established that the README now carries:

- **R15b ships on invariance, not floors**, and the reason generalises: no corpus from the
  shipped model exists (every `summary.json` in `docs/eval-runs/` is the M-series fine-tune
  *candidate*), and those corpora fail the floors on their own. **Until `model-quality`'s M16
  lands, no PR, doc or tester-facing message may claim the live app meets the gate floors.**
- **The gate has never been run on this initiative's own release.** R4's definition called for
  the full 4-mode read before the first share; it was not taken, because the flip was Sharang's
  interactive call and the gate is a ~2.75 h read. Recorded as a deliberate gap, not an
  oversight — and M16 is the read that closes it.

## Ledger

Full outcome text for every row is in
[`archive/public-release-2026-08-11.md`](archive/public-release-2026-08-11.md) under `## Ledger`.

| date | item | PR | outcome |
|---|---|---|---|
| 2026-08-18 | R16 — the session summary stops stuttering, and stops discarding the subject | #151 | Two files only, as scoped. All six decided strings assert exactly, including the two the dedupe changes structurally (`Sat with grateful feelings.` when gratitude is the only theme; `relationships` restored when it tied and lost). Existing assertions untouched — **test additions only**, nothing loosened. Display-only, **no gate read spent**; the shipped generation path is unchanged and the gate verdict is untouched. |
| 2026-08-10 | R13b — Thought Record card stops dropping fields and asserting unsupportable labels | #138 | Display-only; all five positional entries render under the question each answers. Save path, `types.ts` and stored shape untouched and guarded. **One premise of the item was wrong and is recorded, not glossed** → R13c. |
| 2026-08-10 | R15b — Retire the bare `"cutting"` keyword | #137 | One list, no matcher change; seven self-directed phrases in, exactly one authorised test string amended, 7 new cases. Gate taken as a 3-seed `--rescore` with the replay precondition **discharged by measurement** (148 eval user turns, **0 `isCrisis` changes**) and the delta proven **identical at all three seeds**. Below-floor absolutes disclosed as the pre-existing model deficit. |
| 2026-08-08 | R14 — Unmark the live URL; give the public repo a description | #136 | Decided copy verbatim, `~2.0 GB` re-read off the code; "activating" now appears nowhere in `README.md`. `gh repo edit` run with `--description`/`--homepage` only. Also renumbered #134's colliding "R14" finding to **R15**. |
| 2026-08-08 | R13a — Does the saved Thought Record match its labels? | #134 | Measurement only. Scaffold-followed **3/3 correct**; conversation-followed **2/3 mislabelled**, with the real automatic thought stored at `[2]` and displayed nowhere. Same walk found **R15**. |
| 2026-08-07 | R12 — The guided step becomes a writing scaffold | #131 | Step prompt tappable in both branches (prefills the textarea, never a model input); one line says whose the sequence is. No `src/prompts/` diff. Guards source-based (repo has no jsdom) and verified to bite 28-of-30. |
| 2026-08-07 | R6 — MIT LICENSE | #132 | On Sharang's direct interactive go. Canonical MIT text, `"license": "MIT"`, README License section. Model licenses flagged, not folded in. |
| 2026-08-07 | R4 — Release-day activation | — | Sharang triggered it interactively. Repo public, Pages created, deploy un-gated itself with **no workflow edit**. Live-URL smoke on a genuine fresh-origin cold start: full 2.0 GB download, exchange, reload persistence, `mediapipe-cache` populated, 0 console errors. |
| 2026-08-06 | R10a — Guided-desync rate on the default engine | #129 | Measurement only. **0 of 7 scoreable turns aligned.** Check-in asked no question at all in 3/3 replies. |
| 2026-08-06 | R11 — Loading card stops promising an instant load | #130 | Decided copy verbatim; the banned word now appears in **no** file under `src/`, pinned by a tree-wide guard. |
| 2026-08-06 | R9 — Guided sessions resume; the Thought Record stops being lost | #127 | `Session.mode` persisted (optional, no migration); the three step counters replaced by one derived `deriveGuidedStep`. A derived step cannot drift from the transcript. |
| 2026-08-05 | R8 — Size + engine honesty sweep for the new default | #126 | Docs/copy only; `MODEL_DOWNLOAD_SIZES` untouched because its values were already right — only the *default* moved. |
| 2026-08-05 | R7 — Default-engine swap + `tasks-genai` bump, pinned | #125 | Sharang's two commits landed unrewritten; this PR added the missing pin. First-run download 1.49 GB → **2.00 GB**. |
| 2026-08-04 | R5 — Continuity card quotes the entry instead of splicing it | #122 | Fragment rule in `continuityPrompt.ts` only. The callback is **the user's own words, quoted — never a theme label**; `extractThemes` returns 7 coarse labels and can never carry this card. |
| 2026-07-14 | R3b — Footer "open source" repo link | #90 | Fourth `·`-separated quiet link; URL hoisted as `REPO_URL`. Dormant while private, live since R4. |
| 2026-07-13 | R2b — Download-size honesty on the loading card | #88 | Per-runtime measured size via `MODEL_DOWNLOAD_SIZES`. Copy-only, no consent gate. |
| 2026-07-13 | R2a — Honest unsupported-browser fallback + truthful `checkSupport` | #87 | Dropped the promise the screen blocks; `transformersjs-engine.checkSupport` now requires a WebGPU adapter instead of claiming always-supported. |
| 2026-07-12 | R2 — Cold-start audit | #86 | Audit-only. Filed R2a and R2b; invalidated the "Transformers.js is WASM-capable" premise. |
| 2026-07-12 | R1e — MediaPipe model persisted in Cache Storage | #84 | App owns the fetch; real byte progress. **Measured: the `.task` is 2.00 GB, not ~3 GB.** Two fallbacks, both tested. |
| 2026-07-11 | R1d — MediaPipe first-send inference failure | #83 | `maxTokens` is a TOTAL budget and was 1024 against a 4096 context → every first send overflowed. Fixed + CDN wasm fileset pinned. |
| 2026-07-11 | R1c — Lora font missing from production build | #82 | CSS `@import` shipped the package's relative `url()`; switched to a JS import. |
| 2026-07-10 | R3a — README rewrite for strangers | #81 | Stock Vite template replaced. |
| 2026-07-10 | R1a — Pages deploy workflow (dormant) + Vite base | #79 | Build job = CI; deploy job gated on `!private`. Found+fixed a `/logo.svg` 404 under `base`. |
| 2026-07-10 | R1b — Production-build backend smoke (local) | #80 | WebLLM ✅, Transformers.js ✅, MediaPipe ❌ → R1d. Found the Lora font gap → R1c. |

## Blocked on Sharang

**Nothing. This section is empty and that is a result, not an oversight.** Every entry it ever
held has closed: R4 (fired 2026-08-07, interactively), the LICENSE choice (MIT, 2026-08-03) and
R6 (written 2026-08-07 on his direct go), and the PR-merge block from 2026-08-07/08.

Two process lessons from those closures are worth keeping, because both cost a run:

1. **An interactively-fired increment skips the loop's own verification, so its doc consequences
   have to be swept afterwards.** R4 was executed interactively rather than as a queued item with
   a verification block, and nothing unmarked the live URL — which is the entire reason R14
   existed, on a public repo, for 28 days.
2. **Execute cannot merge its own PRs**, so a run that ships a stack leaves it for a human, and a
   planning run reading `git log` early can be looking at a `main` that moves under it. Re-read
   `main` before writing queue status.

**Standing and unchanged: the loop never changes repo visibility, in either direction, and never
adds a LICENSE file or contacts testers on Sharang's behalf.**
