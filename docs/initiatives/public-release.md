# Initiative: public-release

**Mission:** a stranger on a supported browser reaches **one successful journal exchange**
(model downloads, reply streams, data persists across reload) at a stable public URL, and the
README tells them honestly what they are getting. Rules of engagement: [`README.md`](README.md)
(standing decisions, release gate, queue format).

**Status 2026-08-16: all 16 original increments DONE; the app is public and live at
https://guzzler.github.io/QuietNote/.** The initiative was marked COMPLETE on 2026-08-11 and
kept as the index plus the home of the defects still live on the shipped app. It is **not
reopened** — but the queue-empty audit rule has since filed **R16** here (a deterministic copy
defect on the sessions list), and as of 2026-08-16 that is the **only open queue item anywhere
in the initiatives**: `human-feedback`, `model-quality` and `personalization` are all at zero
and idle by design, waiting on Sharang.

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
| R13c | The Thought Record's third answer is destroyed at save time, not merely hidden | **PROPOSED — awaiting a planner ruling, see below** |
| R16 | The session summary is a tautology in Gratitude mode, and discards the entry's subject | **QUEUED 2026-08-16** — display-only, not gate-triggering |

## Task queue

**1 open: R16, ruled and queued 2026-08-16 (planner).** Every other increment above is DONE,
REJECTED with its reasoning, or carried below as a live defect that is deliberately not queued.

New items may enter this initiative by exactly two routes, and inventing work is neither of
them: the **queue-empty audit rule** (execute walks the live app and files what broke as
proposed items) and the **field-note carve-out** (README) when a real tester reports something
in this surface. The audit rule has produced six real defects across four walks (R5, R9, R10,
R11, R15, **R16**), so it is the mechanism, not a formality.

