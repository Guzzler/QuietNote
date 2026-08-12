# Initiative: human-feedback

**Mission:** 5–10 real people use QuietNote and what they experience reaches
the loop as GitHub issues and `docs/field-notes/` entries — **user-initiated
only**. The standing local-only rule is unchanged: no telemetry, no automatic
collection, no network calls for feedback, and journal content is never
prefilled or attached to anything. Rules of engagement:
[`README.md`](README.md).

## Grounding (verified 2026-07-10 — planner: re-verify before editing)

- **A REAL HUMAN HAS USED QUIETNOTE (2026-08-11) — this initiative's mission
  statement is now partly satisfied and its blocking assumption is dead.**
  Sharang shared the app; the first tester (T1) used it on a phone at ~00:35 and
  sent back six items. **The whole of `Blocked on Sharang`'s "the only thing
  standing between a live app and its first human user" is therefore
  historical — the send happened.** The feedback is triaged, code-verified and
  de-identified in
  [`docs/field-notes/2026-08-11-first-tester.md`](../field-notes/2026-08-11-first-tester.md),
  which is the spec of record for F5–F8 below. **It did not arrive as a GitHub
  issue** — it came over a private message, which is the intake shape F3 has to
  actually support (see F3). Two structural findings from it, both load-bearing
  for the whole project:
  - The tester's main quality complaint ("it sounds like…") is a **shipped-model
    finding, not a copy finding** — the app runs stock Gemma, never the QLoRA
    (field note §C1). This corroborates `README.md:62-73` from the outside.
  - The tester's stated primary use case is CBT distortion work, and **they never
    found Thought Record** (field note §B1). Discoverability, not quality.
- **De-identification is a hard rule for this initiative now the repo is
  public.** Tester names and verbatim personal disclosures must never enter a
  tracked file, a PR body, or an ntfy body — paraphrase, per the convention
  `docs/field-notes/2026-06-09-real-user-data-plan.md:4` set for the old-app
  corpus. Refer to testers as T1, T2, …
- **~~Repo is PRIVATE until release day~~ — THE REPO IS PUBLIC AND THE APP IS
  LIVE (R4 fired 2026-08-07; re-verified from outside 2026-08-08, planner).**
  `gh repo view` returns `visibility: PUBLIC`, `licenseInfo: MIT`;
  `gh api repos/Guzzler/QuietNote/pages` returns
  `html_url: https://guzzler.github.io/QuietNote/`, `build_type: workflow`,
  `https_enforced: true`; an anonymous `GET` of that URL returns **200** with
  the correct `/QuietNote/` asset paths. **This initiative is no longer gated
  on anything but Sharang's decision to send the message.** The issue templates
  and the in-app `issues/new` link are live for outsiders; the `mailto:` link
  works as it always did. Owner email: sharangpaiusa@gmail.com.
