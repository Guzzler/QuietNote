# Initiative: public-release

**Mission:** a stranger on a supported browser reaches **one successful journal exchange**
(model downloads, reply streams, data persists across reload) at a stable public URL, and the
README tells them honestly what they are getting. Rules of engagement: [`README.md`](README.md)
(standing decisions, release gate, queue format).

**Status 2026-08-21: all 16 original increments DONE; the app is public and live at
https://guzzler.github.io/QuietNote/.** The initiative was marked COMPLETE on 2026-08-11 and
kept as the index plus the home of the defects still live on the shipped app. It is **not
reopened** — but it remains the only initiative with an intake route that does not need a human,
and that route is again the only thing producing work anywhere in the loop: **R13c** shipped
2026-08-19 (PR #152), **R17** shipped 2026-08-20 (PR #153), and **R18** shipped today (PR #154).
Every initiative — this one included — is now at **zero open items**, idle by design, waiting on
Sharang.

**R18 exists because R17's own carry-forward worked.** R17 recorded `"loss"` in *Still live*
rather than silently widening its scope; this run measured that word and the eight others in the
same class, and six of them shipped as one item. **The mechanism that produced R18 is a
deliberately-narrow fix writing down what it left behind** — worth keeping, because the
alternative (fix everything you notice while you are in the file) is how a two-line PR becomes an
unreviewable one.

**R16 is live, not merely merged (verified 2026-08-19, planner).** Shipping to `main` is not
shipping to a tester — the same discipline the F-series was held to — so the deployed bundle was
read rather than assumed: `gh run list` shows the Pages deploy at 01:48 UTC 2026-08-19
(`32206237334`) **completed success**, and the live bundle fetched anonymously from
`https://guzzler.github.io/QuietNote/assets/index-BG_bhA0m.js` (500,367 bytes) contains R16's
three fingerprints minified — the synonym lookup, the `a[1]` fall-through, and the valence split
(`` `${ih.includes(i.emotion)?`Noticed`:`Worked through`} ${i.emotion} feelings around ${t}.` ``).
**A stranger opening the link today gets the fixed summary line.**

**R17 is live too (verified 2026-08-20, execute), by the same method.** Pages deploy
`32437461115` **completed success** after PR #153 merged, and the anonymously-fetched bundle
`https://guzzler.github.io/QuietNote/assets/index-B8l2mJW2.js` (500,441 bytes) carries both edits
minified: the `sad` list reads
`` …`melancholy`,`gloomy`,`feeling down`,`feel down`,`felt down`,`feeling low` `` with **no bare
`down`**, and `calm` reads `` `calm`…`grounded`,`settled`,`composed`,`mellow`,`at ease` `` — twelve
keywords, **no `still`**. A stranger writing *"I wrote down three things I was grateful for"* today
is no longer told they felt sad.

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
| R13c | The Thought Record's third answer is destroyed at save time, not merely hidden | DONE (PR #152) — additive `emotionsText`, no migration, no gate read spent |
| R16 | The session summary is a tautology in Gratitude mode, and discards the entry's subject | DONE (PR #151) — display-only, no gate read spent |
| R17 | Two common English words are read as feelings, and one of them outranks the feeling the user named | DONE (PR #153) — two list edits, no matcher change, no gate read spent |
| R18 | Six more bare words are read as feelings — including `content`, which inverts an upset entry into contentment | DONE (PR #154) — list edits only, one authorised test amendment, no gate read spent |

## Task queue

**ZERO open as of 2026-08-21.** R18 shipped this run as PR #154 and there is now **no open queue
item anywhere in the initiatives** — `human-feedback`, `model-quality` and `personalization`
remain at zero, idle by design and waiting on Sharang, and **no work was invented to fill them.**
The next execute run therefore takes the **audit pass**, not a task: that rule is what produced
R16, R13c, R17 and R18 in the first place, and it is the only intake route the loop has that does
not need a human.

R18's ruled item body — the five-row replacement table, both verification tables with their
measured *today* column, and the single authorised test amendment — is frozen verbatim in
[`archive/public-release-2026-08-21-r18.md`](archive/public-release-2026-08-21-r18.md).
R17's ruled body and grounding — the three candidate forms rejected on false positives
(`down about`, `so down`, `really down`), the accepted recall cost, and the two things it
deliberately left alone — are frozen verbatim in
[`archive/public-release-2026-08-20-r17.md`](archive/public-release-2026-08-20-r17.md). R13c's
closed body and R17's PROPOSED filing are in
[`archive/public-release-2026-08-20.md`](archive/public-release-2026-08-20.md).



## Still live on the shipped app (not queued — read before proposing a fix)

**Two** numbered things are true of the app a stranger uses today, plus the emotion-keyword
residue recorded immediately below. **R13c stopped being one of them on 2026-08-19** (PR #152),
**R17 on 2026-08-20** (PR #153), and **`"loss"`, `"content"`, `"alone"`, `"no one"`, `"nobody"`,
`"mad"` and the `"feel low"` / `"felt low"` recall gap on 2026-08-21** (PR #154) — all three have
ledger rows below. The two numbered ones stay unqueued for the stated reasons and should be
re-read before anyone opens an item against them. The declaration-order tie-break stays
deliberately alone, argued in
[`archive/public-release-2026-08-20-r17.md`](archive/public-release-2026-08-20-r17.md).

**What R18 deliberately left behind (measured 2026-08-21, recorded so it is not re-filed as
new — and, per R17's precedent, this is the record a later run may pick up).** Four more bare
words mis-fire the same way, each reproduced against the real
`extractEmotions`, each `<emotion> 0.50`:

| word | list | measured false hit |
|---|---|---|
| `stress` | `anxious` | *"I stress the importance of testing at work"*; *"the beam is under stress"* |
| `stuck` | `frustrated` | *"the drawer was stuck so I fixed it"*; *"I stuck to the plan all day"* |
| `steady` | `content` | *"I kept a steady pace on my run"*; *"a steady drizzle all afternoon"* |
| `fear` | `anxious` | *"there is no fear of that happening"*; *"no fear, it is handled"* |

They are out of R18 for two stated reasons, not by oversight. **The false hit is rarer in journal
prose** than `content`/`alone`/`mad` — nobody writes *the beam is under stress* in a diary — so
the harm per word is lower. And **framing is brittle to inserted adverbs**, which is a limitation
of the whole R17 strategy and was measured here rather than assumed: `feeling stuck` does not
match *"feeling completely stuck"*, and `feel alone` does not match *"I feel so alone"*. R18
absorbs that for its six words by shipping form-sets measured to cover their whole true-positive
corpus (`so alone`, `all alone` catch what `feel alone` misses); for `stress` and `fear` the
existing `stressed` / `afraid` / `scared` entries already carry most of the recall, so deleting
the bare word would buy little. **Two further mechanisms are not keyword problems at all and no
list edit fixes them:** the matcher is **negation-blind** (*"I did not want to miss her recital"*
→ `sad 0.50 [miss her]`, and *"there is no fear of that happening"* → `anxious`), and framed
forms can co-occur, so a genuine hit's confidence can rise where one keyword used to fire. Neither
is queued.

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

**2. Two measurement gaps that are not defects but are not evidence of health either.**
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
| 2026-08-21 | R18 — six more bare words stop being read as feelings | #154 | Five list edits in `emotionExtractor.ts` and nothing else, exactly as scoped: `content`, `loss`, `alone`, `no one`/`nobody` and `mad` replaced by the decided framed forms; `feel low` / `felt low` added to close the pre-existing recall gap R17 recorded. **No matcher, formula, threshold or declaration-order change.** Both verification tables assert as decided: all **15** measured false positives now return `null` — including *"the content of the email upset me"*, which reported `content 0.50` (an upset entry read back as contentment) before this PR — and all seven true positives still fire, each pinned to the specific form that catches it. The two new-recall cases now return `sad`. **Exactly one existing assertion amended** (`emotionExtractor.test.ts:81`, `"alone"` → `"so alone"` for a sentence that still resolves to `lonely`), and no other; nothing loosened. **24 cases added, 2646 → 2670 tests green**, build green. `emotionExtractor.ts` is not `src/prompts/`, not the send path and not a safety util, and generation is untouched: **no gate read spent**, gate verdict unchanged. `stress` / `stuck` / `steady` / `fear`, the negation-blindness and the adverb brittleness stay deliberately unqueued — carried forward in *Still live* so they are not re-filed as new. |
| 2026-08-20 | R17 — two ordinary English words stop being read as feelings | #153 | Two list edits in `emotionExtractor.ts` and nothing else, exactly as scoped: bare `"still"` deleted from `calm` with no replacement, bare `"down"` replaced by the three verb-framed forms (`feeling down` / `feel down` / `felt down`) — no matcher, threshold or tie-break change. Both verification tables assert as decided: all six false positives now return **null**, and the three tie-break cases now report `angry` / `anxious` / **`grateful`** — the gratitude inversion is gone. All five true positives still fire, each pinned to the keyword that catches it. **13 cases added, nothing loosened** — no pre-existing assertion mentioned either word (re-checked before writing). `emotionExtractor.ts` is not `src/prompts/`, not the send path and not a safety util, and generation is untouched: **no gate read spent**, gate verdict unchanged. 2646 tests green, build green. `"loss"` mis-fires the same way and stays deliberately unqueued — carried forward in *Still live* so it is not re-filed as new. |
| 2026-08-19 | R13c — the Thought Record keeps the sentence you actually wrote | #152 | Three additive changes, three files plus tests, as scoped: optional `emotionsText`, the raw turn saved beside the parse, and the card preferring it. All six measured `today` strings pinned and all six now render verbatim; the legacy record renders unchanged. **No migration, no DB version bump** — verified in the running app, not argued (`db.version === 4`, `emotionsText` stored verbatim, three pre-R13c records still rendering from the parse). Existing assertions untouched, R13b's guards still bite — **test additions only**. Display-only, **no gate read spent**. Two spec discrepancies recorded rather than glossed — with the item body and its grounding, in [`archive/public-release-2026-08-20.md`](archive/public-release-2026-08-20.md). |
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
