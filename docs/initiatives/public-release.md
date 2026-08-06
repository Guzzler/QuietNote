# Initiative: public-release

**Mission:** a stranger on a supported browser reaches **one successful
journal exchange** (model downloads, reply streams, data persists across
reload) at a stable public URL, and the README tells them honestly what they
are getting. Rules of engagement: [`README.md`](README.md) (standing
decisions, release gate, queue format).

## Grounding (verified 2026-07-13 — planner: re-verify before editing)

- Client-only Vite app; `vite.config.ts` sets `base: "/QuietNote/"` (R1a) for
  the GitHub Pages project URL (`https://guzzler.github.io/QuietNote/`).
- Single page, no client router → no SPA-404 fallback expected (verify).
- **Unsupported-browser state (re-verified in code 2026-07-13):**
  `src/components/WebGPUFallback.tsx` — App.tsx:705-707 returns it *instead
  of the app* (`fixed inset-0 z-50` full-screen card) when the active
  runtime's support check fails. The offending copy is the indigo callout at
  `WebGPUFallback.tsx:59-65` ("You can still use QuietNote for writing…") —
  **contradicted by the behavior: the screen blocks all writing.** Also,
  `transformersjs-engine.ts#checkSupport` (lines 29-45) unconditionally
  returns `{ supported: true }` with a WASM fallback, **but R2 (2026-07-12)
  proved that claim false**: the current ONNX q4f16 model cannot load on
  WASM/CPU (`GatherBlockQuantized` kernel not found) — see the R2 matrix.
  The copy-only fallback fix is the viable direction (R2a).
