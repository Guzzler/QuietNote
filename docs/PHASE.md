# QuietNote Development Phase

This file is the **single source of truth** for what kind of work is allowed today. The planner, executor, critic, and rot-pass scheduled tasks all read it. Do not skip reading it.

## Current phase: `EVAL`

Set: 2026-05-25
Phase owner: Sharang (you can override at any time by editing this file)

## What each phase allows

| Phase | Allowed PR verbs | Forbidden | Exit criteria |
|---|---|---|---|
| **EVAL** | `eval:`, `chore:`, `fix:` (only if critic flagged it), `docs:` | `feat:`, large refactors | 7 consecutive days of critic reports with a sustained north-star score baseline (no required score floor — we're learning what the baseline is) |
| **TUNE** | `tune:`, `fix:`, `eval:`, `docs:` | `feat:`, new modes, new utilities | North-star ≥4.0 sustained for 5 consecutive days |
| **CUT** | `remove:`, `chore:`, `docs:` | `feat:`, `tune:` (CUT is dedicated to surface-area reduction) | No removal candidates in 2 consecutive rot passes |
| **POLISH** | `polish:`, `fix:`, `a11y:`, `docs:` | `feat:` | Subjective — when remaining surface feels production-ready |
| **BUILD** | All verbs (`feat:` now allowed) | Nothing | Open-ended; revert to EVAL if north-star drops below 3.5 |

## Hard rules across all phases

1. **No PR may merge if the previous critic-day north-star score was lower than the score from 7 days ago.** Regressions block.
2. **The planner must read the latest critic report and PHASE.md before writing any plan.** If either is missing or stale (>36h old), the plan must be "diagnose why the critic loop isn't running."
3. **Every plan must append a one-line entry to `docs/decisions.md` describing what was tried and the expected outcome.** When the result comes back, append the actual outcome.

## Phase transitions

Append a line below when phase changes. Newest at top.

- 2026-05-25 → `EVAL` (initial — critic loop just stood up, need baseline)
