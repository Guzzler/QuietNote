import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GUIDE_SCAFFOLD_NOTE,
  GRATITUDE_SEQUENCE,
  MORNING_CHECKIN_SEQUENCE,
  EVENING_CHECKIN_SEQUENCE,
  THOUGHT_RECORD_SEQUENCE,
} from "../../data/journalPrompts";

// R12 (2026-08-07) — the guided step is a writing scaffold, not a promise
// about the reply.
//
// R10a measured the defect on the shipped default: 0 of 7 scoreable turns
// aligned, because the model is never told the step. The banner sat above the
// transcript making a second-person request, so a reader reasonably heard it
// as the AI's question. The fix is the implicature, not the model — the step
// prompt becomes something the WRITER acts on (a textarea prefill, exactly
// like the continuity card, which R5's fact 2 established is ordinary text and
// not a model input), and one line says plainly whose the sequence is.
//
// These are source-text guards, not render assertions: this repo has no
// jsdom/testing-library setup and every component test here is logic- or
// source-based (see DownloadSizeHonesty, WebGPUFallbackGuards, and R9's
// guidedSession wiring guards). The guards below pin the wiring that a render
// test would otherwise check, and they fail against pre-R12 sources.

// Line endings are normalised: the repo checks out CRLF on Windows, and these
// guards match on multi-line source shapes.
const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8").replace(/\r\n/g, "\n");

const GUIDES = [
  "ThoughtRecordGuide",
  "GratitudeGuide",
  "CheckInGuide",
] as const;

/**
 * Split a guide's source at the full-size return. Everything before is the
 * setup plus the `if (compact)` early-return branch; everything after is the
 * full-size render.
 */
function splitBranches(src: string): { compact: string; full: string } {
  const marker = "\n  return (\n    <motion.div";
  const at = src.indexOf(marker);
  expect(at, "guide should have a full-size <motion.div> return").toBeGreaterThan(0);
  return { compact: src.slice(0, at), full: src.slice(at) };
}

function srcFiles(dir = fileURLToPath(new URL("../..", import.meta.url))): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return srcFiles(full);
    return /\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });
}

describe("R12 — the scaffold note says whose the steps are", () => {
  it("is the decided copy, verbatim", () => {
    expect(GUIDE_SCAFFOLD_NOTE).toBe(
      "These steps are a writing guide. Your companion responds to whatever you write.",
    );
  });

  it("names the writer and the companion, and promises nothing about the reply", () => {
    // Both halves must survive future copy edits: the sentence is only honest
    // if it says the steps are the user's AND that the reply follows the user.
    expect(GUIDE_SCAFFOLD_NOTE).toMatch(/writing guide/);
    expect(GUIDE_SCAFFOLD_NOTE).toMatch(/responds to whatever you write/);
  });

  it.each(GUIDES)("%s renders it in the full-size branch only", (guide) => {
    const { compact, full } = splitBranches(read(`../${guide}.tsx`));
    expect(full).toContain("{GUIDE_SCAFFOLD_NOTE}");
    // The compact banner's prompt line is already `truncate`; there is no room
    // for a second line there, and the tappable prompt carries the meaning.
    expect(compact).not.toContain("{GUIDE_SCAFFOLD_NOTE}");
  });

  it.each(GUIDES)("%s renders it exactly once", (guide) => {
    const hits = read(`../${guide}.tsx`).match(/\{GUIDE_SCAFFOLD_NOTE\}/g) ?? [];
    expect(hits).toHaveLength(1);
  });

  it("is never sent to the model", () => {
    // The whole point of R12 is that it fixes the UI's implicature without
    // touching what the model is asked — that is what makes it cost no gate
    // read. If this ever fails, the change became the rejected prompt-side fix.
    const offenders = srcFiles()
      .filter((f) => /[\\/]prompts[\\/]|sessionContext\.ts$/.test(f))
      .filter((f) => readFileSync(f, "utf-8").includes("GUIDE_SCAFFOLD_NOTE"))
      .map((f) => f.replace(/\\/g, "/").split("/src/")[1]);
    expect(offenders).toEqual([]);
  });
});

