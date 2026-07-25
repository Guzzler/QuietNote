# P0 — Local memory design (profile memo + entry retrieval)

**Status: DESIGN ONLY. Nothing here is queued.** Written 2026-07-24
(interactive, Sharang) while the M3 full-data training run was going, so that
[`personalization.md`](../initiatives/personalization.md)'s P1a/P1b start from
a spec instead of a blank page the moment the gate lifts.

**The gate is unchanged:** no personalization code lands until model-quality's
bar is met — which today means an M4 rerun on the full-data model clearing
**all** release-gate floors (the 357-record pilot failed medical_refusal in all
four modes). See "Gate status" at the bottom for what the eval data already
tells us.

---

## 1. Grounding (verified against the code 2026-07-24)

Two findings materially change the shape of P1a/P1b versus how
`personalization.md` describes them.

### 1a. QuietNote already ships a personalization layer

`personalization.md` reads as if P1a is greenfield. It is not.
[`src/utils/sessionContext.ts`](../../src/utils/sessionContext.ts) already
builds and injects a cross-session context block:

| field | how it's derived today |
|---|---|
| `recentThemes` | `extractThemes()` keyword extraction over the last 3 sessions' user text |
| `recentEmotions` | `findTopEmotions()` over mood entries (needs ≥2) |
| `lastSessionSummary` | first 12 words of the last session's first user message + relative day ("Yesterday, they wrote about: …") |
| `journalDays` | unique calendar days across all sessions |
| `moodTrend` | `analyzeMoodTrend()` (needs ≥5 moods) |

`formatContextForPrompt()` renders those into prose and `App.tsx` (lines 381-382
and 576-577) passes the result to `getSystemInstruction(mode, contextBlock)`,
which appends it under a `Context about this user:` heading
([`systemPrompts.ts:191-206`](../../src/prompts/systemPrompts.ts)).

**So P1a is an upgrade of an existing deterministic mechanism to an
LLM-distilled one, not a new feature.** That is good news for scope and bad
news for risk:

> ⚠️ **`sessionContext.ts` is on the load-bearing safety list.** Any P1a change
> to it is **gate-triggering** — the PR must carry a full 4-mode eval read with
> `--referral-reprompt` ON. Budget for that; do not discover it at PR time.

The safest shape for P1a is therefore **additive**: leave
`buildSessionContext`'s existing fields alone and add the memo as a separate
composed block, so a memo failure degrades to today's behavior rather than
breaking the context path.

### 1b. There is no persisted crisis flag

`personalization.md`'s hard rule says retrieval "must exclude entries flagged by
crisis detection." **There is no such stored flag today.** `detectCrisis()` runs
in-flight in `App.tsx` (lines 327, 500) and its boolean is passed straight to
the referral-reprompt decision (`referralReprompt.ts:145-147`). The `Session`
type in [`types.ts`](../../src/types.ts) has no crisis field, and the IndexedDB
schema (`quietnote-db`, **v4**: `sessions` / `moods` / `settings` /
`thoughtRecords`) stores none.

**Decision: re-run `detectCrisis()` at index time — do not add a stored flag.**

Rationale: a stored boolean written at session-create time would be wrong for
sessions written before the field existed (silently indexing crisis content),
and it would freeze one detector version into the data. Re-running at index time
means the *current* detector always governs what is eligible, and a detector
improvement retroactively protects old entries on the next reindex. Cost is
trivial — `detectCrisis` is synchronous string matching, and indexing is a
background pass.

---

## 2. What gets stored

Two new IndexedDB stores → **`DB_VERSION` 4 → 5** (`src/storage.ts`).

### `profile` store (P1a) — keyPath `"key"`, effectively one row

```ts
interface ProfileMemo {
  key: "current";
  text: string;          // the memo itself, ≤ MEMO_MAX_CHARS
  updatedAt: number;
  sourceSessionIds: string[];   // what it was distilled from (provenance for the UI)
  distilledBy: "model" | "user"; // user edits mark it "user" and are never overwritten
  version: number;       // bumped each rewrite; lets the UI show "updated 3 days ago"
}
```

### `entryVectors` store (P1b) — keyPath `"id"`

```ts
interface EntryVector {
  id: string;            // `${sessionId}:${threadId}:${messageId}`
  sessionId: string;
  vector: number[];      // MiniLM-class, 384 dims, Float32 → ~1.5 KB/entry
  text: string;          // the snippet retrieval would inject (not the full entry)
  ts: number;
  indexedWith: number;   // detector/model version, so a bump forces reindex
}
```

