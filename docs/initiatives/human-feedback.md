# Initiative: human-feedback

**Mission:** 5–10 real people use QuietNote and what they experience reaches
the loop as GitHub issues and `docs/field-notes/` entries — **user-initiated
only**. The standing local-only rule is unchanged: no telemetry, no automatic
collection, no network calls for feedback, and journal content is never
prefilled or attached to anything. Rules of engagement:
[`README.md`](README.md).

## Grounding (verified 2026-07-10 — planner: re-verify before editing)

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
| F1b | Re-check the shipped feedback path from the live origin (the half of F1's "re-check at R4" the loop can actually do) | queued 2026-08-08 |
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

### F1b result (execute, 2026-08-10) — **the dormancy has ended; one count in the item was wrong**

Read from the live DOM at **https://guzzler.github.io/QuietNote/** (Chromium via
Playwright, not `vite preview`), production build, 0 console errors (the same 2
benign warnings as every prior walk: Chromium `powerPreference`, WGSL
subgroups).

**Footer, verbatim `innerText`:**

```
Quietnote — your journal entries stay on this device · Share feedback · email · open source
```

**Correction to the item's premise, small but worth being exact about:** the
footer has **four `·`-separated segments, three of which are links** — the first
segment is the plain "your journal entries stay on this device" text. There is
no fourth link and there never was; R3b added the third. "All four
`·`-separated links" was a miscount in the item, not a missing link on the page.

**The three hrefs, as read from the live DOM:**

| text | href | target / rel |
|---|---|---|
| Share feedback | `https://github.com/Guzzler/QuietNote/issues/new/choose` | `_blank` / `noopener noreferrer` |
| email | `mailto:sharangpaiusa@gmail.com` | none / none |
| open source | `https://github.com/Guzzler/QuietNote` | `_blank` / `noopener noreferrer` |

The `mailto:` is recorded verbatim above and was **not opened**, as the item
required.

**HTTP status of the two GitHub links, followed logged-out** (anonymous `curl`,
no credentials, browser UA):

| link | no-follow | followed | result |
|---|---|---|---|
| `…/QuietNote` (open source) | **200** | 200, 0 redirects | Real repo page. `<title>` reads `GitHub - Guzzler/QuietNote: A private AI journal that runs entirely in your browser…` — i.e. R14's description is live and visible to a stranger. |
| `…/issues/new/choose` (Share feedback) | **302** | 200 at `github.com/login?return_to=…/issues/new/choose` | Redirect to login, **not a 404** — GitHub requires an account to open an issue, and it round-trips the tester back to the chooser after sign-in. |

**So the accepted dormancy R3b and F1 recorded has genuinely ended**: neither
link 404s any more. Two supporting reads, taken because "not a 404" is a weak
claim on its own — `…/QuietNote/issues` returns **200** logged-out (a stranger
can read the issue list without an account) and
`…/tree/main/.github/ISSUE_TEMPLATE` returns **200**, so F1/F1a's three template
files are publicly present at the path the chooser reads.

**Still unverifiable by the loop, as the item predicted:** the chooser's
*rendering* — whether the two templates plus `config.yml` present correctly, and
whether F1a's corrected engine-picker path reads right — is behind the 302. That
is Sharang's one-click check while signed in; it is the only piece of F1/F1a
left open.

**Nothing was filed as a defect** — no link 404s, no error surfaced. **No `src/`
diff.** Screenshot: `docs/screenshots/2026-08-10/f1b-live-footer.png`.

**Decided (2026-07-14) — F2 WELCOME.md outline (execute: follow this
structure; sizes/requirements are the measured values, re-check against the
live URL at R4):**

1. **Hi — thanks for trying QuietNote** (2–3 sentences): a private AI
   journaling companion that runs entirely in your browser — the AI model
   downloads to your device and your writing never leaves it. You're one of
   the first ~10 people to use it; rough edges expected.
