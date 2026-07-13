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
| F1 | Feedback channel: issue templates + in-app "Share feedback" link-out | queued |
| F2 | Soft-launch kit: tester one-pager + share message for Sharang | gated on public-release R4 (needs the live URL; download sizes come from R1b) |
| F3 | Field-notes intake convention + weekly issue→field-note triage | after first feedback exists |
| F4 | Feedback-driven iteration: human reports outrank queue items | activates with F3 |

## Task queue

- [ ] 2026-07-10 · **F1 — Feedback channel**: add
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
  `docs/beta/WELCOME.md` (what QuietNote is, requirements + measured
  model-download size from R1b, what to try in each of the 4 modes, known
  limits from the browser matrix, how to send feedback) linked from README;
  include a short copy-paste share message for Sharang in the PR body and
  the ntfy notification ("ready to share"). Sharing with testers is
  **Sharang's action, not the loop's**.

## Ledger

| date | item | PR | outcome |
|---|---|---|---|

## Blocked on Sharang

- **Sharing the link with testers** (after F2 + the release gate pass) — the
  loop prepares; Sharang sends.
