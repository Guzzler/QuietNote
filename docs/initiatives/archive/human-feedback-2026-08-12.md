# Snapshot — `human-feedback.md`, pruned 2026-08-12

**History, not a source of truth.** See [`README.md`](README.md) for the one rule. This file
holds material removed from the live doc on 2026-08-12, verbatim, at the moment it was removed.

What moved here, and why each piece was safe to move:

- **The full queue-item bodies of F5, F6 and F7** — all three shipped on 2026-08-11 (PRs #140,
  #141, #142) and were verified live on https://guzzler.github.io/QuietNote/ on 2026-08-12. A
  shipped item's spec of record is the code plus its ledger row; these ~180 lines were the
  instructions execute has already followed.
- **The closed bodies of F1, F1a, F2 and F1b**, whose specs of record are likewise the shipped
  artifacts (`.github/ISSUE_TEMPLATE/*.yml`, `docs/beta/WELCOME.md`, the F1b ledger row).
- **The two resolved/historical *Blocked on Sharang* entries about sharing the link** — the send
  happened on 2026-08-11 and the first tester reported back. The live doc keeps a one-line
  pointer. Every *unresolved* Blocked-on-Sharang entry stayed in the live doc, per the
  never-pruned list.
- **The 2026-08-11 queue-status block**, superseded by the 2026-08-12 one.

Nothing open was moved here.

---

## Task queue — F5/F6/F7 item bodies (verbatim as of 2026-08-11 pm)

**Queue rebuilt 2026-08-11 (planner, interactive with Sharang) from the first
real tester's report.** Spec of record:
[`docs/field-notes/2026-08-11-first-tester.md`](../../field-notes/2026-08-11-first-tester.md).
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

## Task queue — F1 / F1a / F2 / F1b closed bodies (verbatim)

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

## Queue status block, 2026-08-11 (superseded by the 2026-08-12 block)

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

## Blocked on Sharang — the two resolved/historical "sharing the link" entries (verbatim)

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
  ruling in [`public-release.md`](../public-release.md)). So the honest statement
  about the live build is *"it has been walked end-to-end by hand on the live URL
  and it works; it has never been scored"* — not *"it passed the gate"*. Nothing
  the loop has written to testers claims otherwise (checked this run:
  `docs/beta/WELCOME.md` and the decided share message make no gate or quality
  claim), and nothing may. `model-quality`'s **M16** is the read that would close
  it and is now first in that queue. This does not change whose decision the send
  is — it changes what you would be saying if you made it.
