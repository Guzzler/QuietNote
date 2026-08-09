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
- **Guided-mode state is entirely ephemeral (verified in code 2026-08-06):**
  `journalingMode` and the three step counters are `useState` in `App.tsx`
  (`:152-155`); `Session` (`src/types.ts:20-31`) has **no** mode or step field,
  so nothing survives a reload, and the effect at `:277-283` resets the three
  counters on every `currentId` change. `getSystemInstruction`
  (`src/prompts/systemPrompts.ts:191`) takes no step argument, and the four
  `*_SEQUENCE` constants (`src/data/journalPrompts.ts:349-385`) are imported
  **only** by the three guide display components. This is the shared root of
  R9 and R10.
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
- **~~Repo is PRIVATE and stays private until release day~~ — R4 FIRED
  2026-08-07. The repo is PUBLIC, Pages is live, and the whole "dormant until
  release day" frame above is now history** (kept because several items below
  are only readable against it). **Re-verified from outside on 2026-08-08
  (planner), not assumed:** `gh repo view` → `visibility: PUBLIC`,
  `isPrivate: false`, `licenseInfo: MIT` (R6 is visible to GitHub, not just
  present as a file); `gh api …/pages` → `html_url:
  https://guzzler.github.io/QuietNote/`, `build_type: workflow`,
  `source: main /`, `https_enforced: true`; an anonymous
  `curl` of the live URL returns **200** and serves `index-*.js` /
  `index-*.css` under `/QuietNote/`, so R1a's `base` is correct on the real
  origin. **Two consequences the loop must now carry:** production behaviour is
  verifiable on the live URL and no longer only via `vite preview`, and
  **anything wrong in this repo is wrong in public** — which is how R14 below
  was found. Repo *visibility* remains untouchable by the loop in both
  directions: never flip it back either.
