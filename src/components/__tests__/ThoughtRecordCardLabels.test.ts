import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { THOUGHT_RECORD_SEQUENCE } from "../../data/journalPrompts";

// Guards for R13b (2026-08-10). R13a measured the saved Thought Record card
// mislabelling 2 of 3 entries when the user answers the reply's closing
// question instead of the step prompt: the save at App.tsx is a *positional*
// map of the first five user messages, so "Automatic thought" is a claim about
// the text that the app cannot support. The card must therefore (a) show every
// captured entry and (b) label each one with the question it was written
// against, not with a clinical assertion about its contents.
//
// Source-based in the DownloadSizeHonesty / GuidedStepScaffold idiom — the repo
// has no jsdom or testing-library, and every component test here reads sources.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

const history = read("../ThoughtRecordHistory.tsx");
const app = read("../../App.tsx");

describe("Thought Record card labels (R13b)", () => {
  it("no longer asserts clinical labels about the entry contents", () => {
    expect(history).not.toContain("Automatic thought");
    expect(history).not.toContain("Alternative thought");
  });

  it("labels each entry with the question it was written against", () => {
    const labels = [
      "What happened",
      "What went through your mind",
      "How you felt",
      "The evidence",
      "A more balanced view",
    ];
    for (const label of labels) {
      expect(history).toContain(`"${label}"`);
    }
  });

  it("renders all five positional entries, so nothing captured is invisible", () => {
    for (const field of [
      "record.situation",
      "record.automaticThought",
      "record.emotions",
      "record.evidenceFor",
      "record.alternativeThought",
    ]) {
      expect(history).toContain(field);
    }
  });

  it("keeps the entries in the order the questions were asked", () => {
    const order = [
      "record.situation",
      "record.automaticThought",
      "record.emotions",
      "record.evidenceFor",
      "record.alternativeThought",
    ].map((f) => history.indexOf(f));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("each label is anchored in the wording of its step in THOUGHT_RECORD_SEQUENCE", () => {
    // Not string equality — the header is a short form of the prompt — but the
    // distinctive words must come from the prompt the user actually saw, so a
    // header cannot drift back into a claim about the answer.
    const anchors = [
      { step: 1, inHeader: "what happened", inPrompt: "what happened" },
      { step: 2, inHeader: "went through your mind", inPrompt: "went through your mind" },
      { step: 3, inHeader: "how you felt", inPrompt: "how intense" },
      { step: 4, inHeader: "the evidence", inPrompt: "evidence" },
      { step: 5, inHeader: "a more balanced view", inPrompt: "more balanced" },
    ] as const;
    for (const { step, inHeader, inPrompt } of anchors) {
      const prompt = THOUGHT_RECORD_SEQUENCE.find((s) => s.step === step)!.prompt;
      expect(prompt.toLowerCase()).toContain(inPrompt);
      expect(history.toLowerCase()).toContain(inHeader);
    }
  });

  it("does not touch the save path or the stored shape", () => {
    // R13b is display-only: the positional map stays exactly as it was, so
    // existing records render under the new headers with no migration.
    expect(app).toContain("situation: userMessages[0].content");
    expect(app).toContain("automaticThought: userMessages[1].content");
    expect(app).toContain("emotions: parseEmotions(userMessages[2].content)");
    expect(app).toContain("evidenceFor: [userMessages[3].content]");
    expect(app).toContain("alternativeThought: userMessages[4].content");
  });

  it("keeps the calm styling the card already had", () => {
    expect(history).toContain("line-clamp-2");
    expect(history).toContain(
      "text-[10px] uppercase tracking-wider text-slate-400 font-semibold"
    );
  });
});
