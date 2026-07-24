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

**F2 grounding re-verified in code 2026-07-23 (planner)** — the decided
WELCOME.md outline was written 2026-07-14 without a code pass; checked now so
it ships correct the moment R4 lands:

- **Modes (outline §3) — set correct, order wrong.** Shipped labels and UI
  order are **Free Write · Gratitude · Check-in · Thought Record**
  (`JournalingModeSelector.tsx:15-26`); the outline listed freewrite /
  check-in / thought record / gratitude. Corrected below so a tester reading
  the one-pager sees the same order as the mode strip.
- **Download sizes (outline §2) — exact.** `MODEL_DOWNLOAD_SIZES`
  (`src/inference/types.ts:60-64`) is webllm `~1.5 GB` / transformersjs
  `~3.2 GB` / mediapipe `~2.0 GB`, matching "~1.5 GB … alternates are
  ~2.0–3.2 GB" verbatim.
- **Privacy dashboard (outline §5) — correct.** `SettingsPanel.tsx:160-173`
  has the "Privacy & your data" row ("Export or erase your entries") opening
  `PrivacyDashboard`.
- **Honest limits (outline §4) — correct.** The AI-limitations disclaimer
  ("not a therapist or mental health professional") and the Crisis resources
  button both render in `ChatPanel.tsx:434-444`.
- **README (outline, "linked from README") — no `docs/beta` link exists yet**;
  README's sections are Live app / How privacy actually works here / Four ways
  to write / An honest note on what this is / What you need to run it /
  Development, with the live URL already on line 5 marked "*(activating at
  release)*". F2 adds the link; R4 unmarks the URL.
- **DEFECT FOUND — the engine-picker path in the shipped issue templates is
  wrong.** `feedback.yml:39` and `bug.yml:39` both label the backend dropdown
  "Which AI engine were you using (Settings → engine)?", but Settings has no
  engine control (`SettingsPanel.tsx` has zero runtime/engine references) —
  the picker is the "Inference Engine" section **inside the Privacy
  dashboard** (`PrivacyDashboard.tsx:320-341`), reached via Settings →
  "Privacy & your data". A tester following that instruction won't find it and
  will answer "Not sure". Filed as F1a below.

## Increments

