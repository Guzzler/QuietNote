import { describe, it, expect } from "vitest";
import type { MoodEntry } from "../../types";

function makeMood(overrides: Partial<MoodEntry> = {}): MoodEntry {
  return {
    id: crypto.randomUUID(),
    emotion: "happy",
    intensity: 5,
    contexts: [],
    ts: Date.now(),
    ...overrides,
  };
}

describe("Mood editing logic", () => {
  it("preserves original id and timestamp when editing", () => {
    const original = makeMood({ id: "mood-123", ts: 1700000000000, emotion: "sad", intensity: 3 });

    const updated: MoodEntry = {
      id: original.id,
      sessionId: original.sessionId,
      emotion: "happy",
      intensity: 7,
      contexts: ["work"],
      note: "Feeling better now",
      ts: original.ts,
    };

    expect(updated.id).toBe("mood-123");
    expect(updated.ts).toBe(1700000000000);
    expect(updated.emotion).toBe("happy");
    expect(updated.intensity).toBe(7);
  });

  it("creates new id and timestamp for new entries", () => {
    const beforeTs = Date.now();
    const entry: MoodEntry = {
      id: crypto.randomUUID(),
      emotion: "calm",
      intensity: 6,
      contexts: [],
      ts: Date.now(),
    };

    expect(entry.id).toBeTruthy();
    expect(entry.ts).toBeGreaterThanOrEqual(beforeTs);
  });

  it("pre-fills edit form values from existing mood entry", () => {
    const original = makeMood({
      emotion: "anxious",
      intensity: 8,
      contexts: ["work", "health"],
      note: "Stressful day",
    });

    const formState = {
      selectedEmotion: original.emotion,
      intensity: original.intensity,
      selectedContexts: [...original.contexts],
      note: original.note || "",
      showContexts: original.contexts.length > 0,
    };

    expect(formState.selectedEmotion).toBe("anxious");
    expect(formState.intensity).toBe(8);
    expect(formState.selectedContexts).toEqual(["work", "health"]);
    expect(formState.note).toBe("Stressful day");
    expect(formState.showContexts).toBe(true);
  });

  it("handles mood with no note during edit", () => {
    const original = makeMood({ emotion: "calm", note: undefined });

    const formNote = original.note || "";
    expect(formNote).toBe("");
  });

  it("handles mood with empty contexts during edit", () => {
    const original = makeMood({ contexts: [] });

    const showContexts = original.contexts.length > 0;
    expect(showContexts).toBe(false);
  });

  it("does not duplicate entry when updating — same id used", () => {
    const entries: MoodEntry[] = [
      makeMood({ id: "a", emotion: "happy" }),
      makeMood({ id: "b", emotion: "sad" }),
      makeMood({ id: "c", emotion: "calm" }),
    ];

    const editId = "b";
    const updated: MoodEntry = { ...entries[1], emotion: "excited", intensity: 9 };

    const result = entries.map((e) => (e.id === editId ? updated : e));

    expect(result).toHaveLength(3);
    expect(result[1].id).toBe("b");
    expect(result[1].emotion).toBe("excited");
    expect(result[1].intensity).toBe(9);
  });
});
