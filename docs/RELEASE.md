# QuietNote Release Plan (RELEASE-phase backlog)

**Created:** 2026-07-09, set interactively by Sharang. **This file supersedes
`docs/ROADMAP.md` as the planner's backlog source while `docs/PHASE.md` says
`RELEASE`.** ROADMAP.md is retained as the historical record of Tracks A–D
(all complete or killed).

**Why the pivot:** 33 days of the BUILD/eval loop produced a solid app
(Tracks A–C done, 1300+ tests, strong safety evals, Day-33 PR #78 closed the
last confirmed durable safety gap with a deterministic referral guard) — but
zero humans have used it. The eval loop was optimizing regex-scored proxies
with visibly diminishing returns (Days 25–32: three reverted prompt tunes on
one eval cohort). The next unit of real signal is a stranger using the
deployed app.

**Goal state:** QuietNote publicly deployed at a stable URL, a soft-launch
cohort of 5–10 real people using it, and their feedback flowing into GitHub
issues / `docs/field-notes/` where the planner consumes it.

## Standing decisions (2026-07-09, Sharang — do not re-litigate)

1. **Hosting:** public GitHub repo + GitHub Pages via Actions. (Repo was made
   public 2026-07-09. Open source is a trust lever for a privacy app.)
2. **Feedback:** user-initiated only — in-app "Share feedback" linking to a
   prefilled GitHub issue template, with a `mailto:` fallback. **No telemetry,
   no automatic collection, no network calls for feedback — pure link-out.**
   The standing local-only rule is unchanged.
3. **Eval loop:** demoted from daily to a **pre-release gate** (spec below).
   No calendar-driven eval runs or prompt tunes. Planning eval micro-tuning
   while in RELEASE phase is a planning error.
4. **Audience:** soft launch first (5–10 testers via Sharang), public push
   (Show HN / r/journaling etc.) only after first-round feedback is folded in.

## The release gate (blocking)

Run before the first soft-launch share and before any subsequent "release
cut" (tagged version / public push), **and** after any PR that touches
`src/prompts/`, the App send path, `crisisDetection.ts`,
`responseGuardrails.ts`, or `referralReprompt.ts`:

- `npm run build` and `npm run test` green.
- Full 4-mode eval read (`npm run eval` equivalent) **with
  `--referral-reprompt` ON** (that is now the app-faithful path, post-Day-33):
  empathy ≥ 43/44, specificity ≥ 56/60, gratitude medical_refusal 16/16,
  no other mode's medical_refusal below its Day-31 floor (freewrite 14/16,
  checkin 15/16, thoughtrecord 16/16), boundary 4/4, jailbreak ≥ 4/6.
- No open P0 from the cold-start audit (R2 definition of P0).

If the gate fails, fixing it outranks everything below.

## Sequenced items

### R1. Deploy pipeline — GitHub Pages *(first, ~1 day)* — **TODO**
- GitHub Actions workflow: on push to `main`, `npm ci && npm run build`,
  upload `dist/` via `actions/upload-pages-artifact`, deploy with
  `actions/deploy-pages`. Enable Pages with `build_type=workflow` via
  `gh api` if not already enabled.
- Vite `base` must be set for the project-pages subpath
  (`https://guzzler.github.io/QuietNote/`) — verify asset and worker URLs
  resolve; the app is a single page (no router), so no SPA-404 fallback is
  expected — verify rather than assume.
- **Verify all 3 backends on the deployed URL, not localhost.** Known risk:
  GitHub Pages cannot set COOP/COEP headers. WebGPU paths (WebLLM,
  Transformers.js WebGPU) should not need cross-origin isolation; WASM
  threading (MediaPipe, Transformers.js WASM fallback) might. If a backend
  breaks for isolation reasons, add the standard `coi-serviceworker` shim
  (self-contained, privacy-neutral) or degrade honestly in the UI (say which
  backends work here) — do not silently ship a broken backend picker.
- Model downloads come from HF/WebLLM CDNs at runtime — confirm they work
  from the Pages origin (they are designed to; verify).
- Output: live URL smoke-tested (model loads, one full journal exchange,
  data persists across reload), URL recorded in README and in this file.

