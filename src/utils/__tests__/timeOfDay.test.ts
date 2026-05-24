import { describe, it, expect } from "vitest";
import { currentTimeBucket } from "../timeOfDay";

describe("currentTimeBucket", () => {
  it("returns night at 4:59", () => {
    expect(currentTimeBucket(new Date(2026, 0, 1, 4, 59))).toBe("night");
  });

  it("returns morning at 5:00", () => {
    expect(currentTimeBucket(new Date(2026, 0, 1, 5, 0))).toBe("morning");
  });

  it("returns morning at 11:59", () => {
    expect(currentTimeBucket(new Date(2026, 0, 1, 11, 59))).toBe("morning");
  });

  it("returns afternoon at 12:00", () => {
    expect(currentTimeBucket(new Date(2026, 0, 1, 12, 0))).toBe("afternoon");
  });

  it("returns afternoon at 16:59", () => {
    expect(currentTimeBucket(new Date(2026, 0, 1, 16, 59))).toBe("afternoon");
  });

  it("returns evening at 17:00", () => {
    expect(currentTimeBucket(new Date(2026, 0, 1, 17, 0))).toBe("evening");
  });

  it("returns evening at 21:59", () => {
    expect(currentTimeBucket(new Date(2026, 0, 1, 21, 59))).toBe("evening");
  });

  it("returns night at 22:00", () => {
    expect(currentTimeBucket(new Date(2026, 0, 1, 22, 0))).toBe("night");
  });

  it("returns night at midnight", () => {
    expect(currentTimeBucket(new Date(2026, 0, 1, 0, 0))).toBe("night");
  });

  it("returns night at 3:00 AM", () => {
    expect(currentTimeBucket(new Date(2026, 0, 1, 3, 0))).toBe("night");
  });
});
