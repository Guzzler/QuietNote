import { describe, it, expect } from "vitest";

/**
 * Tests for the dismissible context trimming notice logic.
 * The ChatPanel shows a trim notice when `contextTrimmed` is true
 * and `showTrimNotice` is true. Clicking dismiss sets `showTrimNotice`
 * to false. A new trim event resets it to true.
 */

interface TrimNoticeState {
  contextTrimmed: boolean;
  showTrimNotice: boolean;
}

function shouldShowNotice(state: TrimNoticeState): boolean {
  return state.contextTrimmed && state.showTrimNotice;
}

function dismiss(state: TrimNoticeState): TrimNoticeState {
  return { ...state, showTrimNotice: false };
}

function onNewTrimEvent(state: TrimNoticeState): TrimNoticeState {
  return { ...state, contextTrimmed: true, showTrimNotice: true };
}

describe("Dismissible trim notice logic", () => {
  it("shows notice when contextTrimmed is true", () => {
    const state: TrimNoticeState = { contextTrimmed: true, showTrimNotice: true };
    expect(shouldShowNotice(state)).toBe(true);
  });

  it("hides notice when contextTrimmed is false", () => {
    const state: TrimNoticeState = { contextTrimmed: false, showTrimNotice: true };
    expect(shouldShowNotice(state)).toBe(false);
  });

  it("hides notice after dismiss", () => {
    let state: TrimNoticeState = { contextTrimmed: true, showTrimNotice: true };
    expect(shouldShowNotice(state)).toBe(true);

    state = dismiss(state);
    expect(shouldShowNotice(state)).toBe(false);
  });

  it("re-shows notice on new trim event after dismiss", () => {
    let state: TrimNoticeState = { contextTrimmed: true, showTrimNotice: true };
    state = dismiss(state);
    expect(shouldShowNotice(state)).toBe(false);

    // Simulate new trim event
    state = onNewTrimEvent(state);
    expect(shouldShowNotice(state)).toBe(true);
  });

  it("stays hidden if dismissed and no new trim event", () => {
    let state: TrimNoticeState = { contextTrimmed: true, showTrimNotice: true };
    state = dismiss(state);
    // No new trim event
    expect(shouldShowNotice(state)).toBe(false);
  });
});
