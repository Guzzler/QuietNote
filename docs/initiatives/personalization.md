# Initiative: personalization (local memory → profile injection → adapters)

**Created 2026-07-12 (interactive, Sharang).** The positioning decision in
[`model-quality.md`](model-quality.md) says the thing to sell is a
PERSONALIZED journaling experience; this initiative is how the app earns
that word beyond a single session. Sequencing set by Sharang 2026-07-12:

1. **First** a strong proof-of-concept model for the journaling use case in
   general (model-quality M0–M5 — that initiative's quality bar gates this
   one).
2. **Then** a personalization layer on top: initially prompting only —
   store local data (profile memo, past-entry retrieval), inject it into
   prompts — *if that works for such small models*.
3. **Future**: possibly swapping LoRA adapters in some way (MediaPipe's LLM
   API can load adapters at runtime on GPU → personalization by adapter
   *selection*, never per-user training).

**Mission:** the companion demonstrably knows the journaler across sessions
— recalls relevant past entries, tracks recurring people/stressors, adapts
register — with every byte of that memory in IndexedDB. The unique claim:
cloud journals must read your entries to personalize; QuietNote personalizes
*because* everything stays local.

## Feasibility gate (answered by model-quality M1 — no work here before it)

The "does prompt injection work on 2B-class models" question is exactly what
M1's 10-turn scenarios measure (personalization rubric dimension: does the
model use planted details from earlier context?). Read the M1 baseline +
M4 fine-tuned scores before designing anything here. If even the fine-tuned
model can't use in-context personal details reliably, P1 needs a rethink,
not a build.

## Planned shape (not yet queued — activates when model-quality's bar is met)

| id | what | status |
|---|---|---|
| P0 | Design doc: memory schema (what gets stored/distilled), retrieval trigger, context budget split (~150–250 tokens for the profile memo inside `MODEL_CONTEXT_LIMIT` 4096), safety rules below | gated on model-quality bar |
| P1a | Profile memo: local LLM periodically distills recent entries → compact "about you" memo in IndexedDB, injected into the system prompt; user can view/edit/delete it (it's THEIR profile) | after P0 |
| P1b | Entry retrieval: small embedding model in-browser (MiniLM-class via Transformers.js, ~25 MB), embed entries at write time → IndexedDB vectors; retrieve top 2–3 relevant past moments into the prompt | after P0; can land before or after P1a |
| P2 | Adapter selection (future, NOT committed): differently-flavored LoRA adapters (tone/depth/mode) swapped on-device via MediaPipe runtime loading, chosen from the local profile | idea only — revisit after P1 ships and M5's conversion pipeline exists |

## Hard rules (from day one, non-negotiable)

- **Local-only, always**: memos, embeddings, retrieval — all IndexedDB.
  Nothing personalization-related ever makes a network call. Training data
  for any adapter remains synthetic — no real user text, ever.
- **Crisis content never resurfaces as casual callback material**: retrieval
  must exclude (or guardrail-filter) entries flagged by crisis detection;
  the referral guard applies to retrieved context too.
- **Memory correctness is evaluated**: the eval gets a dimension for "never
  confidently misremembers what the user wrote" before P1 ships.
- **User owns the memory**: visible, editable, deletable in Settings —
  a profile the user can't see is surveillance, even on-device.

## Task queue

(empty — gated on model-quality's quality bar; the planner opens P0 when
M4 clears it)

## Ledger

| date | item | PR | outcome |
|---|---|---|---|

## Blocked on Sharang

- Nothing yet. P2 (adapters) will need his sign-off before any commitment.
