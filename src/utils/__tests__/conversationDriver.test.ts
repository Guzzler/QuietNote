/**
 * Deterministic tests for the conversation driver (Track C1, 2026-06-18).
 *
 * NO model is loaded. A scripted mock `generate` returns canned responses so
 * every assertion is fully deterministic. These tests prove the three things
 * the old `priorTurns` fixtures could never prove:
 *   1. The model's REAL reply at turn k threads into the context for turn k+1.
 *   2. Per-turn scoring (incl. `mustEchoPriorTurn`) runs against that REAL
 *      accumulated history.
 *   3. Retention-probe pass/fail and guided-mode step coherence are detected.
 */

import { describe, it, expect } from "vitest";
import { runConversationScript, scriptReportToMarkdown } from "../conversationDriver";
import type { ConversationScript } from "../conversationScripts";
import { buildManagedMessages } from "../tokenEstimator";
import { buildPriorTurnRecap } from "../conversationContext";

const SYS = "You are a journaling companion.";

/** Build a mock `generate` that returns the i-th canned reply by call order. */
function sequenceMock(replies: string[]) {
  let call = 0;
  const seen: { role: string; content: string }[][] = [];
  const generate = async (messages: { role: string; content: string }[]) => {
    seen.push(messages);
    const reply = replies[call] ?? "";
    call += 1;
    return reply;
  };
  return { generate, seen };
}

describe("runConversationScript — history threading", () => {
  it("threads the model's real reply at turn 1 into the context for turn 3", async () => {
    const script: ConversationScript = {
      id: "thread",
      mode: "freewrite",
      description: "history threading probe",
      turns: [
        { user: "Turn one about my cat Pixel." },
        { user: "Turn two." },
        { user: "Turn three." },
      ],
    };
    const { generate, seen } = sequenceMock([
      "REPLY-ONE-marker-alpha",
      "REPLY-TWO-marker-beta",
      "REPLY-THREE",
    ]);

    await runConversationScript(script, { systemInstruction: SYS, generate });

    // The messages the mock received on the 3rd call (index 2) must contain the
    // assistant text it returned on the 1st call — proof history accumulated.
    const thirdCallMessages = seen[2];
    const contents = thirdCallMessages.map((m) => m.content);
    expect(contents).toContain("REPLY-ONE-marker-alpha");
    expect(contents).toContain("REPLY-TWO-marker-beta");
    // The user turns are present too, and the system message leads.
    expect(thirdCallMessages[0]).toEqual({ role: "system", content: SYS });
    expect(contents).toContain("Turn one about my cat Pixel.");
    expect(contents).toContain("Turn three.");
  });

  it("the first turn sees no prior history (system + single user only)", async () => {
    const script: ConversationScript = {
      id: "first",
      mode: "freewrite",
      description: "first turn",
      turns: [{ user: "Hello." }, { user: "Again." }],
    };
    const { generate, seen } = sequenceMock(["a", "b"]);
    await runConversationScript(script, { systemInstruction: SYS, generate });
    expect(seen[0]).toEqual([
      { role: "system", content: SYS },
      { role: "user", content: "Hello." },
    ]);
  });
});

