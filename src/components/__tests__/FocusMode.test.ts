import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveShortcut } from "../../utils/keyboardShortcuts";

// Track A6 (2026-06-23) — focus mode wiring guards.
// Behavioural focus-toggle logic lives in KeyboardShortcuts.test.ts; this suite
// pins that App.tsx actually wires focusMode into the chrome and never disables
// the writing surface / safety affordances. Source-level guards mirror
// VisualCalmGuards.test.ts.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

describe("Focus mode — App wiring", () => {
  const app = read("../../App.tsx");

  it("declares focusMode state", () => {
    expect(app).toContain("const [focusMode, setFocusMode] = useState(false)");
  });

  it("dims the header in focus mode (opacity-0 + collapse)", () => {
    expect(app).toMatch(/<header[\s\S]*?focusMode \? "opacity-0/);
  });

  it("dims the footer in focus mode", () => {
    expect(app).toMatch(/<footer[\s\S]*?focusMode \? "opacity-0/);
  });

  it("recedes the sessions sidebar on desktop in focus mode", () => {
    expect(app).toContain('focusMode ? "lg:hidden" : "lg:block"');
  });

  it("renders an Esc-to-exit affordance only in focus mode", () => {
    expect(app).toContain("Press Esc to exit focus");
    expect(app).toMatch(/focusMode &&[\s\S]*?Press Esc to exit focus/);
  });

  it("only the header/footer/sidebar get pointer-events-none, never ChatPanel", () => {
    // ChatPanel (the writing surface + crisis/disclaimer affordances) must stay
    // reachable in focus mode. Guard that the ChatPanel render is not wrapped in
    // a focusMode-driven pointer-events-none.
    const chatPanelIdx = app.indexOf("<ChatPanel");
    const before = app.slice(Math.max(0, chatPanelIdx - 200), chatPanelIdx);
    expect(before).not.toContain("pointer-events-none");
  });
});

describe("Focus mode — modal precedence (via resolver)", () => {
  it("Escape with a modal open does not enter focus mode", () => {
    expect(
      resolveShortcut(
        { key: "Escape", metaKey: false, ctrlKey: false },
        { modalOpen: true, target: null }
      )
    ).toBeNull();
  });

  it("Escape with no modal open toggles focus mode", () => {
    expect(
      resolveShortcut(
        { key: "Escape", metaKey: false, ctrlKey: false },
        { modalOpen: false, target: null }
      )
    ).toBe("toggle-focus");
  });
});

describe("Focus mode — prompt-picker bridge", () => {
  it("App dispatches the open-prompt-picker window event", () => {
    expect(read("../../App.tsx")).toContain('new CustomEvent("open-prompt-picker")');
  });

  it("ChatPanel listens for open-prompt-picker and opens the selector", () => {
    const chat = read("../ChatPanel.tsx");
    expect(chat).toContain('window.addEventListener("open-prompt-picker"');
    expect(chat).toContain("setPromptSelectorOpen(true)");
  });
});
