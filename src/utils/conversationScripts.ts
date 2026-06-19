/**
 * Conversation-script data model for the eval harness (Track C1, 2026-06-18).
 *
 * Why this file exists
 * --------------------
 * Every empathy case in `evalRunner.ts` is 2–3 turns and the prior assistant
 * turns are *fabricated strings* hand-written into `EvalCase.priorTurns`. The
 * model never generates the middle of a conversation, so we have never measured
 * what actually degrades over a real 10–20-turn session: does an entity from
 * turn 2 survive to turn 14 once the model's *own* (imperfect) replies are the
 * accumulated context? Does a 5-step Thought Record progress one step at a time
 * without skipping or looping?
 *
 * A `ConversationScript` is a scripted persona: a fixed sequence of user turns.
 * The driver (`conversationDriver.ts`) feeds them one at a time, threading the
 * model's REAL reply at turn k into the context for turn k+1, and scores each
 * turn. This is the instrument Problem #2's residual risk ("fixed at 3-turn
 * scale only — long-conversation behavior unmeasured") needs.
 *
 * Freeze posture: this is a NEW file. It reuses `EvalCase["passCriteria"]` by
 * import only — `evalRunner.ts`, `evalScorer.ts`, and the prompts are untouched.
 * `CONVERSATION_SCRIPTS` is a separate export from `EVAL_CASES`; per-dimension
 * sampling and `EVAL_CASES.length` are unaffected.
 *
 * Scope: scripts contain NO crisis/harm content. C1 is a capability build, not
 * a safety eval. Crisis behavior in long conversations is a later C2/C3 concern
 * routed through the untouched `crisisDetection`/guardrails, never faked here.
 */

import type { JournalingMode } from "../components/JournalingModeSelector";
import type { EvalCase } from "./evalRunner";

/**
 * One scripted user turn. The persona "says" `user`; after the model replies we
 * score that reply.
 */
export interface ScriptTurn {
  /** The user's message at this turn. */
  user: string;
  /**
   * Per-turn pass criteria (same structure as `EvalCase.passCriteria`).
   * Optional: turns with no `expect` and no `retentionProbe` are context-only —
   * they advance the conversation but are not scored.
   */
  expect?: EvalCase["passCriteria"];
  /**
   * Marks this turn as a RETENTION PROBE: a brief/ambiguous follow-up whose
   * reply must still ground in an entity established earlier. `mustContainAny`
   * is matched (case-insensitive) against the model reply. Tracked separately
   * in the report so probe pass-rate is a first-class number.
   */
  retentionProbe?: { entity: string; mustContainAny: string[] };
  /**
   * Guided-mode only: the step index (1-based) this turn belongs to. Used to
   * assert the reply references the correct step and the conversation does not
   * jump ahead or loop back.
   */
  stepIndex?: number;
}

export interface ConversationScript {
  id: string;
  mode: JournalingMode;
  description: string;
  turns: ScriptTurn[];
  /** Guided modes: total expected steps (e.g. 5 for thoughtrecord). Optional. */
  expectedSteps?: number;
}

/**
 * The hand-authored conversation scripts. Kept realistic, not adversarial —
 * the goal is to measure ordinary long-session degradation, not to trick the
 * model. Retention-probe entities always appear in an EARLIER user turn so the
 * probe is fair (asserted by `conversationScripts.test.ts`).
 */
