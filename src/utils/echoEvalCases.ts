/**
 * Single-turn echo eval cases (model-quality M1, 2026-07-14).
 *
 * 10 cases across the 4 modes, each a detail-rich entry that TEMPTS the model
 * to mirror it back (the exact 2026-07-11 failure). Scored by
 * `maxNgramOverlap`/`scoreNoEcho` from `echoMetric.ts`, not by
 * `evaluateResponse` — this is a SEPARATE export from `EVAL_CASES`
 * (the C1 precedent): existing cases, dimensions, per-dim sampling, and the
 * release-gate floors are untouched.
 */

import type { JournalingMode } from "../components/JournalingModeSelector";

export interface EchoEvalCase {
  id: string;
  mode: JournalingMode;
  prompt: string;
}

export const ECHO_EVAL_CASES: EchoEvalCase[] = [
  {
    id: "echo-fw-1",
    mode: "freewrite",
    prompt:
      "I finally fixed a bug that had been bothering me all week and I feel lighter than I have in days.",
  },
  {
    id: "echo-fw-2",
    mode: "freewrite",
    prompt:
      "My landlord emailed saying rent is going up two hundred dollars in March and I've been staring at the ceiling doing math in my head all night.",
  },
  {
    id: "echo-fw-3",
    mode: "freewrite",
    prompt:
      "I snapped at my best friend Jordan over something tiny at lunch and now the silence between us feels enormous.",
  },
  {
    id: "echo-grat-1",
    mode: "gratitude",
    prompt:
      "I'm grateful my neighbor Rosa brought over soup when she heard I was sick, without me even asking.",
  },
  {
    id: "echo-grat-2",
    mode: "gratitude",
    prompt:
      "Today I'm thankful for the twenty quiet minutes on the porch before anyone else woke up, just me and the coffee and the birds.",
  },
  {
    id: "echo-ci-1",
    mode: "checkin",
    prompt:
      "Feeling scattered today. Slept maybe five hours, skipped breakfast, and my head's been buzzing since the morning standup.",
  },
  {
    id: "echo-ci-2",
    mode: "checkin",
    prompt:
      "Honestly a good day for once — my presentation landed well and my boss said the word 'impressive', which she never says.",
  },
  {
    id: "echo-tr-1",
    mode: "thoughtrecord",
    prompt:
      "The thought I can't shake is that I embarrassed myself in the team meeting and everyone now thinks I'm incompetent.",
  },
  {
    id: "echo-tr-2",
    mode: "thoughtrecord",
    prompt:
      "I keep thinking that if I don't answer work messages within five minutes, people will decide I'm lazy and replaceable.",
  },
  {
    id: "echo-fw-4",
    mode: "freewrite",
    prompt:
      "Dad called for the first time since the argument in April. We talked about nothing — weather, his tomatoes — but my hands were shaking when I hung up.",
  },
];
