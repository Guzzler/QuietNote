import { describe, it, expect } from "vitest";
import { buildPersonalityDirective, DEFAULT_PERSONALITY } from "../personalityPrompt";
import type { PersonalitySettings } from "../personalityPrompt";

describe("buildPersonalityDirective", () => {
  it("produces balanced supportive directive with default settings", () => {
    const directive = buildPersonalityDirective(DEFAULT_PERSONALITY);
    expect(directive).toContain("warm and supportive");
    expect(directive).toContain("2-4 sentences");
    expect(directive).toContain("Reflect back");
  });

  it("produces neutral directive with warmth=0", () => {
    const settings: PersonalitySettings = { warmth: 0, verbosity: "balanced", style: "supportive" };
    const directive = buildPersonalityDirective(settings);
    expect(directive).toContain("neutral and observational");
  });

  it("produces deeply warm directive with warmth=10", () => {
    const settings: PersonalitySettings = { warmth: 10, verbosity: "balanced", style: "supportive" };
    const directive = buildPersonalityDirective(settings);
    expect(directive).toContain("deeply warm");
  });

  it("produces concise directive", () => {
    const settings: PersonalitySettings = { warmth: 5, verbosity: "concise", style: "supportive" };
    const directive = buildPersonalityDirective(settings);
    expect(directive).toContain("1-2 sentences");
  });

  it("produces detailed directive", () => {
    const settings: PersonalitySettings = { warmth: 5, verbosity: "detailed", style: "supportive" };
    const directive = buildPersonalityDirective(settings);
    expect(directive).toContain("5-6 sentences");
  });

  it("produces socratic directive", () => {
    const settings: PersonalitySettings = { warmth: 5, verbosity: "balanced", style: "socratic" };
    const directive = buildPersonalityDirective(settings);
    expect(directive).toContain("thoughtful questions");
  });

  it("produces direct directive", () => {
    const settings: PersonalitySettings = { warmth: 5, verbosity: "balanced", style: "direct" };
    const directive = buildPersonalityDirective(settings);
    expect(directive).toContain("gentle observations directly");
  });

  it("concatenates all three without conflict", () => {
    const settings: PersonalitySettings = { warmth: 10, verbosity: "concise", style: "socratic" };
    const directive = buildPersonalityDirective(settings);
    expect(directive).toContain("deeply warm");
    expect(directive).toContain("1-2 sentences");
    expect(directive).toContain("thoughtful questions");
  });
});
