# Initiative: public-release

**Mission:** a stranger on a supported browser reaches **one successful journal exchange**
(model downloads, reply streams, data persists across reload) at a stable public URL, and the
README tells them honestly what they are getting. Rules of engagement: [`README.md`](README.md)
(standing decisions, release gate, queue format).

**Status 2026-08-20: all 16 original increments DONE; the app is public and live at
https://guzzler.github.io/QuietNote/.** The initiative was marked COMPLETE on 2026-08-11 and
kept as the index plus the home of the defects still live on the shipped app. It is **not
reopened** — but it remains the only initiative with an intake route that does not need a human,
and that route is now the only thing producing work anywhere in the loop: **R13c** shipped
2026-08-19 (PR #152), and **R17** — filed PROPOSED by the same day's audit walk — is **ruled in
and queued this run**, measured, narrowed, and the only open item anywhere. `human-feedback`,
`model-quality` and `personalization` are all at zero and idle by design, waiting on Sharang.

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
| R13c | The Thought Record's third answer is destroyed at save time, not merely hidden | DONE (PR #152) — additive `emotionsText`, no migration, no gate read spent |
| R16 | The session summary is a tautology in Gratitude mode, and discards the entry's subject | DONE (PR #151) — display-only, no gate read spent |
| R17 | Two common English words are read as feelings, and one of them outranks the feeling the user named | **QUEUED 2026-08-20** — ruled in, re-measured, spec below |

## Task queue

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


## Still live on the shipped app (not queued — read before proposing a fix)

Three things are true of the app a stranger uses today. **R13c stopped being one of them on
2026-08-19** — it shipped as PR #152 and its record is the ledger row below. **R17 is live and is
now QUEUED** (spec and measurements above); it stays listed here, per the doc-size rule's "never
prune a defect still live on the shipped app", until its PR lands. The other two stay unqueued for
the stated reasons and should be re-read before anyone opens an item against them.

**1. R17 — two ordinary English words are read as feelings. QUEUED 2026-08-20; still live until it
ships.** `"still"` is a `calm` keyword and `"down"` a `sad` one (`emotionExtractor.ts:110`, `:56`);
matching is `\b`-anchored but sense-blind, and one incidental hit scores 0.50 against a 0.4
threshold. So *"I still feel guilty about missing the call"* is reported as **calm**, *"I calmed
down after talking to her"* as **sad**, and *"I wrote down three things I was grateful for"* ranks
**sad above grateful**. It reaches two surfaces — the Sessions summary
(`sessionReflection.generateReflection`) and the mood-suggestion card (`ChatPanel.tsx:239`), with
`:265` using the same extractor to suppress gratitude prompts after negative entries. **Not
gate-triggering.** The full measurement, the three-form replacement list and the two things
deliberately left alone (`"loss"`, the declaration-order tie-break) are in the queue item above.

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

**2. R10 — the guided banner promises a structure the reply does not follow. 100 % of the
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
