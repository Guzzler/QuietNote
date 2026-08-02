/**
 * M11 (2026-07-31) — `stripUnmatchedLeadingQuote` + the call-site pins.
 *
 * The two "observed" replies below are verbatim from the 2026-07-29 audit walk
 * on the built app (`npx vite preview`, WebLLM / Gemma 2 2B, two-turn free-write
 * session) — screenshots in `docs/screenshots/2026-07-29/`. They are the reason
 * this util exists.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripUnmatchedLeadingQuote } from "../replyCleanup";

const OBSERVED = {
  turn1:
    '"Feeling guilty about letting your friend down after missing dinner sounds heavy.',
  turn2:
    '"Staying late at work and skipping dinner with your friend likely makes you feel bad.',
};

describe("stripUnmatchedLeadingQuote — the observed artifact", () => {
  it("strips the leading quote from the first observed reply", () => {
    expect(stripUnmatchedLeadingQuote(OBSERVED.turn1)).toBe(
      "Feeling guilty about letting your friend down after missing dinner sounds heavy."
    );
  });

  it("strips the leading quote from the second observed reply", () => {
    expect(stripUnmatchedLeadingQuote(OBSERVED.turn2)).toBe(
      "Staying late at work and skipping dinner with your friend likely makes you feel bad."
    );
  });

  it("is idempotent — a second call changes nothing", () => {
    const once = stripUnmatchedLeadingQuote(OBSERVED.turn1);
    expect(stripUnmatchedLeadingQuote(once)).toBe(once);
  });
});

describe("stripUnmatchedLeadingQuote — never touches legitimately quoted text", () => {
  it("leaves an interior balanced pair alone", () => {
    const text = 'He said "hello" to me.';
    expect(stripUnmatchedLeadingQuote(text)).toBe(text);
  });

  it("leaves a fully-quoted reply alone (leading quote HAS a partner)", () => {
    const text = '"You are doing better than you think." That is what I heard.';
    expect(stripUnmatchedLeadingQuote(text)).toBe(text);
  });

  it("leaves a leading quote alone when a closing one exists later", () => {
    const text = '"I can\'t do that right now," is a complete sentence too.';
    expect(stripUnmatchedLeadingQuote(text)).toBe(text);
  });

  it("leaves curly quotes alone when the pair is closed", () => {
    const text = "“I missed dinner,” you wrote. What happened next?";
    expect(stripUnmatchedLeadingQuote(text)).toBe(text);
  });

  it("strips an unmatched curly opener", () => {
    expect(stripUnmatchedLeadingQuote("“That sounds heavy.")).toBe(
      "That sounds heavy."
    );
  });

  it("does not touch a mid-string quote — only position 0 is ever considered", () => {
    const text = 'That sounds heavy. "And it lingers.';
    expect(stripUnmatchedLeadingQuote(text)).toBe(text);
  });
});

describe("stripUnmatchedLeadingQuote — narrowness guarantees", () => {
  it("removes at most ONE character", () => {
    // Three quotes = odd, so the leading one is unmatched. Only it goes.
    const out = stripUnmatchedLeadingQuote('""" ok');
    expect(out).toBe('"" ok');
  });

  it("preserves leading whitespace exactly", () => {
    expect(stripUnmatchedLeadingQuote('  "That sounds heavy.')).toBe(
      "  That sounds heavy."
    );
  });

  it("returns empty / whitespace-only / non-quote input unchanged", () => {
    expect(stripUnmatchedLeadingQuote("")).toBe("");
    expect(stripUnmatchedLeadingQuote("   ")).toBe("   ");
    expect(stripUnmatchedLeadingQuote("That sounds heavy.")).toBe(
      "That sounds heavy."
    );
  });
});

describe("M11 — call sites are pinned (a future edit cannot drop one)", () => {
  const read = (rel: string) =>
    readFileSync(join(process.cwd(), rel), "utf-8");

  it("App.tsx calls it at BOTH finalize points, wrapping truncateToLastSentence", () => {
    const app = read("src/App.tsx");
    const calls = app.match(
      /const finalContent = stripUnmatchedLeadingQuote\(truncateToLastSentence\(acc\)\);/g
    );
    expect(calls).toHaveLength(2);
  });

  it("App.tsx runs the cleanup BEFORE sanitizeResponse, never after", () => {
    // The guardrails must classify exactly what gets stored. If the cleanup
    // ever moves after sanitizeResponse, the stored text and the classified
    // text diverge — that is the thing this ordering exists to prevent.
    const app = read("src/App.tsx");
    let from = 0;
    for (let i = 0; i < 2; i++) {
      const strip = app.indexOf("stripUnmatchedLeadingQuote(truncateToLastSentence", from);
      expect(strip).toBeGreaterThan(-1);
      const sanitize = app.indexOf("sanitizeResponse(finalContent)", strip);
      expect(sanitize).toBeGreaterThan(strip);
      from = sanitize;
    }
  });

  it("evalDriver.ts applies it on BOTH the live and the re-score paths", () => {
    const driver = read("src/utils/evalDriver.ts");
    const calls = driver.match(
      /evaluateResponse\(stripUnmatchedLeadingQuote\(response\), c\)/g
    );
    expect(calls).toHaveLength(2);
  });

  it("replyCleanup.ts imports nothing from the safety utils", () => {
    // It is a formatting util, deliberately not a safety surface.
    const src = read("src/utils/replyCleanup.ts");
    for (const forbidden of [
      "crisisDetection",
      "responseGuardrails",
      "responseShaping",
      "referralReprompt",
      "systemPrompts",
    ]) {
      expect(src).not.toContain(forbidden + '"');
    }
  });
});
