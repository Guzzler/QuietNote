# Field notes — Using real launched-app data to make QuietNote better and more robust

**Date:** 2026-06-09
**Sources:** "Journal AI Data.csv" (1,377 prompt→entry→AI-response triples, 293 users, 2023-04-10 → 2023-06-21, 446 explicit helpful votes: 367 True / 79 False) and "Journal Entries.pdf" (15 pages of longer-form entries from an independent-study collection — **marked confidential / research-only; see Phase 0 consent gate**). Raw files live OUTSIDE the repo and must stay there.

This doc is input for future daily-plan runs. Nothing here lifts the harness freeze by itself — Phase 1 requires a planning entry in `docs/decisions.md` per `docs/PHASE.md`.

---

## Part 1 — What the data says (measured)

### Entry shapes (the robustness finding)
- Median entry: **16 words**. 22% of entries are **≤5 words** ("I'm tired", "looming unemployment", "eating my feelings").
- Inputs include literal keyboard gibberish, greetings-as-entries ("hi will you help me with my thoughts?"), and load-bearing typos ("depths" for debts).
- Current eval prompts are articulate multi-sentence texts. **The dominant real input shape is barely tested.**

### The 79 not-helpful votes — a labeled failure taxonomy
1. **Generic deflection** — "looming unemployment" → "you have a lot on your mind, sending positive vibes 🤞" (zero topical echo). *Validates QuietNote's specificity/echo rules.*
2. **Toxic positivity on distress-adjacent disclosures** — "eating my feelings" → "It's great that you're being mindful! 💪". *Same family as the Day-9 distress carve-out.*
3. **Pathologizing positive entries** — user celebrating first full week of work → "you're feeling anxious about your upcoming week". **No QuietNote eval coverage exists for this.**
4. **Projecting emotion onto unintelligible input** instead of asking for clarification. **No coverage.**
5. **Blind typo echo** ("your depth issues"). *Comprehension robustness.*

### Baselines worth anchoring to
- Old app helpful rate: **82%** of votes (367/446); vote participation 32% of entries.
- **52% of users returned on 2+ distinct days.**
- 48% of old responses opened with "it sounds like" (58% in helpful vs 65% in unhelpful) — QuietNote's banned-opener rule is empirically grounded.
- Prompt pull: "Just start writing." 491 (36%), "What are you anxious about?" 345, "What are you grateful for?" 296 — **free writing + anxiety + gratitude = ~80% of all entries.**
- Explicit crisis phrasing: ~6/1,377 entries (≈0.4%) — rare but highest-stakes; justifies the carveout work and warns against over-triggering.

---

## Part 2 — Phased plan

### Phase 0 — Data hygiene (one-time; gates everything else)
- Keep both raw files out of git permanently (`data/` is untracked today — add explicit `.gitignore` entries so they can never land by accident).
- The CSV's `<PERSON>` scrubbing is incomplete (real first names appear in entries and AI responses). Any derived artifact must be **paraphrased, not quoted** — same shape, same length, same typo style, invented specifics.
- The PDF is explicitly marked confidential/research-only: **do not derive product artifacts from it without a consent check.** Until cleared, use it for nothing beyond private reading.

### Phase 1 — Robustness evals from real entry shapes (the core of "more robust")
Needs a freeze-lift planning entry (EVAL_CASES is pinned at 63). Add ~10–12 derived cases — suggested dimension: `input_robustness`:
1. Ultra-terse entries (≤5 words) across all 4 modes — response must still echo the concrete topic and ask a grounded question.
2. Gibberish / nonsense input — response must gently ask for clarification; must NOT assert an emotional read ("it seems you're having a tough time" on keyboard mash = fail).
3. Positive/celebratory entry — response must NOT project anxiety or struggle onto it (mustNotContainAny: anxious/overwhelmed/difficult...).
4. Toxic-positivity trap — distress-adjacent disclosure phrased neutrally ("eating my feelings") — response must not celebrate or congratulate.
5. Typo'd load-bearing word — response should engage the plausible meaning or ask, not echo the typo as a new topic.
Then: re-baseline, and let the existing daily critic→tune loop chase failures (mechanisms in the proven order: prompt tune → deterministic guard, per Days 8–9).

### Phase 2 — Feedback-as-action, not feedback-as-data (revised 2026-06-09)
**Decision: stored helpful/not-helpful votes are NOT useful here.** QuietNote is fully local with no telemetry — votes would never reach the developer, so the "real north-star signal" rationale collapses. Do not build a vote-collection feature.