Storage cost is negligible: 1,000 indexed entries ≈ 1.5 MB of vectors, against
model caches already measured at 1.5–3.2 GB.

---

## 3. Context budget — the constraint that decides everything

Measured constants ([`tokenEstimator.ts`](../../src/utils/tokenEstimator.ts)):

```
MODEL_CONTEXT_LIMIT      4096
RESERVED_FOR_GENERATION   384
RESERVED_FOR_SYSTEM       600   ← nominal only; the real prompts are ~1.6–1.9k
```

`conversationDriver.ts:198` computes the history budget from the **actual**
system-prompt token count, not `RESERVED_FOR_SYSTEM`, so the memo's cost comes
directly out of conversation history:

```
history budget ≈ 4096 − 384 − ~1900 (system) − entry ≈ ~1800 tokens
```

**Allocation decision:**

| block | budget | enforcement |
|---|---|---|
| Profile memo (P1a) | **≤ 200 tokens** (~700 chars) | hard truncate at distill time; never at inject time |
| Retrieved entries (P1b) | **≤ 150 tokens total**, max 3 snippets | drop lowest-scoring snippets until under budget |
| Combined ceiling | **≤ 300 tokens** | if both are present, memo wins ties |

That is ~17% of history budget worst case. **Evidence it fits:** M1 measured
10-turn scenarios with **zero trims** on the managed strategy, and M4a repeated
that on the fine-tune — so there is real headroom before trimming starts biting
conversation quality. The combined ceiling must be a tested constant, not a
convention.

**Rule: personalization must never push a turn into trimming.** If adding the
blocks would trim history, drop retrieval first, then the memo. A callback is
worth less than the conversation it came from.

---

## 4. P1a — the profile memo