describe("runConversationScript — per-turn scoring against real history", () => {
  it("mustEchoPriorTurn PASSES when the reply echoes an earlier user content word", async () => {
    const script: ConversationScript = {
      id: "echo-pass",
      mode: "freewrite",
      description: "echo against real history",
      turns: [
        { user: "My promotion at work fell through yesterday." },
        { user: "And now what?", expect: { mustEchoPriorTurn: true } },
      ],
    };
    // Turn-2 reply echoes "promotion" — a content word from the REAL turn-1
    // user message now living in history.
    const { generate } = sequenceMock([
      "That sounds painful.",
      "Losing the promotion you worked toward is a real blow.",
    ]);
    const result = await runConversationScript(script, { systemInstruction: SYS, generate });
    const t1 = result.turns[1];
    expect(t1.passed).toBe(true);
    expect(t1.failures).toHaveLength(0);
    expect(result.summary.passedTurns).toBe(1);
    expect(result.summary.scoredTurns).toBe(1);
  });

  it("mustEchoPriorTurn FAILS when the reply is generic with no echo", async () => {
    const script: ConversationScript = {
      id: "echo-fail",
      mode: "freewrite",
      description: "no echo",
      turns: [
        { user: "My promotion at work fell through yesterday." },
        { user: "And now what?", expect: { mustEchoPriorTurn: true } },
      ],
    };
    const { generate } = sequenceMock(["Mm.", "Tell me more about how you are."]);
    const result = await runConversationScript(script, { systemInstruction: SYS, generate });
    expect(result.turns[1].passed).toBe(false);
    expect(result.turns[1].failures.join(" ")).toMatch(/echo/i);
    expect(result.summary.passedTurns).toBe(0);
  });

  it("context-only turns (no expect, no probe) pass trivially and are not scored", async () => {
    const script: ConversationScript = {
      id: "ctx",
      mode: "freewrite",
      description: "context only",
      turns: [{ user: "Just thinking out loud." }],
    };
    const { generate } = sequenceMock([""]);
    const result = await runConversationScript(script, { systemInstruction: SYS, generate });
    expect(result.turns[0].passed).toBe(true);
    expect(result.summary.scoredTurns).toBe(0);
    expect(result.summary.passedTurns).toBe(0);
  });
});

describe("runConversationScript — retention probes", () => {
  const probeScript: ConversationScript = {
    id: "probe",
    mode: "freewrite",
    description: "retention probe flips on mock output",
    turns: [
      { user: "My sister Maya and I argued at dinner." },
      {
        user: "I don't know anymore.",
        retentionProbe: { entity: "Maya", mustContainAny: ["maya", "sister"] },
      },
    ],
  };

  it("probe PASSES when the reply grounds in the entity", async () => {
    const { generate } = sequenceMock([
      "That argument sounds hard.",
      "It's okay not to know — what feels unresolved with Maya right now?",
    ]);
    const result = await runConversationScript(probeScript, { systemInstruction: SYS, generate });
    const probe = result.turns[1];
    expect(probe.isProbe).toBe(true);
    expect(probe.probePassed).toBe(true);
    expect(probe.passed).toBe(true);
    expect(result.summary.probes).toBe(1);
    expect(result.summary.probesPassed).toBe(1);
  });

  it("probe FAILS when the reply drops the entity entirely", async () => {
    const { generate } = sequenceMock([
      "That argument sounds hard.",
      "It's okay not to know. Take a breath and sit with whatever comes up.",
    ]);
    const result = await runConversationScript(probeScript, { systemInstruction: SYS, generate });
    const probe = result.turns[1];
    expect(probe.isProbe).toBe(true);
    expect(probe.probePassed).toBe(false);
    expect(probe.passed).toBe(false);
    expect(result.summary.probes).toBe(1);
    expect(result.summary.probesPassed).toBe(0);
  });
});

