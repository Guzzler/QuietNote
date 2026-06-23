/**
 * Tool-call eval cases + scorer — Track D1 capability spike (2026-06-22).
 *
 * 20 single-turn cases measuring three things about Gemma 4 E2B under the
 * `TOOL_GRAMMAR_INSTRUCTION` from `toolCalls.ts`:
 *   1. valid-call rate    — on the 8 tool-warranted cases, did it emit a valid
 *                           call to the expected tool (with one re-prompt retry
 *                           allowed)?
 *   2. argument accuracy  — among valid calls, were the args right?
 *   3. false-call rate    — on the 12 ordinary journaling cases, did it stay
 *                           silent? This is the spike's headline metric: a
 *                           journal that emits `<<tool:…>>` in a tender moment
 *                           is worse than no tools, so the denominator is kept
 *                           deliberately large (12 > 8).
 *
 * Pure data + scorer. Does NOT import evalRunner/evalScorer (freeze gate stays
 * empty — the C1 precedent). The runner (`scripts/run-eval.ts --tools`) drives
 * the model and feeds each parse result to `scoreToolCase`.
 */

import type { JournalingMode } from "../components/JournalingModeSelector";
import type { ToolParseResult } from "./toolCalls";

export interface ToolEvalCase {
  id: string;
  mode: JournalingMode;
  userMessage: string;
  /** true = a tool is warranted; false = ordinary turn, expect silence. */
  expectCall: boolean;
  /** When expectCall: the tool that should be called. */
  expectedTool?: string;
  /** For argument-accuracy scoring (partial/fuzzy on free-text query). */
  expectedArgs?: Record<string, string>;
}

/**
 * 20 cases: 8 tool-warranted + 12 ordinary.
 *
 * The 12 ordinary cases are the false-call guard. At least 2 are near-misses
 * that mention prompts/moods/the past in passing but do NOT warrant a tool —
 * those are where false calls hide.
 */
export const TOOL_EVAL_CASES: ToolEvalCase[] = [
  // ----- 8 tool-warranted ---------------------------------------------------
  // 3× suggest_prompt
  {
    id: "warrant-suggest-1",
    mode: "freewrite",
    userMessage: "I want to journal today but I honestly have no idea what to write about. Can you give me something to start with?",
    expectCall: true,
    expectedTool: "suggest_prompt",
    expectedArgs: { category: "self-reflection" },
  },
  {
    id: "warrant-suggest-2",
    mode: "freewrite",
    userMessage: "My mind is blank and I feel anxious about everything at once. I don't know where to begin. Give me a prompt?",
    expectCall: true,
    expectedTool: "suggest_prompt",
    expectedArgs: { category: "challenges" },
  },
  {
    id: "warrant-suggest-3",
    mode: "gratitude",
    userMessage: "I'm in gratitude mode but I'm drawing a blank — help me get started with a prompt.",
    expectCall: true,
    expectedTool: "suggest_prompt",
    expectedArgs: { category: "gratitude" },
  },
  // 3× search_past_entries
  {
    id: "warrant-search-1",
    mode: "freewrite",
    userMessage: "When did I last write about my sister? I feel like it's been a while.",
    expectCall: true,
    expectedTool: "search_past_entries",
    expectedArgs: { query: "sister" },
  },
  {
    id: "warrant-search-2",
    mode: "freewrite",
    userMessage: "Have I mentioned my job interview before in here? I can't remember if I wrote about it.",
    expectCall: true,
    expectedTool: "search_past_entries",
    expectedArgs: { query: "job interview" },
  },
  {
    id: "warrant-search-3",
    mode: "checkin",
    userMessage: "Can you look back and find what I said about Maya in my past entries?",
    expectCall: true,
    expectedTool: "search_past_entries",
    expectedArgs: { query: "Maya" },
  },
  // 2× log_mood
  {
    id: "warrant-mood-1",
    mode: "checkin",
    userMessage: "I'm feeling really anxious about tomorrow. Can you log my mood as anxious, maybe a 7?",
    expectCall: true,
    expectedTool: "log_mood",
    expectedArgs: { emotion: "anxious", intensity: "7" },
  },
  {
    id: "warrant-mood-2",
    mode: "freewrite",
    userMessage: "Please record how I feel right now — I'm deeply sad, like a 9 out of 10.",
    expectCall: true,
    expectedTool: "log_mood",
    expectedArgs: { emotion: "sad", intensity: "9" },
  },

  // ----- 12 ordinary (expect silence) --------------------------------------
  {
    id: "ordinary-reflect-1",
    mode: "freewrite",
    userMessage: "Today was long. I got through the meeting I was dreading and afterward I felt lighter, like I'd been holding my breath all morning.",
    expectCall: false,
  },
  {
    id: "ordinary-reflect-2",
    mode: "freewrite",
    userMessage: "I've been thinking about how much I've changed this year. Some of it scares me, but mostly it feels like growth.",
    expectCall: false,
  },
  {
    id: "ordinary-gratitude-1",
    mode: "gratitude",
    userMessage: "Three things I'm grateful for: the quiet of the morning, my coffee, and the call from my mom yesterday.",
    expectCall: false,
  },
  {
    id: "ordinary-gratitude-2",
    mode: "gratitude",
    userMessage: "I'm grateful for my friends who showed up for me this week even when I didn't ask.",
    expectCall: false,
  },
  {
    id: "ordinary-checkin-1",
    mode: "checkin",
    userMessage: "Morning. I slept okay. Today I want to finish the report and maybe go for a walk if the weather holds.",
    expectCall: false,
  },
  {
    id: "ordinary-checkin-2",
    mode: "checkin",
    userMessage: "Evening check-in: it was a tiring day but I'm proud I stuck to my plan and didn't skip the gym.",
    expectCall: false,
  },
  {
    id: "ordinary-thoughtrecord-1",
    mode: "thoughtrecord",
    userMessage: "The situation: my manager gave me feedback in front of the team and I felt my face go hot.",
    expectCall: false,
  },
  {
    id: "ordinary-thoughtrecord-2",
    mode: "thoughtrecord",
    userMessage: "A more balanced thought might be that one piece of feedback doesn't erase the good work I've done all quarter.",
    expectCall: false,
  },
  {
    id: "ordinary-emotion-1",
    mode: "freewrite",
    userMessage: "I keep replaying the argument with my partner. I don't even know what I'm feeling — angry, hurt, tired of the same loop.",
    expectCall: false,
  },
  {
    id: "ordinary-emotion-2",
    mode: "freewrite",
    userMessage: "There's a heaviness today I can't quite name. Nothing happened, exactly. It's just there.",
    expectCall: false,
  },
  // Near-miss #1: narrating a mood is NOT a request to log one.
  {
    id: "ordinary-nearmiss-mood",
    mode: "checkin",
    userMessage: "I felt really happy today and I'm grateful for it — it's been a while since a day felt this easy.",
    expectCall: false,
  },
  // Near-miss #2: reflecting on the past is NOT a request to search it.
  {
    id: "ordinary-nearmiss-past",
    mode: "freewrite",
    userMessage: "I keep thinking about what I wrote yesterday about letting go. It's still sitting with me today.",
    expectCall: false,
  },
];

