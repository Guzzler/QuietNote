/**
 * Quality-bar 10-turn scenarios (model-quality M1, 2026-07-14).
 *
 * Encodes the quality bar Sharang set 2026-07-12: three scored 10-turn
 * scenarios — a freewrite emotional arc, a checkin-across-days arc with
 * callbacks, and a thoughtrecord CBT arc. Each scenario PLANTS specific
 * details in early turns (a name, a deadline, a recurring worry) so the
 * personalization dimension is objectively checkable: later turns declare a
 * `callback` whose terms must come from an EARLIER turn.
 *
 * The scenarios are `ConversationScript`s (reusing the C1 driver, which
 * threads the model's REAL replies through the context) plus a parallel
 * per-turn rubric metadata array consumed by `qualityBarRubric.ts`.
 *
 * Freeze posture: NEW file. `CONVERSATION_SCRIPTS`, `EVAL_CASES`, prompts,
 * and gate floors untouched. No crisis/harm content — safety behavior is
 * measured by the (unchanged) release gate, not here.
 */

import type { ConversationScript } from "./conversationScripts";

export interface QualityBarTurnMeta {
  /** Detail terms this turn introduces (documentation; fairness-tested). */
  plants?: string[];
  /**
   * Personalization callback: the reply at THIS turn should ground in a
   * detail planted at an earlier turn (0-based index). `strongTerms` = full
   * pass (2); `weakTerms` = partial (1) — a generic reference that shows
   * memory but drops the specific. Turns without `callback` are not scored
   * on personalization. The callback terms must NOT appear in this turn's
   * own user text (else the model could echo instead of recall).
   */
  callback?: {
    plantedAtTurn: number;
    strongTerms: string[];
    weakTerms?: string[];
  };
  /**
   * Contradiction markers for the continuity dimension: strings whose
   * presence in the reply means the model got a planted fact WRONG
   * (misremembered name, flipped outcome). Continuity scores 0 on a hit.
   */
  continuityBans?: string[];
}

export interface QualityBarScenario {
  script: ConversationScript;
  /** Parallel to `script.turns`. */
  meta: QualityBarTurnMeta[];
}