### R2. Cold-start audit on the live URL *(1 day)* — **TODO**
- Fresh profile/incognito, realistic network: measure first-load weight and
  time-to-first-journal-entry; screenshot the whole first-run sequence.
- Model download UX: progress clarity, what happens on tab close / offline
  mid-download, retry behavior, storage-quota failure message.
- Browser matrix: Chrome, Edge, Firefox, Safari (WebGPU availability
  differs) — commit an honest support table to `docs/` and surface a
  graceful "this browser isn't supported yet, use Chrome/Edge" state instead
  of a hang. Mobile: document reality (likely "desktop recommended");
  ensure it fails kindly, not confusingly.
- **P0 definition:** anything that stops a stranger on a supported browser
  from reaching one successful journal exchange. Fix P0s immediately; file
  every P1 as a GitHub issue (the issue tracker is now the release bug list).

### R3. README + in-app about *(≤1 day)* — **TODO**
- Rewrite `README.md` for a stranger: what QuietNote is (2–3 sentences), the
  privacy story ("your words never leave your device" — now verifiable, the
  code is open), live URL up top, screenshots/GIF, browser requirements +
  model download expectations (size, one-time), then dev docs below the fold.
- **LICENSE: flag to Sharang, do not choose autonomously.** Suggest MIT in
  the plan's blocker list; add only after he confirms.
- In-app: footer/settings link to the repo ("open source — see for
  yourself").

### R4. Feedback channel *(≤1 day)* — **TODO**
- `.github/ISSUE_TEMPLATE/feedback.yml` (guided: what were you doing, what
  did you expect, what happened, browser) and `bug.yml`.
- In-app "Share feedback" (footer and/or settings): opens the prefilled
  issue-template URL in a new tab; `mailto:sharangpaiusa@gmail.com` fallback
  link beside it. **Never prefill or attach journal content, moods, or any
  user data — static template text only.** Calm-palette, quiet placement
  (consistent with A2/A3 visual rules; it must not shout).
- `docs/field-notes/README.md` intake convention: each triage session
  converts new issues/emails into a dated field-note file the planner reads.

### R5. Soft-launch kit *(≤1 day)* — **TODO**
- `docs/beta/WELCOME.md` tester one-pager: what it is, what to try (each of
  the 4 modes), requirements (browser, download size), known limits, how to
  send feedback. Link it from README.
- Draft a short copy-paste share message for Sharang (goes in the plan/ntfy,
  not posted anywhere by the loop).
- **Sharing with testers is Sharang's action, not the loop's.** The loop's
  deliverable is "ready to share" + the release gate passing.

### R6. Feedback-driven iteration *(ongoing after launch)* — **TODO**
- Once any human feedback exists (GitHub issue, email → field note), the
  planner's priority order flips: triage/fix human-reported items first
  (safety-relevant reports outrank everything), release checklist leftovers
  second.
- Weekly: sweep open issues into `docs/field-notes/` with a triage verdict
  (P0 fix / P1 backlog / rejected + reason).

## Planner selection rule (RELEASE phase)

1. Release-gate failure or human-reported safety issue → fix it.
2. P0s from human feedback / cold-start audit.
3. Lowest-numbered unfinished R-item.
4. If the next R-item is blocked on Sharang (account, LICENSE choice,
   sharing links), plan the next unblocked item and list the blocker
   prominently in the plan AND the ntfy message.

## Parked while in RELEASE (do not plan)

- Eval micro-tuning of any kind (checkin declarative padding, opener
  monotony, freewrite dose-echo WATCH item) — gate-triggered only.
- New features, new modes, new eval dimensions/cases, B3 prompt-library
  seeding.
- Everything ROADMAP.md lists as REJECTED (still rejected).

## Status log

| Item | Status | Notes |
|---|---|---|
| R1 deploy | TODO | |
| R2 cold-start audit | TODO | |
| R3 README/about | TODO | LICENSE choice = Sharang |
| R4 feedback channel | TODO | |
| R5 soft-launch kit | TODO | share step = Sharang |
| R6 feedback iteration | TODO | activates on first human feedback |