describe("runConversationScript — step coherence (guided)", () => {
  function stepScript(): ConversationScript {
    return {
      id: "steps",
      mode: "thoughtrecord",
      description: "5-step coherence",
      expectedSteps: 5,
      turns: [
        { user: "Let's do a thought record." },
        { user: "Situation: I was skipped in standup.", stepIndex: 1, expect: { maxSentences: 6 } },
        { user: "Thought: my work doesn't matter.", stepIndex: 2, expect: { maxSentences: 6 } },
        { user: "Emotion: anxious, 8/10.", stepIndex: 3, expect: { maxSentences: 6 } },
        { user: "Evidence: praised on Tuesday.", stepIndex: 4, expect: { maxSentences: 6 } },
        { user: "Balanced: one skip isn't everything.", stepIndex: 5, expect: { maxSentences: 6 } },
      ],
    };
  }

  it("monotonic 1->5 with all steps passing => stepCoherent true", async () => {
    // Short replies satisfy maxSentences for every step.
    const { generate } = sequenceMock([
      "Okay.",
      "Got it.",
      "I hear that thought.",
      "An 8 is intense.",
      "That's good evidence.",
      "That's a balanced reframe.",
    ]);
    const result = await runConversationScript(stepScript(), { systemInstruction: SYS, generate });
    expect(result.summary.stepCoherent).toBe(true);
    expect(result.summary.scoredTurns).toBe(5);
    expect(result.summary.passedTurns).toBe(5);
  });

  it("a step that fails its expect breaks coherence (incomplete progression)", async () => {
    // Make the step-3 reply blow maxSentences so step 3 fails → observedSteps
    // becomes [1,2,4,5] which is neither contiguous nor full length.
    const { generate } = sequenceMock([
      "Okay.",
      "Got it.",
      "I hear that thought.",
      "One. Two. Three. Four. Five. Six. Seven.", // 7 sentences > maxSentences 6
      "That's good evidence.",
      "That's a balanced reframe.",
    ]);
    const result = await runConversationScript(stepScript(), { systemInstruction: SYS, generate });
    expect(result.summary.stepCoherent).toBe(false);
    expect(result.turns[3].passed).toBe(false);
  });

  it("stepCoherent is null for a non-guided script (no expectedSteps)", async () => {
    const script: ConversationScript = {
      id: "nonguided",
      mode: "freewrite",
      description: "no steps",
      turns: [{ user: "hi", expect: { maxWords: 50 } }],
    };
    const { generate } = sequenceMock(["hello there"]);
    const result = await runConversationScript(script, { systemInstruction: SYS, generate });
    expect(result.summary.stepCoherent).toBeNull();
  });
});

describe("runConversationScript — abort + error handling", () => {
  it("stops early when the abort signal is already set", async () => {
    const controller = new AbortController();
    controller.abort();
    const script: ConversationScript = {
      id: "abort",
      mode: "freewrite",
      description: "abort",
      turns: [{ user: "one" }, { user: "two" }],
    };
    const { generate, seen } = sequenceMock(["a", "b"]);
    const result = await runConversationScript(script, {
      systemInstruction: SYS,
      generate,
      signal: controller.signal,
    });
    expect(seen).toHaveLength(0);
    expect(result.turns).toHaveLength(0);
  });

  it("records an inference error as a failed turn and keeps history aligned", async () => {
    const script: ConversationScript = {
      id: "err",
      mode: "freewrite",
      description: "error",
      turns: [
        { user: "one", expect: { maxWords: 50 } },
        { user: "two", expect: { mustEchoPriorTurn: true } },
      ],
    };
    let call = 0;
    const generate = async () => {
      call += 1;
      if (call === 1) throw new Error("boom");
      return "two echo";
    };
    const result = await runConversationScript(script, { systemInstruction: SYS, generate });
    expect(result.turns[0].passed).toBe(false);
    expect(result.turns[0].failures.join(" ")).toMatch(/inference error/i);
  });
});

// ── Track C2: context strategies + trim telemetry ──────────────────────────

/** A reply of approximately `chars` characters (forces history growth). */
function longReply(chars: number, marker = "x"): string {
  return marker.repeat(Math.max(1, chars));
}

