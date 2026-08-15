# Initiative: human-feedback

**Mission:** 5–10 real people use QuietNote and what they experience reaches
the loop as GitHub issues and `docs/field-notes/` entries — **user-initiated
only**. The standing local-only rule is unchanged: no telemetry, no automatic
collection, no network calls for feedback, and journal content is never
prefilled or attached to anything. Rules of engagement:
[`README.md`](README.md).

## Grounding (verified 2026-07-10 — planner: re-verify before editing)

- **T1's four fixable defects are fixed AND LIVE (verified 2026-08-12, planner —
  this is the grounding pass for this run).** Shipping to `main` is not shipping
  to the tester, so the deploy was checked end-to-end rather than assumed:
  `gh run list` shows the Pages deploy for PR #142 (`31556317142`) **completed
  success** at 02:15 UTC, and the live bundle served from
  `https://guzzler.github.io/QuietNote/assets/index-D1RerXfO.js` (500,199 bytes,
  fetched anonymously) contains all three fixes' fingerprint strings —
  `Late-night Check-in` ×2 and `still on your mind at this hour` (F7),
  `your previous entry is saved in Sessions` (F5), `Try a thought record` and
  `flex-wrap` (F6). **So a tester who opens the same link today gets the fixed
  app.** Two consequences: the follow-up message to T1 in *Blocked on Sharang* is
  factually safe to send, and **F9** exists to confirm this at the behaviour
  level rather than the bundle level.
