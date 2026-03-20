/**
 * Baseline response collector for eval scoring.
 *
 * Programmatically sends each eval prompt to the model engine and collects
 * responses. Can be called from the browser console or a dev-only UI panel.
 *
 * Usage (browser console):
 *   import { collectBaseline } from './src/utils/baselineCollector';
 *   const results = await collectBaseline(engine);
 *   copy(JSON.stringify(results, null, 2));
 */

import { EVAL_CASES } from "./evalRunner";
import type { BaselineCollection, BaselineEntry } from "../types";

/** Default inference settings for baseline collection */
export const DEFAULT_SETTINGS = {
  temperature: 0.7,
  top_p: 0.95,
  max_tokens: 512,
  repetition_penalty: 1.1,
} as const;

/** System prompt used during baseline collection (must match production) */
const SYSTEM_PROMPT = `You are Quietnote, a thoughtful journaling companion. Your role is to help users explore their thoughts and feelings through gentle, empathetic reflection. You are NOT a therapist, doctor, or medical professional. Never diagnose conditions, recommend medications, or provide medical advice. Instead, encourage users to seek professional help when appropriate. Keep responses concise (2-4 sentences), end with a reflective question when appropriate, and maintain warm but appropriate boundaries. You are a journaling tool, not a friend or therapist.`;

/** Number of runs per prompt for variance measurement */
const RUNS_PER_PROMPT = 3;

export interface CollectionProgress {
  currentPrompt: number;
  totalPrompts: number;
  currentRun: number;
  totalRuns: number;
  currentCaseId: string;
  status: "running" | "complete" | "error";
  error?: string;
}

export type ProgressCallback = (progress: CollectionProgress) => void;

/**
 * Minimal engine interface — compatible with MLCEngine from @mlc-ai/web-llm.
 * We only need the chat completion method.
 */
interface MinimalEngine {
  chat: {
    completions: {
      create: (params: {
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        top_p?: number;
        max_tokens?: number;
        frequency_penalty?: number;
      }) => Promise<{
        choices: Array<{ message: { content: string } }>;
      }>;
    };
  };
}

/**
 * Send a single prompt to the engine and get a response.
 */
async function getModelResponse(
  engine: MinimalEngine,
  prompt: string,
  settings: typeof DEFAULT_SETTINGS = DEFAULT_SETTINGS
): Promise<string> {
  const result = await engine.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: settings.temperature,
    top_p: settings.top_p,
    max_tokens: settings.max_tokens,
    frequency_penalty: settings.repetition_penalty - 1, // WebLLM uses frequency_penalty
  });

  return result.choices[0]?.message?.content ?? "";
}

/**
 * Collect baseline responses for all eval cases.
 *
 * Runs each of the 30 eval prompts `runsPerPrompt` times with fresh context
 * (no conversation history). Returns a BaselineCollection object.
 *
 * @param engine - The MLCEngine instance (must be loaded and ready)
 * @param modelId - The model identifier string
 * @param runsPerPrompt - Number of runs per prompt (default: 3)
 * @param onProgress - Optional callback for progress updates
 * @param settings - Optional override for inference settings
 */
export async function collectBaseline(
  engine: MinimalEngine,
  modelId: string = "unknown",
  runsPerPrompt: number = RUNS_PER_PROMPT,
  onProgress?: ProgressCallback,
  settings: typeof DEFAULT_SETTINGS = DEFAULT_SETTINGS
): Promise<BaselineCollection> {
  const entries: BaselineEntry[] = [];
  const totalPrompts = EVAL_CASES.length;

  for (let i = 0; i < EVAL_CASES.length; i++) {
    const evalCase = EVAL_CASES[i];
    const runs: string[] = [];

    for (let run = 0; run < runsPerPrompt; run++) {
      onProgress?.({
        currentPrompt: i + 1,
        totalPrompts,
        currentRun: run + 1,
        totalRuns: runsPerPrompt,
        currentCaseId: evalCase.id,
        status: "running",
      });

      try {
        const response = await getModelResponse(engine, evalCase.prompt, settings);
        runs.push(response);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        runs.push(`[ERROR: ${msg}]`);
        onProgress?.({
          currentPrompt: i + 1,
          totalPrompts,
          currentRun: run + 1,
          totalRuns: runsPerPrompt,
          currentCaseId: evalCase.id,
          status: "error",
          error: msg,
        });
      }
    }

    entries.push({ promptId: evalCase.id, runs });
  }

  onProgress?.({
    currentPrompt: totalPrompts,
    totalPrompts,
    currentRun: runsPerPrompt,
    totalRuns: runsPerPrompt,
    currentCaseId: "done",
    status: "complete",
  });

  return {
    model: modelId,
    date: new Date().toISOString().split("T")[0],
    settings: { ...settings },
    responses: entries,
  };
}

/**
 * Select the median-length response from multiple runs of the same prompt.
 * Used for scoring — picks the response closest to the middle in word count.
 */
export function selectMedianResponse(runs: string[]): string {
  if (runs.length === 0) return "";
  if (runs.length === 1) return runs[0];

  const sorted = [...runs].sort(
    (a, b) =>
      a.trim().split(/\s+/).filter(Boolean).length -
      b.trim().split(/\s+/).filter(Boolean).length
  );
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Convert a BaselineCollection into a flat responses map for eval scoring.
 * Selects the median-length response from each prompt's runs.
 */
export function baselineToResponseMap(
  baseline: BaselineCollection
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of baseline.responses) {
    map[entry.promptId] = selectMedianResponse(entry.runs);
  }
  return map;
}