2. **What you need** (numbers refreshed 2026-08-05 by public-release R8, after
   the default engine flipped to MediaPipe / Gemma 4 E2B in R7):
   Chrome or Edge 113+ (or Chrome for Android 121+) with
   WebGPU; **~2.0 GB** one-time model download on first visit (Wi-Fi
   recommended; the two alternate engines under **Settings → Privacy & your
   data → Inference Engine** are **~1.5 GB** (WebLLM / Gemma 2 2B) and
   **~3.2 GB** (Transformers.js / Gemma 4 E2B) — path corrected 2026-07-23);
   a few GB free disk.
   Live URL: https://guzzler.github.io/QuietNote/ (insert at R4).
   **Standing rule for whoever writes `WELCOME.md`:** re-read these three
   numbers off `src/inference/types.ts` (`MODEL_DOWNLOAD_SIZES`) at the time
   F2 is written rather than copying them from here — this outline has now
   gone stale once, when the default moved underneath it.
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

**Queue status (2026-08-09, planner — current): 1 open — F1b.** F2 shipped
(#135), so the kit exists and the only thing left in this initiative that the
loop can do is F1b's measurement of the live feedback path. **One thing changed
about the send that Sharang should know before he sends anything**, and it is
recorded here rather than only in `public-release`: R15 — the live app fires the
988 crisis intervention on the word *cutting* in ordinary sentences like
"cutting back on coffee" — is now ruled and queued as **R15b**. That is the one
open defect most likely to be met by a stranger writing honestly, and it is
worth landing before the message goes out. Added to **Blocked on Sharang** as a
consideration, not as a new gate: the decision to send was already his, and this
is one more input to it.

**Queue status (2026-08-08, planner): 2 open — F2 and F1b, and this initiative
is now the pacing one.** R4 fired on 08-07, which removes the only gate F2 ever
had. `public-release` has exactly one open item (R13a, measurement, blocks
nobody), so the loop's centre of gravity moves here: the app is live and **zero
humans have used it**, which is the condition PHASE.md set `RELEASE` to fix.
**On the model-quality blocker, read precisely:** Sharang's 2026-07-12 ruling
gates *the soft launch* — i.e. sending the message — on the 10-turn quality bar,
and that bar is still unmet. It does not gate *preparing the kit*, and F2 has
always ended at "hand it to Sharang". Writing `WELCOME.md` publishes nothing and
shares nothing with nobody. What ships is a file in a repo that is already
public. Sending stays his call, in **Blocked on Sharang**, exactly as before.

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
| 2026-08-10 | F1b — Re-check the feedback path from the live origin | #139 | **Measurement only — no `src/` diff, nothing fixed, nothing filed as a defect.** Read on **https://guzzler.github.io/QuietNote/** itself (Chromium via Playwright, not `vite preview`), 0 console errors. **The dormancy R3b and F1 accepted has ended:** `open source` → `https://github.com/Guzzler/QuietNote` is **200** logged-out and its `<title>` carries R14's live description, and `Share feedback` → `…/issues/new/choose` is **302 → login → 200**, i.e. a sign-in redirect that round-trips back to the chooser, **not a 404**. Two supporting reads: `…/issues` is **200** anonymously and `…/tree/main/.github/ISSUE_TEMPLATE` is **200**, so F1/F1a's template files are publicly present at the path the chooser reads. `mailto:sharangpaiusa@gmail.com` recorded verbatim and **not opened**. **One correction to the item's own premise:** it asks to confirm "all four `·`-separated links" — the footer has **four `·`-separated segments, three of which are links**; the first is the plain "your journal entries stay on this device" text. Nothing is missing; the item miscounted. **Still open and still Sharang's:** the chooser's *rendering* sits behind the 302, so whether the two templates and `config.yml` present correctly (and whether F1a's corrected engine-picker path reads right) is a one-click check while signed in — the only piece of F1/F1a left. Full hrefs, statuses and the footer `innerText` are in the F1b result section above. Screenshot: `docs/screenshots/2026-08-10/f1b-live-footer.png`. **Not gate-triggering.** |
| 2026-08-08 | F2 — Soft-launch kit | #135 | `docs/beta/WELCOME.md` written to the decided outline as a spec: all six sections in order (welcome / what you need / what to try / honest limits / your data / telling me what happened), **79 lines**, warm-and-plain tone, no screenshots, no deadline and no survey-flavoured language. **Every number re-read off the code at write time per the standing rule, not copied from the outline:** `MODEL_DOWNLOAD_SIZES` (`src/inference/types.ts:60-64`) is `~1.5 GB` / `~3.2 GB` / `~2.0 GB` and `createEngine`'s default parameter (`src/inference/index.ts:12`) is `"mediapipe"`, so the headline "about 2.0 GB" is right; the browser line ("Chrome or Edge 113+, Chrome for Android 121+, Firefox/Safari not yet") matches `WebGPUFallback.tsx:45-54` verbatim in substance; the four mode labels and their order match `JournalingModeSelector.tsx`. The live URL appears once, unhedged, as `https://guzzler.github.io/QuietNote/`. README linked with the decided line — `If you're one of the first testers, start with [the welcome note](docs/beta/WELCOME.md).` — placed in the "An honest note on what this is" section. **README line 5's "activating at release" hedge was deliberately left alone:** public-release R14 owns that line and had not landed when this was written, and the item says to say so rather than edit line 5 twice. One judgement call recorded: §4 "Honest limits" adds a sentence inviting testers to report *false* crisis triggers, because R14 (crisis false positive, this run's R13a walk) means a tester can meet one on ordinary text — it is honest about a known live defect, and it costs nothing if the defect is fixed. Build green, 1256 tests green. Docs-only, not gate-triggering. **Nothing was sent anywhere** — sharing is Sharang's action. **One error in this PR, corrected in a comment on it rather than silently:** the body quoted the **superseded** share message ("one time, then it's instant"), because #135 was authored against a `main` that predated the planner's commit `aa8d21c`, which had rewritten exactly that sentence out — it is the promise R11 (#130) banned from `src/`. `#135`'s comment carries the current decided message verbatim and says plainly not to send the one in the body. The shipped `WELCOME.md` was never affected: it was written against the code, and its §2 already reads "no download again, though a fresh browser session still takes a few seconds to load it". |
| 2026-07-23 | F1a — Correct the engine-picker path in both issue templates | #109 | Both `backend` dropdown labels now read `Which AI engine were you using (Settings → Privacy & your data → Inference Engine)?` — the picker is the "Inference Engine" section in `PrivacyDashboard.tsx:320-341`, reached via Settings → "Privacy & your data"; `SettingsPanel.tsx` has no engine control at all. Templates only, no `src/` runtime change (not gate-triggering); every other field, the option list, and the don't-paste-your-journal guard untouched. `FeedbackChannelGuards.test.ts` gained a 4-test F1a block: both templates contain the corrected label and no longer contain `(Settings → engine)`, plus two UI-anchor assertions (PrivacyDashboard has "Inference Engine", SettingsPanel does not) so the copy can't drift from the UI again. Both files parse as YAML (`js-yaml`, `backend` label read back verbatim). Build green, 1057 tests green. Chooser rendering itself stays unverifiable while the repo is private — re-check at R4 with the rest of F1. |
| 2026-07-12 | F1 — Feedback channel | #85 | Issue templates per the decided spec verbatim (`feedback.yml`, `bug.yml`, `config.yml` with mailto contact link) + calm footer affordance beside the privacy lock: "Share feedback" → `issues/new/choose` (new tab, noopener) · "email" → `mailto:`. Static links only, no query params, nothing prefilled — `FeedbackChannelGuards` (10 tests) pins hrefs, no-fetch, and the don't-paste-your-journal guard in both templates. Verified rendered footer + DOM hrefs on `vite preview` (screenshot). Template chooser rendering itself is only verifiable once the repo is public (F2/R4) — re-check then, incl. that GitHub accepts the `mailto:` contact link. 1336 tests green. |

## Blocked on Sharang

- **Sharing the link with testers** (after F2 + the release gate pass) — the
  loop prepares; Sharang sends. **Now the only thing standing between a live app
  and its first human user.** The kit is being written this cycle (F2); the
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