- **Repo metadata is empty on a now-public repo (verified 2026-08-08):**
  `gh repo view --json description,homepageUrl` returns `""` for both. A
  stranger arriving from the in-app "open source" footer link (R3b) — which now
  resolves for real — gets a repo with no one-line description and no link back
  to the live app. Cheap, stranger-facing, and folded into R14.
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
| R9 | Guided sessions are not resumable, and a mid-exercise reload silently loses the Thought Record | **DONE 2026-08-06 (PR #127)** — mode persisted on `Session`, step derived from the transcript; both halves (reload and no-reload session switch) verified on `vite preview` |
| R10 | The guided step banner and the model contradict each other (the model is never told the step) | CONFIRMED 2026-08-06 (planner) — structural; fix NOT queued, **R10a** measures it on the new default first |
| R10a | Measure the guided-mode desync rate on MediaPipe (the post-R7 default), all three guided modes | **DONE 2026-08-06 (PR #129)** — it reproduces: **0 of 7 scoreable turns aligned**. R10 is not a WebLLM-era defect; R7 did not close it |
| R11 | "After that, it loads instantly" is shown to returning users unconditionally, and is false for a cold browser process | **DONE 2026-08-06 (PR #130)** — decided copy shipped verbatim; the word is now absent from all of `src/` and a test keeps it that way. (Authored as #128; that PR was auto-closed when its base branch was deleted on #127's merge, and the same branch/commit landed as **#130**.) |
| R12 | The guided banner reads as the AI's question, which it never was — make the step a writing scaffold the user acts on | **DONE 2026-08-07 (PR #131)** — the step prompt is tappable in both branches (prefills the textarea, never a model input) and one line says whose the sequence is. No `src/prompts/` diff; R10a's desync is unchanged by design |
| R4 | **Release-day activation (Sharang-triggered):** flip repo public → enable Pages (`gh api repos/Guzzler/QuietNote/pages -X POST -f build_type=workflow`) → deploy runs → live-URL smoke (all backends, full exchange, reload persistence) → release gate → hand to human-feedback F2 | **DONE 2026-08-07** — Sharang triggered it interactively. Repo is **public**, Pages enabled (`build_type=workflow`), deploy job un-gated itself and ran green, and **https://guzzler.github.io/QuietNote/ is live and smoked end-to-end** on a true fresh-origin cold start. See the R4 result below |
| R6 | MIT LICENSE | **DONE 2026-08-07 (PR #132)** — on Sharang's direct interactive go |
| R13a | Does the saved Thought Record match its labels? (measurement) | queued 2026-08-07, unblocked by R12 — **still the only open measurement** |
| R14 | The public front page still says the app isn't live yet, and the repo has no description | queued 2026-08-08 (planner) — found by re-verifying R4's own outcome from outside |

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

**Queue status (2026-08-06, planner): 3 open — R9, R10a, R11**, all three from
the 08-05 audit walk and all three ruled on this run. The 07-14 note above is
now clearly wrong as a standing claim and should be read as history: the
queue-empty audit rule *is* the mechanism by which this initiative acquires new
work, and it has produced five real defects (R5, R9, R10, R11 + R10a's
measurement) in three walks. **Priority within the queue: R9 first** — it is
the only one that loses user data. R11 is a one-string change and can ride
along with anything. R10a is measurement and blocks no one.

**Queue status (2026-08-08, planner — current): 2 open — R13a, then R14.**
Order is deliberate and it is not severity order: R13a first because it is
measurement of a defect that touches **stored user data** (a saved artifact
whose clinical labels may not match its contents) and its answer is what the
next ruling needs; R14 is a one-line copy fix plus one command, ships in
minutes, and can ride along with anything. **This initiative is no longer the
pacing one** — the app is live, so `human-feedback` (F2, F1b) is where the
loop's remaining leverage is, per the README's priority order. Neither item
here blocks that. Nothing else in this initiative is open: R4 and R6 are DONE,
and the release gate remains unrun by deliberate record (see the R4 result).

**Doc size, stated rather than quietly ignored (2026-08-08).** The README caps
initiative docs at ~200 lines and this one is **841** after this run's prune
(902 before, and that is with ~110 lines added — four shipped sections pruned to
their durable facts: the 07-29 and 08-03 walks, the R9/R10/R11 rulings, and the
R9/R10a/R11 item bodies). It is still 4× the cap. The remaining bulk is real
evidence that is still load-bearing — R10a's result table (R13a reads it), the
R4 smoke matrix (the only fresh-origin cold start ever recorded), the R2 matrix
and the Ledger — so the next prune should take **the R2 matrix and the R1b
smoke results**, both superseded by R4's live read, once R13a has closed. Not
done this run because R13a is unanswered and the R2 matrix is what its result
gets compared against.

**Queue status (2026-08-08, execute — end of run): 1 open — R14a (PROPOSED,
needs a planner ruling; do not start it).** R13a shipped this run (#134) and its
two-arm result is below: the scaffold-followed run labels 3/3 correctly, the
conversation-followed run mislabels 2/3, so R12 closed most of R13's exposure and
what remains is conditional on a user behaviour the UI now steers away from —
**ruled nothing, per the item.** The same walk found a defect that outranks
everything else open here: **R14**, an unanchored substring match that fires the
988 crisis intervention on the word "cutting" inside "cutting everyone short", on
the live public app. It is written up below with its mechanism; the fix is
gate-triggering and is *not* taken by execute.

**Queue status (2026-08-07/08, execute — earlier run): 1 open — R13a**, which
this run unblocked by landing R12 (#131) and deliberately did **not** take: it
is measurement, it blocks no one, and this run's 3-PR budget went to landing the
08-06 stack (#127, #130, #129) plus R12. Everything else in this initiative is
Sharang-gated (R4, R6). Next run starts at R13a.

**Queue status (2026-08-06, execute — end of run): 0 open.** All three items
shipped this run in that order (R9 #127, R11 #128, R10a #129). What remains in
this initiative is R4 (Sharang-gated) and R6 (Blocked on Sharang), plus **R10
itself, which is now priced and not queued**: R10a proved the desync is 100 %
on the shipped default, so the fix is a real prompt-side change and the next
planning run owns the decision to spend the 3-seed generate read on it. One
process note for that run: the three PRs above were **pushed and opened but not
merged** — `gh pr merge` was denied by the environment's permission classifier,
so #128 is stacked on #127 and #129 on #128, and their bases retarget as each
lands.

**Queue-empty audit 2026-08-03 (execute) — pruned 2026-08-08, full text in git
history.** A queue-empty walk on `vite preview` (WebLLM default) that was the
first **empty-IndexedDB** start since 07-21 (no saved sessions on first paint;
the model still came from an existing Cache Storage entry, so not a true
first-download cold start — that matrix stayed R2's until R4 finally produced a
real one). Everything checked passed: R2b size line with real progress,
disclaimer + Crisis button, correct footer hrefs, a distinct turn-aware
two-turn exchange with **no quote artifact and no repeat**, reload persistence,
0 console errors. Screenshots: `docs/screenshots/2026-08-03/`. **Its one defect
became R5** — the continuity card splicing 8 raw words of the previous entry
mid-sentence, on the first screen a returning user sees; fixed in PR #122 and
confirmed grammatical on the live URL at R4.

- [x] 2026-08-05 · **R7 — Land the default-engine swap, bump `tasks-genai`, and
  pin the default with a test** (DONE 2026-08-05, PR #125 — full detail, the
  drift-verification and the cleared-storage boot evidence in the Ledger).
- [x] 2026-08-05 · **R8 — Size + engine honesty sweep for the new default**
  (DONE 2026-08-05, PR #126 — docs/copy only; `MODEL_DOWNLOAD_SIZES` untouched
  because its three values were already right. Full detail in the Ledger.)

**Unfiled-leftovers note RESOLVED 2026-08-06 (planner).** The three untracked
screenshots the 08-05 planning run refused to commit were reconciled the same
evening by the run that produced them: commit `bb76ff1` committed
`docs/screenshots/2026-08-05/audit-*.png` **together with** the walk write-up
and the R9/R10/R11 proposals below, which is exactly the resolution that note
asked for. The `thoughtrecord-step-desync` filename was a real defect — it is
R10, and its mechanism is now grounded in the code (see the ruling). Nothing is
outstanding; the note is kept only because "a filename is not a measurement"
turned out to be the right instinct at the right cost (one run's delay).

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

### R9/R10/R11 cold rulings (planner, 2026-08-06) — all three CONFIRMED, all three SHIPPED

Pruned 2026-08-08; the full rulings are in git history and the implementations
in the Ledger rows (#127, #130, #129). **The parts that bind future work, kept:**

1. **Derived beats persisted for anything the transcript already implies.** R9
   fixed the lost Thought Record by deriving the guided step from the stored
   user-message count rather than persisting three counters — a derived step
   *cannot* drift from the transcript, and it made the save condition reachable
   on a **resumed** session, which persisting counters would not have done.
   `Session.mode` is the one thing persisted, optional, `undefined` =
   `"freewrite"`, no migration. R13a below is the open question about what that
   saved artifact actually contains.
2. **R10 is structural and remains unfixed by design.** `getSystemInstruction`
   takes no step argument and the four `*_SEQUENCE` constants are imported only
   by the three display components — nothing carries the step to the model.
   Both cheap fixes were REJECTED (hiding the banner during a reply conceals the
   contradiction without making the guidance true; dropping the sequences would
   re-open the data loss R9 closed). R12 is what shipped instead; the full
   reasoning is in the R10 fix ruling below.
3. **"An unmeasured word is worth one string, not one instrument."** R11 shipped
   the copy fix without first instrumenting cold-process load time: no number
   changes whether "instantly" is true the next morning. Cache-detection to
   branch the copy was REJECTED as real code with a real failure mode for one
   line of text. The shipped sentence — "a few seconds, no download" — is now
   the standard tester-facing copy inherits (see human-feedback's 08-08 share
   message correction).

- [x] 2026-08-06 · **R9 — Make guided sessions resumable, and stop losing the
  Thought Record** (DONE 2026-08-06, PR #127 — item body pruned 2026-08-08, in
  git history; the shipped shape and its evidence are the Ledger row, and the
  durable rule is kept fact 1 above.)

- [x] 2026-08-06 · **R10a — Does the guided desync happen on the default
  engine?** (DONE 2026-08-06, PR #129 — **result section below**. Answer: yes,
  and worse than R10 recorded — see the table.) (measurement only — **no
  `src/` diff**, no eval run, no fix.) Item body pruned 2026-08-08 (git
  history); its **scoring rule is restated inside the result section below**,
  which is the part that has to survive for the measurement to be repeatable.

### R10a result (2026-08-06, execute) — the desync reproduces on the default engine

**Setup.** Production build of the R9+R11 branch on `npx vite preview` (`:4173`),
Chromium via Playwright, `quietnote-runtime` **absent** → **MediaPipe / Gemma 4
E2B**, the post-R7 default (confirmed before starting). One session per mode,
**one page load per session**, three turns each, `temperature` 0.6 as shipped.
Neither R9 nor R11 touches `src/prompts/`, `buildMessages`, context assembly or
sampling, so the model saw exactly what `main` would have sent it.

**Scoring rule, stated so the run is repeatable.** After each send, the banner
rendered *above* the transcript is the step the user is being asked to write
**next** — and so is the reply's closing question. They are directly
comparable. `aligned` = the reply's closing question asks for what the banner
asks for. `desynced` = it asks for something else (including a different step of
the same sequence). `ambiguous` = the reply asks nothing (a declarative
sentence, even one ending in `?`), or it names the banner's step but its actual
question asks for something else. Turn 3 of the two 3-step modes is `n/a`: after
the third send the derived step is 4, past the end of the sequence, and the
guide stops rendering — **there is no banner left to compare against.**

| mode | turn | banner as rendered | reply's closing question (verbatim) | score |
|---|---|---|---|---|
| Thought Record | 1 | Step 2 of 5 — "What went through your mind? What were you thinking?" | "What exactly happened when you found out?" | **desynced** (asks for step 1, the situation — one step behind) |
| Thought Record | 2 | Step 3 of 5 — "What emotions did you feel? How intense were they (1-10)?" | "What thoughts come up when you think about yourself being invisible?" | **desynced** (asks for step 2, the automatic thought — one step behind) |
| Thought Record | 3 | Step 4 of 5 — "What evidence supports or contradicts this thought?" | "What specific things about the situation or your thoughts are leading to those feelings of humiliation and anger?" | **ambiguous** (opens with "Let's look at the evidence", matching the banner, but then asks for the *causes of the feelings*, not evidence for or against the thought) |
| Gratitude | 1 | Step 2 of 3 — "Why does this matter to you?" | "What aspect of that experience are you reflecting on right now?" | **desynced** (generic reflection prompt, not the banner's ask) |
| Gratitude | 2 | Step 3 of 3 — "How did it make you feel?" | "What is it about that commute that is causing you to dread it so much?" | **desynced** (chases the dread; the banner asks how the gratitude felt) |
| Gratitude | 3 | *(none — guide stops after step 3)* | "What part of that lightness is catching your attention right now?" | n/a |
| Check-in | 1 | Step 2 of 3 — "What went well today?" | *(none)* — "It is okay to feel worn down after a long day, even when sleep is scarce?" | **ambiguous** (declarative sentence with a stray `?`; asks nothing) |
| Check-in | 2 | Step 3 of 3 — "What would you do differently?" | *(none)* — "It sounds like you are carrying a lot of tension right now, and I want to acknowledge how much effort that takes?" | **ambiguous** (same shape) |
| Check-in | 3 | *(none — guide stops after step 3)* | *(none)* — "It makes sense that facing those kinds of pressures leaves you feeling fragile?" | n/a |

**Desync count per mode (scoreable turns only):** Thought Record **2 desynced /
1 ambiguous / 0 aligned** of 3; Gratitude **2 desynced / 0 aligned** of 2;
Check-in **0 desynced / 2 ambiguous / 0 aligned** of 2. **Across all three
modes: 0 of 7 scoreable turns aligned.** R10 is not a WebLLM-era defect and R7
did not close it — on the engine a stranger now gets, the banner and the reply
agreed **zero** times.

**Repeats (the M14/M15 metric): none verbatim.** No closing question repeated a
previous turn's within its session. Two shape-level near-duplicates are worth
recording without being scored as repeats: Gratitude turns 1 and 3 are the same
template with the noun swapped ("What aspect of that *experience* are you
reflecting on right now?" / "What part of that *lightness* is catching your
attention right now?"), and all three Check-in replies share one shape —
validate, then stop.

**Two observations outside R10a's question, recorded and deliberately not ruled
on** (the task says stop, and both belong to model-quality rather than
public-release):
1. **Check-in never asked a question at all** — 3 of 3 replies were declarative
   sentences terminated with `?`. That is malformed punctuation *and* a dead end
   for a guided mode, and it is why Check-in scores 0 desyncs: there was nothing
   to be out of step with.
2. **One comprehension miss in Gratitude turn 1** — "My neighbour shovelled my
   driveway before I woke up this morning" came back as "The inconvenience of
   having someone else work on your driveway before you even wake up must feel
   frustrating." A kindness read as an intrusion, in the mode whose entire
   premise is noticing good things.

**Stopping here as instructed — nothing ruled, nothing fixed.** The next
planning run has what it needs to price R10's prompt-side fix against the gate
(fresh 3-seed generate read, ~2.75 h), now knowing the rate is 100 % on the
shipped default rather than a single WebLLM-era sighting. Screenshots:
`docs/screenshots/2026-08-06/r10a-{thoughtrecord,gratitude,checkin}-mediapipe.png`.
**0 console errors** across all three sessions (2 benign warnings: Chromium
`powerPreference`, WGSL subgroups).

- [x] 2026-08-06 · **R11 — Drop "instantly" from the first-time note**
  (DONE 2026-08-06, landed as PR #130 — see Ledger; item body pruned 2026-08-08.
  The shipped sentence is quoted in kept fact 3 above and pinned by a tree-wide
  test, so the copy of record is the test, not this doc.)

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

### R5 cold ruling (planner, 2026-08-04) — defect CONFIRMED, fix SHIPPED (PR #122)

Pruned 2026-08-06; the full ruling is in git history and the implementation in
the Ledger row. **The two durable parts, kept because they bind future work:**

1. **The continuity card's callback is the user's own words, quoted — never a
   theme label.** "you wrote about relationships" was REJECTED, as was dropping
   the fragment: both are the generic warmth the 2026-07-12 positioning
   decision rules out. `extractThemes` returns only 7 coarse `PromptCategory`
   labels, so it can never carry this card.
2. **The card's `suggestedInput` is a textarea prefill, not a model input.**
   `ContinuityCard.tsx:17` → `ChatPanel.tsx:394-397` is `setUserInput(text)` +
   focus: no auto-send, no context injection, no separate prompt path. That is
   why edits to `continuityPrompt.ts` are **not gate-triggering** — the same
   reasoning any future change to that file should re-check rather than assume.

Also worth keeping: three audit walks (07-22 / 07-26 / 07-27) screenshotted the
spliced card without flagging it. "No defects found" means "none noticed".

- [x] 2026-08-04 · **R5 — Quote the entry on the continuity card instead of
  splicing it** (DONE 2026-08-04, PR #122 — see Ledger)

**Audit walk 2026-07-29 (execute) — pruned 2026-08-08, full text in git
history.** Same shape as the walks above (`vite preview`, WebLLM default,
persistent profile → a returning-user walk, 0 console errors, disclaimer +
Crisis button + footer hrefs + reload persistence all correct). **Its one
defect is the reason it is kept at all:** both assistant replies opened with a
stray unmatched `"`, 2 of 2 turns and *persisted*, so it was in the reply text
rather than the renderer — filed as model-quality **M11**, since fixed, and the
R7 and 08-03 walks have both since confirmed no quote artifact of any kind on
the live path.

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

## R4 result (2026-08-07) — the app is live, and the cold start was real

**Sharang triggered R4 interactively.** Repo flipped to **public**, Pages
created with `build_type=workflow`, and the `deploy` job's
`if: ${{ !github.event.repository.private }}` gate un-gated itself exactly as
designed — **no workflow edit was needed on release day**, which is what the
2026-07-21/27 grounding predicted. Run `31237871784`: `build` success, `deploy`
success.

**Live-URL smoke — https://guzzler.github.io/QuietNote/ — genuine fresh-origin
cold start.** Unlike every audit walk since 07-21, this was not a warm profile:
`guzzler.github.io` is a different origin from `localhost`, so Cache Storage
started empty and the **full 2.0 GB MediaPipe download ran for real** (11% →
54% → 85% → ready, ~7 min on the test connection). This is the first time the
fresh-profile download path has been exercised anywhere but R2's 2026-07-12
local read.

| check | result |
|---|---|
| Pages serves the app at `base: /QuietNote/` | PASS — first paint, correct title, no 404s |
| Loading card copy on the live origin | PASS — R2b size line reads **"~2.0 GB"** (MediaPipe default) and **R11's** new sentence renders: "After that it loads from your device — a few seconds, no download." |
| Real byte-level progress cross-origin from the HF CDN | PASS — R1e's app-owned fetch works from a Pages origin; **no COOP/COEP problem materialised** |
| `mediapipe-cache` populated on the Pages origin | PASS — `caches.keys()` returns `mediapipe-cache`; the second load needed **no download**, which makes R11's copy true in production |
| Full journal exchange | PASS — entry + a supportive, turn-aware, non-parroting reply, both persisted |
| Reload persistence on the live origin | PASS — session survived a full reload and re-opened |
| R5's continuity card | PASS — `Earlier today, you wrote: "I finally shipped something I have been working…"` — grammatical, no splice |
| R9's `mode` field in production | PASS — the stored session carries `mode: "freewrite"` |
| Footer "open source" link | Now resolves — the repo is public, ending the accepted dormancy noted in R3b |
| Console | 0 errors (the usual 2 benign warnings) |

**One thing observed and NOT explained — recorded, not diagnosed.** The tab went
to `about:blank` immediately after the first reply was generated, during the
screenshot call. The exchange itself completed and **both messages were already
written to IndexedDB**, so nothing was lost and the reload recovered cleanly.
Most likely a Playwright/headless memory ceiling under a freshly-loaded 2.0 GB
model rather than an app fault — the same class of thing the loop's environment
notes already record for the embedded pane. **It is one sighting on an
automation profile, not a reproduction on a human's browser, and it should not
be written up as a defect until someone sees it in a real Chrome.** Flagging it
because a stranger's first visit is exactly this path.

**Not run: the release gate.** R4's original definition calls for the full
4-mode eval read before the first share. That was not taken this run — the flip
was Sharang's interactive call and the gate is a ~2.75 h read. `model-quality`
remains the pacing initiative and its quality bar is still unmet; **R10a's 0-of-7
guided desync and the unmeasured R13a labelling question ship as-is.** Free
Write is the surface that has been walked repeatedly; the guided modes have not
earned the same confidence.

## Ledger

| date | item | PR | outcome |
|---|---|---|---|
| 2026-08-08 | R13a — Does the saved Thought Record match its labels? | #134 | **Measurement only — no `src/` diff, no fix, no eval run, nothing ruled**, as the item required. Two five-turn Thought Record sessions on a production build at `npx vite preview`, Chromium via Playwright, **MediaPipe / Gemma 4 E2B** (the profile's stale `quietnote-runtime=webllm` was reset to `mediapipe`; the `.task` came from the existing `mediapipe-cache`, so warm-model / empty-IndexedDB, not a first-download cold start), IndexedDB cleared first so the history held only these two records. **Result: the two arms separate cleanly.** Arm 1 (every entry written by clicking R12's step prompt): SITUATION / AUTOMATIC THOUGHT / ALTERNATIVE THOUGHT all **match** — 3 of 3 correct, even though R10a's desync was present on every turn of that arm too. Arm 2 (every entry answering the reply's closing question, the behaviour R10a says the model invites): **2 of 3 mislabelled** — "Automatic thought" holds a second helping of *situation*, "Alternative thought" holds an *emotion intensity rating*, and the user's real automatic thought landed at position `[2]`, was stored as `emotions`, and is **displayed nowhere on the card**. So R12 closed most of R13's exposure and the residue is now conditional on conversation-following rather than universal. Both sessions' five entries verbatim, both history cards verbatim, and the per-field judgements are in the R13a result section above. Screenshots: `docs/screenshots/2026-08-08/r13a-arm{1,2}-*.png`. **0 console errors.** Not gate-triggering (no code change of any kind). **The walk also found R14** — a benign entry containing "cutting everyone short" fires the full 988 crisis intervention via an unanchored `includes("cutting")` in `crisisDetection.ts:140/:31`, on the live public app. Filed with mechanism, reproduction and a screenshot; **deliberately not fixed** (load-bearing safety surface, gate-triggering) and proposed as R14a for a planner ruling. |
| 2026-08-07 | R12 — The guided step becomes a writing scaffold, not a promise about the reply | #131 | The planner's decided shape, implemented as specified. All three guides (`ThoughtRecordGuide`, `GratitudeGuide`, `CheckInGuide`) take an optional `onUsePrompt?: (prompt: string) => void`; when supplied, the step prompt renders as a `<button type="button">` carrying the same text/font/colour classes plus a hover + `focus-visible` ring in each guide's own accent (indigo / pink / amber-or-indigo by time of day) and `aria-label={`Use this prompt: ${step.prompt}`}`, in **both** the compact and full-size branches. Absent the handler it is still a `<p>`, and the `isComplete` branch renders **no** button in either branch — there is no step left to write. The decided sentence ships **verbatim** in the full-size branch only (the compact banner's prompt line is already `truncate`), hoisted to one shared `GUIDE_SCAFFOLD_NOTE` constant in `src/data/journalPrompts.ts` so the wording cannot drift across three files. `ChatPanel.tsx` gained one `useGuidePrompt` callback — `setUserInput(prompt)` + `textareaRef.current?.focus()`, the identical handler `WelcomeEmptyState`'s `onUseContinuity` already uses — passed to all six render sites. **Scope guards held:** no `src/prompts/` edit, no `getSystemInstruction` change, no new state, no change to `deriveGuidedStep` or to any `*_SEQUENCE` (a test pins all four sequences verbatim, and another asserts `GUIDE_SCAFFOLD_NOTE` appears in no file under `src/prompts/` or `sessionContext.ts` — if it ever does, the change became the rejected prompt-side fix). New `GuidedStepScaffold.test.ts` (30 tests). Build green, **1256 tests green** (75 files); `eslint` on the six touched files is clean (ChatPanel's 2 errors + 1 warning are pre-existing and untouched). **Test-idiom discrepancy, recorded rather than papered over:** the item asked for click assertions, but the repo has no jsdom/testing-library — every component test here is logic- or source-based — so the guards are source-based in the `DownloadSizeHonesty`/R9 idiom. They were verified to bite: against pre-R12 sources **28 of 30 fail** (the 2 that pass are the sequence-verbatim guards, correctly). Verified on `npx vite preview` against the production build, Chromium via Playwright, `quietnote-runtime` **absent** → **MediaPipe / Gemma 4 E2B**: opened Thought Record, clicked the step-1 prompt → textarea prefilled `What happened? Describe the situation briefly.` verbatim **and focused**; sent a real step-1 entry; the banner advanced to **Step 2 of 5** and its compact prompt was clickable too → prefilled `What went through your mind? What were you thinking?` and focused. Gratitude and Check-in both render the note exactly once with a tappable step-1 prompt. **0 console errors** (the same 2 benign warnings as R7: Chromium `powerPreference`, WGSL subgroups). Screenshots: `docs/screenshots/2026-08-07/r12-*.png`. **Not gate-triggering** — no `src/prompts/`, no send path, no safety util, no `evalRunner.ts`; the prefill is ordinary textarea text per R5's fact 2. **One free observation, not a measurement:** on this single turn the reply *did* ask for automatic thoughts while the banner showed step 2 — one aligned turn proves nothing against R10a's 0-of-7, and R13a is the measurement. |
| 2026-08-06 | R10a — Guided-desync rate measured on the default engine | #129 | **Measurement only — no `src/` diff, no eval run, no fix, nothing ruled**, exactly as the item required. Nine turns driven (3 modes × 3), one session per mode, one page load per session, on a production build at `npx vite preview` with `quietnote-runtime` absent → **MediaPipe / Gemma 4 E2B**. **Result: the desync reproduces on the shipped default — 0 of 7 scoreable turns aligned.** Thought Record 2 desynced / 1 ambiguous (the two desyncs are both the model running exactly one step behind the banner); Gratitude 2 desynced; Check-in 2 ambiguous because the replies asked **no question at all** — 3 of 3 were declarative sentences terminated with `?`, which is why it scores no desyncs rather than good ones. Turn 3 of the two 3-step modes is `n/a`: the guide stops rendering past the last step, so there is no banner to compare against — a structural detail R10's single WebLLM sighting never surfaced. No verbatim repeats; two shape-level near-duplicates recorded. Two findings outside the question were recorded and deliberately **not** ruled on (Check-in's question-less replies; a Gratitude comprehension miss that read a neighbour's kindness as an inconvenience) — both belong to model-quality. Full table with verbatim banners and closing questions, the stated scoring rule, and the reusable entries is in the R10a result section above. Screenshots: `docs/screenshots/2026-08-06/r10a-*.png`. 0 console errors. Not gate-triggering (no code change of any kind). |
| 2026-08-06 | R11 — The loading card stops promising an instant load | #128 | The decided copy shipped verbatim in `src/App.tsx`'s first-time note: "…then it's stored on this device. After that it loads from your device — a few seconds, no download." The `MODEL_DOWNLOAD_SIZES[runtimeId]` interpolation, the `Lock` icon, the classes and the placement are untouched, and no cache detection was added. `DownloadSizeHonesty.test.ts` gained two R11 guards — the new phrasing is present, and the banned word appears in **no** `.ts`/`.tsx` file under `src/` (a whole-tree walk, with the needle assembled at runtime so the guard cannot trip over its own source). One pre-existing assertion needed a matching edit and it is worth recording: the "vague no-size copy is gone" test asserted the *entire* pre-R2b sentence, which contained the banned word — it now asserts its first sentence only, so the tree-wide guard stays meaningful. Build green, **1226 tests green** (74 files). → **Verify:** screenshot of the real loading card on `npx vite preview` with the new sentence rendered. **Honest caveat on that screenshot:** it was taken on **WebLLM** (`~1.5 GB`), not the MediaPipe default, because a cached MediaPipe boot now reaches ready faster than a screenshot round-trip — three attempts on the default caught only the loaded app. The captured line is the same JSX with the same interpolation; the MediaPipe rendering of this card at **"~2.0 GB"** is evidenced by R7's `r7-cleared-storage-first-boot-mediapipe.png` and pinned by the size tests, and R11 changes no code that could alter it. Not gate-triggering (loading-card JSX only, as R2b established). |
| 2026-08-06 | R9 — Guided sessions resume, and the Thought Record stops being lost | #127 | The planner's decided shape, implemented exactly: `Session` gained one optional `mode?: JournalingMode` (`src/types.ts`, written in `newSession`, read back in `loadExisting` via `resolveSessionMode` — `undefined` = `"freewrite"`, so every pre-08-06 session in IndexedDB stays valid with **no migration**), and the three `useState` step counters plus the `currentId` reset effect are **gone**, replaced by a single derived `guidedStep = deriveGuidedStep(current)` (`src/utils/guidedSession.ts`: user messages across all threads, `+1`). The six `set*Step((s) => s + 1)` calls in `newSession`/`replyInThread` are deleted — the count moves when the message lands. `thoughtRecordSaved` ref guard untouched, so the artifact is still written once per session; the save condition now reads the derived step, which is what makes a **resumed** 5-message Thought Record reach `> 5` instead of being permanently stuck at 1. New `guidedSession.test.ts` (11 tests): step derivation at every length 0–8, the multi-thread count, the restored-5-message save condition and the 4-message negative case, mode restore for all three guided modes + the no-`mode` free-write default, and three App-wiring source guards (mode written + restored, no `set*Step` anywhere, save condition reads `guidedStep`) — the wiring guards fail against pre-fix `App.tsx`, which is the regression check. Build green, **1224 tests green** (74 files). Verified on `npx vite preview` (production build, Chromium/Playwright, `quietnote-runtime` absent → **MediaPipe / Gemma 4 E2B**, the post-R7 default): Thought Record, two entries (banner tracked Step 2 → Step 3), **full reload**, re-opened from the sidebar → mode strip still **Thought Record**, banner still **"Step 3 of 5"**, both turns intact; then switched to a pre-R9 session (correctly falls back to Free Write, no banner) and **back without reloading** → still **"Step 3 of 5"**, which is the half execute never saw and the old reset effect would have shown as Step 1. **0 console errors** (2 benign warnings: Chromium `powerPreference`, WGSL subgroups). Screenshots: `docs/screenshots/2026-08-06/r9-*.png`. **Not gate-triggering** and the hard guard held: no `src/prompts/`, no safety util, no `evalRunner.ts`, and `buildMessages`/context assembly were not edited — the only prompt-adjacent effect is that a resumed session gets back the mode its author chose. |
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
- ~~**R6 — writing the MIT LICENSE file**~~ **DONE 2026-08-07 (PR #132).**
  Unblocked by route (b): Sharang gave the go **directly in an interactive
  session** ("you can write the license and make it MIT"), which is the
  verification the standing rule was protecting against the absence of. The
  earlier refusals were correct — a queue item in a doc cannot stand in for his
  word, but his word given in chat can. Shipped as specified: canonical MIT text
  with `Copyright (c) 2026 Sharang Pai`, `"license": "MIT"` in `package.json`,
  a License section in `README.md`. Model licenses are flagged there, not
  folded in (the Gemma Terms of Use are still a separate question, as the
  original item required).
- ~~**Merging PRs #127 / #128 / #129**~~ **RESOLVED mid-run 2026-08-07/08.**
  All three landed while this planning run was in progress: **#127 (R9)** and
  **#129 (R10a)** merged, and **#128 (R11) was superseded by #130**, which also
  merged — `main` is now `923fce2`. The merge-permission block execute hit is
  therefore not a standing blocker and nothing is queued against it. Worth
  keeping for one run: **execute cannot merge its own PRs**, so any run that
  ships a stack leaves it for a human, and a planning run reading `git log`
  early can be looking at a `main` that moves under it — this run's first read
  showed three PRs open and its last showed all three merged. Re-read `main`
  before writing queue status, which is why the queue below is dated to the
  post-merge state.

## R10 fix ruling (planner, 2026-08-07) — the prompt-side fix is REJECTED on coverage, not cost; R12 is the fix

R10a answered the question it was queued to answer: **0 of 7 scoreable turns
aligned**, on the engine a stranger actually gets. R10 is not a WebLLM-era
defect and R7 did not close it. Three of the four shipped modes show a banner
that promises a structure the reply does not follow, 100 % of the time. That is
squarely a core-usefulness defect and it deserves a fix.

**The obvious fix — tell the model the step — is rejected, and the reason is
not the 2.75 h gate read.** The grounding bullet added this run establishes
that every eval path reads `getBaseSystemInstruction`, and the app's
`getSystemInstruction` is read by nothing outside `App.tsx`. So a step directive
added to the app branch would ship a system-prompt path that **no gate read can
see**: the fresh 3-seed generate read the replay rule demands would reproduce
byte-identically (M11/M12's 900-of-900 result is the evidence) and would
therefore certify nothing about the change, while the change itself would alter
what three of four modes ask the model on every guided turn — unmeasured. Paying
2.75 h for a read that is provably blind to the diff is worse than not paying
it. **Making it visible is a much larger item** (the step would have to reach
`getBaseSystemInstruction` and the eval cases would have to carry a step, which
is new eval cases — parked by standing decision — plus `run-eval.ts`, itself
gate-triggering). Not now, and not as a side effect of a UI defect.

**Rejected too, again and for the record:** hiding the banner during a reply
(R10's own ruling — conceals the contradiction without making the guidance
true), and dropping the sequences outright (it would delete the structure R9
just made durable — the Thought Record artifact save is defined in terms of the
step, so removing steps re-opens the data loss R9 closed).

**DECIDED — R12: the guided step becomes a scaffold the user acts on, not a
promise about what the AI will ask.** The contradiction exists because the
banner sits above the transcript making a second-person request the model was
never told about, so a reader reasonably hears it as the AI's question. Fix the
implicature, not the model: make the step's prompt something the *writer* uses,
and say plainly whose it is. Then the banner is true — the sequence really is
the user's writing guide — and the reply, which responds to whatever the user
wrote, stops contradicting it. Precedent that this is cheap and safe: R5's
fact 2 — a textarea prefill (`setUserInput` + focus) is ordinary text, **not a
model input**, so it is not gate-triggering. `ChatPanel` already owns
`setUserInput` (`:61`, `:395`) and already passes it to the continuity card.

**Copy DECIDED (execute: use verbatim).** One quiet line under the full-size
guide only — the compact sticky banner has no room (its prompt line is already
`truncate`) and needs no wording change once the prompt is tappable:
> These steps are a writing guide. Your companion responds to whatever you write.

Two sentences, both true, neither hedging: it tells the reader the sequence is
theirs and that the AI follows *them*. That is the honest version of what the
app actually does, which is the standard R2a and R11 were held to.

- [x] 2026-08-07 · **R12 — Make the guided step a writing scaffold, not a
  promise about the reply.** (DONE 2026-08-07, PR #131 — see Ledger. One
  discrepancy from the item's verification (a), noted per the honest-smaller-
  version rule: this repo has **no jsdom/testing-library setup**, so "clicking
  the step prompt calls `onUsePrompt`" cannot be asserted by rendering. The
  guards are source-based instead, the same idiom as `DownloadSizeHonesty`,
  `WebGPUFallbackGuards` and R9's own wiring guards — and they were checked
  against pre-R12 sources, where **28 of 30 fail**.) UI only. **Unblocked** —
  R9 is on `main` as of
  `c8d0fbf`, so `src/utils/guidedSession.ts` and the single derived
  `guidedStep` (`src/App.tsx:280`, passed to all three guides at `:929-931`)
  are the state this builds on.
  1. `src/components/{ThoughtRecordGuide,GratitudeGuide,CheckInGuide}.tsx` —
     add an optional `onUsePrompt?: (prompt: string) => void` prop. When it is
     supplied, render the step's prompt line as a `<button type="button">`
     that calls `onUsePrompt(step.prompt)`; keep the exact text, font and
     colour classes, add only a hover/focus affordance and
     `aria-label={`Use this prompt: ${step.prompt}`}`. When it is absent, render
     the `<p>` exactly as today. Do this in **both** the compact and full-size
     branches. In the `isComplete` branch, render the completion line as plain
     text as today — **no button** (there is no step to write).
  2. Full-size branch only, all three guides: add the decided copy above as one
     quiet line under the step prompt (match the `text-xs text-slate-400`
     scale already used by the `Step N of M` line). Not in the compact branch.
  3. `src/components/ChatPanel.tsx` — pass
     `onUsePrompt={(p) => { setUserInput(p); textareaRef.current?.focus(); }}`
     to all six render sites (`:384-388`, `:424-426`), i.e. the same handler
     `WelcomeEmptyState`'s `onUseContinuity` already uses at `:394-397`.
  **Scope guards:** no `src/prompts/` edit, no `getSystemInstruction` change, no
  new state, no change to `deriveGuidedStep` or to the sequences themselves.
  If the implementation starts wanting to send the step to the model, **stop** —
  that is the rejected item above, not this one.
  → **Verify:** (a) unit tests — clicking the step prompt in each of the three
  guides calls `onUsePrompt` with that step's exact `prompt` string; the
  `isComplete` branch renders no button; the decided sentence is present in the
  full-size branch and absent from the compact one. (b) `npm run build` +
  `npm run test` green. (c) On `npx vite preview` (MediaPipe default): open
  Thought Record, click the step prompt, confirm the textarea is prefilled with
  it verbatim and focused; send it; confirm the banner advances and its new
  prompt is clickable too. Screenshots (full-size guide with the new line, and
  the prefilled textarea) to `docs/screenshots/<date>/`.
  **Gate: NOT gate-triggering.** No `src/prompts/`, no send path, no safety
  util, no `evalRunner.ts`; the prefill is ordinary textarea text per R5's
  fact 2, which is the same reasoning that cleared `continuityPrompt.ts`.

## R13 — the saved Thought Record labels entries by position, and R10a says the positions are wrong (planner, 2026-08-07, CONFIRMED in code)

Found while grounding R12; it is the downstream consequence of R10 and it
touches stored user data, so it is recorded here rather than left implicit.

**The mechanism, read on `main` this run.** The artifact effect
(`src/App.tsx:281-315`) takes the session's first five user messages **by
position** and assigns them: `[0]` → `situation`, `[1]` → `automaticThought`,
`[2]` → `emotions` (via `parseEmotions`), `[3]` → `evidenceFor`, `[4]` →
`alternativeThought`. `ThoughtRecordHistory.tsx:136-160` then renders three of
them under CBT terms of art — **"Situation"**, **"Automatic thought"**,
**"Alternative thought"**. Nothing anywhere checks that the user's *n*th message
answered the *n*th step.

**Why R10a makes this more than theoretical.** The positional mapping is only
true if the user answers the sequence in order. R10a measured that the reply
asks for something else on **every** guided turn — Thought Record specifically
runs one step behind, so a user following the *conversation* (the natural thing
to do) answers step *n-1* while the banner shows step *n*. Two short entries for
one step shift everything after it by one. The result is a stored artifact whose
clinical labels do not match its contents, surfaced later in a history view as
if it were a real thought record. Note the ordering: **R9 made this more
reachable, correctly** — resumed sessions can now reach the save condition that
used to be unreachable, so more of these get written, not fewer. That is an
argument for fixing the labelling, not for undoing R9.

**No fix is decided this run, deliberately.** R12 is the upstream change: once
the step prompt is what the user clicks and writes into, the positional mapping
becomes substantially more likely to be true, and the size of whatever remains
is unknown until then. Deciding a labelling fix now would be pricing a defect
whose magnitude R12 is about to change. **The trigger is stated instead** — R13a
below measures it right after R12 lands, and the next planning run rules.

- [x] 2026-08-07 · **R13a — Does the saved Thought Record match its labels?**
  (DONE 2026-08-08, PR #134 — **R13a result** section below. Scaffold-followed
  labels 3/3 correctly; conversation-followed mislabels 2/3. One unrelated and
  more severe defect found on the same walk, filed as **R14**.)
  (measurement only — **no `src/` diff**, no fix, no eval run.) **Run this after
  R12 has landed** — **unblocked 2026-08-07: R12 is on `main` as PR #131, so the
  step prompt is clickable and arm 1 below is now performable as written** — on a
  production build on `npx vite preview`, Chromium via Playwright, MediaPipe
  default.
  1. **Scaffold-followed run:** one Thought Record session, five turns, each
     entry written by clicking R12's step prompt and answering *that* step.
     Record the five entries verbatim.
  2. **Conversation-followed run:** a second session, five turns, each entry
     answering **the reply's closing question** instead — the natural user
     behaviour R10a documented. Record those five verbatim too.
  3. For each session, open the Thought Record history
     (`ThoughtRecordHistory`) and record what is displayed under **Situation**,
     **Automatic thought** and **Alternative thought**, verbatim.
  → **Verify:** an **R13a result** section here with both sessions' entries, both
  history cards, and a per-field `matches` / `mislabelled` judgement against the
  step each field claims — plus one screenshot of each history card into
  `docs/screenshots/<date>/`. **Then stop — rule nothing and fix nothing.** The
  two arms are the point: if the scaffold-followed run labels correctly and only
  the conversation-followed run mislabels, R12 has already done most of the work
  and the residue is a copy problem; if both misalign, the mapping itself is
  wrong and needs replacing with something that does not assume order.

## R14 — the release shipped, and the front page still says it hasn't (planner, 2026-08-08)

Found by doing step 3 of this run's job on R4 itself: verifying a *completed*
increment's outcome against the outside world rather than trusting its own
result table. R4's table records nine PASSes on the live app and none of them
looked at what the repo says about the app.

**`README.md:5` reads, today, on a public repo:**
`**Live app:** ` + a *backticked* URL + ` *(activating at release)*`.

Two defects in one line. The hedge is **false** — the app activated on 08-07 and
returns 200. And the URL is in code backticks rather than a link, so the single
most important click on the page **isn't a click at all**. R3a wrote the hedge
deliberately (Ledger, 2026-07-10: "live-URL line marked 'activating at
release'"), and it was correct for 28 days; R4's item even says "R4 unmarks the
URL" (`human-feedback.md:52`). Nothing unmarked it, because R4 was executed
interactively rather than as a queued item with a verification block — which is
the process lesson worth keeping: **an interactively-fired increment skips the
loop's own verification, so its doc consequences have to be swept afterwards.**

**Copy DECIDED (execute: use verbatim, replacing line 5 entirely):**
> **Live app:** [https://guzzler.github.io/QuietNote/](https://guzzler.github.io/QuietNote/) — runs in Chrome or Edge; the first visit downloads the model (~2.0 GB) once.

The size and the browser requirement move up to the one line a stranger is most
likely to act on, because that click starts a 2 GB download. Both facts are
already in the README further down and in the app itself (R2b's card) — this is
the same disclosure, before the click instead of after it. `~2.0 GB` is
`MODEL_DOWNLOAD_SIZES.mediapipe` and must be re-read off
`src/inference/types.ts` at write time, not copied from here.

**Repo metadata DECIDED** (`gh repo edit`, not a file — see the scope note):
- description: `A private AI journal that runs entirely in your browser. The model downloads to your device; nothing you write is ever sent to a server.`
- homepage: `https://guzzler.github.io/QuietNote/`

- [ ] 2026-08-08 · **R14 — Unmark the live URL, and give the public repo a
  description.** Two parts, one PR plus one command.
  1. `README.md:5` — replace the whole line with the decided copy above,
     verbatim. Re-read the size off `src/inference/types.ts`
     (`MODEL_DOWNLOAD_SIZES.mediapipe`) and use what is actually there; if it
     no longer says `~2.0 GB`, use the real value and say so in the PR body.
     Then grep `README.md` for any other "activating"/"at release"/"once the
     repo is public" hedge and fix the same way — the release happened, the
     whole document should read as though it did.
  2. Repo metadata, **after** the README lands:
     `gh repo edit Guzzler/QuietNote --description "…" --homepage "https://guzzler.github.io/QuietNote/"`
     with the decided description verbatim.
  **Scope guards.** Part 2 is a repo-settings write, so state the boundary
  plainly: `--description` and `--homepage` **only**. Do **not** pass any other
  flag, and specifically nothing touching visibility, features, merge settings,
  or topics. Visibility is Sharang's in both directions and the loop never
  touches it. If `gh repo edit` fails or asks for anything beyond these two
  fields, **stop and report it** — leave it for Sharang rather than working
  around it. No `src/` diff in this item at all.
  → **Verify:** `README.md:5` renders as a real markdown link (check the
  rendered file on github.com, not just the source) and the word "activating"
  appears nowhere in `README.md`; `gh repo view Guzzler/QuietNote --json
  description,homepageUrl` returns both non-empty and matching the decided
  strings; `npm run build` + `npm run test` green. **Not gate-triggering** — no
  `src/`, no prompts, no send path, no safety util, no `evalRunner.ts`.

**What R12 does not claim.** It does not make the model follow the sequence, and
it is not a substitute for that if the sequence is ever meant to be binding. It
makes the shipped surface honest at zero gate cost, which is the right first
move; if human feedback later says the guided modes need the AI to actually run
the exercise, that is a priced, scoped item for after the soft launch — and it
starts with making the eval read able to see the app's system instruction at
all, which is the real blocker the grounding bullet uncovered.

**Two R10a observations that belong to model-quality, routed not queued.**
(1) Check-in asked **no question in 3 of 3 replies** — declarative sentences
terminated with `?`. This is not new: it is the "checkin declarative padding"
item on the README's **Parked while in RELEASE** list (gate-triggered only), and
it stays parked — what R10a adds is that it now has live-app evidence on the
post-R7 default, not just eval evidence, which is worth knowing whenever the
gate next opens it. (2) The Gratitude turn-1 comprehension miss (a neighbour
shovelling the driveway read back as an inconvenience) is ordinary base-model
comprehension error and is exactly what model-quality's M4 fine-tune exists to
move; it is one observation and is not a new item.

## R13a result (2026-08-08, execute) — **the scaffold labels correctly; the conversation mislabels 2 of 3**

Measurement only, **no `src/` diff**. Production build of `main` served by
`npx vite preview` on `:4173`, Chromium via Playwright, **MediaPipe / Gemma 4
E2B** (the post-R7 default — the profile carried a stale
`quietnote-runtime=webllm` from pre-R7 walks and it was set to `mediapipe` for
this read; the `.task` loaded from the existing `mediapipe-cache`, so this is a
warm-model, **empty-IndexedDB** walk, not a first-download cold start).
IndexedDB was cleared first so the Thought Record history contains only these
two sessions. **0 console errors** across both sessions (2 benign warnings).
Screenshots: `docs/screenshots/2026-08-08/`.

### Arm 1 — scaffold-followed (every entry written by clicking R12's step prompt)

| # | banner at time of writing | entry (verbatim) |
|---|---|---|
| 1 | Step 1 — *What happened? Describe the situation briefly.* | In this morning's standup my manager skipped over my update and moved straight to the next person without saying anything about it. |
| 2 | Step 2 — *What went through your mind? What were you thinking?* | I thought: he has already decided I am not worth listening to, and everyone on that call noticed it. |
| 3 | Step 3 — *What emotions did you feel? How intense were they (1-10)?* | Embarrassed 7, anxious 6, and a flat kind of sad about 5. |
| 4 | Step 4 — *What evidence supports or contradicts this thought?* | For: he cut me off. Against: he was watching the clock the whole call, he asked me to lead the migration review last week, and two other people got skipped too. |
| 5 | Step 5 — *What's a more balanced way to think about this?* | A more balanced read: the standup was running long and he was cutting everyone short, so this was about the clock and not about whether my work matters to him. |

**History card, verbatim**
(`docs/screenshots/2026-08-08/r13a-arm1-scaffold-followed-history.png`):

| field | displayed | judgement |
|---|---|---|
| SITUATION | "In this morning's standup my manager skipped over my update…" | **matches** |
| AUTOMATIC THOUGHT | "I thought: he has already decided I am not worth listening to…" | **matches** |
| ALTERNATIVE THOUGHT | "A more balanced read: the standup was running long…" | **matches** |

**3 of 3 correct.** R10a's desync was present throughout this arm anyway — the
reply asked for step 1 again at banner-step 2, jumped to evidence (step 4) at
banner-step 3, and asked for sadness intensity at banner-step 4 — but because
the *user* followed the scaffold rather than the reply, the positional mapping
held. That is the mechanism R12 was betting on, and the bet paid.

### Arm 2 — conversation-followed (every entry answers the reply's closing question)

| # | banner | what the reply asked for | entry (verbatim) |
|---|---|---|---|
| 1 | Step 1 | — (opening turn) | I sent my landlord a message about the broken heater four days ago and he still has not replied. |
| 2 | Step 2 (automatic thought) | *"Let's identify the situation and see what happened next?"* → **step 1** | What happened next is that I texted him again on Wednesday and it showed as read, and then nothing came back. |
| 3 | Step 3 (emotions) | *"What automatic thoughts are running through your mind right now?"* → **step 2** | The thought running through my mind is that he is ignoring me on purpose because he thinks I am a tenant who complains too much. |
| 4 | Step 4 (evidence) | *"Let's examine the evidence for and against that thought?"* → **step 4** | Evidence for: he read the message and said nothing. Evidence against: he fixed the leak in March within a day, and his mother has been in the hospital this month. |
| 5 | Step 5 (balanced thought) | *"What is the intensity of your emotion right now?"* → **step 3** | Right now the frustration is about a 6 out of 10, and underneath it there is a 4 of feeling small. |

**History card, verbatim**
(`docs/screenshots/2026-08-08/r13a-arm2-conversation-followed-history.png`):

| field | displayed | judgement |
|---|---|---|
| SITUATION | "I sent my landlord a message about the broken heater four days ago…" | **matches** |
| AUTOMATIC THOUGHT | "What happened next is that I texted him again on Wednesday…" | **mislabelled** — this is more *situation*; it is not a thought at all |
| ALTERNATIVE THOUGHT | "Right now the frustration is about a 6 out of 10, and underneath it there is a 4 of feeling small." | **mislabelled** — this is an *emotion rating*; nothing about it is a balanced alternative thought |

**2 of 3 mislabelled.** The user's actual automatic thought ("he is ignoring me
on purpose…") *was* written, landed at position `[2]`, was stored as `emotions`,
and **is not displayed anywhere on the card** — the one field a thought record
exists to capture is silently dropped.

### What the two arms say (recorded, not ruled)

The two arms separate cleanly, which is exactly the outcome R13a was shaped to
distinguish: **R12 did most of the work.** A user who takes the scaffold gets a
correctly-labelled record; a user who follows the conversation — the behaviour
R10a says the model invites on every turn — gets clinical labels over the wrong
contents plus one dropped field. The residue is real but it is now conditional
on a user behaviour the shipped UI actively steers away from, rather than on
every guided session. **Ruling nothing per the item's instruction**; the next
planning run owns whether that residue is a copy problem, a mapping problem, or
acceptable.

One observation for whoever prices it: the failure is quiet in the worst way —
nothing on the card signals low confidence, so a mislabelled record reads
exactly like a correct one.

## R14 — a benign entry containing the word "cutting" fires the full crisis intervention (execute, 2026-08-08, CONFIRMED in code and on the live path)

**Found on the R13a walk; unrelated to R13a and more severe.** Arm 1's fifth
entry was:

> A more balanced read: the standup was running long and he was **cutting**
> everyone short, so this was about the clock and not about whether my work
> matters to him.

The model's reply was replaced by the crisis intervention ("I'm deeply concerned
about what you've shared. Your life matters… **Call or text 988**…") **and** the
"Immediate Support Available" modal auto-opened over the writing surface.
Screenshot: `docs/screenshots/2026-08-08/r13a-crisis-false-positive-modal.png`.

**Mechanism, read in the code.** `detectCrisis`
(`src/utils/crisisDetection.ts:140`) tests every keyword with a bare
`lowerText.includes(keyword)` — an unanchored substring test with no word
boundary. `"cutting"` is a `HIGH_SEVERITY_KEYWORDS` entry (`:31`), so
`"cutting everyone short"` scores `severity: "high"`,
`recommendedAction: "immediate_help"`, the branch that suppresses the model
reply entirely. Verified by isolating the keyword lists against the entry text:
the sole match is `cutting`.

This is not a one-off phrase. The same unanchored test makes ordinary journaling
language fire the 988 wall: *cutting back on coffee*, *cutting corners*,
*cost-cutting at work*, *cutting my hair*, *the team is cutting scope*. Other
entries carry the same shape — `"ending it"` inside *ending it on a good note*,
`"give up"` (medium) inside *I won't give up on this*, `"crisis"` (low) inside
*the housing crisis*.

**Why it matters now, specifically.** The app has been public and live since R4
(2026-08-07) and the soft launch (F2) is the next thing to happen. A tester
writing about cutting back on caffeine being told their life matters and to call
a suicide hotline is the most likely single way this build loses a stranger's
trust — and it is the *safety* surface doing it, the surface whose credibility
costs the most to spend. Not a P0 by this initiative's definition (the journal
exchange still completes), but it is the highest-severity open defect on the
live app.

**Deliberately NOT fixed this run.** `crisisDetection.ts` is a load-bearing
safety surface and any change to it is gate-triggering; narrowing a matcher
could in principle let a real signal through, so it needs a planner ruling and a
gate read, not an execute-run patch. Filed with the mechanism and the
reproduction so the ruling can be made on evidence.

- [ ] 2026-08-08 · **R14a — Word-boundary the crisis keyword match** (PROPOSED —
  needs a planner ruling before anyone starts; gate-triggering.) The shape that
  is plausibly one-directional-safe: keep every list and every entry exactly
  as-is, and change the **single-word** keyword tests from
  `lowerText.includes(k)` to a word-boundary regex (`\b…\b`), leaving the
  multi-word phrases on `includes` since they cannot false-positive the same
  way. That strictly *shrinks* the matched set, which is why it needs a ruling
  rather than a patch: it can also drop a real hit inside a compound
  ("cuttingmyself"), so the ruling owes an explicit answer on
  hyphen/punctuation handling and on whether any entry is intentionally a stem.
  → **Verify:** every existing `crisisDetection` test still green with **no test
  deleted or loosened**; new cases pinning both directions (*cutting everyone
  short* → `none`; *I have been cutting again* → `high`); full 4-mode 3-seed gate
  read at seeds 11/22/33 with `--referral-reprompt` ON, numbers vs the README
  floors in the PR body. **A fresh generate read, not a `--rescore`** — the
  crisis/referral trigger is on the replay rule's must-generate list.