describe("R12 — the step prompt is something the writer can use", () => {
  it.each(GUIDES)("%s takes an optional onUsePrompt", (guide) => {
    const src = read(`../${guide}.tsx`);
    expect(src).toContain("onUsePrompt?: (prompt: string) => void");
    expect(src).toContain("onUsePrompt }: Props)");
  });

  it.each(GUIDES)("%s makes the prompt a button in BOTH branches", (guide) => {
    const { compact, full } = splitBranches(read(`../${guide}.tsx`));
    for (const [name, branch] of [["compact", compact], ["full-size", full]] as const) {
      expect(branch, `${guide} ${name} branch`).toContain('type="button"');
      expect(branch, `${guide} ${name} branch`).toContain("onUsePrompt(step.prompt)");
    }
  });

  it.each(GUIDES)("%s falls back to a plain <p> when onUsePrompt is absent", (guide) => {
    // The guides are used without the handler in tests and could be reused
    // elsewhere; the prompt must still render, just not as a control.
    const { compact, full } = splitBranches(read(`../${guide}.tsx`));
    for (const branch of [compact, full]) {
      expect(branch).toContain("onUsePrompt ? (");
      expect(branch).toContain("{step.prompt}</p>");
    }
  });

  it.each(GUIDES)("%s labels the button for screen readers", (guide) => {
    expect(read(`../${guide}.tsx`)).toContain(
      "aria-label={`Use this prompt: ${step.prompt}`}",
    );
  });

  it.each(GUIDES)("%s renders no button once the sequence is complete", (guide) => {
    // There is no step left to write, so there is nothing to prefill.
    const src = read(`../${guide}.tsx`);
    const buttons = src.match(/onUsePrompt\(step\.prompt\)/g) ?? [];
    expect(buttons).toHaveLength(2); // one per branch, and no third in isComplete
    // The completion copy stays plain text in both branches.
    const { compact, full } = splitBranches(src);
    expect(compact).toMatch(/isComplete \? \(\s*<p/);
    expect(full).toMatch(/isComplete \? \(\s*<p/);
  });
});

describe("R12 — ChatPanel wires the scaffold to the textarea", () => {
  const chatPanel = read("../ChatPanel.tsx");

  it("prefills and focuses, the same handler shape the continuity card uses", () => {
    expect(chatPanel).toContain("const useGuidePrompt = useCallback(");
    expect(chatPanel).toContain("setUserInput(prompt)");
    // Not a send: the user still reads what landed in the textarea and edits
    // or sends it themselves.
    expect(chatPanel).not.toMatch(/useGuidePrompt[\s\S]{0,200}newSession\(/);
  });

  it("passes it to all six guide render sites", () => {
    const hits = chatPanel.match(/onUsePrompt=\{useGuidePrompt\}/g) ?? [];
    expect(hits).toHaveLength(6); // 3 modes × (empty-state + sticky compact)
  });

  it.each(GUIDES)("%s gets the handler in both of its render sites", (guide) => {
    const sites = chatPanel.match(
      new RegExp(`<${guide}[^/>]*onUsePrompt=\\{useGuidePrompt\\}`, "g"),
    ) ?? [];
    expect(sites).toHaveLength(2);
  });
});

describe("R12 — the sequences themselves are untouched", () => {
  // Scope guard: R12 changes how a step is presented, never what it asks.
  it("keeps every step prompt exactly as shipped", () => {
    expect(GRATITUDE_SEQUENCE.map((s) => s.prompt)).toEqual([
      "What are you grateful for today?",
      "Why does this matter to you?",
      "How did it make you feel?",
    ]);
    expect(MORNING_CHECKIN_SEQUENCE.map((s) => s.prompt)).toEqual([
      "How are you feeling this morning?",
      "What would you like to focus on today?",
      "Is there anything weighing on your mind?",
    ]);
    expect(EVENING_CHECKIN_SEQUENCE.map((s) => s.prompt)).toEqual([
      "How was your day?",
      "What went well today?",
      "What would you do differently?",
    ]);
    expect(THOUGHT_RECORD_SEQUENCE).toHaveLength(5);
    expect(THOUGHT_RECORD_SEQUENCE[0].prompt).toBe(
      "What happened? Describe the situation briefly.",
    );
    expect(THOUGHT_RECORD_SEQUENCE[4].prompt).toBe(
      "What's a more balanced way to think about this?",
    );
  });
});