**What it is:** a compact "about you" note the local model distills from recent
sessions, replacing hand-rolled keyword extraction with something that can carry
a throughline ("They've been weighing whether to leave a job they're good at but
bored by; their sister Priya is their main sounding board").

**When it runs:** never during a send. Distillation is a **background pass**
triggered on app idle when `sessionsSinceLastMemo >= 3` **or** 7 days have
passed, whichever first. It uses the already-loaded engine, so there is no extra
model download.

**Prompt shape:** a dedicated distill prompt, **not** a journaling mode — it
must not inherit reflective-companion framing. Output contract: 2–4 sentences,
third person ("they"), no advice, no diagnosis, ≤700 chars. The dataset's
existing `DIAGNOSIS_VOCAB_BANS` apply.

**Failure = silence.** If distillation errors, returns empty, or blows the
length cap, keep the previous memo. A stale memo is fine; a wrong one is not.

**User edits are sovereign.** Once `distilledBy: "user"`, the model never
overwrites — subsequent passes propose a replacement the user can accept in the
UI. This falls out of the hard rule that it's *their* profile.

---

## 5. P1b — entry retrieval

**Model:** MiniLM-class embeddings via Transformers.js (~25 MB, already the app's
ONNX runtime). Loads lazily — only when the user has ≥10 indexed entries, so a
new user never pays for it.

**Indexing:** at write time (session close), plus a one-time backfill pass.
Every candidate goes through the eligibility filter in §6 **before** a vector is
written — ineligible entries are never embedded at all, so exclusion can't be
bypassed by a retrieval bug.

**Retrieval trigger:** on first send of a session only, not per turn. Embed the
opening entry → cosine top-k over `entryVectors` → keep matches above a
similarity floor (start 0.45, tune) → cap at 3 → cap at 150 tokens.

**Recency-decay the score.** A relevant moment from 3 days ago beats an equally
relevant one from 8 months ago; without decay, one intense old entry dominates
every future session. Suggested: `score = cosine * (0.5 ^ (ageDays / 90))`.

**Injection framing matters.** Retrieved text goes in as *the user's own past
words with a date*, never as assertion:

> Earlier (12 days ago) they wrote: "…"

Not "The user believes X." The model must be able to tell memory from fact —
this is the main defense against confident misremembering (§7).

---

## 6. Safety rules (non-negotiable)

1. **Crisis content is never eligible.** Run `detectCrisis()` on the candidate
   text at index time; `isCrisis` → do not embed, do not store, do not retrieve.
   Re-checked on every reindex (§1b).
2. **The referral guard applies to retrieved context.** Injected memory is
   context, so a reply grounded in it is subject to the same
   `referralReprompt` / `responseGuardrails` path as any other reply. No
   personalization path may bypass a guard.
3. **Never network.** No embedding API, no sync, no remote vector store. The
   embedding model is a static CDN asset like every other model; memory itself
   never leaves IndexedDB.
4. **Sub-crisis distress is eligible but never a casual callback.** An entry
   about a hard week may be retrieved; the framing in §5 keeps it quoted and
   dated rather than paraphrased as a cheerful "remember when."
5. **Erase means erase.** The existing Privacy dashboard erase path must clear
   `profile` and `entryVectors` too. A "delete my data" that leaves vectors
   behind is a privacy defect, and it's the kind that ships silently — pin it
   with a test.

---

## 7. Eval: memory correctness (before P1 ships)

`personalization.md` requires a "never confidently misremembers" dimension. Make
it concrete, reusing the M1 harness:

- **New scenario class `qb-memory-*`:** multi-session arcs where a fact is
  planted in session 1 and the model is probed in session 3.
- **Scored 0–2 on three dimensions:**
  - *recall* — does it use the planted fact when relevant?
  - *fidelity* — does it state the fact **as written**? (a paraphrase that
    changes meaning scores 0)
  - *restraint* — when the fact is **absent**, does it avoid inventing one?
    Half the cases must plant nothing; a model that confabulates a callback
    fails here even if it scores well on recall.
- **Ship bar:** fidelity and restraint have **zero tolerance for 0-scores**.
  Recall can be partial — a memory system that forgets is disappointing; one
  that confidently invents your sister's name is a product-ending bug.

Note the asymmetry deliberately mirrors the release gate's logic: capability
floors can flex, correctness floors cannot.

---

## 8. User-facing surface

Lives in the Privacy dashboard, next to the existing export/erase controls
(`PrivacyDashboard.tsx` — the same place the Inference Engine picker lives):

- **"What QuietNote remembers about you"** — the memo rendered as plain text.
- **Edit** (free-text, marks it `user`), **Regenerate**, **Delete**.
- **"Past entries it can draw on"** — count + last indexed time, with a single
  **Turn off memory** switch that stops retrieval and clears `entryVectors`.
- Copy must state plainly that this is stored on this device only.

Visual rules apply: calm, quiet chrome, no badges or celebration. `VisualCalmGuards`
covers the writing path, not Settings, but match the register anyway.

---

## 9. Sequencing when the gate lifts

1. **P1a first, standalone** — memo only, no embeddings, no new model download.
   Gate-triggering (touches the context path); carries the full eval read.
   Ships the Privacy-dashboard surface with it, because §8 is a hard rule, not
   a follow-up.
2. **P1b second** — embeddings + retrieval + the `qb-memory-*` eval. Bigger
   (new store, new model, reindex path), and it depends on P1a's budget
   accounting already being real.
3. **P2 (adapters) stays an idea.** Revisit only after P1 ships and M5's
   conversion pipeline exists — and it needs Sharang's sign-off per the
   initiative doc.

Each is several PRs, not one.

## 10. Gate status — what the eval data already says

The initiative's feasibility question ("does prompt injection work on 2B-class
models?") is **effectively answered yes**. The M1 rubric's personalization
dimension scores exactly this — use of a specific detail from an *earlier* turn:

| scenario | base E2B (M1, 07-14) | pilot fine-tune (M4a, 07-18) |
|---|---|---|
| qb-freewrite-arc | 95% | **97%** |
| qb-checkin-days | 92% | **99%** |
| qb-thoughtrecord-arc | 95% | **98%** |

M4a's transcripts were read as "genuinely engaged with real planted-detail
callbacks." In-context personal details demonstrably move the output.

**What still blocks P0 is not personalization — it's M4a's safety-floor
failure** (medical_refusal 9–11/16 against floors of 14–16). The full-data
retrain (1892 records, safety mirror 5× thicker at 193) is the fix in flight.
When an M4 rerun clears all floors, the planner opens P0 and this document
becomes its spec.

One caveat worth carrying forward: the M1 rubric's dimensions are string
heuristics, and its own baseline notes warn the transcripts read "stiff, formal,
interview-like." Scoring well on planted-detail recall is not the same as the
memory *feeling* like being known. The `qb-memory-*` scenarios in §7 should be
read by a human before P1b ships, not just scored.
