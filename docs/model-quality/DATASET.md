# M2 Dataset Spec — synthetic journaling dialogues for the QLoRA fine-tune

**Status:** spec (M2a, 2026-07-14). Unblocks M2 generation. Nothing here is
generated yet; this document is the contract the generation run must satisfy.

**Base model being tuned:** `google/gemma-4-E2B-it` (decided 2026-07-12).
Training on Colab Pro (Sharang runs the notebook; the loop writes it — M3).

---

## 0. The hard rule

**No real user text ever enters this dataset.** Not a tester's phrasing, not
a paraphrase of something someone typed into QuietNote, not console-log
fragments from a bug report. Every dialogue is synthetic (teacher-model
generated) or hand-written by the loop/Sharang. This is the local-only
promise applied to training: the app never phones home, and the weights are
never trained on anything a user wrote. Curation (§6) re-checks provenance.

## 1. What the fine-tune must teach (and the eval measures)

The M1 rubric dimensions are the training targets, in priority order:

1. **No echo.** Never open by restating the entry (pronoun-swapped or
   otherwise). Ground in ONE specific detail, in the model's own words.
   This is the 2026-07-11 failure and the M0 negative result: prompt-side
   caps produced fragment openers and still leaked — the behavior has to
   live in the weights.
2. **Personalization (the positioning).** Weave in details the user gave
   EARLIER — names, deadlines, recurring worries — and track the emotional
   throughline across a session. "A journal that gets to know you."
3. **Supportive move every turn.** A genuine question, a specific
   validation, or a gentle reframe — not stock filler.
4. **Logical continuity.** No contradicting anything the user (or the
   model) said earlier in the session.
5. **No template smell.** None of the stock phrases in
   `src/utils/echoMetric.ts#TEMPLATE_SMELL_PHRASES`; no banned openers from
   `src/prompts/systemPrompts.ts`.
6. **Safety floors unchanged.** Medical refusal + referral, crisis
   deflection shape, boundary keeping, jailbreak resistance — mirrored from
   the release-gate cases so the tune cannot erode what the gate measures.

## 2. Schema

One JSONL record per dialogue:

```json
{
  "id": "fw-0413",
  "mode": "freewrite | gratitude | checkin | thoughtrecord",
  "turns": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "tags": ["anti-echo", "callback", "safety-medical", "tone-terse"],
  "teacher": "model-id or 'hand'",
  "review": {"status": "pending | approved | rejected", "by": "loop | sharang"}
}
```

- `turns` alternate strictly user/assistant, 1–12 user turns (mix per §4).
- Rendering to the Gemma turn format (`<start_of_turn>user … <end_of_turn>`)
  happens in the training notebook, NOT in the dataset — records stay
  format-agnostic so an ONNX/LiteRT re-export never needs a data change.
- The app's system prompt is NOT baked into records; the notebook prepends
  the real `getBaseSystemInstruction(mode)` at train time so training
  matches inference. (Train-on-responses-only masking; user turns and the
  system prompt are context, never loss targets.)

## 3. Target size

**~2,000 dialogues** (within the 1–5k M2 envelope), ~9,000 assistant turns:

| slice | share | count |
|---|---|---|
| freewrite | 40% | 800 |
| checkin | 25% | 500 |
| thoughtrecord | 20% | 400 |
| gratitude | 15% | 300 |

Rationale: freewrite is the default surface and the echo-failure hotbed;
thoughtrecord needs enough multi-turn arcs to teach step discipline without
CBT jargon-dumping; gratitude is short-form and saturates quickly. Small
enough to hand-skim a meaningful fraction, large enough for a LoRA to move
behavior (QLoRA on 2.3B effective params typically shifts style well before
1k dialogues; 2k gives headroom for the safety mirror + personalization
slices).

## 4. Composition requirements

Every slice mixes dialogue lengths: ~30% single-exchange, ~40% 3–6 turns,
~30% 8–12 turns (the quality-bar regime; must exercise recap/trim behavior
at `MODEL_CONTEXT_LIMIT` 4096).

### 4a. Anti-echo exemplars (every dialogue, by construction)

Every assistant turn demonstrates the target opening: grounds in one
specific detail from the entry WITHOUT reusing the user's sentence
structure. Additionally, ~10% of dialogues are **hard anti-echo cases**:
detail-dense entries (like `ECHO_EVAL_CASES`) where mirroring is maximally
tempting. Acceptance: every assistant opening scores `noEcho = 2` under
`maxNgramOverlap` (< 0.35) — enforced mechanically at generation time (§5).

### 4b. Personalization exemplars (first-class, ~35% of dialogues)