- **The model is still cached in T1's browser.** `src/inference/index.ts` and
  `mediapipe-engine.ts` have not changed since R7 (PR #125), which predates T1's
  2026-08-11 visit, so the model URL a returning visitor resolves is the same one
  they already paid ~2 GB for. This is the one claim in the follow-up message that
  would be expensive to get wrong, so it was checked in git rather than assumed.
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
- ~~`docs/field-notes/` exists and the planner already reads it; there is no
  intake convention doc yet.~~ **Stale, corrected 2026-08-14: F3 shipped it**
  — [`docs/field-notes/README.md`](../field-notes/README.md) (PR #144, 73 lines)
  is the intake convention, and the initiatives README's *How the loop works*
  points at it.

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
| F3 | Field-notes intake convention + issue→field-note triage | **DONE 2026-08-12 (PR #144)** — `docs/field-notes/README.md`, 73 lines, all six elements, written from the 2026-08-11 note rather than from theory; linked from the initiatives README's *How the loop works* |
| F4 | Feedback-driven iteration: human reports outrank queue items | **ACTIVE 2026-08-11** — F5–F7 were the first exercise of it, and all three shipped within a day of the report |
| F5 | Mobile session control: "New" is invisible on a phone **and** switching modes silently corrupts the session (**4** coupled bugs — a 4th found 2026-08-11 pm, and it writes fabricated data to IndexedDB) | **DONE 2026-08-11 (PR #140)** — live-verified 2026-08-12 |
| F6 | Surface Thought Record at phone widths — highest-intent tester never saw the most differentiated mode | **DONE 2026-08-11 (PR #141)** — live-verified 2026-08-12 |
| F7 | Time-of-day correctness: a 00:35 check-in asks how "today" went about a day that already ended | **DONE 2026-08-11 (PR #142)** — gate taken on invariance; live-verified 2026-08-12 |
| F9 | Walk T1's exact path on the **live** origin at 375px / 00:35 and capture the after-state | **DONE 2026-08-12 (PR #145)** — all four steps PASS on the live origin, 0 console errors; F5/F6/F7 confirmed at the behaviour level, not just the bundle level |
| F8 | Gratitude tone + CBT distortion-naming + **thoughtrecord opener monotony** (third component added 2026-08-14), batched into ONE gated PR | **BLOCKED** on the QLoRA-to-browser question (field note §C, Blocked on Sharang) — do not queue |

## Task queue

**Queue rebuilt 2026-08-12 (planner) — 2 open: F3, then F9.** F5, F6 and F7 all
shipped and are **live** (verified this run, see Grounding). Neither open item is
gate-triggering and neither is invented: **F3 is this initiative's own ACTIVE
increment and has never been built**, and **F9 is the F1b shape applied to the
fixes a real tester asked for** — the same "re-check it from the live origin"
discipline, on the three PRs that answered their report. **F8 stays out of the
queue** pending the QLoRA-to-browser answer (*Blocked on Sharang*); do not
promote it without his answer.

<details><summary>Closed 2026-08-12 (F3 #144, F9 #145) — full item bodies and the F9 result block archived</summary>

- [x] 2026-08-12 · **F3 — write the field-note intake convention.** DONE (PR #144).
  `docs/field-notes/README.md`, 73 lines, all six required elements, written from what the
  2026-08-11 note *did* rather than from theory.
- [x] 2026-08-12 · **F9 — walk T1's exact path on the live origin at 375px / 00:35.** DONE
  (PR #145). **All four steps PASS, 0 console errors**; F5/F6/F7 confirmed at the behaviour level,
  and nothing behaved differently on the live origin than on `vite preview`. Screenshots:
  `docs/screenshots/2026-08-12/f9-0{1,2,3,4}`.
  - **One F9 observation is superseded and the correction matters** (planner, 2026-08-14): F9
    recorded that replies reach for *"sounds like"* only **mid-sentence**, which does not violate
    the FIRST LINE RULE. On M19's 10-turn arc data the rule is broken **outright, 6 of 30 times**
    — see the queue status above and `model-quality.md`'s *The FIRST LINE RULE on the shipped
    path*. F9's finding was correct for the two exchanges it drove; it is not the whole picture.

Full bodies and the F9 result tables in
[`archive/human-feedback-2026-08-14.md`](archive/human-feedback-2026-08-14.md).

</details>


**Closed item bodies (F1, F1a, F2, F1b, F5, F6, F7) are archived verbatim**
(2026-08-12) in
[`archive/human-feedback-2026-08-12.md`](archive/human-feedback-2026-08-12.md);
their spec of record is now the shipped artifact plus the Ledger row below. The
share message immediately after this line stayed live: it is **unsent to testers
2–10** and is still the copy Sharang would paste.

<details><summary>Superseded 2026-08-11 queue material (F5/F6/F7 specs, closed bodies, prior status block)</summary>

All in [`archive/human-feedback-2026-08-12.md`](archive/human-feedback-2026-08-12.md).
F1b's result tables and the F2 WELCOME.md outline are one archive earlier, in
[`archive/human-feedback-2026-08-11.md`](archive/human-feedback-2026-08-11.md).

</details>

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

**Queue status (2026-08-14, planner — current): still ZERO open, still nothing invented; but F8's
spec grew and its unblocking condition is now a dated measurement rather than an open question.**
Two changes this run, both upstream in `model-quality.md` and neither of them a queue item here:

1. **F8 is now three components, not two.** M19's read of the shipped path (PR #148) produced a
   third field-note-traceable register defect — a formulaic first-person opener on **all ten**
   thoughtrecord turns ("I understand… / I notice… / I see…"). Execute filed it as **P-M19b** and
   correctly did not queue it; the planner ruled it into **F8's batch** rather than giving it its
   own gated PR, per the README's batching rule (three prompt fixes must not become three 2.75 h
   gate reads). F8 = gratitude tone (§C1) + distortion-naming (§C2) + opener monotony (P-M19b).
2. **T1's tone complaint is now measured, not just corroborated — 6 of 30, and it is a rule
   violation rather than a taste question.** Counting literal sentence-initial matches across all
   30 committed M19 replies, **20 % open with a phrase `systemPrompts.ts:18-21` bans as the "FIRST
   LINE RULE — strictest rule, never break"** (*"It sounds like"* ×5, *"I hear that"* ×1), and
   *"it sounds like"* is the exact phrase T1 named. F9 had only ever found it **mid-sentence**,
   which does not violate the rule. Full table and the three consequences are in
   `model-quality.md`'s **The FIRST LINE RULE on the shipped path**. **This does not become a queue
   item** — it is prompt-touching, therefore gate-triggering, therefore F8's, which is blocked. It
   is recorded here and in the field note as evidence for whoever unblocks it.

**And the unblocking condition is now concrete: `model-quality`'s M5c is the last cheap probe of
the last of M5's three formats.** ONNX is upstream-deadlocked, MLC needs a new model definition
(M18, PR #147), and LiteRT converts but dies on `gpu_artisan` — M5c is the CPU-delegate probe of
that last door. It does not answer Sharang's question by itself (the "weird limitations" he
referred to are still his to explain), but **it is the measurement that makes the *If structurally
blocked* branch below actionable instead of hypothetical.**

**Superseded — queue status (2026-08-13, planner): ZERO open, and no work was invented to fill it.**
F3 (#144) and F9 (#145) both shipped, so **every item this initiative can act on without a human
is done.** What is left is exactly two things, both of them Sharang's and both already written
below: **F8** stays out of the queue pending the QLoRA-to-browser answer, and **testers 2–10** is
the binding constraint on the mission itself. Per the loop's own rule — queue empty and only
gated steps remaining means *say so*, not manufacture an F10 — this initiative is **idle by
design**, and `model-quality` (M17, then M5c) carries this run's queue. The one new fact that
touches this doc is upstream: M16's failing floors were re-read this run and every one of them is
a reply that **refuses and refers to a doctor**, tripped by a bare banned substring (see
`model-quality.md`'s **M16 ruling**). That does **not** license any tester-facing gate claim —
the verdict on the books is still FAIL, and the binding sentence below is unchanged.

**Superseded — queue status (2026-08-12, planner): 2 open, F3 then F9.** Everything
T1 reported that the loop could fix without a model answer is **fixed and
deployed** (Grounding, this doc). The queue that replaces it is deliberately
small and deliberately not new product work: F3 writes down the intake convention
this initiative has been running on informally since the first note, and F9 checks
the three fixes on the origin a tester opens rather than on `vite preview`. **F8
remains out of the queue** pending the QLoRA-to-browser answer, and **no pass
against the gate floors is claimed anywhere** — that is M16's to answer.

**What this initiative is actually waiting on is a second human.** T1 is one
datapoint; F3/F4 exist to turn a stream of them into queue items, and the loop
cannot generate that stream. The T1 follow-up message and the send to testers
2–10 are both in *Blocked on Sharang* below. Superseded queue-status blocks:
[2026-08-11](archive/human-feedback-2026-08-12.md),
[2026-08-09 and earlier](archive/human-feedback-2026-08-11.md).

## Ledger

| date | item | PR | outcome |
|---|---|---|---|
| 2026-08-12 | F9 — walk T1's path on the live origin | #145 | **Measurement only, no `src/` diff.** All four steps **PASS** on `https://guzzler.github.io/QuietNote/` at 375px with **0 console errors**, so F5/F6/F7 are now confirmed at the **behaviour** level and not just the bundle level the planner checked: the zero-mood empty state offers Thought Record in T1's own 21:00–04:59 band, `document.scrollWidth === innerWidth === 375` with all four mode labels on screen across 2 rows, **New** is labelled at phone width, the Gratitude→Check-in switch starts a fresh session with the quiet notice and a guide reading **Step 1 of 3** while the old entry survives in Sessions, and a literal pinned **00:35** renders **Late-night Check-in** ("How are you feeling right now?" → "What's still on your mind at this hour?"). **Nothing behaved differently on the live origin than on `vite preview`.** Method recorded rather than assumed: the walk ran at a real 22:48 — already inside the night band — and `Date` was shifted by a constant monotonic offset only for step 4; the ~2.0 GB model was already cached so no download was paid; only `quietnote-db` (1 loop-created session, no moods/records) and `localStorage` were cleared. One observation filed as evidence and deliberately **not** queued: replies still reach for "sounds like" **mid-sentence**, which does not violate the FIRST LINE RULE and belongs to the blocked C1/F8 model question. Screenshots: `docs/screenshots/2026-08-12/f9-0{1,2,3,4}`. Build + **2592** tests green. Not gate-triggering. |
| 2026-08-12 | F3 — field-note intake convention | #144 | `docs/field-notes/README.md` (73 lines) with all six required elements, and a pointer line added to the initiatives README's *How the loop works*. Written from what the 2026-08-11 note **did**, so every claim is traceable to it or to the initiatives README — **no new policy was invented**, and per the item's explicit prohibition there is no cadence promise, no triage SLA and no template for feedback nobody has sent. The intake shape leads because it is the part the loop got wrong for weeks: reports arrive as a private message relayed by Sharang, and an empty `gh issue list` is **not** evidence of silence. The triage-against-`src/` section is argued from the note's measured payoff (one "possibly unintended" report was four coupled defects, one of them writing a fabricated Thought Record to IndexedDB; one suggestion was a shipped-but-undiscoverable feature; one tone complaint was a shipped-model finding). Bucket **D** is documented as non-optional using §D1's precedent, where a tester's own reasoning was the argument against their own suggestion. Docs-only, no `src/` diff; build + **2592** tests green. Not gate-triggering. |
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

  **Update 2026-08-14 (planner) — the loop has now checked all three doors itself, so this question
  is narrower than when it was asked.** It was filed as one unknown; it has since resolved into
  three measurements plus one thing only you know:
  - **ONNX** — upstream deadlock, verified 2026-07-18: `gemma4` exists only in transformers 5.x
    while `optimum-onnx` pins `<4.58`. No version pair can export it.
  - **MLC / WebLLM** — **M18, PR #147, 2026-08-13.** `mlc_llm` has no `gemma4`; the fork is
    `gemma4_model.py` + `gemma4_loader.py`, a **new model definition** (per-layer input embeddings,
    20-of-35 shared-KV layers, double-wide MLP), not the prefix remap it was priced as. Days of
    TVM-Relax work plus a WebGPU build.
  - **LiteRT** — converts to a 5.07 GB `.litertlm` and dies on `gpu_artisan`. **`M5c` is the one
    remaining cheap probe** and it is queued.
  So the honest status is **"needs a fork or an upstream fix, on every path"** — not "impossible",
  and **not yet** the *structurally blocked* branch. **Nothing is promoted on this alone**, and the
  loop is still not guessing: if M5c comes back negative, all three doors are shut with the cheap
  options exhausted, and **the branch below fires on evidence rather than on assumption** — at which
  point promoting F8 becomes a decision worth your five minutes rather than a guess. Your "weird
  limitations" comment may still name something none of these three found, which is why this stays
  yours.

- **The one-click chooser check** — see the grounding note above; still one
  signed-in click, still not machine-verifiable by the loop.

- **Tell T1 their report landed — and ask for one second pass. (New 2026-08-12;
  this run's decided copy, unsent.)** Four of the six things T1 raised are fixed
  and **live** (verified this run: deploy `31556317142` succeeded and the shipped
  bundle carries all three fixes). A tester who reports six things and hears
  nothing back is a tester who does not report a seventh — and T1 is currently the
  entire human-feedback pipeline. Two things make a second pass unusually cheap
  for them: the model is **already cached in their browser** (`inference/index.ts`
  has not changed since R7, well before their visit, so the ~2 GB is not re-paid),
  and the one mode they said they most wanted — the CBT thought record — is the
  thing they never saw. **Sending is yours; the loop never sends.** Message,
  written to be pasted as-is (~120 words, no links besides the one they already
  have, no deadline, no survey framing, and — per the standing honesty rule that
  bound the F2 copy — **no speed promise and no quality claim**):

  > Quick follow-up: the things you flagged are fixed and already live at the
  > same link. Nothing to reinstall, and it won't re-download the AI — that part
  > is still cached on your phone.
  >
  > - There's a labelled **New** button on phones now, so you don't have to
  >   refresh to start again.
  > - Switching modes starts a **fresh entry** instead of continuing the old one.
  >   The previous one is saved under Sessions.
  > - **Thought Record** — the 5-step CBT one, evidence for and against, then a
  >   balanced reframe — is now visible on a phone. That's the closest thing to
  >   what you said you actually use it for, and it was there the whole time; you
  >   just couldn't see it.
  > - A late-night check-in no longer asks how "today" went.
  >
  > The tone thing you noticed is real and is a bigger fix — that one's a model
  > problem, not a wording problem, and I'm working on it.
  >
  > No rush at all. If you open it again, tell me where it still feels off.

  **Why each line is defensible, since tester-facing copy inherits the `src/`
  honesty guards:** "already live" is the verified deploy; "won't re-download the
  AI" is true because the model URL is unchanged; the Thought Record description
  matches `THOUGHT_RECORD_INSTRUCTION`'s actual 5 steps; and the tone sentence
  states the §C1 finding plainly rather than promising a date. **Do not** add the
  eval numbers, name the model, or say anything about gate floors — nothing about
  the live build has ever been scored (see below).

- ~~**Sharing the link with testers**~~ — **DONE 2026-08-11.** Sharang sent it,
  T1 reported back, and the resulting work (F5–F7) has shipped. The decision cost
  and what it bought, the R15/R15b input, and the "the gate pass does not exist"
  ruling are verbatim in
  [`archive/human-feedback-2026-08-12.md`](archive/human-feedback-2026-08-12.md).
  **The one point from it that is still live and still binding:** the honest
  statement about the shipped build is *"walked end-to-end by hand on the live URL
  and it works; it has never been scored"* — **not** *"it passed the gate"*.
  `model-quality`'s **M16** is the read that would change that, and nothing the
  loop writes for a tester may claim otherwise in the meantime.

- **Testers 2–10 — still unsent, and now the binding constraint on this
  initiative.** The mission is 5–10 people; one has used it. The share message
  above the queue is unchanged and still ready to paste. Nothing in the loop's
  queue substitutes for this, and the loop will not invent work to fill the gap
  it leaves.

- **One-click check only you can do: does the issue-template chooser render?**
  Open https://github.com/Guzzler/QuietNote/issues/new/choose while logged in
  and confirm you see the two forms plus the "Prefer email?" contact link. The
  loop cannot see this page — logged-out it 302s to the login screen, and a
  token doesn't authenticate GitHub's web UI (verified 2026-08-08). This is the
  last unverified piece of F1/F1a. If a form is missing, GitHub rejected its
  YAML and it becomes a queue item.
