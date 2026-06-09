# Day 8 — Prior-Turn Entity Surfacing (first BUILD `feat:`)

**Phase:** BUILD (Day 8 / 1 of N)
**Plan:** [`docs/daily-plans/2026-06-08-plan.md`](../daily-plans/2026-06-08-plan.md)
**Verdict:** **SHIP** — `empathy-mt-3` experience-PASS in 3/4 modes with genuine entity callbacks; mt-1/2/4 hold across all 4 modes.

## Summary

Resolved the four-sample (Days 3–6) `empathy-mt-3` entity-drop failure by structurally **surfacing prior-turn entities adjacent to the current user turn**. Introduces a new pure, deterministic util `buildPriorTurnRecap` that synthesizes a 1-line recap of the salient entities (named people, relationships, events) and feelings the user established in earlier USER turns, and prepends it to the current user turn. Wired into BOTH the eval path (`src/utils/evalDriver.ts`) and the app path (`src/utils/tokenEstimator.ts:buildManagedMessages`) — DRY via shared util.

## Non-goals (held)

- **NO** new system-prompt sentence (the Day-3 directive is empirically exhausted on this shape).
- **NO** change to `MODEL_CONTEXT_LIMIT` (this is a salience problem, not a window problem).
- **NO** new EVAL_CASES (harness-expansion freeze held — `EVAL_CASES.length === 63`).
- **NO** scorer edits.

## Files changed

- **New** `src/utils/conversationContext.ts` — `buildPriorTurnRecap(history)`. Pure, deterministic. Uses small curated lexicons for relationships (`mom, dad, boss, coworker, …`), events (`dinner, meeting, layoff, …`), and feelings (`ashamed, tired, lonely, …`), plus a capitalized-named-token extractor (with sentence-start + stopword guards). Composes anchors as e.g. `"the family dinner"` when a relation + event co-occur in the same turn, plus standalone named people (Sarah, Miguel). Caps at 4 entity anchors / 240 chars / 2 feelings. Returns `null` for empty / single-trivial-opener histories or when no anchor verifies against the source.
- **Modified** `src/utils/evalDriver.ts` — `runEvalSuite` calls `buildPriorTurnRecap(c.priorTurns)` and prepends the recap to `c.prompt` for the current user message. Template-agnostic (no extra system turn).
- **Modified** `src/utils/tokenEstimator.ts` — `buildManagedMessages` calls the same util on the untrimmed `conversationHistory` and prepends the recap to `currentEntry`. Recap is included in the entry-budget accounting so the trim math remains correct.
- **New** `src/utils/__tests__/conversationContext.test.ts` — 11 tests: mt-1 / mt-3 / mt-4 fixtures, empty / trivial-opener / assistant-only guards, no-fabrication assertion, determinism, `buildManagedMessages` wiring assertion, and a re-asserted `EVAL_CASES.length === 63` freeze guard.

## Verification

### Build + tests
- `npm run build` — green (tsc strict + vite, 6.64s).
- `npm run test` — **1006/1006 green** (was 995 + 11 new from `conversationContext.test.ts`).

### Eval run — `npm run eval -- --dimensions=empathy --per-dim=11`
Generation params unchanged: `q4f16 / temp 0.6 / rep_penalty 1.3 / max_new=200` — directly comparable to Days 3–6. Output: [`docs/eval-runs/2026-06-08/`](../eval-runs/2026-06-08/) (renamed from UTC-rolled `2026-06-09` per the Day-5/Day-7 convention).

#### `empathy-mt-3` — binary call: **SHIP**

| Mode | Before (Day 6, 4th sample) | After (Day 8) | Verdict |
|---|---|---|---|
| **freewrite** | FAIL — "Feeling tired of everything is a significant weight…" (no callback) | **PASS** — *"Feeling exhausted right now connects with the weight of that painful interaction at the family dinner. When things feel overwhelming, where do you notice that tiredness showing up most strongly in your body?"* | ✅ genuine callback |
| **checkin** | FAIL (Day 5 hardened — body retained, surface-word latch) | **PASS** — *"Feeling exhausted is a heavy weight right now. Thinking about how things unfolded at the family dinner brings up those difficult emotions again. When reflecting on the situation, what part feels most draining presently?"* | ✅ genuine callback |
| **thoughtrecord** | FAIL | **PASS** — *"You mentioned feeling ashamed about what happened at the family dinner previously, and now you express being tired of everything. What specifically feels overwhelming right now?"* | ✅ explicit callback (shame + family dinner) |
| **gratitude** | FAIL | **FAIL** — *"Feeling 'tired' brings up such a deep sense of exhaustion right now. When you feel this way, what part of that tiredness feels heaviest today?"* | ❌ surface-latch persists; **same shape as the Priority-2 gratitude curt-bail backlog** (not new collateral) |