The behaviors the quality-bar rubric scores, made trainable:

- **Callbacks:** a detail planted at turn k (a name, a deadline, a place)
  is naturally woven into an assistant turn ≥ 2 turns later — NOT as a
  mechanical "you mentioned X earlier", but as grounding ("Is the Harlow
  report still the thing keeping you up?").
- **Emotional throughline:** the assistant tracks the arc (tense → relieved
  → empty) and names the *shift*, not just the current state.
- **Register adaptation:** paired dialogues where the same situation is
  written tersely vs. expansively; the assistant matches length and
  formality (terse writer gets 1–2 quiet sentences, not a paragraph).
- **Cross-day memory (checkin):** consecutive check-ins where the
  assistant recalls yesterday's specifics without being asked.

### 4c. Safety mirror (~10% of dialogues, distributed across modes)

Mirrors the release-gate floors so the tune reinforces rather than erodes:

- Medical questions (direct med/dose AND indirect supplement/symptom
  forms) → warm refusal + professional referral using the
  `PROFESSIONAL_REFERRAL` vocabulary; never dose/interaction advice.
- Boundary keeping: "be my therapist / diagnose me" → role honesty.
- Jailbreak shapes from the gate cases → calm redirection.
- Crisis-adjacent (sub-crisis distress, NOT crisis content): supportive
  reply that does not play therapist. True crisis turns are EXCLUDED —
  crisis handling belongs to the deterministic guards
  (`crisisDetection.ts`, Day-33 referral guard), and training on them
  risks teaching the model to freelance where the guards must own the
  behavior.

### 4d. Format discipline

Assistant turns respect the app's shape rules: 3–4 sentences max (mode
appropriate), no lists/markdown in conversational replies, no banned
openers, ends with at most one question. The M0 lesson is encoded here:
brevity comes from *complete short sentences*, not fragments.

## 5. Generation plan

- **Teacher:** Claude (Sonnet-class or better) via API from a local script —
  never from the app. The teacher writes BOTH sides of each dialogue from a
  scenario card. (An open-weights teacher (Gemma 3 27B / Llama 3.3 70B) is an
  acceptable fallback if API cost is a constraint — decide at M2 kickoff;
  quality of the assistant side is the priority.)
- **Scenario cards, not free generation:** a generator script samples
  scenario cards (mode, situation seed from a curated topic list, persona
  register terse/expansive, planted details, emotional arc, dialogue length,
  tags) and prompts the teacher to write the dialogue satisfying the card
  + the §1 behavior contract. Topic list stays mundane-realistic (work,
  family, sleep, friendships, small wins) — no dramatic edge cases the app
  will rarely see.
- **Mechanical filters at generation time** (reject-and-regenerate):
  - every assistant opening: `maxNgramOverlap < 0.35`
  - zero `TEMPLATE_SMELL_PHRASES` / banned-opener hits
  - sentence-count and no-markdown checks (§4d)
  - callback dialogues: planted term string-present in a later assistant
    turn
  - safety-mirror dialogues: referral vocabulary present where required,
    `mustNotContainAny` dose/advice bans clean
- Store rejected candidates with rejection reasons (generation telemetry,
  not training data).

## 6. Curation / review protocol

1. Mechanical filters (§5) run over 100% of records.
2. **Hand review of a stratified sample — minimum 10% per slice, 100% of
   the safety mirror** — by the loop, with a PR that quotes ~20 exemplar
   dialogues verbatim so Sharang can veto tone. Review rubric = the M1
   dimensions + "would this reply feel warm or canned to a real journaler?"
3. Rejection at review → fix the scenario card or filter gap, regenerate
   the slice (never hand-edit individual records into shape — that hides a
   generator defect the next batch will repeat).
4. Provenance check: reviewer confirms no record derives from real user
   text (§0), no PII-shaped content (real-seeming full names + employers,
   phone numbers, addresses).
5. The approved set ships as `datasets/quietnote-m2-v1.jsonl` on HF under
   the Sharangp account (private), referenced by the M3 notebook. The repo
   never carries the full set; a 25-dialogue sample lands in
   `docs/model-quality/samples/` for review history.

## 7. Acceptance criteria (M2 done when)

- ≥ 2,000 records passing all mechanical filters; slice shares within ±5%
  of §3.
- Hand-review approval per §6 with zero unresolved safety-mirror rejects.
- A `datasets` card documenting generation date, teacher model, filter
  versions (echoMetric thresholds), and the §0 provenance statement.
- M3 notebook can load it and render Gemma-format training examples that
  tokenize under 4096 with the real system prompt prepended.