- **Loading card (verified 2026-07-13):** App.tsx:709-748; the only
  first-time hint is the lock line at App.tsx:741-744 ("First time takes a
  few minutes…") — no size disclosure (R2b). The active `runtimeId` lives in
  `src/hooks/useInferenceEngine.ts` (localStorage `quietnote-runtime`), so
  the card can show a per-backend size.
- **Footer (re-verified 2026-07-14):** App.tsx:940-967 (drifted from 935-962
  after PRs #87/#88) — lock + "stay on this device" + "Share feedback" +
  "email" separated by `·` spans; room for one more quiet link in the same
  pattern (R3b). `FEEDBACK_ISSUES_URL`/`FEEDBACK_MAILTO` confirmed in
  `src/utils/feedbackLinks.ts` (no query params, bare constants).
- **The default engine changed on 2026-08-05 (Sharang, interactive) and it is
  now ON `main` — R7 landed as PR #125.** A first-time visitor with no
  `quietnote-runtime` key boots on **MediaPipe / Gemma 4 E2B**, not
  WebLLM / Gemma 2 2B. Both halves — `createEngine`'s default parameter
  (`src/inference/index.ts`) and `getStoredRuntime()`'s no-key fallback
  (`src/hooks/useInferenceEngine.ts`) — now read `"mediapipe"` and are pinned
  together by `src/inference/__tests__/DefaultEngine.test.ts`, so they cannot
  drift apart again. `tasks-genai` is 0.10.29 in `package.json`, the lockfile
  and `TASKS_GENAI_VERSION` (also pinned by that test). The one number that
  moved for a stranger is the first-run download: **1.49 GB → 2.00 GB**;
  R8 (PR #126) swept the docs that quoted the old default.
- 3 backends: WebLLM (Gemma 2 2B, WebGPU), Transformers.js v4 (Gemma 4 E2B
  ONNX, WebGPU/WASM), MediaPipe (Gemma 4 E2B LiteRT, WASM). Models download
  at runtime from HF/WebLLM CDNs — designed for cross-origin use (verify from
  the Pages origin). `src/utils/webgpuCheck.ts` exists (capability detection).
- **MediaPipe model caching: FIXED by R1e (PR #84, 2026-07-12).** The app
  now owns the fetch (`mediapipe-cache` in Cache Storage, streamed into
  `modelAssetBuffer`) with real byte-level download progress. Measured: the
  `.task` is **2.00 GB** (earlier "~3 GB" was wrong). Browsers whose origin
  quota can't hold it skip the cache and stream directly (still works,
  re-downloads per visit).
- **Known risk:** GitHub Pages cannot set COOP/COEP headers. WebGPU paths
  should not need cross-origin isolation; WASM *threading* might. If a
  backend breaks on the live origin, the fix ladder is: `coi-serviceworker`
  shim (self-contained, privacy-neutral) → honest per-backend UI note. Never
  silently ship a broken backend picker.
- **Repo is PRIVATE and stays private until release day** (Sharang deferred
  the go-public flip on 2026-07-10; the loop must NEVER change visibility).
  GitHub Free cannot serve Pages from a private repo → there is no live URL
  yet. Everything below is built release-ready now and activates at
  release day (see R4). Production behavior is verified locally via
  `npm run build` + `npx vite preview` (serves `dist/` at the configured
  `base`).
- **Deploy-gate re-verified against the live file 2026-07-27** (was
  2026-07-21 — unchanged): `.github/workflows/deploy.yml`'s `deploy` job
  (line 39) still carries `if: ${{ !github.event.repository.private }}`, so it
  skips cleanly while private and flips to running automatically the moment
  Sharang makes the repo public at R4 — **no workflow edit is needed on
  release day**. The `build` job runs on every push (build +
  `upload-pages-artifact`) with `configure-pages` set `continue-on-error`
  (line 30), so doc-only pushes to `main` don't fail CI while Pages is
  disabled. R4's Pages-enable command
  (`gh api repos/Guzzler/QuietNote/pages -X POST -f build_type=workflow`)
  is still the correct current-API invocation for the Actions build type —
  and **re-confirmed the POST (create) verb is right, not PUT (update):** a
  live `gh api repos/Guzzler/QuietNote/pages` on 2026-07-27 returns
  `404 Not Found`, i.e. no Pages site exists yet, so R4 creates one. Repo
  visibility re-checked the same day: still `PRIVATE`, so there is no live
  URL and the deploy job is dormant exactly as designed.
- `README.md` today is the **stock Vite template** (React+TS+Vite boilerplate,
  ESLint config advice) — R3a is a from-scratch write, not an edit.
- No LICENSE file (see Blocked).
- 1300+ Vitest tests; `npm run build` is TS-strict and must stay green.

## Increments

| id | what | status |
|---|---|---|
| R1a | Pages deploy workflow, gated to skip while private (+ Vite `base`) | DONE (PR #79) |
| R1b | Production-build smoke test of all 3 backends + persistence on local `vite preview` | DONE (PR #80) |
| R1c | Lora font missing from production build | DONE (PR #82) |
| R1d | MediaPipe backend fails at inference under production build | DONE (PR #83) |
| R2 | Cold-start audit (fresh profile: download UX, failure states, browser matrix doc, graceful unsupported-browser state, mobile honesty) — on `vite preview` now, re-run on the live URL at release day | DONE (PR #86) |
| R2a | Honest unsupported-browser fallback (copy-only) + truthful `checkSupport` | DONE (PR #87) |
| R2b | Download-size honesty on the loading card | DONE (PR #88) |
| R3a | README rewrite for strangers | DONE (PR #81) |
| R3b | In-app footer link to the repo ("open source — verify it yourself") | DONE (PR #90) |
| R7 | **Land the default-engine swap + the `tasks-genai` bump** (branch `fix/2026-08-05-tasks-genai-litertlm`, 2 commits, pushed, no PR) and close the test gap the swap's own commit message flags: nothing pins the default runtime | **DONE 2026-08-05 (PR #125)** — both commits landed unrewritten; `DefaultEngine.test.ts` pins both halves of the default and their agreement, plus the `TASKS_GENAI_VERSION` ↔ `package.json` match |
| R8 | **Size + engine honesty sweep for the new default** — `README.md:33`, the F2 WELCOME outline and the R1b matrix all name Gemma 2 2B / ~1.5 GB as what a stranger gets | **DONE 2026-08-05 (PR #126)** — all three rewritten; `MODEL_DOWNLOAD_SIZES` untouched, its values were already right |
| R4 | **Release-day activation (Sharang-triggered):** flip repo public → enable Pages (`gh api repos/Guzzler/QuietNote/pages -X POST -f build_type=workflow`) → deploy runs → live-URL smoke (all backends, full exchange, reload persistence) → release gate → hand to human-feedback F2 | blocked on Sharang |

## Task queue

- [x] 2026-07-11 · **R1e — Cache the MediaPipe model in Cache Storage**
  (DONE 2026-07-12, PR #84 — full detail in Ledger)
- [x] 2026-07-11 · **R2 — Cold-start audit on `vite preview`** (DONE
  2026-07-12, PR #86 — matrix below, full detail in Ledger. Scope caveat:
  WebGPU-less state simulated by deleting `navigator.gpu`; re-verify in real
  Firefox/Safari on the live URL at release day.)
- [x] 2026-07-13 · **R2a — Honest unsupported-browser fallback (copy-only) +
  truthful `checkSupport`** (DONE 2026-07-13, PR #87 — see Ledger)
- [x] 2026-07-13 · **R2b — Download-size honesty on the loading card**
  (DONE 2026-07-13, PR #88 — see Ledger)
- [x] 2026-07-13 · **R3b — Footer "open source" repo link** (DONE 2026-07-14,
  PR #90 — see Ledger) (re-grounded
  2026-07-14): in App.tsx's
  footer (lines 940-967), add one more `·`-separated quiet link matching the
  existing "Share feedback" pattern: text "open source", href
  `https://github.com/Guzzler/QuietNote`, `target="_blank"
  rel="noopener noreferrer"`, same classes. Hoist the URL as a constant
  beside `FEEDBACK_ISSUES_URL` in `src/utils/feedbackLinks.ts`. (Link 404s
  for outsiders while the repo is private — same accepted dormancy as F1's
  issues link; activates at R4.) → Verify: unit test pins the href (extend
  `FeedbackChannelGuards` pattern); footer renders calmly on `vite preview`;
  screenshot.

**Queue note (2026-07-14):** R3b is the LAST non-gated public-release
increment. After it ships, this initiative is release-ready and everything
remaining (R4, LICENSE) is Sharang-gated — do not invent further items here;
model-quality (M1/M2a) is where open work lives. **(Amended 2026-08-03,
execute:** R5 below is not an invented increment — it is an audit-walk finding
filed under the queue-empty rule, which is the one path by which new
public-release items may appear. It is PROPOSED and awaits a planner ruling.**)**

**Queue-empty audit (2026-08-03, execute — `npm run build` (green) +
`npm run test` (1203 green, 72 files) + `npx vite preview` on `:4173`, WebLLM
default, Chromium via Playwright):** the only open checkboxes anywhere were
M14 (PROPOSED, explicitly "do not start without a ruling" — and the planner's
own 2026-08-02 ruling leaves it unqueued as a fix pending the next planning
run's read of the M14a table) and F2 (gated on R4), so the queue-empty rule
sent this run to an audit walk. Walked load → writing surface → first exchange
→ second turn → reload persistence → session re-open. **The Playwright profile
had no saved sessions this time** ("No saved sessions yet." on first paint), so
unlike every walk since 07-21 this was a genuinely empty-journal start — the
model still loaded from an existing Cache Storage entry, so it is an
empty-IndexedDB walk, not a true first-download cold start; the fresh-profile
download matrix stays the 2026-07-12 R2 read. Working: model reached ready with
the R2b "~1.5 GB" size line and real progress (0% → 35% → 94% → ready, ~2 min);
AI-limitations disclaimer + Crisis resources button above the transcript; mode
strip in the shipped order; all four footer links carry the correct hrefs; a
two-turn free-write exchange came back supportive, turn-aware and **distinct**
(turn 2 picked up the new disclosure — being four hours away, doing the math on
taking a week off — rather than restating turn 1), with **no quote artifact of
any kind** (M11/M11b's rules holding on the live path) and **no M14 repeat**;
the session survived a full reload and re-opened from the sidebar with both
turns intact. **0 console errors** (one benign Chromium `powerPreference`
WebGPU warning, crbug.com/369219127). Screenshots:
`docs/screenshots/2026-08-03/`.

**One defect found — filed as R5 (proposed) below:** the "Pick up where you
left off" card splices the raw first 8 words of the previous entry into the
middle of a sentence, producing ungrammatical, double-punctuated copy on the
first screen a returning user sees.

- [x] 2026-08-05 · **R7 — Land the default-engine swap and the `tasks-genai`
  bump, and pin the default with a test.** (DONE 2026-08-05, PR #125 — see
  Ledger. Both commits landed unrewritten; the pin is
  `src/inference/__tests__/DefaultEngine.test.ts` (5 tests, both halves +
  their agreement + the WASM-version match), drift-verified by flipping
  `getStoredRuntime` to `webllm` and watching 2 of 5 fail. Cleared-storage
  boot on `vite preview` showed the **~2.0 GB** MediaPipe card and reached
  ready in 13.3 s from `mediapipe-cache`; both turns distinct, **no quote
  artifact of any kind**, 0 console errors.) The two commits on
  `fix/2026-08-05-tasks-genai-litertlm` (`fd60f58`, `e5efb23`) are Sharang's
  interactive work from 2026-08-05, already verified on `npm run dev` +
  Playwright with build and 1208 tests green. **Do not rewrite, squash or
  re-derive them** — this item is the PR and the missing test, nothing else.
  1. Open a PR from the existing branch (`gh pr create --base main --head
     fix/2026-08-05-tasks-genai-litertlm`). Body: both commit messages'
     evidence, and the **known trade stated plainly** — MediaPipe has no
     repetition-penalty knob, and M1b measured it at 7/10 no-echo (mean
     overlap 0.22, one hard fail at 0.84 on `echo-fw-3`, the exact reply that
     started model-quality). This buys out M14's repeat and M11/M11b/M15's
     quote artifacts (all WebLLM) at the price of echo risk; it is a one-word
     flip back if echo proves worse in practice.
  2. Add the missing pin — the swap's own commit message calls it out: *"no
     test pinned the default engine — that gap let this be a two-line change
     with no failing test."* Assert **both** halves in one test file
     (`src/inference/__tests__/` beside the existing suites): `createEngine`'s
     default parameter and `getStoredRuntime()`'s no-key fallback resolve to
     the same `RuntimeId`, and that id is `"mediapipe"`. A test that pins only
     one half lets them drift apart, which is the actual failure mode.
  3. Re-verify from a **cleared** localStorage on `npx vite preview` (the
     production build, not `npm run dev` — the swap has only been driven on
     dev): first paint boots MediaPipe, the loading card shows the MediaPipe
     size, a full free-write exchange completes, 0 console errors.
  4. **Free by-product, record it in the PR body:** drive a **second turn** and
     say whether turn 2 is distinct and whether any quote artifact (leading,
     wrapping, or a lone trailing `”`) appears. That single observation is the
     re-open condition for **M15** and another MediaPipe sample for M14c.
  → **Verify:** PR merged; `npm run build` + `npm run test` green with the new
  pin; screenshots of the cleared-storage first boot and both turns into
  `docs/screenshots/<date>/`; a ledger row here and one in `model-quality.md`
  for M5b. **Gate:** not gate-triggering by the README's file list — nothing in
  `src/prompts/`, the send path, the safety utils or `evalRunner.ts` is touched.
  Recorded honestly: it *does* change which model answers a stranger, and the
  floors have never been read on that model — that read is queued as
  **model-quality M16**, and it is a soft-launch blocker, not a merge blocker.

- [x] 2026-08-05 · **R8 — Size + engine honesty sweep for the new default**
  (DONE 2026-08-05, PR #126 — see Ledger. All three places rewritten; gate
  respected, R7 landed first. `MODEL_DOWNLOAD_SIZES` left alone as instructed
  — the three values were already correct, only the *default* moved.)
  (gated on R7 — do not take it first; if R7 does not land, every edit here is
  wrong). Docs and copy only, no `src/` logic. Three known-stale places,
  verified in the files this run:
  1. `README.md:33` — reads *"the default model (Gemma 2 2B via WebLLM) is
     about 1.5 GB … Optional alternative engines … roughly 3 GB."* Both halves
     invert. Rewrite: the default is **Gemma 4 E2B via MediaPipe, ~2.0 GB**;
     the alternatives are **~1.5 GB (WebLLM / Gemma 2 2B)** and **~3.2 GB
     (Transformers.js / Gemma 4 E2B)**. Keep the honest "downloaded once and
     cached by your browser" framing.
  2. `human-feedback.md`'s F2 WELCOME outline, item 2 — same numbers, same
     direction; edit the outline in place (F2 itself stays gated on R4).
  3. The R1b smoke matrix in this doc — add a line saying which row is the
     default as of R7. **Do not restate the measurements**; they are still
     correct per-engine, only the label "default" moved.
  **Leave `MODEL_DOWNLOAD_SIZES` alone** — it is keyed by runtime and R2b's
  card already reads the *active* runtime's size, so it needed no change and
  the `DownloadSizeHonesty` pins stay green. → **Verify:** `npm run build` +
  `npm run test` green; no size string in any doc names a number that
  `src/inference/types.ts:60-64` does not carry; screenshot of the loading card
  on a cleared profile showing the size the README now claims.

**Unfiled leftovers noticed 2026-08-05 (planner) — NOT queued, and deliberately
not committed.** The working tree carries three untracked screenshots,
`docs/screenshots/2026-08-05/audit-{two-turn-freewrite,reload-continuity-card,
thoughtrecord-step-desync}.png`, with no accompanying doc section anywhere.
They are from a walk this loop did not record, so the planner cannot attest to
what they show and will not commit them as evidence. One filename —
`thoughtrecord-step-desync` — reads like a defect nobody filed. **Whoever's run
produced them owns reconciling them**: either write the walk up (and the defect,
if it is one, as a proposed queue item under the queue-empty rule) or delete
them. Do not treat the filenames as a finding; a filename is not a measurement.

<details><summary>R6 — MIT LICENSE (moved to Blocked on Sharang 2026-08-05, unchanged)</summary>

- 2026-08-03 · **R6 — Add the MIT LICENSE file** (planner-queued on
  Sharang's explicit 2026-08-03 go; the 2026-07-12 note required it and it is
  now given). Add a standard `LICENSE` at the repo root: the verbatim MIT
  text, `Copyright (c) 2026 Sharang Pai` — no modifications, no added clauses,
  no dual-licensing. Then make the repo state consistent: `package.json` has
  no `license` field today — add `"license": "MIT"`; and `README.md`'s R3a
  rewrite documents everything about the app *except* its license, so add one
  short License section near the bottom pointing at the file. **Scope guards:**
  this is a licensing change only — do **not** touch repo visibility, Pages,
  or any workflow (R4 is Sharang's release-day trigger and is unaffected), and
  do not add third-party attribution/NOTICE files in this item (the model
  licenses — Gemma terms, Apache-2.0 for `gemma-4-E2B-it` — are a separate
  question worth its own increment; flag it, don't fold it in).
  → **Verify:** `LICENSE` exists at the repo root and matches the canonical
  MIT text byte-for-byte apart from the copyright line; `npm run build` and
  `npm run test` green; GitHub shows "MIT" in the repo sidebar once pushed.
  Not gate-triggering (no `src/`, no send path, no safety util).

**R6 NOT TAKEN 2026-08-04 (execute) — left open deliberately, not skipped by
accident.**
</details>

## Audit walk 2026-08-05 (execute) — two real defects, both in the guided modes

Walked before taking R7/R8, on `npx vite preview` against a production build of
`main` at the time (so: **WebLLM / Gemma 2 2B**, the pre-R7 default), Chromium
via Playwright, the persistent profile (model cached — this is an
empty-IndexedDB-ish walk, **not** a true first-download cold start; the
fresh-profile download matrix remains R2's 2026-07-12 read). Path: load → free
write two turns → reload → session re-open → Thought Record two turns → reload
→ session re-open.

**Working, re-confirmed:** R5's quoting fix is live and grammatical on the real
path (`3 days ago, you wrote: “Today felt heavy. I stayed late at work…” How
are you feeling about that today?` — no mid-sentence capital, no `….`); the
two-turn free-write exchange came back distinct and turn-aware with **no quote
artifact of any kind** and **no M14 repeat**; both turns survived a full reload
and re-opened from the sidebar; disclaimer + Crisis resources above the
transcript; all four footer links correct; **0 console errors** (one benign
Chromium `powerPreference` warning). Screenshots:
`docs/screenshots/2026-08-05/audit-*.png`.

- [ ] 2026-08-05 · **R9 (PROPOSED by execute — not planner-graded, do not
  start without a ruling) — the guided modes are not resumable, and the
  Thought Record can be silently lost.** Re-opening a Thought Record session
  from the sidebar restores the transcript but drops the exercise: the mode
  strip resets to **Free Write** and the "Step N of 5" scaffold disappears
  (measured: `aria-checked="true"` on Free Write, no `Step ` string in the
  document). **Grounded in the code, not inferred:** `journalingMode` and the
  three step counters are plain React state initialised to `"freewrite"` / `1`
  (`src/App.tsx:152-155`), nothing persists them to the session record, and
  `src/App.tsx:279-283` resets all three on every `currentId` change — so
  re-opening *any* guided session lands the user in Free Write at step 1.
  **The part that is worse than cosmetic:** the structured `ThoughtRecord` is
  only written when `thoughtRecordStep > 5` (`src/App.tsx:287-318`), and the
  counter is ephemeral — so a user who reloads mid-exercise and comes back can
  never reach the save condition for that session. The CBT artifact the mode
  exists to produce is lost, quietly. A stranger doing the one mode that most
  looks like "real" therapy work is the one most likely to hit this.
  **Not guessed at:** how much of this is intended (a session may be meant to
  be one sitting), and whether the fix is persisting `journalingMode` + step on
  the session record or deriving the step from the stored message count. Both
  touch session shape; the choice is the planner's.

- [ ] 2026-08-05 · **R10 (PROPOSED by execute — not planner-graded, do not
  start without a ruling) — the guided step banner and the model contradict
  each other, because the model is never told the step.** Observed on turn 2 of
  the Thought Record walk: the banner had advanced to **"Step 2 of 5 — What
  went through your mind? What were you thinking?"** while the reply asked
  *"How does that make you feel?"* — **the identical closing question it had
  already asked on turn 1**. So the screen simultaneously instructs the user to
  do two different things, and one of them is a repeat. Survives a reload and a
  sidebar re-open, so it is in the stored reply, not a render artifact.
  **The mechanism is structural, and this is the finding:**
  `getSystemInstruction(mode, contextBlock?, personalityDirective?)`
  (`src/prompts/systemPrompts.ts:191`) has **no step parameter**, and
  `THOUGHT_RECORD_SEQUENCE` (`src/data/journalPrompts.ts:379-385`) is imported
  only by the display component `ThoughtRecordGuide.tsx`. The banner is a pure
  UI counter incremented on each send (`src/App.tsx:323-325`, `:506-508`) while
  the model free-associates with no knowledge of it. These two cannot stay in
  sync except by luck — the observed desync is the default behavior, not a
  fluke, and the same holds for Gratitude and Check-in.
  **Related but distinct from M14/M15:** the repeated *closing question* is a
  partial repeat (opening sentence differed), on the pre-R7 default engine.
  **Re-measure on MediaPipe before pricing any fix** — R7 changed which model a
  stranger gets, and this walk predates it. Any fix that feeds the step into
  the prompt touches `src/prompts/`, i.e. **gate-triggering in the expensive
  way** (fresh 3-seed generate read); a UI-only fix that hides the banner
  during a reply is cheap but treats the symptom.

- [ ] 2026-08-05 · **R11 (PROPOSED by execute — low severity, weakest of the
  three, filed for completeness) — "it loads instantly" is shown to returning
  users unconditionally.** The first-time note at `src/App.tsx:766-774` renders
  on *every* load with no cache-awareness, so a returning visitor reads
  *"First time: downloads the AI model (~2.0 GB) once … After that, it loads
  instantly"* while watching a progress bar. **Measured this run, and the
  numbers do not all support the complaint** — cached loads ranged from
  **5.6 s / 6.3 s** (warm reload, same browser process, WebLLM) through
  **13.3 s** (MediaPipe from `mediapipe-cache`) to roughly **40–60 s** on the
  first load of a cold browser process. So "instantly" is fair for a warm
  reload and false for the cold-process case that a returning stranger actually
  experiences the next day. **What is missing before this is worth acting on:**
  a proper cold-process measurement (this run's 40–60 s is inferred from
  wall-clock between navigation and ready, not instrumented) — R2's fresh-profile
  methodology is the right instrument. If the planner wants it cheap, the honest
  copy fix is dropping the word "instantly" for something measured; it is
  copy-only and not gate-triggering.

**R6 moved out of the queue 2026-08-05 (planner).** It sat open for two runs
because execute is right to refuse it: its task file's standing rule ("never
add a LICENSE file on his behalf") governs the runner, and a queue item cannot
override it. An item nothing in the loop is permitted to take is by definition
**Blocked on Sharang**, and the README's queue rule says those live in that
section, not the queue. Nothing about R6's content changed — the full item is
preserved above and the unblock conditions are unchanged.

<details><summary>execute's 2026-08-04 refusal, in full</summary>
 The execute task file carries a standing hard rule: *"LICENSE and
tester outreach are Sharang's — never add a LICENSE file … on his behalf."*
That rule governs this runner directly, and a queue item in a doc does not
override it, even one recording Sharang's interactive go — the runner cannot
verify that go, and the cost of being wrong (a licensing declaration published
on his repo) is not symmetric with the cost of waiting. Everything else about
R6 is ready and the item is unchanged. **To unblock it, either Sharang adds the
file himself, or the standing hard rule in the execute task file is amended to
carve out a planner-queued LICENSE with his recorded go.** The rest of the
2026-08-04 run took R5, M14b and M14c instead.
</details>

### R5 cold ruling (planner, 2026-08-04) — defect CONFIRMED, fix QUEUED

**Grounding re-verified against the files this run** (not from execute's
report): `continuityPrompt.ts:16-17` takes the first 8 words of the previous
session's first non-empty user message verbatim — leading capital included —
and appends `…` when the message was longer; `:77` splices that into
`` `${formatWhen(days)}, you wrote about ${shortTopic}. How are you feeling
about that today?` `` and `:78` into
`` `I want to revisit what I wrote about ${shortTopic}. ` ``. Both defects
execute measured follow mechanically from those two lines: a capitalized
clause mid-sentence, and `…` immediately followed by the sentence period
(`….`). Confirmed; the ledger of walks that screenshotted it without flagging
it (07-22/07-26/07-27) is a reminder that "no defects found" means "none
noticed".

**Two facts execute's proposal did not have, both read from the code:**
1. **The prefill does not reach the model as anything but ordinary typed
   text.** `ContinuityCard.tsx:17` passes `suggestedInput` to `onClick`, and
   `ChatPanel.tsx:394-397` does exactly `setUserInput(text)` + focus. There is
   no auto-send, no injection into context assembly, no separate prompt path —
   the user reads it, edits it, and presses send like any other entry.
2. **`extractThemes` cannot carry this card.** It returns 7 coarse
   `PromptCategory` labels (gratitude / self-reflection / goals / challenges /
   relationships / growth / creativity), so a themes-based topic renders "you
   wrote about relationships".

**Shape decided: keep the user's own words, quote them, and make the join
punctuation-safe.** The themes variant is **REJECTED** — "you wrote about
relationships" is exactly the generic warmth the 2026-07-12 positioning
decision rules out (the sell is that the app uses *this* user's details).
Dropping the fragment entirely is **REJECTED** for the same reason: the
callback *is* the value of the card. Quoting fixes both defects at once — a
capital is correct inside a quotation, and a quoted fragment ends a clause, so
nothing needs a period after it.

**Copy decided (execute: use verbatim, `kind: "last-session"` branch only —
the `recurring-theme` and `mood-followup` branches are already grammatical and
must not be touched):**
> body: `${formatWhen(days)}, you wrote: “${fragment}” How are you feeling about that today?`
> suggestedInput: `${formatWhen(days)} I wrote: “${fragment}” I want to come back to that. `

**Fragment rule (this is the whole fix in `extractShortTopic`):** split the
trimmed message on whitespace; if it has **more than 8 words**, join the first
8, strip any trailing `.,;:!?-—"'` from that last word, and append `…`; if it
has **8 or fewer**, return the trimmed message unchanged *with* its own
punctuation (so a short entry reads `“Today felt heavy.” How are you…` and a
long one reads `“My sister called tonight to say our dad…” How are you…` —
never `….`). Guard a pathological entry: if the assembled fragment exceeds 80
characters, cut at the last space before 80 and append `…`. Use **curly**
quotes `“ ”` — straight `"` would be typographically worse *and* would sit in
text that later flows past M11's `stripUnmatchedLeadingQuote`; curly quotes
cannot interact with it at all.

**Gate ruling: NOT gate-triggering, and here is the reasoning execute asked
for.** `continuityPrompt.ts` is not on the gate-triggering list, and the
`suggestedInput` worry is answered by fact 1 above — it is a textarea prefill,
not a message the app constructs. It changes nothing about `src/prompts/`,
context assembly, the send path's message construction, sampling, or the
referral trigger, so neither the fresh-generate nor the `--rescore` arm of the
replay rule applies. **Hard guard:** if the implementation turns out to need an
edit inside `App.tsx`'s send path, `buildMessages`, or any safety util, stop
and re-queue — that would be a different item with a different gate answer.

- [x] 2026-08-04 · **R5 — Fix the continuity card's spliced entry text**
  (DONE 2026-08-04, PR #122 — see Ledger). In
  `src/utils/continuityPrompt.ts`: rewrite `extractShortTopic` (`:12-22`) to
  the fragment rule above, and replace the `kind: "last-session"` `body` and
  `suggestedInput` at `:77-78` with the decided copy verbatim. Leave the
  `recurring-theme` and `mood-followup` branches, `themeExtractor.ts`,
  `ContinuityCard.tsx` and `ChatPanel.tsx` untouched — this is a
  string-construction fix in one file. **Note the existing test at
  `src/utils/__tests__/continuityPrompt.test.ts:53` asserts
  `suggestedInput` contains `"revisit"`**, which the new copy drops; update
  that assertion rather than bending the copy to it.
  → **Verify:** (a) new unit tests in `continuityPrompt.test.ts` for all four
  fragment cases — >8 words (ends `…`, no `….` anywhere in `body`), ≤8 words
  (keeps its own trailing period, no `…`), a last word carrying punctuation
  before truncation (stripped), and an >80-char fragment (cut on a space,
  ends `…`); plus one assertion that `body` contains no `“…”.` sequence and
  one that the quotes are balanced. (b) `npm run build` + `npm run test`
  green. (c) On `npx vite preview`: write an entry, reload into a *new*
  session so the card renders, screenshot the card **and** the textarea after
  clicking it — both must read as ordinary English. Screenshots to
  `docs/screenshots/2026-08-04/`. Not gate-triggering.

**Audit walk (2026-07-29, execute — `npm run build` (green) +
`npm run test` (1099 green, 68 files) + `npx vite preview` on `:4173`, WebLLM
default, Chromium via Playwright):** at run start the only open queue item
anywhere was F2 (gated on R4), so the queue-empty rule sent this run to an
audit walk; the planner pushed M9/M10 to `main` mid-walk (commit 470d711),
which the run then picked up and worked. The walk's finding stands either way.
Walked load → writing surface → first exchange → second turn →
reload persistence → session re-open. Working: model loaded from cache with no
errors; the AI-limitations disclaimer + Crisis resources button render above
the transcript; mode strip in the shipped order; all four footer links carry
the correct hrefs; the new session persisted through a full reload (sidebar
"Today felt heavy." / "Worked through sad feelings around relationships." +
"Pick up where you left off" card + fully restored two-turn transcript on
re-open, which also confirms the reply text is what is stored in IndexedDB).
**0 console errors** (one benign Chromium `powerPreference`-ignored WebGPU
warning, crbug.com/369219127).
**One defect found — filed as model-quality M11 (proposed):** both assistant
replies opened with a stray unmatched `"` (`"Feeling guilty about letting your
friend down…`, `"Staying late at work and skipping dinner…`) — 2/2 turns, and
persisted, so it is in the reply text, not a render artifact. Also observed
(not a new item — existing echo/parroting evidence for M1/M4): turn 2 ignored
the new disclosure ("scared of being seen as replaceable") and restated turn
1's content. Same scope caveat as 07-21/07-22/07-26/07-27: the Playwright
profile was persistent (prior sessions present), so this was a returning-user
walk, not a true fresh-profile cold start — the fresh-profile matrix stays the
2026-07-12 R2 read, to be re-run on the live URL at R4. Screenshots:
`docs/screenshots/2026-07-29/`.

**Superseded audit walks (2026-07-21 / 07-22 / 07-26 / 07-27, execute) — pruned
2026-08-04 and 2026-08-05, full text in git history.** All four were queue-empty walks on
`npx vite preview` (WebLLM default, Chromium via Playwright) that reported
the same shape as the 07-27 walk above: loading card with the R2b "~1.5 GB"
line and real progress, disclaimer + Crisis button present, a supportive
non-parroting single-question reply, session surviving a full reload, 0
console errors, **no defects found**, and the same persistent-profile caveat
(returning-user walks, not fresh-profile cold starts — the fresh-profile
matrix stays the 2026-07-12 R2 read below). Screenshots remain at
`docs/screenshots/2026-07-{21,22,26,27}/`. Read alongside R5: these walks
screenshotted the continuity-card splice without flagging it. The 07-27 walk
additionally recorded that every non-gated item across all four initiatives was
DONE at that date — true then, superseded by R5/R6/R7/R8 and the model-quality
queue since.

**R2 cold-start audit matrix (2026-07-12, `npm run build` + `npx vite
preview`, Chromium via Playwright; screenshots in
`docs/screenshots/2026-07-12/`):**

| scenario | result |
|---|---|
| Cold start, fresh profile, desktop | ✅ First paint <2 s: calm loading card, spinner, % progress, "First time takes a few minutes. After that, it loads instantly." ⚠️ No size disclosure before a 1.49 GB download auto-starts → R2b |
| Download progress honesty | ✅ WebLLM shows real %; MediaPipe shows real bytes-based % since R1e (PR #84). |
| First exchange → reload persistence | ✅ Verified twice on 07-12 (R1e PR #84): exchange streams, sessions + model survive reload. |
| WebGPU-less browser (`navigator.gpu` removed; proxy for Firefox/Safari) | ❌ Confirmed grounding: full-screen "WebGPU Not Available" card blocks ALL writing while its copy promises "You can still use QuietNote for writing"; no engine-switch affordance → R2a (`r2-webgpu-fallback-block.png`) |
| Transformers.js without WebGPU | ❌ **Not actually WASM-capable with the current model**: ONNX q4f16 requires `com.microsoft.GatherBlockQuantized`, which has no CPU kernel → "Can't create a session … Kernel not found"; app at least fails visibly ("Something went wrong"). Invalidates the preferred "switch to Transformers.js" fix and the model-quality assumption that Transformers.js is the WASM-capable default candidate (`r2-transformersjs-wasm-failure.png`) |
| Mobile 375×812 cold start | ✅ Loading card lays out cleanly at phone width (`r2-mobile-cold-start.png`); ⚠️ same missing size disclosure, worse on cellular → R2b |

**Decided (2026-07-11; confirmed by R2 2026-07-12 — copy-only variant is
the one to ship, the Transformers.js-switch variant is invalidated) —
R2a fallback-card copy (execute: use verbatim):**
> QuietNote's AI companion needs WebGPU, which this browser doesn't offer
> yet. Your data never left this device — nothing was sent or lost. To use
> QuietNote, open it in Chrome or Edge 113+ (or Chrome for Android 121+).

**Decided (2026-07-13) — R2b loading-card size copy (execute: use
verbatim):** replace the first-time note's text (App.tsx:743) with:
> First time: downloads the AI model (~1.5 GB) once, then it's stored on
> this device. After that, it loads instantly.
where "~1.5 GB" comes from the per-runtime size map (webllm ~1.5 GB /
transformersjs ~3.2 GB / mediapipe ~2.0 GB). One calm line, same lock icon
and styling — the disclosure is honesty, not a warning.

## R1b smoke results (2026-07-10, `npx vite preview` on built `dist/`, real Chrome, Windows 11 + WebGPU)

| backend | model | download (measured) | result |
|---|---|---|---|
| WebLLM (**was** the default until R7) | Gemma 2 2B q4f16 | **1.49 GB** model + 5.3 MB wasm (Cache Storage `webllm/*`) | ✅ progress UI visible → full exchange streamed → reload → session persisted (IndexedDB) |
| Transformers.js | Gemma 4 E2B ONNX q4f16 | **3.15 GB** (Cache Storage `transformers-cache`; ~7 min on test connection) | ✅ full exchange streamed (engine switch persists via `quietnote-runtime` localStorage; model loads on next boot, not immediately at switch) |
| MediaPipe (**the default since R7**, 2026-08-05) | Gemma 4 E2B LiteRT (`gemma-4-E2B-it-web.task`) | at the time of this smoke: downloaded + initialized but left **no Cache Storage entry**. Both halves were later fixed and measured — see R1d/R1e | ❌ *as of 2026-07-10* first send failed: `INVALID_ARGUMENT: CalculatorGraph::Run() failed` / `[newSession] Inference failed`; no reply rendered → queued R1d. **Both defects are since fixed** (R1d PR #83, R1e PR #84) and the path was driven two turns in M14c |

**Which row is the default (added 2026-08-05, R8):** the **MediaPipe** row, as
of R7 (PR #125). The per-backend measurements above are unchanged and still
correct — only the label "default" moved. The authoritative size for each
engine is `MODEL_DOWNLOAD_SIZES` in `src/inference/types.ts`; this table is a
dated smoke record, not the source of truth, and the 2026-07-10 ❌ in the
MediaPipe row is history, not current behavior.

Cross-cutting: Lora serif font broken in production build (missing woff2 in
`dist/`) → queued R1c. Total storage with two model caches: ~4.65 GB (all
three now resident is ≈6.65 GB — M14c).

## Ledger

| date | item | PR | outcome |
|---|---|---|---|
| 2026-08-05 | R8 — Size + engine honesty sweep for the new default | #126 | Docs and copy only — **no `src/` diff**, and `MODEL_DOWNLOAD_SIZES` deliberately untouched (its three values were already right; only the label "default" moved, so R2b's card and the `DownloadSizeHonesty` pins needed no change). Three places fixed: (1) `README.md:33` — both halves inverted, now "the default model (Gemma 4 E2B via MediaPipe) is about **2.0 GB**" with the alternates named individually (**~1.5 GB** WebLLM / Gemma 2 2B, **~3.2 GB** Transformers.js / Gemma 4 E2B) instead of the old lumped "roughly 3 GB"; the honest "downloaded once and cached by your browser" framing kept. (2) `human-feedback.md`'s F2 WELCOME outline §2 — same numbers, same direction, plus a standing rule that whoever writes `WELCOME.md` re-reads them off `src/inference/types.ts` rather than copying the outline, since it has now gone stale once. The share-message draft's "about 1.5 GB" → "about 2 GB". The F1a verification note above it was **also** stale in an instructive way and is corrected in place: the three sizes it checked were right, the *default* was what moved, which is exactly why a July check passed and the copy still went wrong. (3) The R1b smoke matrix — added a line naming the MediaPipe row as the default as of R7, without restating any measurement; the MediaPipe row's stale "~3 GB" parenthetical (a number `types.ts` does not carry) was dropped in favour of a pointer to R1e's measured 2.00 GB, and its 2026-07-10 ❌ is now marked as history, since R1d/R1e fixed both halves and M14c drove the path two turns. → **Verify:** `npm run build` + `npm run test` green (1213, 73 files); a sweep of `README.md` + both initiative docs found no size string outside dated historical records that `src/inference/types.ts:60-64` does not carry. Loading-card evidence for the size the README now claims is the R7 screenshot `docs/screenshots/2026-08-05/r7-cleared-storage-first-boot-mediapipe.png` — a cleared-`quietnote-runtime` boot showing **"~2.0 GB"**; not re-taken, since R8 changes no code that could alter it. Not gate-triggering. |
| 2026-08-05 | R7 — Default-engine swap + `tasks-genai` bump landed and pinned | #125 | Sharang's two commits (`fd60f58`, `e5efb23`) landed **unrewritten** — this PR added only the missing pin and the doc rows. New `src/inference/__tests__/DefaultEngine.test.ts` (5 tests) asserts *both* halves and their agreement: `createEngine`'s default parameter (`src/inference/index.ts`) and `getStoredRuntime()`'s no-key fallback (`src/hooks/useInferenceEngine.ts`) each resolve to `"mediapipe"`, **and equal each other** — the drift case the swap's own commit message flagged. It also pins `TASKS_GENAI_VERSION` to the `package.json` dependency so the CDN WASM fileset cannot drift from the bundled JS API. Guard verified, not assumed: flipping `getStoredRuntime` back to `"webllm"` fails 2 of the 5. Build green, **1213 tests green** (73 files). Verified on `npx vite preview` against the production build with `quietnote-runtime` **removed** from localStorage (true first-time visitor): first paint booted MediaPipe, the loading card read **"~2.0 GB"** (R2b's per-runtime copy, no edit needed), ready in **13.3 s** from an existing `mediapipe-cache`, and a two-turn free-write exchange completed with **0 console errors** (2 benign warnings: Chromium `powerPreference`, WGSL subgroup support). Screenshots: `docs/screenshots/2026-08-05/r7-*.png`. Not gate-triggering by the README file list. **Free by-product (R7 step 4), recorded for M15 and M14c:** turn 2 was **distinct** and turn-aware, and there was **no quote artifact of any kind** — no leading `"`, no wrapper, no lone trailing `”`. |
| 2026-08-04 | R5 — Continuity card quotes the entry instead of splicing it | #122 | Implemented the planner's ruling verbatim in `src/utils/continuityPrompt.ts` only. `extractShortTopic` now applies the fragment rule: >8 words → first 8 joined, trailing `.,;:!?-—"'’”` stripped, `…` appended; ≤8 words → the trimmed message kept with its own punctuation; either way capped at 80 chars on the last space before the cut. The `last-session` `body`/`suggestedInput` use the decided copy with curly quotes; `recurring-theme`, `mood-followup`, `themeExtractor.ts`, `ContinuityCard.tsx`, `ChatPanel.tsx` untouched. Test at `continuityPrompt.test.ts:53` updated off `"revisit"`; 5 new fragment tests (>8 words, ≤8 words, punctuation-before-truncation, >80-char cap, and a loop asserting no `…".` join and balanced quotes in both strings). Build green, **1208 tests green** (72 files). Verified on `npx vite preview` (Chromium/Playwright, WebLLM, real IndexedDB data — both branches hit on the real path): long → `Earlier today, you wrote: “My sister called tonight to say our dad…” How are you feeling about that today?`, short → `Earlier today, you wrote: “Today felt heavy.” How are you feeling about that today?`, and the prefill reads `Earlier today I wrote: “Today felt heavy.” I want to come back to that. `. 0 console errors. Screenshots: `docs/screenshots/2026-08-04/r5-*.png`. Not gate-triggering (no `src/prompts/`, no send path, no safety util — the prefill is ordinary textarea text per the planner's fact 1). **One unrelated defect seen during the walk — filed as model-quality M15 (proposed):** the reply carried an unmatched trailing curly `”`. |
| 2026-07-14 | R3b — Footer "open source" repo link | #90 | Added a fourth `·`-separated quiet link "open source" → `https://github.com/Guzzler/QuietNote` (`target="_blank" rel="noopener noreferrer"`, same classes as "Share feedback") in the App.tsx footer; URL hoisted as `REPO_URL` beside `FEEDBACK_ISSUES_URL` in `src/utils/feedbackLinks.ts`. `FeedbackChannelGuards` extended (2 tests: href pinned + no query string; footer renders the link). Link 404s for outsiders while the repo is private — accepted dormancy, activates at R4. Verified on `vite preview`: all three footer hrefs correct in DOM, calm rendering (screenshot `docs/screenshots/2026-07-14/`). Build green, 1350 tests. This was the LAST non-gated public-release increment — initiative is release-ready, waiting on R4. |
| 2026-07-13 | R2b — Download-size honesty on the loading card | #88 | Decided copy rendered verbatim on the loading card with the active runtime's measured size via new `MODEL_DOWNLOAD_SIZES` map in `src/inference/types.ts` (webllm ~1.5 GB / transformersjs ~3.2 GB / mediapipe ~2.0 GB — R1b/R1e values). Copy-only, same lock icon + calm styling, no consent gate. `DownloadSizeHonesty.test.ts` pins sizes + disclosure. Verified on `vite preview` in a fresh browser context (screenshot in `docs/screenshots/2026-07-13/`). Build green, 1346 tests. Not gate-triggering (App.tsx change is the loading card JSX only, not the send path). |
| 2026-07-13 | R2a — Honest unsupported-browser fallback + truthful `checkSupport` | #87 | Applied the decided copy verbatim to `WebGPUFallback.tsx` (no promise the screen blocks; "your data never left this device"; points to Chrome/Edge 113+). `transformersjs-engine.checkSupport` now requires a WebGPU adapter (mirrors WebLLM's check) instead of claiming always-supported — the ONNX q4f16 model has no WASM/CPU kernel path. PrivacyDashboard picker description dropped its "WebGPU/WASM" claim too. New `WebGPUFallbackGuards.test.ts` pins both honesty contracts; engine checkSupport tests rewritten (4 cases). Verified on `vite preview` with `navigator.gpu` deleted before boot: new copy renders, old promise absent (screenshot in `docs/screenshots/2026-07-13/`). Build green, 1342 tests. Not gate-triggering (no prompts/send-path/safety files). |
| 2026-07-12 | R2 — Cold-start audit on `vite preview` | #86 | Audit-only PR (no fixes, per task). Matrix committed above; 2 defects filed as proposed queue items: R2a (fallback-card contradiction confirmed + preferred Transformers.js-switch variant invalidated — ONNX q4f16 has no WASM/CPU kernel path) and R2b (no download-size disclosure before a 1.49 GB auto-download). Scope caveat: WebGPU-less state simulated by removing `navigator.gpu` (the exact check `checkSupport` uses); real Firefox/Safari re-run stays tied to the release-day live-URL pass. Cross-initiative flag: model-quality's "Transformers.js (WASM-capable) as default after WebLLM removal" assumption is contradicted — noted in model-quality.md. |
| 2026-07-12 | R1e — MediaPipe model persisted in Cache Storage | #84 | App now owns the fetch: miss → byte-counted stream into `mediapipe-cache` (real progress from Content-Length, e.g. "48% of 2.0 GB"), hit → stream from disk into `modelAssetBuffer` (dropped `modelAssetPath`). **Measured: the .task is 2.00 GB, not ~3 GB as previously documented.** Verified on `vite preview` (real Chromium profile): first load populated the cache entry + progress tracked the download; reload reached ready in <30 s with ZERO huggingface requests; full exchange before and after reload; sessions persisted. Two fallbacks, both tested: quota-precheck skips the put when the origin can't hold the model (avoids a doomed put + double download — hit for real in a 7.2 GB-quota browser profile, where load still succeeded by streaming direct with real progress), and put-failure refetches direct. 6 new tests; 1326 green. Total storage all 3 model caches ≈ 6.65 GB. |
| 2026-07-11 | R1d — MediaPipe first-send inference failure | #83 | Not production-specific: MediaPipe's `maxTokens` is a TOTAL (input+output) budget and was 1024 while the app builds prompts to `MODEL_CONTEXT_LIMIT` 4096 (system prompt alone ~1.6–1.9k tokens) → first send always overflowed → `INVALID_ARGUMENT: CalculatorGraph::Run() failed`. Fix: `maxTokens: MODEL_CONTEXT_LIMIT` + pinned the CDN wasm fileset to the installed `@mediapipe/tasks-genai@0.10.27` (was unpinned → JS/WASM drift risk). Verified full exchange on `vite preview` (reply streamed, no console errors); 2 regression tests; 1320 green. Cache Storage gap (re-download) → queued R1e. |
| 2026-07-11 | R1c — Lora font missing from production build | #82 | Root cause as diagnosed: CSS `@import "@fontsource-variable/lora"` shipped the package's relative `url(./files/...)` verbatim; no woff2 in `dist/`. Fix: JS import `@fontsource-variable/lora/index.css` in `main.tsx` (bare specifier fails TS strict — package ships no types). Built CSS now has `url(/QuietNote/assets/lora-*.woff2)`, 8 woff2 emitted, preview: woff2 200, no OTS error, `document.fonts.check("16px Lora Variable")` true, textarea computed font Lora. 1318 tests green. |
| 2026-07-10 | R1a — Pages deploy workflow (dormant) + Vite base | #79 | Shipped. Build job = CI; deploy job gated on `!private`, skips until R4. Found+fixed `/logo.svg` absolute-path 404 under base (App.tsx → `import.meta.env.BASE_URL`). `vite preview` at `/QuietNote/` zero 404s; 1318 tests green. |
| 2026-07-10 | R3a — README rewrite for strangers | #81 | Stock Vite template replaced. Decided hero copy verbatim; live-URL line marked "activating at release"; privacy story, 4 modes, honest safety note, WebGPU requirements, measured download sizes from R1b (1.5 GB default / ~3 GB alternates); 2 screenshots; dev setup below the fold. No LICENSE added (Sharang's call). |
| 2026-07-10 | R1b — Production-build backend smoke (local) | #80 | WebLLM ✅ (1.49 GB, exchange + persistence), Transformers.js ✅ (3.15 GB, exchange), MediaPipe ❌ (`CalculatorGraph::Run() failed` at inference; no model cache) → queued R1d. Found Lora font missing from `dist/` → queued R1c. Screenshots in `docs/screenshots/2026-07-10/`. |

## Blocked on Sharang

- **Go-public + Pages activation (R4)** — the release-day trigger. The loop
  prepares everything; Sharang flips visibility when he declares the app
  ready. Never flip it autonomously. **Deferred until the model-quality bar
  is met** (Sharang 2026-07-12): the soft launch is now gated on
  model-quality's 10-turn quality bar; he'll decide R4 after that.
- ~~**LICENSE choice**~~ **DECIDED 2026-08-03 (Sharang, interactive): MIT.**
  Note this is the *choice* only: adding the file does not publish anything
  while the repo is private, and it does **not** advance R4.
- **R6 — writing the MIT LICENSE file (moved here 2026-08-05).** The decision
  is made and the item is fully specified in the queue section above; the loop
  is simply not permitted to write it. **Two ways to unblock, either works:**
  (a) add the three-line change yourself — `LICENSE` with the canonical MIT
  text and `Copyright (c) 2026 Sharang Pai`, `"license": "MIT"` in
  `package.json`, a short License section in `README.md`; or (b) amend the
  execute task file's standing rule to carve out a planner-queued LICENSE
  carrying your recorded go. Until then it will keep being correctly refused.