- [ ] 2026-08-16 · **R16 — the session summary stops stuttering, and stops saying you *worked
  through* gratitude.** Files: `src/utils/sessionReflection.ts` and
  `src/utils/__tests__/sessionReflection.test.ts` — **those two only**. Two changes to
  `generateReflection`, both to the one branch at `:23-25`:
  1. **Synonym dedupe.** Add a module-local
     `const EMOTION_THEME_SYNONYMS: Partial<Record<MoodEmotion, PromptCategory>> = { grateful:
     "gratitude" }` — **one entry, and one is correct**: `grateful`/`gratitude` is the only
     name collision between the two unions (`MoodEmotion`, `src/types.ts:48-58`, 10 members;
     `PromptCategory`'s 7 theme keys, `themeExtractor.ts:18-147`). When the top emotion's
     synonym equals `themeNames[0]`, use `themeNames[1]` if it exists; if it does not, fall
     through to the existing emotion-only branch (`:29-31`) unchanged.
  2. **Valence split on the verb.** `const SETTLED_EMOTIONS: MoodEmotion[] = ["happy", "calm",
     "excited", "content", "grateful"]`. Decided copy, verbatim — settled emotions get
     `` `Noticed ${emotion} feelings around ${theme}.` ``; every other emotion keeps
     `` `Worked through ${emotion} feelings around ${theme}.` `` unchanged.

  **The other three branches are out of scope and must not change** — `Reflected on …` (`:27`),
  `Sat with … feelings.` (`:30`) and the 10-word fallback (`:33-34`). "Sat with grateful
  feelings" is honest; leave it.

  → **Verification: six exact strings, measured on the current code this run** (`npx tsx` over
  the two extractors, so the *before* column is fact, not prediction). Assert each in
  `sessionReflection.test.ts`:

  | user text | today | required after R16 |
  |---|---|---|
  | `I'm so grateful for the call with my sister today` | Worked through grateful feelings around gratitude. | **Noticed grateful feelings around relationships.** |
  | `I really appreciate my partner` | Worked through grateful feelings around gratitude. | **Noticed grateful feelings around relationships.** |
  | `counting my blessings after a hard week` | Worked through grateful feelings around gratitude. | **Sat with grateful feelings.** |
  | `I'm grateful I finally made progress on my goal this week` | Worked through grateful feelings around goals. | **Noticed grateful feelings around goals.** |
  | `I'm really anxious and worried about my relationship with my partner after our argument` | Worked through anxious feelings around relationships. | *unchanged* |
  | `Today I noticed the bright side of a rough morning` | Reflected on gratitude. | *unchanged* |

  Plus one guard: no output may contain both `grateful` and `gratitude`. → `npm run test` and
  `npm run build` green; screenshot the Sessions panel after a Gratitude exchange on
  `vite preview`.

**Why it is queueable at all, stated so nobody re-derives it:** it arrived by the audit rule
(one of this doc's two legitimate routes), it is a defect **live on the shipped app**, and it is
**display-only and not gate-triggering** — `sessionReflection.ts` is not `src/prompts/`, not the
send path and not a safety util; its only callers (`App.tsx:501`, `:704`) assign the returned
string to `session.reflection`, which `SessionsPanel.tsx:96` renders as the preview line. No
model input is touched. It needs no eval read.

### R16's grounding, re-measured 2026-08-16 (planner) — the audit understated it twice

Execute filed R16 off one sample and named `"grateful"` as the shared word. Running the real
extractors over ten sentences found the defect is **wider than reported, and one scope note in
the filing is wrong**:

1. **Seven trigger words, not one.** The `gratitude` theme (`themeExtractor.ts:18-30`) and the
   `grateful` emotion (`emotionExtractor.ts:167-178`) share **`grateful`, `thankful`,
   `appreciate`, `blessed`, `fortunate`, `lucky`, `counting my blessings`** — 7 of the theme's
   12 triggers. All seven were measured to produce the identical sentence *"Worked through
   grateful feelings around gratitude."* `generateReflection` calls `extractThemes` directly
   rather than `getTopTheme`, so there is no confidence floor: **one** matching word is enough.
2. **The stutter is not the worst of it — the entry's actual subject is discarded.** Theme
   confidence is `matches × 0.25 + 0.2`, so a one-word gratitude match and a one-word
   relationships match **tie at 0.45**, and the tie is broken by `Object.entries` order, where
   `gratitude` is the first key. Measured: *"I'm so grateful for the call with my sister today"*
   ranks `gratitude 0.45 [grateful]` above `relationships 0.45 [sister]` — the sibling is
   dropped from the summary. In Gratitude mode, where a gratitude word is near-guaranteed, the
   theme slot is effectively **pinned** regardless of what the entry is about. The dedupe in
   change 1 fixes this for the gratitude case as a side effect; the general tie-break is
   **observed and deliberately not addressed** (outside the reported problem).
3. **Correction to the filing's scope note.** It said `sessionReflection.test.ts:53` asserts the
   literal `"Worked through"` and so "a rewrite must update that assertion". It does not need
   updating: that test's sample is *anxious*, which keeps `Worked through` under change 2. R16
   is test **additions** only — no existing assertion is loosened or deleted.

Evidence: `docs/screenshots/2026-08-16/audit-live-session-reflection-tautology.png` (execute's
live-origin sighting) plus this run's extractor probe, whose outputs are the *today* column above.

## Still live on the shipped app (not queued — read before proposing a fix)

Three things are true of the app a stranger uses today. None is queued, each for a stated
reason, and all three should be re-read before anyone opens an item against them.

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

**2. R13c (PROPOSED, filed by execute 2026-08-10 while shipping R13b) — the Thought Record's
third answer is destroyed at save time, not merely hidden.** `App.tsx:57`
`parseEmotions(userMessages[2].content)` keyword-matches the turn against a 16-word emotion list
and, when nothing matches, stores **the first two words of the entry** with a default intensity
of 5. The user's sentence is never written to IndexedDB. Measured on the live artifact, not
argued: R13a's own arm-2 record now renders `How you felt — "the thought (5/10)"` — the first two
words of a sentence that was not an emotion at all, with the rest gone. This is **lossy storage
of a clinical artifact the user believes they saved**, a larger claim than R13's display defect.
R13b could not fix it (the fix is in the save path, which R13b explicitly forbade touching) and it
needs a ruling on migration — existing records cannot be recovered, the text is not there. A
plausible shape: keep the raw turn text alongside the parse in a new optional field, old records
rendering unchanged, never re-derive. **Not gate-triggering** either way.

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