export const QUALITY_BAR_SCENARIOS: QualityBarScenario[] = [
  // ── 1. Freewrite emotional arc ──────────────────────────────────────────
  // Interview-week anxiety → the interview happens → mixed aftermath.
  // Plants: Priya (the hiring manager), Thursday (the interview day), the
  // design portfolio. The arc resolves ambiguously — a real emotional line,
  // not a victory lap.
  {
    script: {
      id: "qb-freewrite-arc",
      mode: "freewrite",
      description:
        "10-turn freewrite: interview-week anxiety arc with planted details (Priya, Thursday, portfolio) and two callback turns.",
      turns: [
        {
          user:
            "I have a job interview on Thursday and I can't think about anything else. It's for a senior design role.",
        },
        {
          user:
            "The hiring manager is named Priya. She seemed warm on the phone but I keep replaying everything I said and finding flaws.",
        },
        {
          user:
            "I spent all evening rearranging my portfolio instead of sleeping. Moved the case studies around four times and it might be worse now.",
        },
        {
          user: "I don't even know why this one matters so much to me.",
        },
        {
          user:
            "I think it's because I've been feeling invisible at my current job for over a year. Nobody there has looked at my work, really looked, in months.",
        },
        {
          user: "Tomorrow's the day. Can't tell if I'm excited or terrified.",
        },
        {
          user:
            "It happened. I rambled on the second question but she laughed at my joke about spreadsheets. I have no idea how it went.",
        },
        {
          user: "Now comes the waiting. I hate waiting.",
        },
        {
          user:
            "Part of me is already rehearsing the rejection so it won't hurt. Is that self-protection or just giving up early?",
        },
        {
          user:
            "Either way, I noticed one thing: I did the scary thing this week. That has to count for something.",
        },
      ],
    },
    meta: [
      { plants: ["interview", "Thursday", "senior design role"] },
      { plants: ["Priya"] },
      { plants: ["portfolio", "case studies"] },
      {},
      { plants: ["invisible", "current job"] },
      {
        // "Tomorrow's the day" — the reply should know WHICH day/what happens.
        callback: {
          plantedAtTurn: 0,
          strongTerms: ["interview"],
          weakTerms: ["thursday", "big day"],
        },
      },
      {
        // "It happened … she laughed" — should ground "she" = Priya.
        callback: {
          plantedAtTurn: 1,
          strongTerms: ["priya"],
          weakTerms: ["hiring manager", "the manager"],
        },
        continuityBans: ["didn't go", "went badly", "you bombed"],
      },
      {},
      {},
      {
        // Closing reflection — should tie back to the arc's specifics.
        callback: {
          plantedAtTurn: 0,
          strongTerms: ["interview"],
          weakTerms: ["thursday", "priya", "portfolio"],
        },
      },
    ],
  },

  // ── 2. Check-in across days with callbacks ─────────────────────────────
  // A recurring worry (the Harlow report deadline), poor sleep, one named
  // support (Dan). Simulates consecutive daily check-ins in one session —
  // the "journal that gets to know you" behavior the positioning sells.
  {
    script: {
      id: "qb-checkin-days",
      mode: "checkin",
      description:
        "10-turn check-in across simulated days: recurring deadline worry (the Harlow report), sleep thread, friend Dan; three callback turns.",
      turns: [
        {
          user:
            "Checking in. Tense today — the Harlow report is due Friday and I'm behind on it.",
        },
        {
          user:
            "Slept badly, maybe five hours. My brain kept drafting report sections at 2am.",
        },
        {
          user:
            "A bit better this morning. My friend Dan called and we walked by the river for an hour. First real exhale in days.",
        },
        {
          user: "Back to tense. Found an error in my data section this afternoon.",
        },
        {
          user: "Next day check-in. Still tired but I fixed the error last night.",
        },
        {
          user: "Feeling flat today. Not sad exactly, just gray.",
        },
        {
          user: "Deadline's tomorrow. Weirdly calm about it now?",
        },
        {
          user: "I submitted it. It's done.",
        },
        {
          user:
            "Today I feel strangely empty instead of relieved. I expected to feel lighter.",
        },
        {
          user: "Last check-in of the week. How do I not end up here again next time?",
        },
      ],
    },
    meta: [
      { plants: ["Harlow report", "Friday"] },
      { plants: ["five hours", "2am"] },
      { plants: ["Dan", "river", "walk"] },
      { plants: ["error", "data section"] },
      {
        // "fixed the error" — reply should keep the report thread coherent.
        callback: {
          plantedAtTurn: 0,
          strongTerms: ["harlow", "report"],
          weakTerms: ["deadline", "friday"],
        },
      },
      {},
      {
        // "Deadline's tomorrow" — should know it's the Harlow report.
        callback: {
          plantedAtTurn: 0,
          strongTerms: ["harlow", "report"],
          weakTerms: ["friday"],
        },
        continuityBans: ["harlow meeting", "harlow presentation"],
      },
      {},
      {},
      {
        // "how do I not end up here again" — should recall what actually
        // helped (Dan / the walk) or the sleep pattern, not generic advice.
        callback: {
          plantedAtTurn: 2,
          strongTerms: ["dan", "walk", "river"],
          weakTerms: ["sleep", "friend"],
        },
      },
    ],
  },

  // ── 3. Thought-record CBT arc ────────────────────────────────────────────
  // One stressful thought worked through CBT-style: situation → automatic
  // thought → evidence for → evidence against → balanced thought → plan.
  // Plants: Marcus (the colleague), the standup, the frozen moment.
  {
    script: {
      id: "qb-thoughtrecord-arc",
      mode: "thoughtrecord",
      description:
        "10-turn thought record: 'I froze in standup, everyone thinks I'm incompetent' worked through a CBT arc; planted details Marcus/standup; two callback turns.",
      turns: [
        {
          user:
            "I want to work through something. I froze in the middle of standup this morning — lost my thread mid-sentence in front of the whole team.",
        },
        {
          user:
            "The thought stuck in my head is: everyone now thinks I'm incompetent.",
        },
        {
          user:
            "When I believe it, it's about a 90. My chest goes tight and I want to hide.",
        },
        {
          user:
            "Evidence for it... Marcus looked down at his laptop while I was struggling. And nobody said anything after.",
        },
        {
          user:
            "Evidence against? I guess people lose their thread sometimes. My last review was strong.",
        },
        {
          user:
            "Also, honestly, Marcus checks his laptop during everyone's updates. I've seen him do it to the team lead.",
        },
        {
          user: "So what would a more balanced version of the thought be?",
        },
        {
          user:
            "Maybe: I had an awkward thirty seconds, and one awkward moment doesn't erase how my work is actually seen.",
        },
        {
          user: "Believability of the old thought now... maybe a 45.",
        },
        {
          user:
            "What should I actually do tomorrow morning when I walk into that room again?",
        },
      ],
    },
    meta: [
      { plants: ["standup", "froze", "lost my thread"] },
      { plants: ["incompetent"] },
      { plants: ["90", "chest"] },
      { plants: ["Marcus", "laptop"] },
      { plants: ["last review"] },
      { continuityBans: ["marcus said", "marcus told you"] },
      {
        // "A more balanced version?" — should ground in the ACTUAL evidence
        // gathered (the strong review / the Marcus-laptop reinterpretation),
        // not generic reframing.
        callback: {
          plantedAtTurn: 4,
          strongTerms: ["review"],
          weakTerms: ["marcus", "laptop"],
        },
      },
      {},
      { continuityBans: ["you said 90 now", "still a 90"] },
      {
        // The plan turn — should reference the actual situation (standup),
        // not a generic morning routine.
        callback: {
          plantedAtTurn: 0,
          strongTerms: ["standup"],
          weakTerms: ["meeting", "team", "thread"],
        },
      },
    ],
  },
];