- **The chooser check F1/F1a deferred to R4 is NOT machine-verifiable by the
  loop, and that is now a finding rather than a pending step (2026-08-08).**
  `https://github.com/Guzzler/QuietNote/issues/new/choose` returns **302 to the
  login page** for an anonymous request, and a token in an `Authorization`
  header does not authenticate GitHub's *web* UI either — it redirects the same
  way. So "do both templates render in the chooser, and does GitHub accept the
  `mailto:` contact link" can only be answered by a logged-in human. It is one
  click for Sharang and is filed under **Blocked on Sharang** as a micro-check,
  not queued. What the loop *can* assert is already asserted:
  `FeedbackChannelGuards.test.ts` parses both templates as YAML and pins the
  corrected F1a label, and `config.yml`'s contact link is a bare `mailto:` with
  no query string.
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
- **Download sizes (outline §2) — exact *as of 2026-07-23*, re-checked
  2026-08-05.** `MODEL_DOWNLOAD_SIZES` (`src/inference/types.ts:60-64`) is
  unchanged — webllm `~1.5 GB` / transformersjs `~3.2 GB` / mediapipe
  `~2.0 GB` — but **which one a first-time visitor pays moved** when R7 made
  MediaPipe the default. The three values were right and the *default* was
  the stale part, which is why the check passed in July and the copy still
  went wrong. Outline §2 rewritten by R8; the numbers themselves needed no
  correction.
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
| F2 | Soft-launch kit: tester one-pager + share message for Sharang | **DONE 2026-08-08 (PR #135)** — `docs/beta/WELCOME.md`, 79 lines, all six sections; README linked. Sharing remains Sharang's |
| F1b | Re-check the shipped feedback path from the live origin (the half of F1's "re-check at R4" the loop can actually do) | DONE (PR #139) |
| F3 | Field-notes intake convention + weekly issue→field-note triage | **ACTIVE 2026-08-11** — first feedback exists. Convention set by `2026-08-11-first-tester.md`: de-identified, code-triaged, sequencing at the end. Note the intake shape: feedback arrived by **private message**, not as an issue, so relaying it into `docs/field-notes/` is a Sharang-and-planner step, not an automated one |
| F4 | Feedback-driven iteration: human reports outrank queue items | **ACTIVE 2026-08-11** — F5–F8 below are the first exercise of it |
| F5 | Mobile session control: "New" is invisible on a phone **and** switching modes silently corrupts the session (**4** coupled bugs — a 4th found 2026-08-11 pm, and it writes fabricated data to IndexedDB) | **DONE 2026-08-11 (PR #140)** |
| F6 | Surface Thought Record at phone widths — highest-intent tester never saw the most differentiated mode | **DONE 2026-08-11 (PR #141)** |
| F7 | Time-of-day correctness: a 00:35 check-in asks how "today" went about a day that already ended | **DONE 2026-08-11 (PR #142)** — gate taken on invariance |
| F8 | Gratitude tone + CBT distortion-naming, batched into ONE gated PR | **BLOCKED** on the QLoRA-to-browser question (field note §C, Blocked on Sharang) — do not queue |

## Task queue

**Queue rebuilt 2026-08-11 (planner, interactive with Sharang) from the first
real tester's report.** Spec of record:
[`docs/field-notes/2026-08-11-first-tester.md`](../field-notes/2026-08-11-first-tester.md).
F4 is now live, so these three outrank every remaining queued item anywhere in
the initiatives except a safety-relevant report. **F8 is deliberately absent** —
it is blocked on the QLoRA-to-browser question and lives under *Blocked on
Sharang*; do not promote it into this queue without his answer.

- [x] 2026-08-11 · **F5 — Mode switching must start a new session (fixes 3
  coupled bugs + makes "New" discoverable).** DONE 2026-08-11 (PR #140 — see
  Ledger). Field note §A1+§A2. In
  `src/App.tsx`, change `onJournalingModeChange` (`:928`, currently just
  `setJournalingMode(mode)`) to start a fresh session when the current one
  already has content: `if (current) handleNewSession();` **before**
  `setJournalingMode(mode)`. `handleNewSession` (`:189`) already clears
  `current`/`currentId`/`selectedThread`/input/trim state, and the outgoing
  session is already persisted by the `useEffect` at `:267-269`, so nothing is
  lost — it stays in the Sessions list.
  **Decided design (planner, this run — do not re-litigate):** one rule, no
  modal. A mode is a distinct exercise, so switching always begins a new entry.
  This resolves all three defects at once: the new mode's prompt can no longer
  land on the old mode's transcript (`:581`), the persisted `mode` (`:356`) can
  no longer disagree with the active mode on reload (`:715`), and
  `deriveGuidedStep` can no longer inherit the old mode's user-message count and
  render the new guide as already "Complete" (`CheckInGuide.tsx:63`).
  **A FOURTH coupled defect, found by this run's grounding pass and worse than
  the other three — it writes fabricated data to storage.** `App.tsx:283-315`
  persists a structured `ThoughtRecord` whenever `journalingMode ===
  "thoughtrecord" && guidedStep > 5 && current`. Nothing in that effect checks
  which mode the messages were *written* in, and `guidedStep` counts user
  messages session-wide. So a user who writes 5+ turns in Free Write or Gratitude
  and then switches to Thought Record has a **fabricated thought record saved to
  IndexedDB immediately, before they type anything** — their gratitude answers
  filed as `situation`, `automaticThought`, `evidenceFor` and
  `alternativeThought`, with `parseEmotions` (`App.tsx:57`) reducing turn 3 to a
  keyword. It then appears in `ThoughtRecordHistory` as a real record. The other
  three defects are display/prompt-level and end when the session does; this one
  leaves permanent junk in the user's own data on a privacy-positioning app, and
  it is the strongest argument for the decided design below.
  **Grounding note for execute — no extra reset code is needed.** `guidedStep` is
  a `useMemo` over `current` (`App.tsx:280`), so `handleNewSession()` setting
  `current = null` drops it to 1 automatically and the save effect's `!current`
  guard short-circuits. Do not add a separate step-counter reset; there is no
  such state to reset (R9 removed it deliberately — see `guidedSession.ts`'s
  header comment).
  Add one
  quiet inline confirmation in the calm register (e.g. *"Started a new
  Check-in — your previous entry is saved in Sessions."*), styled like existing
  `text-xs text-slate-400/500` notices, **not** a dialog and not a toast that
  moves the writing surface.
  Also make "New" visible on a phone: `App.tsx:862`'s label is
  `hidden sm:inline`, so at ≤640px the header is four unlabelled icons. Keep the
  icon-only treatment if the row cannot fit four labels, but the New control must
  be distinguishable from the other three (it is the only indigo one today —
  verify that reads as a control, or give it an accessible visible affordance).
  **Do not** break `ChatPanel.tsx:409` (`onSuggestMode={onJournalingModeChange}`)
  — the empty-state mode suggestion routes through this same handler, and there
  `current` is null so behaviour must be unchanged.
  → **Verify:** `npm run build` + `npm run test` green; new tests that bite
  pre-change for all **four** defects (prompt/transcript pairing, reload-restored
  mode, guided step reset, **and no `saveThoughtRecord` call when the mode is
  switched to `thoughtrecord` on a session with ≥5 user messages written in
  another mode** — assert on the persistence call, not on the rendered guide).
  Drive the real app at **375px** via Playwright on
  `npx vite preview`: send one gratitude turn → switch to Check-in → confirm a
  fresh session, that the Check-in guide reads **step 1 of 3** and not
  "Complete", and that the old entry is in Sessions; reload and confirm the mode
  does not revert. Screenshots to `docs/screenshots/2026-08-11/` (mobile header
  + post-switch state). **Not gate-triggering** — no `src/prompts/`, no send-path
  message construction, no safety util.

- [x] 2026-08-11 · **F6 — Make Thought Record reachable on a phone.** DONE 2026-08-11
  (PR #141 — see Ledger). Field note
  §B1: the tester whose stated primary use case is CBT distortion work never saw
  the mode. Two independent causes, both verified this run — fix both.
  (a) `JournalingModeSelector.tsx` renders `inline-flex gap-0.5 overflow-x-auto
  max-w-full` with every button `whitespace-nowrap flex-shrink-0`, and "Thought
  Record" is the widest label **last of four**, inside `ChatPanel.tsx:565-569`'s
  `min-w-0 flex-1` beside `PromptSelector`. At ~375px the row overflows with no
  visible scroll affordance. Change the container to wrap (`flex-wrap`, keeping
  `gap-0.5` and the `role="radiogroup"`) so all four modes are always visible;
  if two rows look wrong in the calm register, an explicit scroll affordance is
  the fallback — but four-visible is the goal.
  (b) **The only in-app surface that ever names Thought Record is unreachable to
  a new user.** `ChatPanel.tsx:180` suggests it, but that line sits behind
  `moods.length >= 5` **and** ≥2 of the last 5 moods being
  anxious/frustrated/angry (`:169-181`), so a first-time user with no mood
  history can never see it. Additionally at T1's hour the `else` branch (`:162`)
  leaves `suggestion` **null**, so the empty state offered no mode at all. Widen
  discovery for the zero-data case — but **respect
  `WelcomeEmptyState.tsx:25-26`'s deliberate "at most one auxiliary element"
  rule and `pickAuxiliaryElement`**: route any new hint through the existing
  suggestion slot rather than adding a second element, or `VisualCalmGuards` /
  `WelcomeEmptyState` / `PersonalizedWelcome` tests will (correctly) fight it.
  → **Verify:** `npm run build` + `npm run test` green; a test that all four mode
  labels are reachable without horizontal scroll at 375px, and one that the
  zero-mood empty state can surface Thought Record. Playwright on
  `npx vite preview` at **375px and 390px**, fresh profile with **no mood data**:
  screenshot showing all four modes visible, and complete one Thought Record
  step-1 exchange entered from that surface. Screenshots to
  `docs/screenshots/2026-08-11/`. **Not gate-triggering** — UI only, no prompt
  text, no safety util.

- [x] 2026-08-11 · **F7 — A 00:35 check-in must not ask how "today" went.** DONE
  2026-08-11 (PR #142 — see Ledger).
  Field note §A3. `isMorning()` (`src/prompts/systemPrompts.ts:186`) is
  `hour >= 5 && hour < 12`, so every hour from 12:00 to 04:59 selects
  `CHECKIN_EVENING_INSTRUCTION`, whose step 1 is "How their day was overall" —
  which at 00:35 asks about a day that ended 35 minutes ago. **Second, separate
  defect found this run: the app carries two disagreeing clocks.**
  `ChatPanel.tsx:150-164` uses four bands (morning 5–12, afternoon 12–17,
  evening 17–21, else "Hello") while `isMorning()` uses two, so after midnight
  the greeting is correctly neutral while the system prompt is confidently
  "Evening". Unify on one time model — a single shared helper both call — per the
  **decided design below**, which this run wrote so F7 is a pure implementation
  task. Keep the existing 3-step shape and every safety carveout **verbatim**.

  **Decided (planner, 2026-08-11 pm — do not re-litigate):**
  1. **One shared helper, four bands.** New `src/utils/timeOfDay.ts` exporting
     `getTimeBand(now: Date = new Date()): "morning" | "afternoon" | "evening" |
     "night"` — morning 05:00–11:59, afternoon 12:00–16:59, evening 17:00–20:59,
     **night 21:00–04:59**. These are `ChatPanel.tsx:150-164`'s existing four
     bands, unchanged, so the greeting's behaviour is **byte-identical at every
     hour** after the refactor (verified this run: its `else` branch is exactly
     21:00–04:59 → "Hello"). The greeting keeps its current strings; only the
     source of the band moves.
  2. **A third check-in variant, `CHECKIN_NIGHT_INSTRUCTION`**, selected for the
     `night` band; `morning` → MORNING, `afternoon` **and** `evening` → EVENING
     (unchanged from today for those hours).
  3. **Build all three by composition, not by copy-paste.** The three constants
     differ only in the header line, the 3-step block and the closing pair;
     everything else — the medical rule, FIRST LINE RULE, UNINTELLIGIBLE INPUT
     RULE, END-OF-RESPONSE RULE, SAFETY CARVEOUT, Empathy/Continuity/Format — is
     duplicated verbatim today. Extract that shared body once and assemble the
     three variants from it. A third hand-copied ~2000-token block is the failure
     mode this avoids: it would be the fourth place a safety carveout has to be
     edited in lockstep. **Constraint:** MORNING and EVENING must come out
     **byte-identical to today's constants** — assert it with an equality test
     against a frozen snapshot, not by eye.
  4. **The night copy (decided text — the only new prose).** Header: `You are
     Quietnote in Late-night Check-in mode.` Steps:
     > Guide the user through a 3-step late-night reflection:
     > 1. How they're feeling right now
     > 2. What is still on their mind at this hour
     > 3. What would help them set it down for tonight

     Closing pair, replacing evening's "encourage self-compassion" / "Help them
     close their day with peace": *After each response, gently acknowledge what
     they shared and encourage self-compassion.* / *Be warm, brief (2-3
     sentences), and unhurried. Help them put the day down — but always end with
     a question.*
     **Why this wording:** it never asserts *which* day it is, which is the whole
     defect — "right now", "at this hour", "tonight" are all true at 00:35 and at
     23:00. It keeps evening's self-compassion beat (the small hours are not the
     moment to switch to morning's intention-setting), and it does not
     editorialise about being awake late — T1's "odd state" observation is a
     reason to avoid asserting a false frame, not a licence to comment on the
     user's sleep.
  → **Verify:** `npm run build` + `npm run test` green, with tests pinning the
  band boundaries (04:59 / 05:00 / 11:59 / 12:00 / 16:59 / 17:00 / 20:59 /
  21:00 / 00:35) against **injected** clocks, a test that the greeting and the
  system-prompt selection agree at all 24 hours, and the byte-identity assertion
  from (3).
  **GATE-TRIGGERING — `src/prompts/` is touched**, and that status does not
  change. **How the read may be taken, ruled this run:** the eval already pins
  `morning: false` at every generate site (`scripts/run-eval.ts:261, 395, 462,
  496`), so it always assembles CHECKIN_EVENING_INSTRUCTION and **never reaches
  the night variant**. If (3)'s byte-identity assertion holds, this PR provably
  cannot alter what the model is asked in the eval — which is exactly the
  **invariance** shape R15b established (`README.md:62-73`). So: land the
  byte-identity test first, then take the gate as a `--rescore` of the preserved
  3-seed corpora and show identical per-mode summaries at 11/22/33, saying in the
  PR body that invariance is what is being claimed. **If that assertion cannot be
  made to hold — if MORNING or EVENING moves by a single byte — the composition
  refactor has failed its own precondition and the item reverts to a fresh 3-seed
  generate read** (~2.75h). Conservative in the safe direction, per the replay
  rule: when in doubt, generate.
  **Correction to this item as first written (2026-08-11 am):** it said to "pin
  the check-in variant explicitly via `opts.morning` so the eval stays
  reproducible" — that is **already done** at all four sites, so there is nothing
  to add. The real risk runs the other way: a refactor that changes what
  `morning: false` *resolves to* (e.g. routing it through the new band enum and
  landing on `night`) would silently change what the gate measures on every
  future read. `morning: false` must keep meaning EVENING exactly; pin that with
  a test.
  **Sequencing note:** this is the *only* gated item of the three — if gate time
  is short in a run, ship F5 and F6 first; they are independent of it.

- [x] 2026-07-10 · **F1 — Feedback channel** (DONE 2026-07-12, PR #85 — see
  Ledger. The decided 2026-07-12 issue-template spec is pruned here on
  2026-07-23: it shipped verbatim, so `.github/ISSUE_TEMPLATE/feedback.yml`,
  `bug.yml`, `config.yml` and `FeedbackChannelGuards.test.ts` are now the
  spec of record — with the one correction filed as F1a below.)

- [x] 2026-07-23 · **F1a — Correct the engine-picker path in both issue
  templates** (DONE 2026-07-23, PR #109 — see Ledger. Chooser rendering
  stays unverifiable until the repo is public — re-check at R4 with the
  rest of F1.)
- [x] 2026-08-08 · **F2 — Soft-launch kit** (DONE 2026-08-08, PR #135 — see
  Ledger. All six sections shipped, sizes re-read off the code, README linked
  with the decided line. **R14 had not landed when this was written, so line 5's
  hedge was left alone as the item instructs** — R14 owns it and is the next PR
  this run. **Nothing was shared with anyone**: the share message is in the PR
  body and the ntfy, and sending it stays Sharang's.)
- [x] 2026-08-08 · **F2 — Soft-launch kit** (**ungated** — R4 fired 2026-08-07;
  `docs/beta/` does not exist yet, verified this run). Write
  `docs/beta/WELCOME.md` per the decided outline below — which is a spec, not a
  draft: follow its six sections in order, in its stated tone, under ~80 lines,
  no screenshots. Then link it from `README.md` in the "An honest note on what
  this is" area as one plain line (`If you're one of the first testers, start
  with [the welcome note](docs/beta/WELCOME.md).`). Put the decided share
  message below **verbatim** in the PR body and a pointer to it in the ntfy
  notification. **Sharing with testers is Sharang's action, never the loop's** —
  do not open a discussion, post anywhere, or email anyone.
  **Standing rule that has already bitten once:** re-read the three download
  sizes off `src/inference/types.ts` (`MODEL_DOWNLOAD_SIZES`) and the mode
  labels/order off `JournalingModeSelector.tsx` at write time rather than
  copying them from the outline. (Planner re-checked both this run: sizes are
  still `~1.5 GB` / `~3.2 GB` / `~2.0 GB` with **mediapipe the default**, so
  §2's numbers are correct as written — check anyway, cheaply.)
  → **Verify:** the file exists at `docs/beta/WELCOME.md` and covers all six
  sections; the live URL in it is `https://guzzler.github.io/QuietNote/` with
  **no "activating at release" hedge** (R14 removes the same hedge from the
  README — if R14 has not landed, say so in the PR rather than editing line 5
  twice); every number in it matches `src/inference/types.ts`; `npm run build`
  and `npm run test` green (docs-only, but the README link must not break any
  link test). **Not gate-triggering** — no `src/`, no prompts, no safety util.

- [x] 2026-08-08 · **F1b — Re-check the feedback path from the live origin.**
  F1 and F1a both deferred a "re-check at R4" that has now half arrived: the
  repo is public, so the in-app links resolve for a stranger for the first time.
  Do the half the loop can do, on **https://guzzler.github.io/QuietNote/**
  itself (not `vite preview` — the point is the deployed origin), Chromium via
  Playwright: confirm the footer renders all four `·`-separated links, that
  "Share feedback" href is `…/issues/new/choose` and "open source" is the repo
  root, and that **both now return a real GitHub page rather than a 404** when
  followed anonymously (the accepted dormancy R3b recorded has ended — check it
  actually ended). Record the `mailto:` href verbatim without opening it.
  → **Verify:** an **F1b result** note here with the four hrefs as read from the
  live DOM, the HTTP status of the two GitHub links followed logged-out, and one
  screenshot of the live footer into `docs/screenshots/<date>/`. **Measurement
  only — no `src/` diff.** If a link 404s or the chooser errors, file it as a
  proposed item; do not fix it in the same run. Note in the write-up that the
  chooser's *rendering* stays unverifiable logged-out (302 to login) — that
  piece is Sharang's one-click check, below.

**F1b's full result section and the F2 WELCOME.md outline are archived** (2026-08-11 pm)
— both describe finished work whose spec of record is now the shipped artifact, not this doc:
the outline is superseded by `docs/beta/WELCOME.md` itself, and F1b's four-href /
HTTP-status tables are reproduced in full in the snapshot. Verbatim in
[`archive/human-feedback-2026-08-11.md`](archive/human-feedback-2026-08-11.md)
(`grep -n "F1b result"`).
Two things were kept live out of that material because they still bind: the share message below
(unsent to testers 2-10) and its 2026-08-08 honesty correction.

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
> laptop, and the first visit downloads about 2 GB — one time, then it loads
> from your device with no download — so do it on Wi-Fi.
>
> Write about something real if you can, and go a few messages back and
> forth. Then tell me where it felt off. Rough edges are expected — that's
> the point of asking you.

**Copy correction 2026-08-08 (planner) — the share message promised the thing
R11 removed from the app.** As decided on 2026-07-23 it read "one time, then
it's instant". Three weeks later R11 (PR #130) ruled that exact word out of the
product: a load that takes 5.6–13.3 s warm and ~40–60 s from a cold browser
process is not instant, and the app's loading card now says "a few seconds, no
download" — with a test that fails if the banned word reappears anywhere under
`src/`. A tester-facing message that still promised instant would have been the
one piece of shipped copy contradicting the guarantee, and it would have been
the *first* thing every tester read. Rewritten above to make the claim that is
actually true and actually matters on cellular — **no download** — without
promising a speed. **This is the same standard R2a, R2b and R11 were held to,
applied to copy the loop writes for a human to send.** Standing consequence:
any future tester-facing copy inherits the `src/` honesty guards; the guards
are the spec, not just a test.

Notes for execute: the URL line stays exactly as-is (it's live by the time
this is sent — R4 precedes F2); do **not** add a deadline, a feedback form
link, or anything that reads like a survey invite — the in-app footer link
and `WELCOME.md` §6 carry the reporting path. Do not name the model or the
engine; testers don't need it, and §2 of WELCOME.md covers alternates.

**Queue status (2026-08-11, after the execute run): 0 open.** F5 (#140), F6
(#141) and F7 (#142) all shipped this run, in that order, each as its own PR
with build and tests green. F7's gate was taken on **invariance** exactly as the
item ruled — byte-identity held, so a `--rescore` at seeds 11/22/33 replaced a
~2.75 h generate read, and it reproduced the R15b baseline in every dimension at
all three seeds. **No pass is claimed against the floors**; that is still M16's
to answer. F8 stays out of the queue pending the QLoRA-to-browser answer, so this
initiative has no workable open item until Sharang answers it or a new field note
arrives. Three item premises turned out incomplete and were built honestly
smaller/wider rather than glossed — the END-OF-RESPONSE RULE differing between
MORNING and EVENING, the third clock (`currentTimeBucket`, left alone), and the
check-in *guide* needing to move with the prompt. All three are in the ledger
rows and in `docs/decisions.md`.

The three superseded queue-status blocks (2026-08-09, 2026-08-08, 2026-07-23)
are verbatim in
[`archive/human-feedback-2026-08-11.md`](archive/human-feedback-2026-08-11.md);
the two standing points they carried are already live elsewhere in this doc —
R15b's relevance to the send is in *Blocked on Sharang*, and the "preparing the
kit is not sending it" reading of the model-quality blocker is in the same place.

## Ledger

| date | item | PR | outcome |
|---|---|---|---|
| 2026-08-11 | F7 — time-of-day correctness (gate-triggering, taken on invariance) | #142 | `utils/timeOfDay.ts` gains `getTimeBand`/`bandForHour` (4 bands, night 21:00–04:59); the greeting and the check-in system prompt now read that one helper, and `CHECKIN_NIGHT_INSTRUCTION` ships with the decided copy verbatim. The three variants are **composed from one shared body** — and the item's premise was one block short: MORNING and EVENING also differ in their **END-OF-RESPONSE RULE** (evening carries the longer "strictest format rule" version). Recorded, not smoothed: night takes evening's. **Byte-identity holds** — MORNING and EVENING equal a frozen pre-refactor snapshot (`src/prompts/__tests__/checkinSnapshots.ts`), and `morning: false` still resolves to EVENING at every hour, both pinned by tests. Two things beyond the item, both inside the reported defect: the **guide** now reads the same clock (a night guide showing "How was your day?" beside the night prompt would have reproduced the defect on the more visible surface), and a **third clock was found and deliberately left alone** — `currentTimeBucket` runs evening to 22:00 and selects journal prompts, a different question; noted in the file. 25 new tests, build green, **2592** tests green. **GATE (invariance, per README:62-73 + the item's ruling):** `--rescore` of the preserved M11 corpora at seeds 11/22/33 with `--referral-reprompt`, per-mode summaries **identical in every dimension to the R15b baseline at all three seeds** (`docs/eval-runs/2026-08-11-f7-rescore-seed{11,22,33}`). Those absolute numbers are the M-series fine-tune candidate, not the shipped model, and they miss floors on their own — **no pass is claimed**, only invariance. Verified in the app at a pinned 00:xx clock: "Late-night Check-in · Step 1 of 3 · How are you feeling right now?", coherent reply, and 19:00 still gets "Evening Check-in · How was your day?". 0 console errors. |
| 2026-08-11 | F6 — Thought Record reachable on a phone | #141 | Both causes fixed. (a) The mode strip wraps instead of scrolling sideways, and on phones it takes the full row with the Prompt button below it — sharing one row left the strip ~200px, which wrapped four modes onto **three** lines; measured at 375px and 390px, all four labels on screen in two rows, `document.scrollWidth == innerWidth`. (b) `ChatPanel`'s inline welcome `useMemo` moved to `utils/welcomeSuggestion.ts`, and the two bands that returned **null for everyone** (afternoon, and 21:00–04:59 — T1's hour) now offer "Something on your mind? Try a thought record." Morning/evening check-in nudges and the mood override are unchanged, pinned by tests. It routes through the **existing** suggestion slot, so `pickAuxiliaryElement`'s one-auxiliary-element rule holds and continuity still wins. `PersonalizedWelcome.test.ts` had hand-copied the logic it was meant to guard — it now imports the real functions; a replica could not have caught this. 11 new tests, build green, **2567** tests green (+9 net). Playwright at 375/390px on `npx vite preview`, IndexedDB cleared to a true first-visit state and the clock pinned to 00:xx: suggestion → Thought Record **step 1 of 5** → one exchange → step 2. IndexedDB restored afterwards. 0 console errors. Not gate-triggering. |
| 2026-08-11 | F5 — Mode switching starts a new session (4 coupled bugs + "New" on a phone) | #140 | New `utils/modeSwitch.ts` holds both predicates; `App.tsx`'s `onJournalingModeChange` calls `handleNewSession()` before `setJournalingMode` when the current session has content, and the ThoughtRecord save effect now runs through `shouldPersistThoughtRecord` — which adds a second line of defence (a session explicitly written in another mode is never filed as a record; pre-R9 sessions with no `mode` keep their old behaviour). Quiet inline notice above the mode strip, no dialog, no toast. Header: `New` is labelled at every width in a mobile-only indigo pill, mobile padding tightened, and the "Private journaling companion" tagline hides below `sm` — it wrapped to three lines at 375px once New carried its label. `ChatPanel.tsx:onSuggestMode` unchanged (empty state, `current` null). 18 new tests, each of the four defects modelled against the pre-F5 handler so the bite is explicit; one R9 source guard re-pointed at `modeSwitch.ts` rather than deleted. Build green, **2558 tests** green (+18). Playwright at 375px on `npx vite preview`: gratitude turn → switch to Check-in → fresh session, **"Evening Check-in · Step 1 of 3"** not "Complete", notice shown, old entry in Sessions; wrote a Check-in turn, reloaded, reopened it — mode restored as **Check-in**. 0 console errors. Not gate-triggering. |
| 2026-08-10 | F1b — Re-check the feedback path from the live origin | #139 | **Measurement only, no `src/` diff.** The dormancy R3b/F1 accepted **has ended**: open-source link **200** logged-out (R14's description live in the `<title>`), Share feedback **302 → login → 200** (not a 404), `…/issues` and `…/tree/main/.github/ISSUE_TEMPLATE` both **200** anonymously. `mailto:` recorded verbatim, not opened. One correction: the footer has four `·`-separated *segments*, three of which are links — the item miscounted, nothing missing. Chooser *rendering* stays behind the 302 = Sharang's one click. Screenshot `docs/screenshots/2026-08-10/f1b-live-footer.png`. Full hrefs/status tables: [archive](archive/human-feedback-2026-08-11.md). |
| 2026-08-08 | F2 — Soft-launch kit | #135 | `docs/beta/WELCOME.md`, **79 lines**, all six sections in order; every number re-read off the code at write time (sizes `~1.5`/`~3.2`/`~2.0 GB`, default `mediapipe`, browser line matching `WebGPUFallback.tsx`, mode order matching `JournalingModeSelector.tsx`); live URL once, unhedged; README linked with the decided line. README line 5's hedge deliberately left to R14. Judgement call: §4 invites testers to report *false* crisis triggers (R15 was live). Build + 1256 tests green, docs-only. **Nothing sent anywhere.** One error corrected in a PR comment rather than silently: the body quoted the **superseded** share message ("one time, then it's instant", banned from `src/` by R11 #130) — the shipped file was never affected. Full text: [archive](archive/human-feedback-2026-08-11.md). |
| 2026-07-23 | F1a — Correct the engine-picker path in both issue templates | #109 | Both `backend` dropdown labels now read `Which AI engine were you using (Settings → Privacy & your data → Inference Engine)?` — the picker is the "Inference Engine" section in `PrivacyDashboard.tsx:320-341`, reached via Settings → "Privacy & your data"; `SettingsPanel.tsx` has no engine control at all. Templates only, no `src/` runtime change (not gate-triggering); every other field, the option list, and the don't-paste-your-journal guard untouched. `FeedbackChannelGuards.test.ts` gained a 4-test F1a block: both templates contain the corrected label and no longer contain `(Settings → engine)`, plus two UI-anchor assertions (PrivacyDashboard has "Inference Engine", SettingsPanel does not) so the copy can't drift from the UI again. Both files parse as YAML (`js-yaml`, `backend` label read back verbatim). Build green, 1057 tests green. Chooser rendering itself stays unverifiable while the repo is private — re-check at R4 with the rest of F1. |
| 2026-07-12 | F1 — Feedback channel | #85 | Issue templates per the decided spec verbatim (`feedback.yml`, `bug.yml`, `config.yml` with mailto contact link) + calm footer affordance beside the privacy lock: "Share feedback" → `issues/new/choose` (new tab, noopener) · "email" → `mailto:`. Static links only, no query params, nothing prefilled — `FeedbackChannelGuards` (10 tests) pins hrefs, no-fetch, and the don't-paste-your-journal guard in both templates. Verified rendered footer + DOM hrefs on `vite preview` (screenshot). Template chooser rendering itself is only verifiable once the repo is public (F2/R4) — re-check then, incl. that GitHub accepts the `mailto:` contact link. 1336 tests green. |

## Blocked on Sharang

- **Can the QLoRA actually reach the browser? (asked 2026-08-11 — now the single
  highest-value unknown in the project.)** Sharang has referred to "weird
  limitations" around converting the fine-tune to a LiteRT-web `.task`. The app
  ships stock Gemma on all three engines (`src/inference/index.ts:33/39/45`) and
  the first tester's main quality complaint is exactly the thing the QLoRA was
  trained to fix (field note §C1). This one fact sets the order of all gated
  work:
  - **If reachable:** F8 (gratitude tone + CBT distortion-naming) waits for the
    tuned model and tone becomes a *training* target, not a prompt target. M16
    stays first in `model-quality`.
  - **If structurally blocked:** prompt-only is the permanent shipped ceiling and
    **F8 is promoted to the top of this queue** — because then no amount of
    waiting fixes the banned opener, and the prompt is the only lever left.

  The loop must not guess this, and must not queue F8 either way until answered.
  Everything else in the queue (F5, F6, F7) is workable now and independent of it.

- **The one-click chooser check** — see the grounding note above; still one
  signed-in click, still not machine-verifiable by the loop.

- ~~**Sharing the link with testers**~~ — **DONE 2026-08-11. Sharang sent it and
  the first tester reported back**; the resulting queue is F5–F8 above. Kept for
  the record because the reasoning below shows what the decision cost and what it
  bought: it was sent with the 10-turn bar still unmet, and the tester's report
  vindicates that call — the six items are worth more than the wait would have
  been, and none of them is a safety incident. Historical text follows.

- *(historical)* **Sharing the link with testers** (after F2 + the release gate
  pass) — the loop prepares; Sharang sends. **~~Now the only thing standing
  between a live app and its first human user.~~** The kit is being written this cycle (F2); the
  message is decided and corrected, verbatim above. Two things to weigh when you
  decide: your own 2026-07-12 ruling gates this on the 10-turn quality bar,
  which is **still unmet**, and R10a measured the guided modes at **0 of 7**
  turns aligned — Free Write is the surface that has been walked repeatedly and
  is the one that holds up. Sending to 5–10 people who know it's rough is a
  legitimate reading of that; so is waiting for M4. The loop won't decide it.
  **Third input, added 2026-08-09:** the live app currently answers ordinary
  sentences containing the word *cutting* ("cutting back on coffee", "he was
  cutting everyone short") with the full 988 crisis wall — `public-release` R15,
  now ruled, with the fix queued as **R15b**. It is one list change plus a gate
  read, so it is days not weeks, and it is the single defect most likely to make
  a tester distrust the safety surface. Worth waiting for; still your call.
- **Fourth input, added 2026-08-10 — read this one before the other three.** The
  "release gate pass" that the kit and this initiative have been assuming as a
  precondition **does not exist and cannot currently be obtained**: every
  preserved eval corpus is the M-series fine-tune candidate, not the model the
  live app runs, and those corpora fail the floors on their own (details and the
  ruling in [`public-release.md`](public-release.md)). So the honest statement
  about the live build is *"it has been walked end-to-end by hand on the live URL
  and it works; it has never been scored"* — not *"it passed the gate"*. Nothing
  the loop has written to testers claims otherwise (checked this run:
  `docs/beta/WELCOME.md` and the decided share message make no gate or quality
  claim), and nothing may. `model-quality`'s **M16** is the read that would close
  it and is now first in that queue. This does not change whose decision the send
  is — it changes what you would be saying if you made it.
- **One-click check only you can do: does the issue-template chooser render?**
  Open https://github.com/Guzzler/QuietNote/issues/new/choose while logged in
  and confirm you see the two forms plus the "Prefer email?" contact link. The
  loop cannot see this page — logged-out it 302s to the login screen, and a
  token doesn't authenticate GitHub's web UI (verified 2026-08-08). This is the
  last unverified piece of F1/F1a. If a form is missing, GitHub rejected its
  YAML and it becomes a queue item.