| id | what | status |
|---|---|---|
| F1 | Feedback channel: issue templates + in-app "Share feedback" link-out | DONE (PR #85) — one copy defect found 2026-07-23, filed as F1a |
| F1a | Issue templates point testers at "Settings → engine"; the picker is in the Privacy dashboard | DONE (PR #109) |
| F2 | Soft-launch kit: tester one-pager + share message for Sharang | gated on public-release R4 (needs the live URL; download sizes come from R1b) |
| F3 | Field-notes intake convention + weekly issue→field-note triage | after first feedback exists |
| F4 | Feedback-driven iteration: human reports outrank queue items | activates with F3 |

## Task queue

- [x] 2026-07-10 · **F1 — Feedback channel** (DONE 2026-07-12, PR #85 — see
  Ledger. The decided 2026-07-12 issue-template spec is pruned here on
  2026-07-23: it shipped verbatim, so `.github/ISSUE_TEMPLATE/feedback.yml`,
  `bug.yml`, `config.yml` and `FeedbackChannelGuards.test.ts` are now the
  spec of record — with the one correction filed as F1a below.)

- [x] 2026-07-23 · **F1a — Correct the engine-picker path in both issue
  templates** (DONE 2026-07-23, PR #109 — see Ledger. Chooser rendering
  stays unverifiable until the repo is public — re-check at R4 with the
  rest of F1.)
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
   recommended; the two alternate engines under **Settings → Privacy & your
   data → Inference Engine** are ~2.0–3.2 GB — path corrected 2026-07-23);
   a few GB free disk.
   Live URL: https://guzzler.github.io/QuietNote/ (insert at R4).
3. **What to try** — one bullet per mode, **in the app's own order and with
   its own labels** (corrected 2026-07-23 against
   `JournalingModeSelector.tsx`): **Free Write** (just write what's on your
   mind and reply to what comes back), **Gratitude**, **Check-in** (a guided
   mood check), **Thought Record** (work through one stressful thought,
   CBT-style). Phrase each as an invitation. Suggested: have at least one
   conversation that goes 5+ turns.
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

**Decided (2026-07-23) — F2 share message (execute: put this in the PR body
and the ntfy notification verbatim; Sharang sends it, the loop never does).**
The remaining open F2 copy question was this message; answering it now so F2
is a pure write-it-out task at R4. It is written to be pasted into a text or
DM as-is, ~110 words, no links besides the two the tester needs:

> Hey — I built a journaling app and I'd love your take on it before anyone
> else sees it. It's called QuietNote: you write, and an AI companion writes
> back. The catch is the whole AI runs *inside your browser* — nothing you
> type is ever sent anywhere, including to me.
>
> https://guzzler.github.io/QuietNote/
>
> Two things to know before you open it: you'll need Chrome or Edge on a
> laptop, and the first visit downloads about 1.5 GB (one time, then it's
> instant) — so do it on Wi-Fi.
>
> Write about something real if you can, and go a few messages back and
> forth. Then tell me where it felt off. Rough edges are expected — that's
> the point of asking you.

Notes for execute: the URL line stays exactly as-is (it's live by the time
this is sent — R4 precedes F2); do **not** add a deadline, a feedback form
link, or anything that reads like a survey invite — the in-app footer link
and `WELCOME.md` §6 carry the reporting path. Do not name the model or the
engine; testers don't need it, and §2 of WELCOME.md covers alternates.

**Queue status (2026-07-23, execute): F1a shipped (PR #109) — the queue is
back to zero open non-gated items across all three initiatives; F2 remains
gated on R4.** F1a was the first non-gated work anywhere in the initiatives
since 2026-07-19 — it came from a grounding pass, not from inventing work:
the F2 outline had never been checked against the code, and checking it
surfaced a shipped-copy defect in F1. F2 itself is now a pure write-it-out
task (outline corrected, share message decided) the moment R4 lands.

## Ledger

| date | item | PR | outcome |
|---|---|---|---|
| 2026-07-23 | F1a — Correct the engine-picker path in both issue templates | #109 | Both `backend` dropdown labels now read `Which AI engine were you using (Settings → Privacy & your data → Inference Engine)?` — the picker is the "Inference Engine" section in `PrivacyDashboard.tsx:320-341`, reached via Settings → "Privacy & your data"; `SettingsPanel.tsx` has no engine control at all. Templates only, no `src/` runtime change (not gate-triggering); every other field, the option list, and the don't-paste-your-journal guard untouched. `FeedbackChannelGuards.test.ts` gained a 4-test F1a block: both templates contain the corrected label and no longer contain `(Settings → engine)`, plus two UI-anchor assertions (PrivacyDashboard has "Inference Engine", SettingsPanel does not) so the copy can't drift from the UI again. Both files parse as YAML (`js-yaml`, `backend` label read back verbatim). Build green, 1057 tests green. Chooser rendering itself stays unverifiable while the repo is private — re-check at R4 with the rest of F1. |
| 2026-07-12 | F1 — Feedback channel | #85 | Issue templates per the decided spec verbatim (`feedback.yml`, `bug.yml`, `config.yml` with mailto contact link) + calm footer affordance beside the privacy lock: "Share feedback" → `issues/new/choose` (new tab, noopener) · "email" → `mailto:`. Static links only, no query params, nothing prefilled — `FeedbackChannelGuards` (10 tests) pins hrefs, no-fetch, and the don't-paste-your-journal guard in both templates. Verified rendered footer + DOM hrefs on `vite preview` (screenshot). Template chooser rendering itself is only verifiable once the repo is public (F2/R4) — re-check then, incl. that GitHub accepts the `mailto:` contact link. 1336 tests green. |

## Blocked on Sharang

- **Sharing the link with testers** (after F2 + the release gate pass) — the
  loop prepares; Sharang sends.