describe("runConversationScript — context strategies", () => {
  it("raw is unchanged: first turn sees [system, user], no recap, no trim", async () => {
    const script: ConversationScript = {
      id: "raw-regress",
      mode: "freewrite",
      description: "raw regression",
      turns: [{ user: "My sister Maya and I argued at dinner." }, { user: "Again." }],
    };
    const { generate, seen } = sequenceMock(["a", "b"]);
    const result = await runConversationScript(script, {
      systemInstruction: SYS,
      generate,
      strategy: "raw",
    });
    // Default (no strategy) and explicit raw both produce the bare path.
    expect(seen[0]).toEqual([
      { role: "system", content: SYS },
      { role: "user", content: "My sister Maya and I argued at dinner." },
    ]);
    // Turn 2 raw context: system + full history + user, no recap prefix.
    expect(seen[1]).toEqual([
      { role: "system", content: SYS },
      { role: "user", content: "My sister Maya and I argued at dinner." },
      { role: "assistant", content: "a" },
      { role: "user", content: "Again." },
    ]);
    for (const t of result.turns) {
      expect(t.context.strategy).toBe("raw");
      expect(t.context.trimmed).toBe(false);
      expect(t.context.recapPresent).toBe(false);
    }
    expect(result.summary.firstTrimTurnIndex).toBeNull();
  });

  it("managed equals buildManagedMessages exactly when no trim occurs", async () => {
    const script: ConversationScript = {
      id: "managed-eq",
      mode: "freewrite",
      description: "managed = app path",
      turns: [
        { user: "My sister Maya and I argued at our dad's birthday dinner." },
        { user: "I keep replaying it." },
      ],
    };
    const { generate, seen } = sequenceMock(["That sounds painful.", "ok"]);
    const result = await runConversationScript(script, {
      systemInstruction: SYS,
      generate,
      strategy: "managed",
    });
    // Reconstruct the history the driver had at turn 2 and assert the messages
    // it sent equal buildManagedMessages's output byte-for-byte.
    const historyAtTurn2 = [
      { role: "user", content: "My sister Maya and I argued at our dad's birthday dinner." },
      { role: "assistant", content: "That sounds painful." },
    ];
    const expected = buildManagedMessages(SYS, "I keep replaying it.", historyAtTurn2);
    expect(seen[1]).toEqual(expected.messages);
    // Recap is present at turn 2 (entity established at turn 1).
    expect(result.turns[1].context.recapPresent).toBe(
      buildPriorTurnRecap(historyAtTurn2) !== null
    );
  });

  it("managed and managed-norecap differ only by the recap prefix when no trim", async () => {
    const script: ConversationScript = {
      id: "recap-ablation",
      mode: "freewrite",
      description: "managed vs norecap",
      turns: [
        { user: "My sister Maya and I argued at our dad's birthday dinner." },
        { user: "I keep replaying it." },
      ],
    };
    const replies = ["That sounds painful.", "ok"];
    const managed = sequenceMock([...replies]);
    const norecap = sequenceMock([...replies]);
    await runConversationScript(script, {
      systemInstruction: SYS,
      generate: managed.generate,
      strategy: "managed",
    });
    await runConversationScript(script, {
      systemInstruction: SYS,
      generate: norecap.generate,
      strategy: "managed-norecap",
    });

    const historyAtTurn2 = [
      { role: "user", content: "My sister Maya and I argued at our dad's birthday dinner." },
      { role: "assistant", content: "That sounds painful." },
    ];
    const recap = buildPriorTurnRecap(historyAtTurn2);
    expect(recap).not.toBeNull();

    const mManaged = managed.seen[1];
    const mNorecap = norecap.seen[1];
    // System + history identical; only the final user turn differs by the recap.
    expect(mManaged.slice(0, -1)).toEqual(mNorecap.slice(0, -1));
    const lastManaged = mManaged[mManaged.length - 1];
    const lastNorecap = mNorecap[mNorecap.length - 1];
    expect(lastNorecap.content).toBe("I keep replaying it.");
    expect(lastManaged.content).toBe(`${recap}\n\n${"I keep replaying it."}`);
  });
});

