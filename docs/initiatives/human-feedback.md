# Initiative: human-feedback

**Mission:** 5–10 real people use QuietNote and what they experience reaches
the loop as GitHub issues and `docs/field-notes/` entries — **user-initiated
only**. The standing local-only rule is unchanged: no telemetry, no automatic
collection, no network calls for feedback, and journal content is never
prefilled or attached to anything. Rules of engagement:
[`README.md`](README.md).

## Grounding (verified 2026-07-10 — planner: re-verify before editing)

- **Repo is PRIVATE until release day** (go-public deferred 2026-07-10;
  Sharang's trigger — see public-release R4). Issue templates and the in-app
  `issues/new` link are built now but stay **dormant for outsiders** until
  the flip; the `mailto:` link works regardless. Owner email:
  sharangpaiusa@gmail.com.
- The app footer already carries the single privacy indicator (lock + "stay
  on this device", Track A3); Settings has row-style entries (A3's
  "Privacy & your data" row is the pattern to copy for a feedback row).
- Visual rules: calm palette, quiet chrome (`VisualCalmGuards` tests guard
  the writing path) — a feedback affordance must whisper, not shout.
- `docs/field-notes/` exists and the planner already reads it; there is no
  intake convention doc yet.

## Increments

| id | what | status |
|---|---|---|
| F1 | Feedback channel: issue templates + in-app "Share feedback" link-out | DONE (PR #85) |
| F2 | Soft-launch kit: tester one-pager + share message for Sharang | gated on public-release R4 (needs the live URL; download sizes come from R1b) |
| F3 | Field-notes intake convention + weekly issue→field-note triage | after first feedback exists |
| F4 | Feedback-driven iteration: human reports outrank queue items | activates with F3 |

## Task queue

- [x] 2026-07-10 · **F1 — Feedback channel** (DONE 2026-07-12, PR #85 — see
  Ledger): add
  `.github/ISSUE_TEMPLATE/feedback.yml` and `bug.yml` per the decided spec
  below; add an in-app "Share feedback" affordance in the footer beside the
  privacy lock and/or as a Settings row — a plain link-out opening
  `https://github.com/Guzzler/QuietNote/issues/new/choose` in a new tab, with
  a `mailto:sharangpaiusa@gmail.com` alternative beside it. Static links
  only: no fetch, no prefill of any user data. Calm styling to match the
  footer. → Verify: links resolve in the browser (screenshot), unit test
  asserts hrefs + that the affordance renders, full suite green.

**Decided (2026-07-12) — F1 issue-template spec (execute: implement verbatim):**

Both templates start with the same privacy guard as a `markdown` element:

> **Please don't paste your journal entries here.** QuietNote never sends
> your writing anywhere, and this issue is public — describe what happened
> in your own words instead of quoting what you wrote.

- `feedback.yml` — name "Share feedback", description "Tell us how QuietNote
  is working for you", labels `[feedback]`, fields:
  1. `textarea` `doing` — "What were you doing?" (required)
  2. `textarea` `expected` — "What did you expect?" (required)
  3. `textarea` `happened` — "What happened instead — or what would make it
     better?" (required)
  4. `input` `env` — "Browser + OS" placeholder "e.g. Chrome 126 on
     Windows 11" (optional)
  5. `dropdown` `backend` — "Which AI engine were you using (Settings →
     engine)?" options: WebLLM (default) / Transformers.js / MediaPipe /
     Not sure (optional)
- `bug.yml` — name "Report a bug", description "Something broke or errored",
  labels `[bug]`, same five fields plus:
  6. `textarea` `console` — "Console errors, if any" with the description
     "Press F12 → Console tab, copy any red text. Check it for personal
     text before pasting." rendered as code (`render: shell`) (optional)
- `config.yml` — `blank_issues_enabled: true`, one contact link:
  "Prefer email?" → `mailto:sharangpaiusa@gmail.com`.
- [ ] gated on public-release R4 · **F2 — Soft-launch kit**: write
  `docs/beta/WELCOME.md` per the decided outline below, linked from README;
  include a short copy-paste share message for Sharang in the PR body and
  the ntfy notification ("ready to share"). Sharing with testers is
  **Sharang's action, not the loop's**.

**Decided (2026-07-14) — F2 WELCOME.md outline (execute: follow this
structure; sizes/requirements are the measured values, re-check against the
live URL at R4):**

1. **Hi — thanks for trying QuietNote** (2–3 sentences): a private AI
   journaling companion that runs entirely in your browser — the AI model
   downloads to your device and your writing never leaves it. You're one of
   the first ~10 people to use it; rough edges expected.
2. **What you need**: Chrome or Edge 113+ (or Chrome for Android 121+) with
   WebGPU; ~1.5 GB one-time model download on first visit (Wi-Fi
   recommended; alternates in Settings are ~2.0–3.2 GB); a few GB free disk.
   Live URL: https://guzzler.github.io/QuietNote/ (insert at R4).
3. **What to try** — one bullet per mode, phrased as an invitation:
   freewrite (just write what's on your mind and reply to what comes back),
   check-in (a guided mood check), thought record (work through one stressful
   thought, CBT-style), gratitude. Suggested: have at least one conversation
   that goes 5+ turns.
4. **Honest limits**: the AI is a small on-device model — it can be clumsy,
   repeat your words back, or miss nuance; it is not a therapist and will
   point you to real help if you write about being in crisis; Firefox/Safari
   aren't supported yet.
5. **Your data**: everything (entries, moods, the model) lives in this
   browser's storage — clearing site data deletes it; there's no account and
   no sync; the Privacy dashboard in Settings shows exactly what's stored.
6. **Telling us what happened** (the part we actually need): the in-app
   "Share feedback" footer link → GitHub form (please don't paste journal
   entries — it's public), or email sharangpaiusa@gmail.com. What helps most:
   what you were doing, what you expected, what happened instead.

Tone: warm, plain, no marketing voice; under ~80 lines; no screenshots
needed (README has them).

## Ledger

| date | item | PR | outcome |
|---|---|---|---|
| 2026-07-12 | F1 — Feedback channel | #85 | Issue templates per the decided spec verbatim (`feedback.yml`, `bug.yml`, `config.yml` with mailto contact link) + calm footer affordance beside the privacy lock: "Share feedback" → `issues/new/choose` (new tab, noopener) · "email" → `mailto:`. Static links only, no query params, nothing prefilled — `FeedbackChannelGuards` (10 tests) pins hrefs, no-fetch, and the don't-paste-your-journal guard in both templates. Verified rendered footer + DOM hrefs on `vite preview` (screenshot). Template chooser rendering itself is only verifiable once the repo is public (F2/R4) — re-check then, incl. that GitHub accepts the `mailto:` contact link. 1336 tests green. |

## Blocked on Sharang

- **Sharing the link with testers** (after F2 + the release gate pass) — the
  loop prepares; Sharang sends.