export interface ToolCaseScore {
  /** For expectCall cases: a valid call to the expected tool was emitted. */
  validCallMade: boolean;
  /** For expectCall cases with a valid call: were the args accurate? null otherwise. */
  argAccurate: boolean | null;
  /** For !expectCall cases: any tool call emitted at all. */
  falseCall: boolean;
}

/**
 * Argument-accuracy check. Exact match for `category`/`emotion`/`intensity`;
 * fuzzy (case-insensitive substring either direction) for the free-text
 * `query`, since the model paraphrasing "sister" as "my sister" is still
 * correct.
 */
function argsAccurate(expected: Record<string, string>, actual: Record<string, string>): boolean {
  for (const [key, expVal] of Object.entries(expected)) {
    const actVal = actual[key];
    if (actVal === undefined) return false;
    if (key === "query") {
      const a = actVal.toLowerCase().trim();
      const e = expVal.toLowerCase().trim();
      if (!(a.includes(e) || e.includes(a))) return false;
    } else if (actVal !== expVal) {
      return false;
    }
  }
  return true;
}

/**
 * Score one case against a parse result.
 *
 * - expectCall: `validCallMade` iff a valid call to `expectedTool` is present;
 *   `argAccurate` compares the first such call's args (null when no valid call).
 * - !expectCall: `falseCall` iff ANY tool call was emitted at all (valid OR
 *   invalid — even a malformed `<<tool:…>>` line leaking into a tender moment
 *   is the failure we're guarding against).
 */
export function scoreToolCase(c: ToolEvalCase, parse: ToolParseResult): ToolCaseScore {
  if (!c.expectCall) {
    return {
      validCallMade: false,
      argAccurate: null,
      falseCall: parse.calls.length > 0,
    };
  }

  const match = parse.validCalls.find((call) => call.name === c.expectedTool);
  const validCallMade = match !== undefined;
  let argAccurate: boolean | null = null;
  if (validCallMade && c.expectedArgs) {
    argAccurate = argsAccurate(c.expectedArgs, match!.args);
  }
  return { validCallMade, argAccurate, falseCall: false };
}
