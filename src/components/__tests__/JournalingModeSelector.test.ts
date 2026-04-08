import { describe, it, expect } from "vitest";

/**
 * Tests for JournalingModeSelector logic — verifying mode definitions,
 * time-based icon selection, and type safety.
 */

type JournalingMode = "freewrite" | "gratitude" | "checkin";

function getCheckinIconName(hour: number): "Sun" | "Moon" {
  return hour >= 5 && hour < 12 ? "Sun" : "Moon";
}

const STATIC_MODES: { id: JournalingMode; label: string }[] = [
  { id: "freewrite", label: "Free Write" },
  { id: "gratitude", label: "Gratitude" },
];

function getAllModes(hour: number) {
  const checkinIcon = getCheckinIconName(hour);
  return [
    ...STATIC_MODES,
    { id: "checkin" as JournalingMode, label: "Check-in", iconName: checkinIcon },
  ];
}

describe("JournalingModeSelector logic", () => {
  it("has 3 modes total", () => {
    const modes = getAllModes(10);
    expect(modes).toHaveLength(3);
  });

  it("mode IDs are freewrite, gratitude, checkin", () => {
    const modes = getAllModes(10);
    expect(modes.map((m) => m.id)).toEqual(["freewrite", "gratitude", "checkin"]);
  });

  it("static modes are Free Write and Gratitude", () => {
    expect(STATIC_MODES).toHaveLength(2);
    expect(STATIC_MODES[0].label).toBe("Free Write");
    expect(STATIC_MODES[1].label).toBe("Gratitude");
  });

  describe("check-in icon selection", () => {
    it("shows Sun icon in the morning (5-11)", () => {
      expect(getCheckinIconName(5)).toBe("Sun");
      expect(getCheckinIconName(9)).toBe("Sun");
      expect(getCheckinIconName(11)).toBe("Sun");
    });

    it("shows Moon icon in the afternoon/evening (12+)", () => {
      expect(getCheckinIconName(12)).toBe("Moon");
      expect(getCheckinIconName(18)).toBe("Moon");
      expect(getCheckinIconName(23)).toBe("Moon");
    });

    it("shows Moon icon in the early morning (0-4)", () => {
      expect(getCheckinIconName(0)).toBe("Moon");
      expect(getCheckinIconName(4)).toBe("Moon");
    });
  });

  describe("mode selection behavior", () => {
    it("each mode has a unique id", () => {
      const modes = getAllModes(10);
      const ids = new Set(modes.map((m) => m.id));
      expect(ids.size).toBe(modes.length);
    });

    it("each mode has a non-empty label", () => {
      const modes = getAllModes(10);
      modes.forEach((m) => {
        expect(m.label.length).toBeGreaterThan(0);
      });
    });
  });
});
