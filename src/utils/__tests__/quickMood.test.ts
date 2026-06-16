import { describe, it, expect } from "vitest";
import { makeQuickMoodEntry } from "../quickMood";

describe("makeQuickMoodEntry", () => {
  it("builds a valid lightweight MoodEntry with neutral defaults", () => {
    const before = Date.now();
    const entry = makeQuickMoodEntry("anxious");
    const after = Date.now();

    expect(entry.emotion).toBe("anxious");
    expect(entry.intensity).toBe(5);
    expect(entry.contexts).toEqual([]);
    expect(typeof entry.id).toBe("string");
    expect(entry.id.length).toBeGreaterThan(0);
    expect(entry.ts).toBeGreaterThanOrEqual(before);
    expect(entry.ts).toBeLessThanOrEqual(after);
    // No sessionId key when omitted.
    expect("sessionId" in entry).toBe(false);
  });

  it("includes sessionId when provided", () => {
    const entry = makeQuickMoodEntry("calm", "sess-1");
    expect(entry.sessionId).toBe("sess-1");
  });

  it("produces distinct ids on successive calls", () => {
    const a = makeQuickMoodEntry("happy");
    const b = makeQuickMoodEntry("happy");
    expect(a.id).not.toBe(b.id);
  });
});