export const CONVERSATION_SCRIPTS: ConversationScript[] = [
  // ── 1. Long freewrite with entity retention ──────────────────────────────
  // The long-form version of empathy-mt-3/mt-4, but the connective tissue is
  // the model's OWN replies, not canned `priorTurns`. Establishes "Maya / the
  // dinner" in turns 1–2, develops the conversation, then probes recall at
  // ~turn 8 and ~turn 11 with deliberately brief follow-ups.
  {
    id: "script-freewrite-retention",
    mode: "freewrite",
    description:
      "12-turn freewrite establishing sister Maya + the birthday dinner; two retention probes (brief follow-ups) must still ground in that entity.",
    turns: [
      {
        // Turn 1 — establish the entity.
        user:
          "My sister Maya and I had a falling out after our dad's birthday dinner last weekend.",
        expect: {
          maxWords: 90,
          mustNotStartWithBanned: true,
          mustNotContainAny: ["diagnos", "you have", "disorder"],
        },
      },
      {
        // Turn 2 — deepen the entity.
        user:
          "She said I always make Dad's events about myself. I just wanted the toast to go well.",
        expect: {
          maxWords: 90,
          mustNotStartWithBanned: true,
        },
      },
      {
        // Turn 3 — ordinary follow-up, scored for warmth/specificity.
        user: "I keep replaying the moment she pushed her chair back and left.",
        expect: {
          maxWords: 90,
          mustEchoPriorTurn: true,
        },
      },
      {
        // Turn 4 — context-only (advance the conversation, unscored).
        user: "We haven't spoken since. Five days now.",
      },
      {
        // Turn 5 — scored.
        user: "Part of me thinks I should just apologize even if I'm not fully in the wrong.",
        expect: {
          maxWords: 90,
          mustNotStartWithBanned: true,
        },
      },
      {
        // Turn 6 — context-only.
        user: "But another part of me is still angry she walked out in front of everyone.",
      },
      {
        // Turn 7 — scored.
        user: "How do people even start a conversation after something like this?",
        expect: {
          maxWords: 90,
        },
      },
      {
        // Turn 8 — RETENTION PROBE 1. Deliberately brief and ambiguous; the
        // reply must still ground in Maya / the dinner.
        user: "I don't know anymore.",
        retentionProbe: {
          entity: "Maya / the dinner",
          mustContainAny: ["maya", "sister", "dinner", "dad", "birthday"],
        },
      },
      {
        // Turn 9 — scored follow-up.
        user: "Maybe I do want to fix it. I miss talking to her.",
        expect: {
          maxWords: 90,
          mustNotStartWithBanned: true,
        },
      },
      {
        // Turn 10 — context-only.
        user: "I drafted a text but deleted it three times.",
      },
      {
        // Turn 11 — RETENTION PROBE 2. Another brief, low-content turn.
        user: "Yeah, exactly.",
        retentionProbe: {
          entity: "Maya / the dinner",
          mustContainAny: ["maya", "sister", "dinner", "text", "apolog"],
        },
      },
      {
        // Turn 12 — closing scored turn.
        user: "I think I'll send it tomorrow. Thanks for hearing me out.",
        expect: {
          maxWords: 90,
          mustNotStartWithBanned: true,
        },
      },
    ],
  },

  // ── 2. Thought Record — 5-step coherence ─────────────────────────────────
  // Walks the 5 CBT steps (situation → automatic thought → emotion → evidence →
  // balanced thought), mirroring THOUGHT_RECORD_SEQUENCE in journalPrompts.ts.
  // Each step turn carries `stepIndex`; the driver asserts the replies progress
  // 1→5 without skipping or looping (see conversationDriver step-coherence).
  {
    id: "script-thoughtrecord-steps",
    mode: "thoughtrecord",
    description:
      "Intro + 5 CBT steps (situation, automatic thought, emotion, evidence, balanced thought). Step turns assert monotonic 1→5 progression.",
    expectedSteps: 5,
    turns: [
      {
        // Intro — context-only, sets the scene before step 1.
        user: "I'd like to work through something with a thought record.",
      },
      {
        // Step 1 — situation. "What happened? Describe the situation briefly."
        user:
          "What happened: my manager skipped my update in the team standup this morning.",
        stepIndex: 1,
        expect: {
          maxSentences: 5,
          mustNotStartWithBanned: true,
        },
      },
      {
        // Step 2 — automatic thought. "What went through your mind?"
        user:
          "What went through my mind was 'they think my work doesn't matter and I'm going to be let go.'",
        stepIndex: 2,
        expect: {
          maxSentences: 5,
          mustContainAny: ["thought", "mind", "thinking", "believe", "tell"],
        },
      },
      {
        // Step 3 — emotion. "What emotions did you feel? How intense (1-10)?"
        user: "I felt anxious and small — maybe an 8 out of 10.",
        stepIndex: 3,
        expect: {
          maxSentences: 5,
          mustContainAny: ["feel", "felt", "emotion", "anxious", "anxiety", "intense"],
        },
      },
      {
        // Step 4 — evidence. "What evidence supports or contradicts this thought?"
        user:
          "Evidence against it: my manager praised my report on Tuesday and we just ran out of time today.",
        stepIndex: 4,
        expect: {
          maxSentences: 5,
          mustContainAny: ["evidence", "support", "contradict", "fact", "against", "for"],
        },
      },
      {
        // Step 5 — balanced thought. "What's a more balanced way to think?"
        user:
          "A more balanced thought: standups run short sometimes, and one skipped update doesn't define my standing.",
        stepIndex: 5,
        expect: {
          maxSentences: 5,
          mustContainAny: ["balanced", "perspective", "reframe", "kinder", "fair", "realistic"],
        },
      },
    ],
  },

  // ── 3. Evening check-in with late recall ─────────────────────────────────
  // Establishes a concrete daytime event early, develops the evening reflection,
  // probes recall near the end.
  {
    id: "script-checkin-retention",
    mode: "checkin",
    description:
      "10-turn evening check-in establishing a daytime presentation; one late retention probe must recall it.",
    turns: [
      {
        // Turn 1 — establish the daytime event.
        user:
          "Checking in for the evening. The big thing today was the client presentation I led at 2pm.",
        expect: {
          maxWords: 90,
          mustNotStartWithBanned: true,
        },
      },
      {
        // Turn 2 — deepen.
        user: "It went better than I feared — they asked good questions and nobody shot it down.",
        expect: {
          maxWords: 90,
        },
      },
      {
        // Turn 3 — scored.
        user: "Still, I noticed I rushed the middle section when I got nervous.",
        expect: {
          maxWords: 90,
          mustEchoPriorTurn: true,
        },
      },
      {
        // Turn 4 — context-only.
        user: "After it ended I went for a walk to decompress.",
      },
      {
        // Turn 5 — scored.
        user: "The rest of the afternoon I couldn't really focus on email.",
        expect: {
          maxWords: 90,
        },
      },
      {
        // Turn 6 — context-only.
        user: "I made a simple dinner and have been quiet since.",
      },
      {
        // Turn 7 — scored.
        user: "I'm proud I did it but also just drained.",
        expect: {
          maxWords: 90,
          mustNotStartWithBanned: true,
        },
      },
      {
        // Turn 8 — context-only.
        user: "Tomorrow's lighter, thankfully.",
      },
      {
        // Turn 9 — RETENTION PROBE. Brief; reply must recall the presentation.
        user: "What do you think the high point was?",
        retentionProbe: {
          entity: "the client presentation",
          mustContainAny: ["presentation", "client", "led", "2pm", "questions"],
        },
      },
      {
        // Turn 10 — closing scored turn.
        user: "Yeah. I'll try to rest now.",
        expect: {
          maxWords: 90,
          mustNotStartWithBanned: true,
        },
      },
    ],
  },
];
