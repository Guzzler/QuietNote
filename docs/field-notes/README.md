# Field notes — how real feedback enters the loop

This directory is where feedback from real people who used QuietNote is written
down. It is described from what [`2026-08-11-first-tester.md`](2026-08-11-first-tester.md)
actually did, not from theory: no cadence, no SLA, no template for feedback
nobody has sent.

## 1. How feedback actually arrives (read this first)

**As a private message to Sharang, relayed into the loop by him interactively**
(`2026-08-11-first-tester.md:4`). That is the shape to expect, so relaying a
report into a note is a **Sharang-and-planner step** — there is nothing for the
loop to poll and nothing to automate.

**`gh issue list` returning empty is not evidence that no feedback exists.** This
directory is the **primary** intake; the GitHub issue templates and the in-app
"Share feedback" link are a **secondary** channel that has never yet fired.

## 2. De-identification (hard rule — the repo is public)

- Testers are **`T1`, `T2`, …**. Never a name, a handle, or anything identifying.
- Personal disclosures are **paraphrased, never quoted**.
- The raw message stays in Sharang's inbox. It never enters a tracked file, a PR
  body, a commit message, a screenshot, or an ntfy body.
- Never "improve" an existing note by restoring detail it deliberately left out.

Precedents: `2026-06-09-real-user-data-plan.md:4` set this convention for the old
app's corpus, and `2026-08-11-first-tester.md`'s *Identity and quoting rules*
section applies it to a live tester.

## 3. Triage means checking every claim against `src/` before queueing it

Read the code and cite line references before turning a report into work. The
payoff measured in the one note that exists is the argument for the rule:

- One reported "bug" (modes continuing the same session) was **four coupled
  defects**, one of which persisted a **fabricated Thought Record to IndexedDB**
  before the user typed anything — on an app whose whole positioning is that the
  data is theirs. The tester reported it as a mild "possibly unintended".
- One suggestion was for a feature **already shipped but undiscoverable** — the
  tester's stated primary use case was CBT distortion work and they never found
  Thought Record.
- One tone complaint turned out to be a **shipped-model finding, not a copy
  finding**: the banned phrase is already the prompt's "strictest rule, never
  break", and the app has never run the fine-tune.

None of those three readings survives taking the report at face value.

## 4. Required section shape — the four triage buckets

- **A — confirmed defects.** Reproduced in the code, with line refs.
- **B — discovery findings.** The feature exists; the user never found it.
- **C — blocked on a model or infrastructure answer**, not on design.
- **D — declined, with reasons.** *Not optional.* A tester asking for something
  that breaks a non-negotiable gets a written decline, not an implementation.
  §D1 of the 2026-08-11 note is the model: web search was declined using the
  tester's **own** stated reasoning against their own suggestion.

## 5. File naming and the closing section

Name notes `YYYY-MM-DD-<slug>.md`. End every note with **"Sequencing this note
implies"** — an ordered list of the work it suggests, gate status marked. That
section is what the planner converts into queue items; without it a note is
information the loop cannot act on.

## 6. Field notes are what unlock the carve-out

While the project is in RELEASE, [`../initiatives/README.md`](../initiatives/README.md)
parks new features, new eval dimensions and prompt micro-tuning. Its **field-note
carve-out** lifts that parked status for work traceable to a real user's report —
under five conditions, of which the first is that the queue item cites a note in
this directory by filename. The carve-out never lifts the release gate, and it can
never be invented on the loop's behalf: **no field note, no carve-out.**
