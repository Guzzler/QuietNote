/**
 * Tool-call grammar + pure parser/validator — Track D1 capability spike
 * (2026-06-22, eval-only).
 *
 * This is the greenfield first step of Track D (local tool-calling). It is
 * deliberately scoped to PARSE + VALIDATE only: no UI, no execution, no
 * storage, no React. The D1 spike's whole question is whether Gemma 4 E2B can
 * emit a single-line, ultra-constrained call grammar reliably enough — and,
 * more importantly, stay SILENT on ordinary journaling turns — to be worth
 * building a framework around (D2). The gate is measured by the Node eval in
 * `toolCallEval.ts` + the `--tools` flag in `scripts/run-eval.ts`.
 *
 * Design lineage:
 *   - The 2026-03-12 design (`docs/design/tool-calling-architecture.md`) chose
 *     a one-line grammar over free JSON precisely because a 2B-class model
 *     can't be trusted with nested structured output. We keep that decision.
 *   - The malformed-call retry mirrors the Day-9 `responseShaping.ts` precedent
 *     exactly: detect a bad shape → append a corrective instruction → regen
 *     once. `TOOL_REPROMPT_INSTRUCTION` is the analogue of
 *     `DEFLECTION_REPROMPT_INSTRUCTION`.
 *
 * Freeze-gate note: this is a NEW file. `evalRunner.ts`, `evalScorer.ts` and
 * `src/prompts/*` stay byte-identical (the C1 precedent). The grammar
 * instruction is injected ONLY by the eval runner at runtime via string
 * concatenation — never written into `systemPrompts.ts`.
 */

import { getAllCategories } from "../data/journalPrompts";
import type { MoodEmotion } from "../types";

// ---------------------------------------------------------------------------
// Tool domain — imported, never hardcoded to a divergent set.
// ---------------------------------------------------------------------------

/**
 * The canonical prompt categories, derived at runtime from the real
 * `JOURNAL_PROMPTS` data (same source `suggest_prompt` would read from). Do
 * NOT invent categories here — if the data changes, this validation tracks it.
 */
export const VALID_PROMPT_CATEGORIES: readonly string[] = getAllCategories();

/**
 * The 10 canonical mood emotions from `types.ts`. Kept as a runtime array for
 * validation; the `satisfies` clause makes a divergence from `MoodEmotion` a
 * compile error.
 */
export const VALID_MOOD_EMOTIONS = [
  "happy",
  "sad",
  "anxious",
  "angry",
  "calm",
  "excited",
  "frustrated",
  "content",
  "lonely",
  "grateful",
] as const satisfies readonly MoodEmotion[];

