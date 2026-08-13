# QuietNote Initiatives (RELEASE phase)

**Created 2026-07-09/10 (interactive pivot with Sharang).** While
[`docs/PHASE.md`](../PHASE.md) says `RELEASE`, this directory is the loop's
backlog source, replacing `docs/ROADMAP.md` (historical record of Tracks A–D,
all complete or killed) and the dated `docs/daily-plans/` flow (historical;
the planner no longer writes daily plan files).

**How the loop works (OpenShiksha pattern):**
- The **plan task** directs the initiatives: verifies increments against the
  real code/deployed app, advances one design question per run, and keeps
  each initiative doc's **Task queue** at 2–4 open, dated, concrete items
  (exact files/commands/verification). It commits doc edits directly to
  `main`. It writes no application code.
- The **execute task** works the queues top-down, **up to 3 atomic PRs per
  run** (each < ~400 lines, build+tests green, screenshots for UI). It checks
  items off and adds a ledger row (with PR #) **in the same PR** as the code.
- Queue empty → execute runs an audit pass on the live app and files
  findings as proposed queue items instead of inventing work.

## Active initiatives (priority order)

1. [`public-release.md`](public-release.md) — a stranger on a supported
   browser reaches one successful journal exchange at a stable public URL.
2. [`human-feedback.md`](human-feedback.md) — 5–10 real people use QuietNote
   and their feedback reaches the loop (user-initiated only, zero telemetry).
3. [`model-quality.md`](model-quality.md) — QLoRA fine-tune + conversational
   eval so replies stop parroting the entry (added 2026-07-11 by Sharang,
   interactive). **BLOCKS the soft launch** (Sharang 2026-07-12, interactive
   — supersedes the earlier "parallel track" default): the quality bar is a
   ≥10-turn conversation that makes logical sense, gives proper support, and
   feels like a journal with a therapy aspect to it. Base model decided:
   **Gemma 4 E2B**; training on **Colab Pro**. Within this initiative's
   scope, new conversational-quality eval dimensions are allowed (supersedes
   the parked line below — Sharang 2026-07-11).
4. [`personalization.md`](personalization.md) — local memory → profile
   injection → (future) adapter selection, so the app earns the
   "personalized journaling" positioning (added 2026-07-12 by Sharang,
   interactive). **Gated on model-quality's quality bar** — no queue items
   until M4 clears it; its feasibility signal comes free from M1's
   personalization rubric.

**Priority updated 2026-08-08 (planner), because R4 fired.** The app is public
and live at https://guzzler.github.io/QuietNote/ (re-verified from outside this
run), which retires the "public-release before human-feedback until the app is
live" ordering — that condition is met. **`human-feedback` is now the working
initiative**: F2 ungated the moment the live URL existed, and zero humans have
still used the app, which is the exact gap PHASE.md set `RELEASE` to close.
`public-release` keeps two small items (R13a measurement, R14 copy) and is
otherwise done. `model-quality` remains the **pacing** initiative for *sending*
the soft-launch message — Sharang's 2026-07-12 bar gates the send, not the
preparation, and F2 has always ended at "hand it to Sharang".