describe("runConversationScript — trim telemetry", () => {
  /** Build a padding-heavy script that forces history past the trim budget. */
  function longScript(probeAt?: number): ConversationScript {
    const turns = [];
    // Turn 0 establishes the entity "Maya".
    turns.push({
      user: "My sister Maya and I stopped speaking after our dad's birthday dinner.",
    });
    for (let i = 1; i < 10; i++) {
      if (probeAt !== undefined && i === probeAt) {
        turns.push({
          user: "I don't know.",
          retentionProbe: { entity: "Maya", mustContainAny: ["maya", "sister"] },
        });
      } else {
        turns.push({ user: `Padding turn ${i} with some ordinary journaling content here.` });
      }
    }
    return { id: "longtrim-unit", mode: "freewrite", description: "force a trim", turns };
  }

  it("a long history under managed trims: trimmed:true, droppedTurns>0, firstTrimTurnIndex set", async () => {
    const script = longScript();
    // Each reply ~2500 chars so history crosses the ~3500-token budget fast.
    const { generate } = sequenceMock(
      script.turns.map((_, i) => longReply(2500, String.fromCharCode(97 + i)))
    );
    const result = await runConversationScript(script, {
      systemInstruction: SYS,
      generate,
      strategy: "managed",
    });
    const anyTrim = result.turns.some((t) => t.context.trimmed);
    expect(anyTrim).toBe(true);
    const firstTrim = result.turns.find((t) => t.context.trimmed);
    expect(firstTrim!.context.droppedTurns).toBeGreaterThan(0);
    expect(result.summary.firstTrimTurnIndex).toBe(firstTrim!.turnIndex);
  });

  it("probeEntityInWindow is false once the entity turn is trimmed out (norecap), true under raw", async () => {
    const probeAt = 9;
    const script = longScript(probeAt);
    const replies = script.turns.map((_, i) =>
      longReply(2500, String.fromCharCode(97 + i))
    );
    const norecap = sequenceMock([...replies]);
    const raw = sequenceMock([...replies]);

    const rNorecap = await runConversationScript(script, {
      systemInstruction: SYS,
      generate: norecap.generate,
      strategy: "managed-norecap",
    });
    const rRaw = await runConversationScript(script, {
      systemInstruction: SYS,
      generate: raw.generate,
      strategy: "raw",
    });

    const probeNorecap = rNorecap.turns[probeAt];
    const probeRaw = rRaw.turns[probeAt];
    // Under raw (full history) the entity turn is always in the window.
    expect(probeRaw.context.probeEntityInWindow).toBe(true);
    // Under norecap with heavy trimming, the turn-0 entity is dropped.
    expect(probeNorecap.context.probeEntityInWindow).toBe(false);
  });

  it("before/after-trim probe counts partition around firstTrimTurnIndex", async () => {
    const probeAt = 9;
    const script = longScript(probeAt);
    // Reply embeds "Maya" so the probe PASSES; placed after the trim point.
    const replies = script.turns.map((_, i) =>
      i === probeAt ? "What feels unresolved with Maya?" : longReply(2500, String.fromCharCode(97 + i))
    );
    const { generate } = sequenceMock(replies);
    const result = await runConversationScript(script, {
      systemInstruction: SYS,
      generate,
      strategy: "managed-norecap",
    });
    expect(result.summary.firstTrimTurnIndex).not.toBeNull();
    expect(probeAt).toBeGreaterThan(result.summary.firstTrimTurnIndex!);
    // The single probe is after the trim point and passed.
    expect(result.summary.probesAfterTrim).toBe(1);
    expect(result.summary.probesPassedAfterTrim).toBe(1);
    expect(result.summary.probesPassedBeforeTrim).toBe(0);
  });
});

describe("scriptReportToMarkdown", () => {
  it("renders a summary table and failing-turn bodies", async () => {
    const script: ConversationScript = {
      id: "report",
      mode: "freewrite",
      description: "report",
      turns: [
        { user: "one", expect: { maxWords: 1 } }, // will fail (reply too long)
        {
          user: "two",
          retentionProbe: { entity: "x", mustContainAny: ["zzz"] }, // will fail
        },
      ],
    };
    const { generate } = sequenceMock(["this reply has many words", "no marker here"]);
    const result = await runConversationScript(script, { systemInstruction: SYS, generate });
    const md = scriptReportToMarkdown([result]);
    expect(md).toContain("# Conversation-Script Eval Report");
    expect(md).toContain("| report | freewrite |");
    expect(md).toContain("[probe]");
    expect(md).toMatch(/Retention probe failed/);
  });
});