/** The fixed allow-list of tool names the spike recognises. */
export const TOOL_NAMES = ["suggest_prompt", "search_past_entries", "log_mood"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

/**
 * Per-tool argument spec. `required` lists the keys that must be present;
 * `validateArg` checks a single value against its domain. Unknown args (keys
 * not in `required`) make the whole call invalid — a model that pads a call
 * with junk args is not reliably callable.
 */
interface ToolSpec {
  required: readonly string[];
  validateArg: (key: string, value: string) => boolean;
}

const TOOL_SPECS: Record<ToolName, ToolSpec> = {
  suggest_prompt: {
    required: ["category"],
    validateArg: (key, value) =>
      key === "category" && VALID_PROMPT_CATEGORIES.includes(value),
  },
  search_past_entries: {
    // Free-text query — any non-empty string is in-domain.
    required: ["query"],
    validateArg: (key, value) => key === "query" && value.trim().length > 0,
  },
  log_mood: {
    required: ["emotion", "intensity"],
    validateArg: (key, value) => {
      if (key === "emotion") return (VALID_MOOD_EMOTIONS as readonly string[]).includes(value);
      if (key === "intensity") {
        // Integer 1–10, no decimals, no leading-zero weirdness beyond parseInt.
        if (!/^\d+$/.test(value)) return false;
        const n = Number(value);
        return Number.isInteger(n) && n >= 1 && n <= 10;
      }
      return false;
    },
  },
};

// ---------------------------------------------------------------------------
// Parse result types
// ---------------------------------------------------------------------------

export interface ParsedToolCall {
  name: string;
  args: Record<string, string>;
  raw: string; // the exact source line, for diagnostics
}

export interface ToolParseResult {
  /** Syntactically well-formed `<<tool:…>>` lines found (name + parsed args). */
  calls: ParsedToolCall[];
  /** Calls that ALSO pass name + arg validation. */
  validCalls: ParsedToolCall[];
  /** Well-formed shape but bad name/arg → the retry candidates. */
  invalidCalls: ParsedToolCall[];
  /** Response with every tool-call line removed — what would render to the user. */
  strippedText: string;
}

// ---------------------------------------------------------------------------
// Grammar
// ---------------------------------------------------------------------------
//
//   <<tool:NAME arg=value arg=value>>
//
// - On its own line, nothing else on that line (leading/trailing whitespace ok).
// - NAME is a bare identifier.
// - Args are key=value, space-separated. A value is either a single
//   non-space token or a "double-quoted string" (which may contain spaces).
//
// The line matcher is intentionally permissive about the *name* and *args*
// (it captures anything shaped like a call) so that a wrong tool name or bad
// arg is surfaced as an `invalidCall` (retry candidate) rather than silently
// dropped as prose. Validation — not parsing — is where the allow-list bites.

// Matches a whole line that is exactly a tool call. The inner `[\s\S]*?` is
// constrained by the line anchors below (we match per-line), so it cannot eat
// across lines.
const TOOL_LINE_RE = /^[ \t]*<<tool:([a-zA-Z_][a-zA-Z0-9_]*)((?:\s+[^>]*?)?)>>[ \t]*$/;

// Matches one `key=value` pair where value is a quoted string OR a bare token.
const ARG_RE = /([a-zA-Z_][a-zA-Z0-9_]*)=(?:"([^"]*)"|(\S+))/g;

function parseArgs(argStr: string): Record<string, string> {
  const args: Record<string, string> = {};
  let m: RegExpExecArray | null;
  ARG_RE.lastIndex = 0;
  while ((m = ARG_RE.exec(argStr)) !== null) {
    const key = m[1];
    // m[2] is the quoted-string capture (may be ""), m[3] the bare token.
    const value = m[2] !== undefined ? m[2] : m[3];
    args[key] = value;
  }
  return args;
}

/**
 * Validate a single parsed call against the allow-list and its arg domain.
 * Returns `{ valid: false, reason }` on the first problem found.
 */
export function validateToolCall(call: ParsedToolCall): { valid: boolean; reason?: string } {
  if (!(TOOL_NAMES as readonly string[]).includes(call.name)) {
    return { valid: false, reason: `unknown tool name: ${call.name}` };
  }
  const spec = TOOL_SPECS[call.name as ToolName];

  // All required args present.
  for (const key of spec.required) {
    if (!(key in call.args)) {
      return { valid: false, reason: `missing required arg: ${key}` };
    }
  }
  // No unknown args, and every present arg is in-domain.
  for (const [key, value] of Object.entries(call.args)) {
    if (!spec.required.includes(key)) {
      return { valid: false, reason: `unknown arg: ${key}` };
    }
    if (!spec.validateArg(key, value)) {
      return { valid: false, reason: `out-of-domain value for ${key}: ${value}` };
    }
  }
  return { valid: true };
}

/**
 * Parse a model response into tool calls + display text.
 *
 * Scans line by line; any line matching the grammar is extracted as a call and
 * removed from `strippedText`. Each call is bucketed into valid/invalid by
 * `validateToolCall`. Lines that merely *look* tool-ish (e.g. free JSON
 * `{"tool":…}`) do NOT match the grammar and stay as prose — they are not
 * counted as calls at all (so they can't inflate the false-call metric as a
 * "call"; they'd just be a normal generation).
 */
