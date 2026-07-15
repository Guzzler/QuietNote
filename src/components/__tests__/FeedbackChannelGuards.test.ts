import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  FEEDBACK_ISSUES_URL,
  FEEDBACK_MAILTO,
  REPO_URL,
} from "../../utils/feedbackLinks";

// Guards for the F1 feedback channel (2026-07-12). Feedback is
// user-initiated link-out ONLY: static hrefs, no fetch, no query params,
// nothing that could prefill or attach journal content. Same
// read-source-as-text pattern as PrivacyConsolidationGuards.test.ts.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

describe("Feedback channel guards (F1)", () => {
  describe("links are static and carry no user data", () => {
    it("issues link points at the template chooser", () => {
      expect(FEEDBACK_ISSUES_URL).toBe(
        "https://github.com/Guzzler/QuietNote/issues/new/choose",
      );
    });

    it("issues link has no query string (nothing may be prefilled)", () => {
      expect(FEEDBACK_ISSUES_URL).not.toContain("?");
    });

    it("mailto goes to the owner with no subject/body prefill", () => {
      expect(FEEDBACK_MAILTO).toBe("mailto:sharangpaiusa@gmail.com");
      expect(FEEDBACK_MAILTO).not.toContain("?");
    });

    it("repo link points at the repository with no query string (R3b)", () => {
      expect(REPO_URL).toBe("https://github.com/Guzzler/QuietNote");
      expect(REPO_URL).not.toContain("?");
    });

    it("feedbackLinks module performs no network calls", () => {
      const source = read("../../utils/feedbackLinks.ts");
      expect(source).not.toContain("fetch(");
      expect(source).not.toContain("XMLHttpRequest");
      expect(source).not.toContain("navigator.sendBeacon");
    });
  });

  describe("footer renders the affordance", () => {
    const source = read("../../App.tsx");

    it("App footer carries the Share feedback link-out", () => {
      expect(source).toContain("FEEDBACK_ISSUES_URL");
      expect(source).toContain("Share feedback");
    });

    it("issues link opens in a new tab without an opener handle", () => {
      expect(source).toContain('rel="noopener noreferrer"');
    });

    it("App footer carries the mailto alternative", () => {
      expect(source).toContain("FEEDBACK_MAILTO");
    });

    it("App footer carries the open-source repo link (R3b)", () => {
      expect(source).toContain("REPO_URL");
      expect(source).toContain("open source");
    });
  });

  describe("issue templates guard against pasted journal content", () => {
    const guard = "Please don't paste your journal entries here.";

    it("feedback.yml opens with the privacy guard", () => {
      expect(read("../../../.github/ISSUE_TEMPLATE/feedback.yml")).toContain(
        guard,
      );
    });

    it("bug.yml opens with the privacy guard", () => {
      expect(read("../../../.github/ISSUE_TEMPLATE/bug.yml")).toContain(guard);
    });

    it("bug.yml console field warns about personal text", () => {
      expect(read("../../../.github/ISSUE_TEMPLATE/bug.yml")).toContain(
        "Check it for personal text before pasting.",
      );
    });
  });
});
