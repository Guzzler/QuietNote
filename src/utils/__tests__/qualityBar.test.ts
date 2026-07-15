import { describe, it, expect } from "vitest";

import { QUALITY_BAR_SCENARIOS } from "../qualityBarScenarios";
import { ECHO_EVAL_CASES } from "../echoEvalCases";
import {
  scoreScenario,
  scoreSupport,
  scoreContinuity,
  QUALITY_BAR_PASS_PERCENT,
} from "../qualityBarRubric";
import type { ScriptResult } from "../conversationDriver";

// Guards for the M1 quality-bar instrument (2026-07-14). The scenarios and
// rubric encode Sharang's 2026-07-12 quality bar; these tests pin the
// instrument's integrity, not model behavior.

describe("quality-bar scenarios (M1)", () => {
  it("has exactly three scenarios: freewrite arc, checkin arc, thoughtrecord arc", () => {
    expect(QUALITY_BAR_SCENARIOS.map((s) => s.script.mode).sort()).toEqual([
      "checkin",
      "freewrite",
      "thoughtrecord",
    ]);
  });

  for (const scenario of QUALITY_BAR_SCENARIOS) {
    describe(scenario.script.id, () => {
      it("is exactly 10 turns with parallel rubric metadata", () => {
        expect(scenario.script.turns).toHaveLength(10);
        expect(scenario.meta).toHaveLength(10);
      });

      it("plants at least one detail and declares at least two callbacks", () => {
        expect(scenario.meta.some((m) => m.plants?.length)).toBe(true);
        expect(
          scenario.meta.filter((m) => m.callback !== undefined).length
        ).toBeGreaterThanOrEqual(2);
      });

      it("every callback references an EARLIER turn whose text plants a strong term", () => {
        scenario.meta.forEach((m, i) => {
          if (!m.callback) return;
          expect(m.callback.plantedAtTurn).toBeLessThan(i);
          const plantedText =
            scenario.script.turns[m.callback.plantedAtTurn].user.toLowerCase();
          expect(
            m.callback.strongTerms.some((t) =>
              plantedText.includes(t.toLowerCase())
            )
          ).toBe(true);
        });
      });

      it("callback terms are absent from the callback turn's own user text (no echo shortcut)", () => {
        scenario.meta.forEach((m, i) => {
          if (!m.callback) return;
          const currentText = scenario.script.turns[i].user.toLowerCase();
          for (const t of [
            ...m.callback.strongTerms,
            ...(m.callback.weakTerms ?? []),
          ]) {
            expect(
              currentText.includes(t.toLowerCase()),
              `${scenario.script.id} turn ${i}: callback term "${t}" appears in the current user turn`
            ).toBe(false);
          }
        });
      });

      it("contains no crisis/harm content (safety is the gate's job, not the rubric's)", () => {
        const all = scenario.script.turns.map((t) => t.user).join(" ").toLowerCase();
        for (const term of ["suicide", "kill myself", "self-harm", "overdose"]) {
          expect(all).not.toContain(term);
        }
      });
    });
  }
});

describe("echo eval cases (M1)", () => {
  it("has 8–12 cases covering all 4 modes, ids unique", () => {
    expect(ECHO_EVAL_CASES.length).toBeGreaterThanOrEqual(8);
    expect(ECHO_EVAL_CASES.length).toBeLessThanOrEqual(12);
    expect(new Set(ECHO_EVAL_CASES.map((c) => c.mode)).size).toBe(4);
    expect(new Set(ECHO_EVAL_CASES.map((c) => c.id)).size).toBe(
      ECHO_EVAL_CASES.length
    );
  });
});

describe("quality-bar rubric scoring", () => {
  function fakeRun(responses: string[], scenarioIdx = 0): ScriptResult {
    const scenario = QUALITY_BAR_SCENARIOS[scenarioIdx];
    return {
      scriptId: scenario.script.id,
      mode: scenario.script.mode,
      strategy: "managed",
      turns: responses.map((response, turnIndex) => ({
        turnIndex,
        user: scenario.script.turns[turnIndex].user,
        response,
        passed: true,
        failures: [],
        isProbe: false,
        context: {
          strategy: "managed" as const,
          estHistoryTokens: 0,
          trimmed: false,
          droppedTurns: 0,
          recapPresent: false,
        },
      })),
      summary: {
        scoredTurns: 0,
        passedTurns: 0,
        probes: 0,
        probesPassed: 0,
        stepCoherent: null,
        firstTrimTurnIndex: null,
        probesPassedBeforeTrim: 0,
        probesPassedAfterTrim: 0,
        probesAfterTrim: 0,
      },
    };
  }

  it("a warm, grounded run passes; an echoing template run fails", () => {
    const scenario = QUALITY_BAR_SCENARIOS[0]; // freewrite arc
    const good = scenario.script.turns.map((_, i) => {
      // Own words, supportive question, and the planted callbacks.
      if (scenario.meta[i].callback) {
        const term = scenario.meta[i].callback!.strongTerms[0];
        return `That thread about the ${term} keeps coming back — what feels different about it today?`;
      }
      return "Something in how you wrote that feels quieter than yesterday — what changed?";
    });
    const goodResult = scoreScenario(scenario, fakeRun(good));
    expect(goodResult.percent).toBeGreaterThanOrEqual(QUALITY_BAR_PASS_PERCENT);
    expect(goodResult.zeroCriticalTurns).toEqual([]);
    expect(goodResult.passed).toBe(true);

    const bad = scenario.script.turns.map(
      (t) => `${t.user} It's okay to feel this. You are not alone in this.`
    );
    const badResult = scoreScenario(scenario, fakeRun(bad));
    expect(badResult.passed).toBe(false);
  });

  it("an empty reply zeroes continuity and blocks the pass regardless of total", () => {
    const scenario = QUALITY_BAR_SCENARIOS[0];
    const responses = scenario.script.turns.map((_, i) =>
      i === 4 ? "" : "You did the hard part already — what would tomorrow-you thank you for?"
    );
    const result = scoreScenario(scenario, fakeRun(responses));
    expect(result.zeroCriticalTurns).toContain(4);
    expect(result.passed).toBe(false);
  });

  it("scoreSupport: question=2, bare second-person=1, detached=0", () => {
    expect(scoreSupport("What part of that felt heaviest?")).toBe(2);
    expect(scoreSupport("Your week held a lot of weight.")).toBe(1);
    expect(scoreSupport("The weather was cold on Tuesday.")).toBe(0);
  });

  it("scoreContinuity: contradiction ban hits zero it", () => {
    expect(scoreContinuity("Priya said you bombed the interview badly.", ["you bombed"])).toBe(0);
    expect(scoreContinuity("Short reply.", undefined)).toBe(1);
    expect(
      scoreContinuity("A grounded, ordinary reply with more than eight words in it.", undefined)
    ).toBe(2);
  });
});