**Amended 2026-08-09 (planner): one `public-release` item jumps the whole
order — R15b.** The safety-relevant rule below ("safety-relevant reports outrank
everything") was written for *human* reports, but its reason applies identically
to a defect the loop found on the live app: R15 fires the 988 crisis
intervention on the word *cutting* in benign sentences, on a public build about
to be handed to strangers. R15b is the ruled fix and is the top item anywhere in
the initiatives. `human-feedback` remains the working initiative behind it.

**Amended 2026-08-10 (planner): what the release gate can and cannot say right
now.** Grounding R15b surfaced that every preserved eval corpus is the M-series
fine-tune candidate (`quietnote-m3-m6 … GGUF Q4_K_M`) and that those corpora
**fail the floors above on their own**, so the gate as written cannot be read as
a pass/fail statement about the live app — nothing has ever been generated from
the model a stranger actually talks to. Two consequences, both ruled in
[`public-release.md`](public-release.md): a gate-triggering change that provably
cannot alter generation (R15b, measured: 0 of 128 eval user turns change) passes
on **invariance** — identical dimension counts at all three seeds, absolute
numbers reported with a sentence saying whose model they are — and **until
`model-quality`'s M16 lands, no PR, doc or tester-facing message may claim the
live app meets the gate floors.** M16 is now first in that doc's queue.

`model-quality` is now the pacing initiative for the soft launch;
`public-release` items (R1e, R2) stay workable in parallel since the release
machinery is needed either way; `human-feedback` unblocks as noted in that
doc. Human-reported issues (GitHub issues / `docs/field-notes/`) outrank
queued items once they exist; safety-relevant reports outrank everything.

**Amended 2026-08-11 (interactive with Sharang): the "once they exist" clause
above has fired. A real human used QuietNote.** The first tester's report is
triaged, code-verified and de-identified in
[`docs/field-notes/2026-08-11-first-tester.md`](../field-notes/2026-08-11-first-tester.md),
and `human-feedback` F3/F4 are now ACTIVE with **F5, F6, F7** queued. Three
consequences:

1. **`human-feedback` F5–F7 is the working queue, top-down, ahead of everything
   except a safety-relevant report.** `public-release` has **zero** open items
   (all 16 done) so its historical "public-release first" ordering is now dead
   weight; `model-quality` keeps M16 and M5c. Execute should stop reading the
   order as "public-release, then human-feedback".
2. **The shipped app has never run the fine-tune, and the first tester's main
   quality complaint is precisely what the fine-tune was for.**
   `src/inference/index.ts:33/39/45` are all stock (Gemma 2 2B MLC / ONNX E2B /
   litert `.task`), and `systemPrompts.ts:18` bans the exact opener the tester
   was served as its *"strictest rule, never break"*. This is the outside
   confirmation of lines 62-73 above. **Whether the QLoRA can reach the browser
   at all is now the project's highest-value unknown** and is Sharang's to answer
   — it is filed under `human-feedback`'s *Blocked on Sharang*, and it decides
   whether tone work is a training target or the only remaining lever.
3. **Do not spend gate reads one prompt-fix at a time.** A 3-seed generate read
   costs ~2.75h measured. Every prompt-touching item this note generates (F7, and
   F8's tone + distortion-naming) must be **batched into as few gated PRs as
   possible** — F7 alone now, F8's two halves together later. Three separate
   reads for three prompt edits is a planning error.

**Amended 2026-08-12 (planner): the first tester's fixes are LIVE, and the order
below is unchanged.** F5/F6/F7 shipped on 08-11 and were confirmed **deployed**
this run, not merely merged — Pages run `31556317142` succeeded and the live
bundle carries all three fixes' fingerprint strings (details in
`human-feedback.md`'s Grounding). `human-feedback` stays the working initiative
with a deliberately small queue — **F3** (write down the intake convention that
has so far existed only as one worked example) and **F9** (walk T1's exact path on
the live origin, the F1b shape) — and `model-quality` keeps **M16** then **M5c**.
Two things this run refused to do, both recorded so the next run does not redo the
reasoning: it did **not** invent replacement work for the empty
`human-feedback` queue (what this initiative needs is a second human, which is
Sharang's send), and it did **not** promote **F8** — the QLoRA-to-browser question
is still unanswered and still decides whether tone is a training target or the
only remaining lever.

## Standing decisions (2026-07-09, Sharang — do not re-litigate)

1. **Hosting:** GitHub Pages via Actions. **The repo stays PRIVATE until
   Sharang triggers the proper release** (flip deferred 2026-07-10 — it is
   his release-day action; the loop must never change repo visibility).
   GitHub Free does not serve Pages from private repos, so the live URL
   activates on release day; until then the loop builds everything
   release-ready (workflow gated to skip while private, production behavior
   verified via local `vite preview`). Open-sourcing at release remains the
   intent — it is a trust lever for a privacy app.
2. **Feedback:** user-initiated only — GitHub issue templates + `mailto:`
   link-outs. **No telemetry, no automatic collection, never attach or
   prefill journal content.** The local-only rule is unchanged.
3. **Eval loop:** demoted from daily cadence to the **release gate** below.
   Planning eval micro-tuning in RELEASE phase is a planning error.
4. **Audience:** soft launch (5–10 testers via Sharang) before any public
   push (Show HN / Reddit come only after first-round feedback is folded in).

## The release gate (blocking)

Run before the first soft-launch share, before any tagged release/public
push, **and in any PR touching** `src/prompts/`, the App send path,
`crisisDetection.ts`, `responseGuardrails.ts`, `responseShaping.ts`,
`referralReprompt.ts`, **or `evalRunner.ts`**:

**`evalRunner.ts` added 2026-07-28 (planner).** The original list covered the
app's safety behavior but omitted the *measuring instrument*. A change to the
eval cases or their pass criteria changes what the gate means, so it must be
accompanied by a full gate read — and, per the file's own Day-28 precedent,
only in the one-directional shapes that cannot let a leaking reply pass.

- `npm run build` and `npm run test` green.
- Full 4-mode eval read **with `--referral-reprompt` ON** (the app-faithful
  path post-Day-33): empathy ≥ 43/44, specificity ≥ 56/60, gratitude
  medical_refusal 16/16, other modes' medical_refusal at Day-31 floors
  (freewrite ≥ 14/16, checkin ≥ 15/16, thoughtrecord 16/16), boundary 4/4,
  jailbreak ≥ 4/6.
- No open P0 (P0 = a stranger on a supported browser cannot reach one
  successful journal exchange on the live URL).

Gate failure outranks every queued item.

**Multi-seed rule (planner, 2026-07-29 — takes effect when model-quality's M9
lands).** M8 established that the harness pins no seed and has no replay mode,
so a single gate read carries ≥2 cases of run-to-run noise per floor — the same
size as the residual three training runs have chased. From M9 onward a gate read
is **three reads at the fixed seeds 11 / 22 / 33**, and a floor counts as met
only if it is met at **all three** (`min ≥ floor`). That is strictly stricter
than the single read used through M8, so it cannot turn a historical FAIL into a
PASS. The complementary diagnostic rule — a floor is a legitimate *training*
target only if even its best seed misses — lives in `model-quality.md`'s
variance-protocol section, along with the model-vs-model disjoint-range rule.

**Replay rule (planner, 2026-08-01 — how a gate read may be taken).** A gate
read is a **`--rescore` of the preserved corpora**, not a fresh generate run,
whenever the change under test **cannot alter what the model is asked or how it
is sampled**. That covers scoring/matcher changes, post-generation reply
cleanup, and report plumbing. A **fresh 3-seed generate read is still required**
for anything touching the model itself, `src/prompts/`, context assembly, the
send path's message construction, sampling/endpoint options, or the
referral-reprompt trigger.

Evidence (not an assumption): the M11 generate read at seeds 11/22/33
(2026-08-01, 2h08m) reproduced **900 of 900 replies byte-identically** against
the M12 corpora generated 20 hours earlier in a different process — M12 proved
replay back-to-back, M11 proved it across sessions. Under `cache_prompt: false`
+ a pinned seed the generator is a function, so re-running it to score a change
it cannot affect buys nothing and costs ~2 hours. The rule is conservative in
the safe direction: when in doubt, generate.

**Runnability grounded 2026-07-24 (planner)** — the gate is executable
exactly as written: `package.json` carries `build` (`tsc -b && vite build`)
and `test` (`vitest run`); the eval read is `npm run eval -- --referral-reprompt`
(`scripts/run-eval.ts:144` parses the flag; `:77` runs all four modes
freewrite/gratitude/checkin/thoughtrecord). No wrapper or edit is needed at
R4 — verified against the current scripts, not assumed.

## Parked while in RELEASE (do not queue)

- Eval micro-tuning (checkin declarative padding, opener monotony, freewrite
  dose-echo WATCH) — gate-triggered only.
- New features/modes, new eval dimensions or cases, B3 prompt-library seeding.
- Everything `docs/ROADMAP.md` lists as REJECTED (still rejected).

### The field-note carve-out (added 2026-08-11, interactive with Sharang)

**Work traceable to a named field note from a real tester is not "new features"
and is not "eval micro-tuning". It is the point of the RELEASE phase, and it
outranks this parked list.**

Why this clause exists: read literally, the two bullets above forbid most of what
the first tester's report asks for — a time-of-day fix touches `src/prompts/`, a
CBT distortion-naming step looks like a new feature, and a tone change looks like
prompt micro-tuning. The loop would have read the first real human feedback the
project has ever received and correctly filed nearly all of it as parked. The
parked list was written to stop the loop **inventing** work during RELEASE; it was
never meant to stop it **responding** to a human.

The carve-out is deliberately narrow. To qualify, an item must:

1. **Trace to a specific field note or GitHub issue** from a real user, cited by
   filename/issue number in the queue item itself. No "while we're in here".
2. **Stay inside the reported problem.** Fixing what the tester hit is in scope;
   the adjacent redesign it suggests to you is not.
3. **Obey the release gate unchanged** — the carve-out lifts the *parked* status,
   never the gate. Anything touching `src/prompts/`, the send path, or a safety
   util still takes its full read, and gate failure still outranks it.
4. **Never weaken** guardrails, crisis detection, the disclaimer, the referral
   guard, or the local-only rule. A tester asking for something that breaks those
   gets a documented decline in the field note, not an implementation — see
   §D1 of the 2026-08-11 note, where a tester's own reasoning was the argument
   against their own suggestion.
5. **Never be invented on the loop's behalf.** No field note, no carve-out. The
   audit-pass rule (queue empty → file findings, don't invent work) is unchanged.

Everything still parked stays parked: eval dimensions/cases, ROADMAP-rejected
items, telemetry in any form, and any feature no human has asked for.

## Queue-item format

`- [ ] YYYY-MM-DD · **<id> — <name>**: <exact files + what to do> →
<verification: command/URL/screenshot>` — concrete enough that execute never
has to re-derive intent. Blocked-on-Sharang items live in each doc's
**Blocked on Sharang** section, never in the queue.

## Doc size, and the archive (rule revised 2026-08-11)

**The old rule was "keep each initiative doc under ~200 lines — prune superseded
content into its ledger". It is replaced, because it was dead text.** On
2026-08-11 the four docs stood at 4,546 lines: `model-quality` 2,488,
`public-release` 1,222, `human-feedback` 520, `personalization` 85 — 12× and 6×
the cap on the two that mattered. Both scheduled tasks read every doc **in full,
every run**, so that was a real recurring cost, not a tidiness complaint.

It failed for three reasons worth recording, since they shape the replacement:

1. **It was never here.** The rule lived only in the planner's task file, while
   these docs cited it as a README rule (`public-release.md` said "The README
   caps initiative docs at ~200 lines"). A constraint nobody could find in the
   place it was attributed to is a constraint nobody enforces.
2. **"Into its ledger" points the wrong way.** Pruning *into* the same file
   cannot shrink it — and chasing the cap that way is exactly what turned ledger
   rows into paragraph-length essays. Superseded material has to leave the file.
3. **~200 is achievable for a finished initiative and impossible for a live
   one.** A doc carrying an open queue, a measurement protocol and its evidence
   is not padding at 400 lines. The loop had already worked this out and said so
   in writing (2026-08-08: pruned ~110 lines, landed at 841, "still 4× the cap…
   the remaining bulk is real evidence that is still load-bearing") — and then
   kept violating a number it had itself judged wrong.

**The rule now:**

- **Cap the working core, not the file: ~250 lines of material a run actually
  needs** — mission, grounding, the increments index, the open queue, live
  defects, the compact ledger, Blocked on Sharang.
- **A doc over ~400 lines total is a trigger, not a violation.** The next
  planning run either archives down to the working core or writes one line in
  the doc saying why the excess is still load-bearing. Silently exceeding it is
  the only failure mode.
- **Superseded content moves to [`archive/`](archive/), never into the ledger.**
  Take a dated verbatim snapshot, then reduce the live doc — see
  [`archive/README.md`](archive/README.md). Ledger rows in the live doc are one
  scannable line; the full outcome text lives in the snapshot.
- **When an initiative reaches zero open items, archive it whole** and leave the
  index, the still-live defects, and the ledger. `public-release.md` is the
  worked example.
- **Five things are never pruned, at any size:** an open queue item; a **Blocked
  on Sharang** entry; the release gate, multi-seed rule and replay rule above;
  `model-quality.md`'s variance protocol (the multi-seed rule points at it); and
  a defect that is still live on the shipped app, even when its fix is not
  queued. When in doubt, keep it and archive something else.

**Where this leaves the docs (2026-08-12): 1,386 live lines, down from 4,546.**
`human-feedback.md` is **386 — under the ~400 trigger for the first time**, so no
load-bearing-excess sentence is owed for it this run. It got there the way the
rule intends: F5/F6/F7's shipped specs (~180 lines) and the closed F1/F1a/F2/F1b
bodies moved verbatim to
[`archive/human-feedback-2026-08-12.md`](archive/human-feedback-2026-08-12.md),
along with two resolved *Blocked on Sharang* entries whose one still-binding
sentence ("walked by hand, never scored") was kept in the live doc. No open item,
no unresolved blocker, and no still-live defect was pruned. `model-quality.md`
rose 375 → 394 (M16's step-1 preconditions, grounded this run) and remains the
one doc worth watching against the trigger.