export function parseToolCalls(response: string): ToolParseResult {
  const calls: ParsedToolCall[] = [];
  const displayLines: string[] = [];

  for (const line of response.split("\n")) {
    const m = TOOL_LINE_RE.exec(line);
    if (m) {
      const name = m[1];
      const args = parseArgs(m[2] ?? "");
      calls.push({ name, args, raw: line.trim() });
      // line is consumed — not added to display text
    } else {
      displayLines.push(line);
    }
  }

  const validCalls: ParsedToolCall[] = [];
  const invalidCalls: ParsedToolCall[] = [];
  for (const c of calls) {
    if (validateToolCall(c).valid) validCalls.push(c);
    else invalidCalls.push(c);
  }

  // Collapse the blank lines a removed call leaves behind so display prose
  // reads cleanly, then trim the ends.
  const strippedText = displayLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { calls, validCalls, invalidCalls, strippedText };
}

// ---------------------------------------------------------------------------
// Prompt beats (injected ONLY by the eval runner, never in systemPrompts.ts)
// ---------------------------------------------------------------------------

/**
 * The grammar-teaching beat. Concatenated onto the base system instruction at
 * runtime by `run-eval.ts` under the `--tools` flag. The "most turns need NO
 * tool" clause is the load-bearing part — it is exactly what the false-call
 * metric tests.
 */
export const TOOL_GRAMMAR_INSTRUCTION = [
  "TOOLS (optional — most turns need NONE):",
  "When — and only when — a tool would clearly help the writer, you may emit ONE tool call on its own line, formatted EXACTLY as:",
  "<<tool:NAME arg=value arg=value>>",
  "Use a double-quoted string for any value containing spaces.",
  "",
  "Available tools:",
  '- suggest_prompt category=CATEGORY   — when the writer is stuck or asks for help starting. CATEGORY is one of: ' +
    VALID_PROMPT_CATEGORIES.join(", ") +
    ".",
  '- search_past_entries query="TEXT"   — when the writer asks about their own past entries ("when did I last write about…", "have I mentioned…").',
  "- log_mood emotion=EMOTION intensity=N   — when the writer explicitly asks to record/log how they feel. EMOTION is one of: " +
    VALID_MOOD_EMOTIONS.join(", ") +
    "; intensity is an integer 1-10.",
  "",
  "CRITICAL: Most journaling turns need NO tool. Only emit a call when it is clearly useful. NEVER emit tool syntax during ordinary reflection, gratitude lists, or emotional sharing. Narrating a feeling is NOT a request to log it; mentioning the past is NOT a request to search it. When in doubt, respond normally with NO tool call.",
  "",
  "Examples:",
  'Writer: "I want to write but I have no idea where to start today."',
  "You: <<tool:suggest_prompt category=" +
    (VALID_PROMPT_CATEGORIES[0] ?? "self-reflection") +
    ">>",
  "",
  'Writer: "I felt really happy at dinner tonight and I\'m grateful for my friends."',
  "You: (no tool — just respond warmly to what they shared.)",
].join("\n");

/**
 * The one-shot corrective instruction appended on the malformed-call retry.
 * Mirrors `DEFLECTION_REPROMPT_INSTRUCTION`: a single user-side nudge, taken
 * once, no loops. Used by the runner only when the first pass produced an
 * invalid-but-well-formed call and no valid call.
 */
export const TOOL_REPROMPT_INSTRUCTION =
  "Your previous reply contained a malformed or invalid tool call. " +
  "If a tool is warranted, emit exactly ONE correctly-formatted call on its own line " +
  "(<<tool:NAME arg=value>>) using only the allowed tool names, argument keys, and value domains. " +
  "If no tool is actually warranted, respond normally with NO tool call.";
