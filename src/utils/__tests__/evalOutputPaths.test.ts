import { describe, it, expect } from "vitest";
import {
  resolveOutDirName,
  withOutfileSuffix,
  modeReportFilename,
  summaryFilename,
} from "../evalOutputPaths";

describe("resolveOutDirName", () => {
  it("defaults to UTC today when no --outdir is given", () => {
    expect(resolveOutDirName(undefined, "2026-07-07")).toBe("2026-07-07");
  });

  it("uses --outdir verbatim when present", () => {
    expect(resolveOutDirName("2026-07-07", "2026-07-08")).toBe("2026-07-07");
  });

  it("treats empty/whitespace --outdir as absent", () => {
    expect(resolveOutDirName("", "2026-07-07")).toBe("2026-07-07");
    expect(resolveOutDirName("   ", "2026-07-07")).toBe("2026-07-07");
  });

  it("accepts non-date directory names verbatim", () => {
    expect(resolveOutDirName("day32-confirmation", "2026-07-07")).toBe("day32-confirmation");
  });
});

describe("withOutfileSuffix", () => {
  it("returns the base name unchanged with no suffix (backward compat)", () => {
    expect(withOutfileSuffix("gratitude.md", undefined)).toBe("gratitude.md");
    expect(withOutfileSuffix("summary.json", "")).toBe("summary.json");
    expect(withOutfileSuffix("summary.json", "  ")).toBe("summary.json");
  });

  it("inserts the suffix before the extension", () => {
    expect(withOutfileSuffix("gratitude.md", "pass1")).toBe("gratitude-pass1.md");
    expect(withOutfileSuffix("summary.json", "pass2")).toBe("summary-pass2.json");
  });

  it("appends when the base has no extension", () => {
    expect(withOutfileSuffix("NOTE", "pass1")).toBe("NOTE-pass1");
  });
});

describe("modeReportFilename", () => {
  it("keeps historical names without a suffix", () => {
    expect(modeReportFilename("gratitude")).toBe("gratitude.md");
    expect(modeReportFilename("checkin")).toBe("checkin.md");
    expect(modeReportFilename("thoughtrecord")).toBe("thoughtrecord.md");
    expect(modeReportFilename("freewrite")).toBe("freewrite-fullsuite.md");
  });

  it("makes per-pass names unique with a suffix", () => {
    expect(modeReportFilename("gratitude", "pass1")).toBe("gratitude-pass1.md");
    expect(modeReportFilename("gratitude", "pass2")).toBe("gratitude-pass2.md");
    expect(modeReportFilename("freewrite", "pass1")).toBe("freewrite-fullsuite-pass1.md");
  });
});

describe("summaryFilename", () => {
  it("keeps summary.json without a suffix (critic loop compat)", () => {
    expect(summaryFilename()).toBe("summary.json");
  });

  it("suffixes the summary per pass", () => {
    expect(summaryFilename("pass3")).toBe("summary-pass3.json");
  });
});
