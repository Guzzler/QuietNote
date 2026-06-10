# QuietNote Roadmap

**Created:** 2026-06-10. **Owner:** Sharang. This is the planner's backlog source: when the critic-report BUILD backlog is empty, the `make-quiet-note-better` planner MUST pick the highest unstarted item here (respecting `PHASE.md`). Update item status in place; record outcomes in `docs/decisions.md` as usual.

**Inputs triaged into this roadmap:** external UX spec (2026-06-10, second-agent review), real-user data analysis ([`field-notes/2026-06-09-real-user-data-plan.md`](field-notes/2026-06-09-real-user-data-plan.md)), Day 1–9 eval/critic history, [`design/tool-calling-architecture.md`](design/tool-calling-architecture.md) (2026-03-12).

## Status of the original fundamental problems

| # | Problem | Status |
|---|---|---|
| 1 | Guided modes vanish on first keystroke | **FIXED** (sticky banner, PR #40) |
| 2 | 2048-token context window | **FIXED** (4096 + prior-turn entity surfacing, PR #53). Residual risk: behavior in genuinely long conversations is unmeasured → Track C |
| 3 | Model response quality untested | **MANAGED** — the daily eval→tune loop owns this (Days 1–9: 54–55/56 collateral, empathy 43/44). Remaining items flow from new eval tracks |
| 4 | Feels like a tech demo | **ACTIVE** — now concretized as Track A below |

---

## Track A — Core experience (UX spec, triaged)

The external UX spec's core diagnosis is right and matches the real-user data: *the app shouts when it should whisper*, and the empty state is a dashboard when it should be an open page. ("Just start writing" drove 36% of real entries in the launched-app data.) But several of its specific calls misread the product — triage below.

### Accepted (priority order)

- **A1. Empty-state simplification** *(high, ~2 BUILD days incl. mockup day)* — One prominent writing invitation in the center; the 4 mode buttons become a quieter bottom strip (modes stay visible — gratitude/check-in are validated by real usage, but they're a style of entry, not a gate); welcome card loses the redundant privacy bullets and feature tour; streak becomes a quiet badge near today's entry, never onboarding copy. Mock first (screenshot-driven), then implement.
- **A2. Visual calm pass** *(high, 1–2 days)* — Warm off-white paper surface, reduce chrome, soft 12–16px radii, serif (e.g. Lora/Source Serif) for the writing/reading surface with sans for UI chrome only, one accent color. This is "tech demo → journal" made concrete and is screenshot-verifiable.
- **A3. Privacy signal consolidation** *(med, ≤1 day)* — One persistent subtle indicator (footer lock + "Stored on this device" — footer line already exists; converge on it). Remove the duplicated reassurances from welcome card and loading screen. Privacy dashboard moves behind Settings; drop the dedicated nav button. (Consistent with standing guidance: privacy is solid, stop re-selling it.)
- **A4. Inline mood check** *(med, 1 day)* — Replace the ambiguous header heart entry point with a gentle "How are you feeling?" dots/emoji row at entry start; selection becomes mood metadata automatically and feeds the existing mood-aware prompts. Keyword extraction stays as fallback.
- **A5. Sessions sidebar previews** *(low, ≤1 day)* — 2–3-line first-line previews + date + mood dot (title/reflection/date partially exist).
- **A6. Focus mode + keyboard polish** *(low, filler)* — Esc dims chrome to just the page; Cmd+N new entry; `/` opens prompt picker. Loading-screen copy softened to step-text ("Setting up your private space…") — keep the percentage; it's real download progress, contra the spec.

### Rejected from the spec (with reasons — do not re-plan these)

- **"Chat mode: frame as opt-in or cut it. Don't make it the default."** — REJECTED. The AI companion *is* the product; the entire eval/safety/empathy investment (Days 1–9) lives there, and "write → feel heard" is the north star. The legitimate kernel: the *presentation* could feel less like SMS and more like a journal with a thoughtful margin reply — treat as an exploratory A2 follow-up, never as removal/demotion.
- **Autosave + save-button removal** — already true; sessions autosave and no save button exists. Spec was written without reading the app.
- **Weekly reflection digest** — already exists (`WellnessSummary`). If anything, an A1/A2 discoverability tweak.
- **Per-entry privacy badge** — contradicts the spec's own consolidation point (A3). Local-only is global truth; a per-entry badge implies some entries might not be.
- **"Never show a percentage you can't honor"** — the percentage is honored (real model-download progress). Copy softening only.

## Track B — Input robustness (from real-user data)

Owned by the existing eval→tune loop. Spec: [`field-notes/2026-06-09-real-user-data-plan.md`](field-notes/2026-06-09-real-user-data-plan.md).

- **B1.** Freeze-lift planning entry + ~10–12 derived `input_robustness` eval cases: ultra-terse entries (22% of real entries ≤5 words), gibberish → clarify-don't-project, positive entries → don't pathologize, toxic-positivity traps, load-bearing typos. *(1 day + loop)*
- **B2.** Fix what B1 surfaces via the proven mechanism ladder (prompt tune → deterministic guard).
- **B3.** Prompt library seeding from validated high-pull prompts. *(piggybacks any UI day)*

## Track C — Long-conversation evaluation (new harness capability)

**Why:** today's empathy `mt-*` cases are 2–3 turns. Nothing measures a real 10–20-turn session: entity retention across many turns, guided-mode step coherence over a full 5-step thought record, trim behavior at the 4096 boundary, and response-quality drift late in a conversation. Problem 2 was "fixed" at 3-turn scale only.

- **C1. Conversation-script support in the harness** *(2 days)* — Extend `evalDriver`/`evalRunner` with a `conversationScript` case type: a scripted persona plays N user turns (10–20); the model's real responses accumulate as context (not canned priorTurns). Score per-turn criteria plus **retention probes** (e.g., turn 14 references the entity from turn 2 — does the reply ground in it?) and **step-coherence** for guided modes (correct step progression, no step skips/repeats). Needs a freeze-lift entry (new case type + cases).
- **C2. Baseline run + trim instrumentation** *(1 day)* — Run scripts per mode; log when `buildManagedMessages` trims and what was lost; measure probe pass-rate before/after the trim point. This finally answers whether 4096 + entity surfacing holds at length, or whether summarization-on-trim is needed.
- **C3. Fixes** — likely candidates if C2 shows decay: summarize-trimmed-turns into the recap line (extends Day-8 `conversationContext.ts`), `RESERVED_FOR_GENERATION` tuning, per-mode history compaction. Gate any context-limit change on C2 data.

## Track D — Local tool-calling framework (spike-gated)

**History:** the 2026-03-12 design explicitly chose *client-side keyword extraction* over model-side tool calling because Gemma 2 2B couldn't be trusted with structured output. Two things changed: the canonical eval model is now Gemma 4 E2B, and Day 8–9 built the exact machinery a tool loop needs (deterministic response-shape detection + one-shot re-prompt, DRY across app and eval paths). Worth re-testing — but **spike-gated, not committed**.

- **D1. Capability spike** *(1 day, eval-only — MUST come first)* — Define an ultra-constrained call grammar (one line, e.g. `<<tool:suggest_prompt category=anxiety>>` — not free JSON). Three Tier-1/2 tools from the existing design: `suggest_prompt`, `search_past_entries`, `log_mood` (all user-confirmed via cards, per the design's five safety principles). Build a 20-case Node-runner eval: valid-call rate, argument accuracy, and **false-call rate on ordinary journaling turns** (must be ~0; a journal that randomly emits tool syntax is worse than no tools). **Gate: ≥80% valid calls with one re-prompt retry AND ~0 false calls → proceed to D2; else record the negative result and stop.**
- **D2. Framework build** *(2–3 days, only if D1 passes)* — `src/tools/` registry (name, schema, validate, execute-via-UI-card); parser + strip-from-display; one re-prompt retry on malformed calls (reuse `responseShaping` pattern); all executions user-confirmed, reversible, and suppressed entirely on crisis turns; Tier-3 exclusions from the design doc remain binding. No tool may bypass `crisisDetection`/`responseGuardrails`.
- **D3. Tool-call eval dimension** + change doc + design-doc update.

**Honest assessment:** medium-high risk. 2B–E2B-class models are unreliable at structured output, and the journaling tone cost of a stray `<<tool:…>>` in a tender moment is high. That's why D1 is cheap, measurable, and allowed to kill the track. The genuinely valuable tool is `search_past_entries` ("when did I last write about my sister?") — if only one survives the spike, keep that one.

## Sequencing (what the planner should pick, in order)

1. **A1 → A2** (empty state, then visual calm) — the last fundamental problem, validated by data, and the user-visible debt.
2. **B1** input-robustness cases (can interleave with A-track on EVAL-flavored days).
3. **A3–A5** consolidation/polish items.
4. **C1 → C2 → C3** long-conversation harness, then data-driven context fixes.
5. **D1** tool-calling spike → **D2/D3** only if the gate passes.
6. **A6** + Track B leftovers as filler.

Standing rules unchanged: `PHASE.md` governs allowed verbs; revert to EVAL if north-star drops below 3.5; scorer freeze persists (lifts require a decisions-log entry); never weaken guardrails, crisis detection, or the AI disclaimer; no telemetry/feedback-collection features (local-only app — signal never reaches the developer; quality signal comes from this eval loop).