**3/4 modes flipped FAIL → PASS with genuine, source-grounded callbacks.** Binary call from the plan (§D.2): SHIP if `mt-3` experience-PASSes in ≥3/4 modes AND mt-1/2/4 do not regress. **Both conditions met.**

#### Collateral check — mt-1 / mt-2 / mt-4

| Case | freewrite | gratitude | checkin | thoughtrecord |
|---|---|---|---|---|
| `empathy-mt-1` (Sarah) | PASS | PASS | PASS | PASS |
| `empathy-mt-2` (boss / Tuesday meeting) | PASS | PASS | PASS | PASS |
| `empathy-mt-4` (Miguel / layoff) | PASS | PASS | PASS | PASS |

**No collateral regression.**

#### Aggregate per-mode totals (empathy slice, 11 cases each)

| Mode | Before (Day 7 baseline `--per-dim=2` did not exercise mt-*) → Day 6 empathy `--per-dim=11` | After (Day 8) | Δ |
|---|---|---|---|
| freewrite | ~10/11 | **11/11** | +1 |
| gratitude | ~8/11 | **8/11** | 0 (gratitude curt-bail still firing on redteam-7.2 + gratitude-modecoherence-1 + mt-3 — Priority 2 backlog) |
| checkin | ~9/11 | **10/11** | +1 |
| thoughtrecord | ~9/11 | **11/11** | +2 |

The gratitude mt-3 miss + redteam-7.2 + gratitude-modecoherence-1 are the same gratitude-mode under-engagement pattern documented in Days 5/6 — **expected, queued, untouched today**.

### North-star re-score (`multi_turn_memory`)

Was held at **3/3/3/3** since Day-5. After this BUILD ships:

| Mode | Before | After | Reason |
|---|---|---|---|
| freewrite | 3 | **4** | mt-1/2/3/4 all PASS with callback in mt-3 body |
| gratitude | 3 | **3** | mt-3 still surface-latches; gratitude-mode pattern (Priority 2) |
| checkin | 3 | **4** | mt-1/2/3/4 all PASS with explicit family-dinner reference |
| thoughtrecord | 3 | **4** | mt-1/2/3/4 all PASS; thoughtrecord names "ashamed" + "family dinner" explicitly |

## Screenshot

Browser screenshot of the running app at `/` (Day-8 dev build) committed to `docs/screenshots/2026-06-08/01-app-loaded.png`.

## Roadmap tracker

| Fundamental problem | Status after Day 8 |
|---|---|
| 1. Guided modes vanish on first keystroke | Sticky banner shipped earlier (PR #40). |
| 2. Tiny context window | `MODEL_CONTEXT_LIMIT=4096` shipped earlier. **Residual salience sub-problem closed** — entity-drop on brief follow-ups no longer reproduces in 3/4 modes. |
| 3. Model response quality | `multi_turn_memory` moved off the 3/3/3/3 floor → 4/3/4/4 today. |
| 4. Feels like a tech demo | The "it forgot what I just said" failure no longer reproduces on the canonical mt-3 fixture. |

## BUILD backlog after today

- **Priority 2 (next BUILD plan):** gratitude-mode distress carve-out — addresses the remaining mt-3 gratitude FAIL plus the redteam-7.2 / gratitude-modecoherence-1 curt-bail pattern (same root: gratitude prompt is under-engaging on distress shapes). Sketch already drafted Day-6; ship in next BUILD slot.

## Next steps

- Open PR `feat:` against `main` with this change doc, the eval before/after table, and the browser screenshot inline.
- Update `docs/decisions.md` (newest at top) with `actual:` matching today's verdict.
- Append 4 north-star rows for 2026-06-08.
