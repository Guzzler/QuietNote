import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Source-level guards for the Track A3 privacy signal consolidation (2026-06-14).
// Same read-source-as-text pattern as VisualCalmGuards.test.ts: assert the
// privacy story is told in exactly one persistent place (footer) with a single
// entry point to the data controls (inside Settings), and the dedicated header
// Privacy nav button stays gone — while the PrivacyDashboard stays mounted and
// fully reachable.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

describe("Privacy consolidation guards (Track A3)", () => {
  describe("no dedicated header Privacy nav button", () => {
    it("App.tsx no longer renders a standalone Privacy dashboard button", () => {
      // The header button carried aria-label="Privacy dashboard"; the entry
      // point now lives only via Settings, so this exact label must be absent.
      expect(read("../../App.tsx")).not.toContain('aria-label="Privacy dashboard"');
    });
  });

  describe("single entry point lives inside Settings", () => {
    const source = read("../SettingsPanel.tsx");

    it("SettingsPanel accepts an onOpenPrivacy callback", () => {
      expect(source).toContain("onOpenPrivacy");
    });

    it("SettingsPanel renders a Privacy & your data affordance", () => {
      expect(source).toContain("Privacy &amp; your data");
      expect(source).toContain('aria-label="Open privacy and data controls"');
    });
  });

  describe("App wires Settings -> Privacy and keeps the dashboard mounted", () => {
    const source = read("../../App.tsx");

    it("App passes onOpenPrivacy to SettingsPanel", () => {
      expect(source).toContain("onOpenPrivacy");
    });

    it("PrivacyDashboard remains mounted / reachable", () => {
      expect(source).toContain("<PrivacyDashboard");
    });
  });

  describe("footer is the single persistent privacy indicator", () => {
    const source = read("../../App.tsx");

    it("footer carries a Lock icon", () => {
      expect(source).toContain('<Lock className="h-3 w-3 text-slate-400" />');
    });

    it("footer keeps the on-device copy", () => {
      expect(source).toContain("stay on this device");
    });
  });
});
