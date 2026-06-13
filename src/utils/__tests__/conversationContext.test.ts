import { describe, it, expect } from "vitest";
import { buildPriorTurnRecap } from "../conversationContext";
import { buildManagedMessages } from "../tokenEstimator";
import { EVAL_CASES } from "../evalRunner";

describe("buildPriorTurnRecap — Day-8 prior-turn entity surfacing", () => {
  it("mt-3 fixture: surfaces family-dinner / mom / shame anchors", () => {
    const history = [
      { role: "user", content: "I feel deeply ashamed about what happened at the family dinner last weekend." },
      { role: "assistant", content: "Carrying that shame from the family dinner sounds heavy. What happened that's stayed with you?" },
      { role: "user", content: "I said something hurtful to my mom and everyone went quiet." },
      { role: "assistant", content: "That silence after saying something you regret to your mom — that can replay in your head. Have you had a chance to talk to her since?" },
    ];
    const recap = buildPriorTurnRecap(history);
    expect(recap).not.toBeNull();
    expect(recap!.toLowerCase()).toMatch(/mom|dinner|ashamed|shame/);
  });

  it("mt-1 fixture: surfaces Sarah", () => {
    const history = [
      { role: "user", content: "My friend Sarah cancelled our plans again. She always does this." },
      { role: "assistant", content: "It sounds like Sarah cancelling again really stings." },
    ];
    const recap = buildPriorTurnRecap(history);
    expect(recap).not.toBeNull();
    expect(recap!).toMatch(/Sarah/);
  });

  it("mt-4 fixture: surfaces Miguel and layoffs context", () => {
    const history = [
      { role: "user", content: "My coworker Miguel got laid off today. We started on the same day three years ago." },
      { role: "assistant", content: "Losing Miguel after three years..." },
      { role: "user", content: "Kind of. But mostly I just feel guilty that I'm still here and he's not." },
      { role: "assistant", content: "Survivor's guilt..." },
    ];
    const recap = buildPriorTurnRecap(history);
    expect(recap).not.toBeNull();
    expect(recap!.toLowerCase()).toMatch(/miguel|coworker|guilty|guilt/);
  });

  it("returns null for empty history", () => {
    expect(buildPriorTurnRecap([])).toBeNull();
  });

  it("returns null for a single trivial opener", () => {
    expect(buildPriorTurnRecap([{ role: "user", content: "hi" }])).toBeNull();
  });

  it("returns null when prior turns are only assistant turns", () => {
    expect(
      buildPriorTurnRecap([{ role: "assistant", content: "How can I help?" }])
    ).toBeNull();
  });

  it("does not fabricate anchors absent from the source", () => {
    const history = [
      { role: "user", content: "I feel deeply ashamed about what happened at the family dinner last weekend." },
      { role: "assistant", content: "..." },
      { role: "user", content: "I said something hurtful to my mom and everyone went quiet." },
    ];
    const recap = buildPriorTurnRecap(history)!;
    const sourceLower = history
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ")
      .toLowerCase();
    // Every word longer than 3 chars in the recap (excluding boilerplate)
    // must appear in the source user text. Boilerplate stopwords allowed.
    const boilerplate = new Set([
      "earlier",
      "this",
      "conversation",
      "they",
      "spoke",
      "about",
      "and",
      "felt",
      "the",
      "their",
      "connect",
      "your",
      "reply",
      "that",
      "before",
      "responding",
      "their",
      "latest",
      "message",
      "with",
      "for",
    ]);
    const words = recap.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
    for (const w of words) {
      if (boilerplate.has(w)) continue;
      expect(sourceLower).toContain(w);
    }
  });

  it("is deterministic — same input yields same output", () => {
    const history = [
      { role: "user", content: "I feel deeply ashamed about what happened at the family dinner last weekend." },
      { role: "assistant", content: "..." },
      { role: "user", content: "I said something hurtful to my mom and everyone went quiet." },
    ];
    const a = buildPriorTurnRecap(history);
    const b = buildPriorTurnRecap(history);
    expect(a).toBe(b);
  });
});

describe("buildManagedMessages — app path wires recap onto current user turn", () => {
  it("prepends a recap to the current user message when history has multiple user turns", () => {
    const history = [
      { role: "user", content: "I feel deeply ashamed about what happened at the family dinner last weekend." },
      { role: "assistant", content: "Carrying that shame from the family dinner sounds heavy." },
      { role: "user", content: "I said something hurtful to my mom and everyone went quiet." },
      { role: "assistant", content: "That silence after saying something you regret to your mom — that can replay in your head." },
    ];
    const { messages } = buildManagedMessages("system prompt", "I'm just so tired of everything.", history);
    const last = messages[messages.length - 1];
    expect(last.role).toBe("user");
    expect(last.content).toMatch(/I'm just so tired of everything\.$/);
    expect(last.content.toLowerCase()).toMatch(/mom|dinner|ashamed|shame/);
  });

  it("does not modify the current user message when there is no useful history", () => {
    const { messages } = buildManagedMessages("system prompt", "Hello there.", []);
    const last = messages[messages.length - 1];
    expect(last.content).toBe("Hello there.");
  });
});

describe("EVAL_CASES freeze — harness-expansion guard (Day-12 re-assert)", () => {
  it("EVAL_CASES.length matches the frozen count (75 after 2026-06-13 input_robustness freeze-lift)", () => {
    // Bumped 63→75 on 2026-06-13: input_robustness dimension + 12 paraphrased
    // real-user-shape cases, via a freeze-lift entry in docs/decisions.md.
    expect(EVAL_CASES.length).toBe(75);
  });
});
