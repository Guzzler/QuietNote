# QuietNote Development Phase

This file is the **single source of truth** for what kind of work is allowed today. The planner, executor, critic, and rot-pass scheduled tasks all read it. Do not skip reading it.

## Current phase: `RELEASE`

Set: 2026-07-09 (flipped from `BUILD`, set interactively by Sharang: the 33-day BUILD loop plateaued on eval micro-tuning while zero humans have used the app; Day-33 PR #78 closed the last confirmed durable safety gap, making this a clean stopping point. Goal: deployed public app + 5–10 real testers + their feedback feeding the loop. Backlog source: [`docs/RELEASE.md`](RELEASE.md))
Phase owner: Sharang (you can override at any time by editing this file)

## What each phase allows

| Phase | Allowed PR verbs | Forbidden | Exit criteria |
|---|---|---|---|
| **EVAL** | `eval:`, `chore:`, `fix:` (only if critic flagged it), `docs:` | `feat:`, large refactors | 7 consecutive days of critic reports with a sustained north-star score baseline (no required score floor — we're learning what the baseline is) |
| **TUNE** | `tune:`, `fix:`, `eval:`, `docs:` | `feat:`, new modes, new utilities | North-star ≥4.0 sustained for 5 consecutive days |
| **CUT** | `remove:`, `chore:`, `docs:` | `feat:`, `tune:` (CUT is dedicated to surface-area reduction) | No removal candidates in 2 consecutive rot passes |
| **POLISH** | `polish:`, `fix:`, `a11y:`, `docs:` | `feat:` | Subjective — when remaining surface feels production-ready |
| **BUILD** | All verbs (`feat:` now allowed) | Nothing | Open-ended; revert to EVAL if north-star drops below 3.5 |
| **RELEASE** | `release:`, `feat:`/`fix:`/`docs:`/`chore:` (RELEASE.md checklist items and human-reported issues only) | `tune:` and any eval-case/scorer/prompt changes unless triggered by the release gate or a human-reported safety issue; new features outside the checklist | Soft-launch cohort onboarded + first feedback batch triaged into field notes (then Sharang decides the next phase) |

## Hard rules across all phases

1. **Regressions block.** In phases with a daily critic: no PR may merge if the previous critic-day north-star score was lower than the score from 7 days ago. In `RELEASE`: the eval read is event-driven — it runs as the release gate defined in `docs/RELEASE.md` (before release cuts and after any PR touching prompts/send path/safety utils) and no release or safety-adjacent PR ships below the gate floors.
2. **The planner must read PHASE.md and the current backlog source before writing any plan** (in `RELEASE`: `docs/RELEASE.md`, open GitHub issues, and `docs/field-notes/`). Critic reports are consulted when they exist but are no longer generated on a calendar cadence in `RELEASE`.
3. **Every plan must append a one-line entry to `docs/decisions.md` describing what was tried and the expected outcome.** When the result comes back, append the actual outcome.

## Phase transitions

Append a line below when phase changes. Newest at top.

- 2026-07-09 → `RELEASE` (set interactively by Sharang. Rationale: BUILD's eval→tune loop hit diminishing returns — Days 25–32 spent on one eval cohort with three reverted tunes — while the app has never had a human user; Day-33 PR #78 (deterministic referral guard, 16/16 ×2) closed the last durable safety gap. Standing decisions recorded in docs/RELEASE.md: public repo + GitHub Pages; user-initiated GitHub-issue+mailto feedback (no telemetry, unchanged); eval demoted to pre-release gate; soft launch before public push.)
- 2026-06-07 → `BUILD` (EVAL exit: 7 critic reports 05-28…06-07, baseline sustained at overall 3–4 / guardrail 4–5 / multi_turn_memory 3; two confirmed BUILD feat:s queued — prior-turn entity surfacing (primary), gratitude distress carve-out (secondary))
- 2026-05-25 → `EVAL` (initial — critic loop just stood up, need baseline)
