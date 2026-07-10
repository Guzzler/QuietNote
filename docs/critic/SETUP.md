# Critic Loop — Human-Only Setup (ACTION REQUIRED by Sharang)

These two steps **cannot** be done by the planner or executor scheduled tasks: they
touch files outside the QuietNote repo (`C:\Users\shara\.claude\scheduled-tasks\...`).
Until they are done, the critic loop will run **only** when triggered manually, and the
planner/executor will not enforce the PHASE.md gate. Both are quick copy-paste jobs.

---

## Action 1 — Register the `quietnote-critic` scheduled task

Create `C:\Users\shara\.claude\scheduled-tasks\quietnote-critic\SKILL.md` with the body
below. **Schedule it to run BEFORE the daily planner each day** (e.g. critic at 06:00,
planner at 06:30) so the planner always has a fresh report and Hard Rule #2's 36h
staleness check passes.

```markdown
---
name: quietnote-critic
description: Daily critic for QuietNote — runs the eval harness against the real model, scores the north-star dimensions, writes a dated critic report, and commits it to main. Never edits source.
---

This is an automated run of a scheduled task. The user is not present. Execute
autonomously without asking questions. This task ONLY measures and reports — it
NEVER edits source code.

## Working directory
cd "C:\Users\shara\OneDrive\Desktop\My Stuff\Work\Dev\QuietNote"
All file ops use absolute paths under that directory.

## Steps
1. `git checkout main && git pull origin main` (try `git pull --rebase` on failure).
2. Read `docs/critic/CRITIC.md` — it is the authoritative protocol. Follow it exactly.
3. Read `docs/PHASE.md` for the current phase (informational; the critic runs in every phase).
4. `npm run dev`; open http://localhost:5173/?eval=1 via Playwright MCP.
5. Trigger model load (send one message in the chat), confirm a response, then open the
   Eval Panel. Record the backend shown in the panel header.
6. For each of the 4 modes (Free Write, Gratitude, Check-in, Thought Record): select the
   mode, run all dimensions, capture pass-rates and a few sample responses.
7. Hand-read 3–5 responses per mode and score the 8 north-star columns 1–5 per the rubric.
8. Append one row per mode to `docs/north-star.csv`.
9. Write `docs/critic-reports/YYYY-MM-DD.md` (backend + `git rev-parse HEAD` + total cases
   header; per-mode tables; sample responses; weakest 3 dimensions; "what to target next").
10. Append one line to `docs/decisions.md` recording the critic ran and the overall score.
11. Commit (docs-only) on `main` and push: report + csv rows + decisions line.
12. Send an ntfy notification (see below). Send exactly one per run.

## Notifications (ntfy)
On success:
  curl -s -H "Title: QuietNote Critic Done" -H "Tags: bar_chart" -d "<overall score + weakest dimension>. Report: docs/critic-reports/YYYY-MM-DD.md" https://ntfy.sh/<ntfy-topic>
On failure:
  curl -s -H "Title: QuietNote Critic FAILED" -H "Tags: x" -H "Priority: high" -d "<what failed>" https://ntfy.sh/<ntfy-topic>

## Hard rules
- NEVER edit source code. Docs-only commits.
- If the model can't run, still produce a report that states the limitation and hand-scores
  from whatever responses you can capture. The empty directory is the bug; a rough report is the fix.
```

Then register it with your scheduler so it fires daily before the planner. (Mirror however
`make-quiet-note-better` and `daily-plan-execution` are registered on this machine.)

---

## Action 2 — Make the planner and executor phase-aware

### 2a. `C:\Users\shara\.claude\scheduled-tasks\daily-plan-execution\SKILL.md`

Add a **Step 0.5** immediately after the existing "Step 0: Pull latest from remote":

```markdown
## Step 0.5: Read PHASE.md and honor the phase gate
1. Read `docs/PHASE.md`. Note the current phase and its allowed/forbidden PR verbs.
2. Read the latest `docs/critic-reports/*.md`. If none exists or the newest is >36h old,
   the only allowed work today is standing up / repairing the critic loop.
3. Before opening any PR, check its commit verb against the phase table:
   - In `EVAL`: allow `eval:`, `chore:`, `fix:` (only if the critic flagged the bug), `docs:`.
     FORBID `feat:` and large refactors. If the plan asks for a forbidden verb, do NOT ship it —
     instead implement the highest-priority allowed work and note the redirect in the PR body.
4. Hard Rule #1: if the most recent critic-day north-star score regressed vs. 7 days ago,
   do NOT merge — flag the regression in the PR and stop.
```

And add a **final step** (after the change-description step) appending the actual outcome
to the decision log (Hard Rule #3):

```markdown
## Final step: Update the decision log
Append/patch `docs/decisions.md`: find the matching `actual: pending` entry for today's
work and replace `pending` with the real outcome (what shipped, the PR URL, any caveats).
Commit this docs change with the PR or as a follow-up `docs:` commit.
```

### 2b. `C:\Users\shara\.claude\scheduled-tasks\make-quiet-note-better\SKILL.md`

Add an explicit **Step 0.5** before it writes any plan:

```markdown
## Step 0.5: Read PHASE.md + latest critic report (Hard Rule #2)
1. Read `docs/PHASE.md` for the current phase and its rules.
2. Read the newest file in `docs/critic-reports/`. If the directory is empty OR the newest
   report is >36h old, this plan MUST be "diagnose why the critic loop isn't running" — do
   not write a feature/tuning plan.
3. The plan's allowed PR verbs must match the current phase. In `EVAL`, never plan a `feat:` PR.
4. Append a one-line entry to `docs/decisions.md` (Hard Rule #3): what is being tried + the
   expected outcome, with `actual: pending`.
```

---

## Why this matters
The 2026-05-25 "closed feedback loop" decision created PHASE.md, decisions.md, north-star.csv
and an empty critic-reports/ dir, but **never created the critic agent** and left the gate
unenforced on the execution side. Until Actions 1 and 2 are done, the loop only advances when
a human triggers it, and the EVAL phase's "7 consecutive days of critic reports" exit criterion
will accumulate slowly or not at all.
