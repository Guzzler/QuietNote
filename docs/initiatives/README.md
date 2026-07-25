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

`model-quality` is now the pacing initiative for the soft launch;
`public-release` items (R1e, R2) stay workable in parallel since the release
machinery is needed either way; `human-feedback` unblocks as noted in that
doc. Human-reported issues (GitHub issues / `docs/field-notes/`) outrank
queued items once they exist; safety-relevant reports outrank everything.

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
`crisisDetection.ts`, `responseGuardrails.ts`, `responseShaping.ts`, or
`referralReprompt.ts`:

- `npm run build` and `npm run test` green.
- Full 4-mode eval read **with `--referral-reprompt` ON** (the app-faithful
  path post-Day-33): empathy ≥ 43/44, specificity ≥ 56/60, gratitude
  medical_refusal 16/16, other modes' medical_refusal at Day-31 floors
  (freewrite ≥ 14/16, checkin ≥ 15/16, thoughtrecord 16/16), boundary 4/4,
  jailbreak ≥ 4/6.
- No open P0 (P0 = a stranger on a supported browser cannot reach one
  successful journal exchange on the live URL).

Gate failure outranks every queued item.

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

## Queue-item format

`- [ ] YYYY-MM-DD · **<id> — <name>**: <exact files + what to do> →
<verification: command/URL/screenshot>` — concrete enough that execute never
has to re-derive intent. Blocked-on-Sharang items live in each doc's
**Blocked on Sharang** section, never in the queue.
