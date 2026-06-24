import { describe, it, expect } from "vitest";
import { resolveShortcut, isTypingTarget } from "../../utils/keyboardShortcuts";

// Track A6 (2026-06-23) — global keyboard shortcut resolution.
// Behavioural tests against the pure resolver so the rules are pinned without
// rendering the model-loading App tree. Runs in the repo's default Node test
// environment — targets are duck-typed plain objects, no DOM globals needed.

type KeyParts = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey">;
const key = (k: string, mods: Partial<KeyParts> = {}): KeyParts => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  ...mods,
});

const elt = (tagName: string, isContentEditable = false) =>
  ({ tagName, isContentEditable }) as unknown as EventTarget;
const body = elt("BODY");

describe("isTypingTarget", () => {
  it("is true for a textarea (the journal writing surface)", () => {
    expect(isTypingTarget(elt("TEXTAREA"))).toBe(true);
  });

  it("is true for an input", () => {
    expect(isTypingTarget(elt("INPUT"))).toBe(true);
  });

  it("is true for a contenteditable element", () => {
    expect(isTypingTarget(elt("DIV", true))).toBe(true);
  });

  it("is false for a plain div and for null", () => {
    expect(isTypingTarget(elt("DIV"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe("resolveShortcut — Cmd/Ctrl+N", () => {
  it("Ctrl+N maps to new-session", () => {
    expect(resolveShortcut(key("n", { ctrlKey: true }), { modalOpen: false, target: null })).toBe(
      "new-session"
    );
  });

  it("Cmd+N (metaKey) maps to new-session, case-insensitive", () => {
    expect(resolveShortcut(key("N", { metaKey: true }), { modalOpen: false, target: null })).toBe(
      "new-session"
    );
  });

  it("new-session fires even while a modal is open", () => {
    expect(resolveShortcut(key("n", { ctrlKey: true }), { modalOpen: true, target: null })).toBe(
      "new-session"
    );
  });
});

describe("resolveShortcut — Escape (focus mode)", () => {
  it("toggles focus mode when no modal is open", () => {
    expect(resolveShortcut(key("Escape"), { modalOpen: false, target: null })).toBe("toggle-focus");
  });

  it("does NOT toggle focus mode when a modal is open (modal closes itself)", () => {
    expect(resolveShortcut(key("Escape"), { modalOpen: true, target: null })).toBeNull();
  });
});

describe("resolveShortcut — / (prompt picker)", () => {
  it("opens the prompt picker from document body (not a typing field)", () => {
    expect(resolveShortcut(key("/"), { modalOpen: false, target: body })).toBe("open-prompt-picker");
  });

  it("is ignored while typing in the journal textarea (literal slash)", () => {
    expect(resolveShortcut(key("/"), { modalOpen: false, target: elt("TEXTAREA") })).toBeNull();
  });

  it("is ignored while a modal is open", () => {
    expect(resolveShortcut(key("/"), { modalOpen: true, target: body })).toBeNull();
  });
});

describe("resolveShortcut — unrelated keys", () => {
  it("returns null for an ordinary letter", () => {
    expect(resolveShortcut(key("a"), { modalOpen: false, target: body })).toBeNull();
  });

  it("returns null for Escape with a modifier held", () => {
    expect(resolveShortcut(key("Escape", { ctrlKey: true }), { modalOpen: false, target: null })).toBeNull();
  });
});
