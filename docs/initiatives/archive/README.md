# Initiative archive

Frozen snapshots of initiative docs, taken at the moment they were pruned. **History, not a
source of truth.**

## The one rule

Nothing in this directory is authoritative for open work. If a file here disagrees with the
live doc in [`docs/initiatives/`](..), with [`../README.md`](../README.md) (standing decisions,
the release gate, the multi-seed rule, the replay rule) or with the code, **those win**.

- **Do not queue work from an archive file.** Queues live in the live docs only.
- **Do not cite an archive file as a current fact.** Cite it as the evidence a decision was
  made on — "measured in \<file\>, 2026-08-06" — never as "the app does X".
- **Do not edit an archive file.** A snapshot that gets updated is no longer a snapshot. If
  something in here turns out to still be live, move it *back* into the live doc.

## Why this exists

The loop's two scheduled tasks read every initiative doc **in full, every run**. That makes doc
length a real recurring cost, and it was being paid almost entirely on finished work: on
2026-08-11 the four docs totalled 4,546 lines, of which `public-release.md` (1,223) had **zero
open items** and `model-quality.md` (2,488) had **two**.

Git history already held all of it, but "it's in git" is not findability — no run was ever going
to `git log -S` its way to a 2026-08-06 measurement table. These files keep that material one
click from the live doc while getting it out of the per-run read.

## Contents

| file | snapshot of | taken | why |
|---|---|---|---|
| [`public-release-2026-08-11.md`](public-release-2026-08-11.md) | `public-release.md` @ 1,223 lines | 2026-08-11 | Initiative complete — all 16 increments DONE, queue empty. The live doc keeps the mission, the durable grounding, the increments table, the compact ledger, and the two threads that are still open (R10, R13c). Everything else — the R4 live-URL smoke matrix, the R10a desync table, both R13a arms, the R15/R15a/R15b rulings, four audit walks, the full ledger rows — is here. |
| [`human-feedback-2026-08-11.md`](human-feedback-2026-08-11.md) | `human-feedback.md` @ 520 lines | 2026-08-11 (pm) | Partial prune of the **only initiative with an open queue** — so it is conservative by design. The live doc keeps all three open items (F5, F6, F7) with the new grounding, the mission, the F2 share message (still unsent to testers 2–10) and its honesty correction, the full *Blocked on Sharang* section, and a one-line-per-PR ledger. Here: F1b's four-href and HTTP-status tables, the F2 `WELCOME.md` outline (superseded by the shipped `docs/beta/WELCOME.md`), three stale queue-status blocks, and the two essay-length ledger rows in full. |
| [`model-quality-2026-08-11.md`](model-quality-2026-08-11.md) | `model-quality.md` @ 2,488 lines | 2026-08-11 | Still the active pacing initiative, so this is a partial prune: the live doc keeps the standing decisions, the increments table, the two open items (M16, M5c) and **the variance protocol verbatim** (`../README.md`'s multi-seed rule points at it). The superseded eval reads — M1/M1b baselines, M4/M4a/M6/M6b, M8–M13's ruling and re-score sections, M14/M14a/M14b/M14c, M15, the M5a/M5b results — and the closed queue items' full bodies are here. |

| [`model-quality-2026-08-13.md`](model-quality-2026-08-13.md) | `model-quality.md` @ 505 lines | 2026-08-13 | Small, targeted prune taken while the doc was being *added* to (the M16 ruling + M17). Here: the closed **M16 queue-item body** (DONE, PR #143 — its result tables and Ledger row stay live because M17 must delta against them), the superseded **2026-08-10 queue status**, and the M16 result's *"three findings the next planning run owns"* subsection, now that all three are ruled in the live doc. The live doc declares its remaining excess over the ~400 trigger load-bearing, item by item. |

| [`initiatives-README-2026-08-16.md`](initiatives-README-2026-08-16.md) | `../README.md` @ 518 lines | 2026-08-16 | **The first snapshot of the rules doc itself.** Its dated amendment log had reached eleven entries (2026-08-08 → 2026-08-16) and pushed the file past the ~400 trigger it defines. The live doc replaced the log with one distilled *What the amendment log settled* block; **every rule that still binds was restated there, not dropped** — the ordering rule, the GATE FAIL sentence, the read shapes, the batching rule, the two negatives, the live findings, and the queue-empty rule. Nothing here is authoritative: standing decisions, the release gate, the multi-seed and replay rules, the field-note carve-out, the queue format and the doc-size rule were never in the log and were not touched. |

Note: [`human-feedback-2026-08-12.md`](human-feedback-2026-08-12.md) (F5/F6/F7 specs, the closed
F1/F1a/F2/F1b bodies, two resolved *Blocked on Sharang* entries) was taken 2026-08-12 and is
described in the live `human-feedback.md`. `human-feedback-2026-08-14.md`,
`model-quality-2026-08-14.md` and `model-quality-2026-08-15.md` follow the same pattern and are
described in their live docs.

## Finding something

Both files are the complete original, so the live doc's headings still work as search keys —
`grep -n "R10a result" docs/initiatives/archive/public-release-2026-08-11.md`. The live docs
carry pointers at each place content was lifted from.

One known external pointer: `src/utils/__tests__/evalScorerCorrections.test.ts:700` cites
`model-quality.md`'s *"Cold ruling on the 4 newly surfaced artifacts"* section by name. That
section now lives in [`model-quality-2026-08-11.md`](model-quality-2026-08-11.md). The comment
was left alone (that change would not be doc-only); this line is the redirect.