The salvageable kernel: a "that didn't help" / regenerate affordance on assistant messages whose ONLY job is to trigger one re-generation through the existing Day-9 machinery (`withDeflectionReprompt` in `src/utils/responseShaping.ts`). Immediate on-device value, zero storage, zero aggregation. Low priority — evaluate whether a plain regenerate button earns its UI space at all; quality improvements should keep flowing through the eval loop (Phase 1), which is the developer-side signal that actually works for a local app.

### Phase 3 — Prompt library upgrades (cheap, validated)
- Seed `src/data/journalPrompts.ts` with the proven high-pull prompts ("What are you anxious about?", "List 10 of your favorite things", "Write about something that makes you smile no matter what", …).
- The old app's #1 entry driver was the daily prompt — make the prompt suggestion more prominent in the empty state.
- Track prompt usage locally to learn which prompts pull entries in QuietNote.

### Phase 4 — Fine-tune corpus (optional; gated on Phase 0 consent + scrub)
- `scripts/build_finetune_csv.py` mixes only public datasets; this data is the missing in-domain piece.
- Use **entries** (scrubbed/paraphrased) as in-domain prompts; generate fresh responses under QuietNote's current prompts. Do NOT train toward the old AI responses (dated, formulaic, emoji-heavy).
- The 79 False responses are useful as DPO-style negatives at most.

---

## Part 3 — Feature audit (what makes sense / what would users use)

Judged against the real-usage evidence: terse entries, prompt-driven writing, anxiety+gratitude dominance, 52% day-2 return, and the write→feel-heard loop as the product.

### Keep and invest (core loop — evidence-backed)
| Feature | Verdict |
|---|---|
| Free Write + AI response (ChatPanel) | **The product.** 36% of old-app entries came from "Just start writing." Every robustness phase serves this. |
| Gratitude mode | Validated — gratitude prompts pulled 296+ entries. Day-9 distress carveout fixed its worst moment. |
| Check-in mode | Validated — "What are you anxious about?" was the #2 prompt (345). Anxiety check-in is what users actually do. |
| Crisis detection + carveouts + disclaimer | Rare (0.4%) but non-negotiable; keep exactly as is. |
| Prompt selector / journalPrompts | Validated hard. Phase 3 upgrades. Surface more prominently. |
| Sessions + search + deletion | Table stakes for a journal; keep. |
| Continuity / streaks / cross-session context | Plausible retention levers aimed at the 52%-return baseline; keep, cheap. |

### Keep, but watch usage (plausible, unvalidated)
| Feature | Verdict |
|---|---|
| Thought Record (CBT 5-step) | Differentiated and well-built, but no old-app analog and the most effortful mode; real entries are terse — 5 structured steps may exceed most users' appetite. Watch via Phase-2 feedback + local mode-usage counts before investing further. |
| Wellness summary, session reflections | Nice retention garnish; no more investment until feedback data says users read them. |
| Mood check (basic) + trend chart | Simple mood logging is standard journaling; keep the lightweight path. |

### Over-built relative to evidence (consolidate / deprioritize)
| Feature | Verdict |
|---|---|
| Mood correlations + day-of-week analysis + insights cards (~700 lines across 3 components) | Needs weeks of dense data most users will never accumulate (old app: half of users had a single day). Freeze; don't extend. Candidate for simplification if it costs maintenance. |
| 3 inference backends + ModelPanel | Users don't care which runtime generates the reply; 3× maintenance and eval surface. Pick the best default per device, demote backend choice to an advanced setting. Eval effort should track ONE canonical backend (the Node runner already does). |
| Privacy dashboard (528 lines) | Privacy is solid and already a stated non-priority for further investment. Maintain, don't grow. |
| AI personality settings | Speculative; no evidence users want tone knobs. Freeze; revisit only if Phase-2 feedback shows tone complaints. |
| EvalPanel (in-app) | Dev tool superseded by the Node runner for the loop; keep hidden, zero investment. |

### Missing (the data says add)
1. **Input-robustness behavior** (Phase 1) — graceful handling of terse/gibberish/positive/typo'd entries is a feature users feel, not just an eval score. This is the priority.
2. *(Downgraded 2026-06-09)* a regenerate / "that didn't help" affordance (Phase 2) — feedback-as-action only; stored votes ruled out for a local-only app.

---

## Suggested sequencing for the daily loop
1. Next planning slot: adopt Phase 1 (freeze-lift entry + derived cases) — it extends the existing eval muscle and directly targets robustness. This is the main line.
2. Phase 3 (prompt library seeding) piggybacks on any UI day — cheap and validated.
3. Phase 2 (regenerate affordance) only if a UI day has spare capacity. Phase 4 stays parked until consent/scrub is settled.
