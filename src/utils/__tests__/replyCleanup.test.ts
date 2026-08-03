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
import {
  stripUnmatchedLeadingQuote,
  stripSelfQuotingWrapper,
} from "../replyCleanup";

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

/**
 * M11b (2026-08-01) — `stripSelfQuotingWrapper`.
 *
 * WRAPPED below is transcribed verbatim from
 * `docs/screenshots/2026-08-01/m11-two-turn-freewrite.png` (shipped default
 * engine = WebLLM / Gemma 2 2B on `vite preview`): the model wrapped its whole
 * opening reflection in a BALANCED `"…"` pair, which M11's odd-count rule is
 * correct to leave alone — so the user-visible defect survived M11.
 */
const WRAPPED = {
  turn1:
    '"Staying late at work and missing dinner with your friend sounds like it\'s been taking a toll.  It must have felt hard to prioritize work over spending time together."\nWhat aspect of this situation feels most challenging for you right now?',
  turn2:
    '"It sounds like the quietness of your friend\'s reaction is adding to that feeling.  There could be a lot going on with her, and it might feel harder than if she\'d made an outward show about needing space."\nHow do you think this makes you relate to those feelings?',
};

describe("stripSelfQuotingWrapper — the observed wrapper", () => {
  it("unwraps the first observed reply, interior untouched", () => {
    expect(stripSelfQuotingWrapper(WRAPPED.turn1)).toBe(
      "Staying late at work and missing dinner with your friend sounds like it's been taking a toll.  It must have felt hard to prioritize work over spending time together.\nWhat aspect of this situation feels most challenging for you right now?"
    );
  });

  it("unwraps the second observed reply", () => {
    expect(stripSelfQuotingWrapper(WRAPPED.turn2)).toBe(
      "It sounds like the quietness of your friend's reaction is adding to that feeling.  There could be a lot going on with her, and it might feel harder than if she'd made an outward show about needing space.\nHow do you think this makes you relate to those feelings?"
    );
  });

  it("unwraps when the closing quote is the very last character", () => {
    const text = '"That sounds like a heavy day, and it makes sense that it lingers."';
    expect(stripSelfQuotingWrapper(text)).toBe(
      "That sounds like a heavy day, and it makes sense that it lingers."
    );
  });

  it("handles the curly pair under the same five conditions", () => {
    const text = "“That sounds like a heavy day, and it makes sense that it lingers.”";
    expect(stripSelfQuotingWrapper(text)).toBe(
      "That sounds like a heavy day, and it makes sense that it lingers."
    );
  });

  it("is idempotent", () => {
    const once = stripSelfQuotingWrapper(WRAPPED.turn1);
    expect(stripSelfQuotingWrapper(once)).toBe(once);
  });

  // Captured live 2026-08-01 while verifying M11b on `vite preview` (WebLLM /
  // Gemma 2 2B). The closer carries a TRAILING SPACE before the newline, which
  // the ruling's literal "immediately followed by a newline" wording rejected —
  // i.e. the first build of this rule left the real artifact in place. Verbatim
  // from the app; see the discrepancy note in `replyCleanup.ts`.
  const LIVE_2026_08_01 =
    '"Staying late at work can feel draining, and it\'s understandable that you missed dinner with your friend. It sounds like tonight felt heavy even though she might have been understanding of the situation." \nWhat did staying late make most present in this moment?';

  it("unwraps the live 2026-08-01 reply, whose closer has a trailing space", () => {
    expect(stripSelfQuotingWrapper(LIVE_2026_08_01)).toBe(
      "Staying late at work can feel draining, and it's understandable that you missed dinner with your friend. It sounds like tonight felt heavy even though she might have been understanding of the situation. \nWhat did staying late make most present in this moment?"
    );
  });
});

describe("stripSelfQuotingWrapper — negative cases the ruling protects", () => {
  it("leaves an opener that is not at position 0 alone (condition 1)", () => {
    const text = 'He said "hello, that sounds like a genuinely heavy day for you." to me.';
    expect(stripSelfQuotingWrapper(text)).toBe(text);
  });

  it("leaves a reply with FOUR quotes alone (condition 2)", () => {
    const text =
      '"That sounds like a heavy day for you." You also said "I hate this." earlier.';
    expect(stripSelfQuotingWrapper(text)).toBe(text);
  });

  it("leaves a short quoted-back fragment alone (condition 4, <40 chars)", () => {
    const text = '"Yes." is a complete answer sometimes.';
    expect(stripSelfQuotingWrapper(text)).toBe(text);
  });

  it("leaves the user's own short phrase quoted back alone — the legitimate device", () => {
    const text = '"stretched thin" is a vivid way to put it. What stretched furthest?';
    expect(stripSelfQuotingWrapper(text)).toBe(text);
  });

  it("leaves a wrapper whose closing quote sits mid-sentence alone (condition 3)", () => {
    const text =
      '"That sounds like a heavy day, and it makes sense that it lingers." he might say, if he were here.';
    expect(stripSelfQuotingWrapper(text)).toBe(text);
  });

  it("still rejects a closer followed by a space and MORE TEXT on the same line", () => {
    // The trailing-space allowance must not become "anything after the closer".
    const text =
      '"That sounds like a heavy day, and it makes sense that it lingers." he might say.';
    expect(stripSelfQuotingWrapper(text)).toBe(text);
  });

  it("leaves a long span with no sentence punctuation alone (condition 4)", () => {
    const text = '"a long stretch of tiredness and quiet frustration all week"';
    expect(stripSelfQuotingWrapper(text)).toBe(text);
  });

  it("leaves an unmatched opener alone — that is M11's job, not this one", () => {
    const text = '"Feeling guilty about letting your friend down sounds heavy.';
    expect(stripSelfQuotingWrapper(text)).toBe(text);
  });

  it("returns empty / whitespace-only / non-quote input unchanged", () => {
    expect(stripSelfQuotingWrapper("")).toBe("");
    expect(stripSelfQuotingWrapper("   ")).toBe("   ");
    expect(stripSelfQuotingWrapper("That sounds heavy.")).toBe("That sounds heavy.");
  });
});

describe("M11 + M11b composed — the app's own order", () => {
  const clean = (t: string) => stripSelfQuotingWrapper(stripUnmatchedLeadingQuote(t));

  it("composition is idempotent on the observed wrapper", () => {
    const once = clean(WRAPPED.turn1);
    expect(clean(once)).toBe(once);
  });

  it("composition is idempotent on the observed unmatched opener", () => {
    const once = clean(OBSERVED.turn1);
    expect(clean(once)).toBe(once);
    expect(once).toBe(
      "Feeling guilty about letting your friend down after missing dinner sounds heavy."
    );
  });

  it("a truncated wrapper is handled by M11 alone, and M11b adds nothing", () => {
    // This is the real relationship between the two artifacts: the 2026-07-29
    // replies were wrappers whose tail (and closing quote) was dropped by
    // `truncateToLastSentence`, leaving an odd count.
    const truncated =
      '"Staying late at work and missing dinner with your friend sounds like it has been taking a toll.';
    expect(clean(truncated)).toBe(
      "Staying late at work and missing dinner with your friend sounds like it has been taking a toll."
    );
  });

  it("leaves ordinary unquoted replies completely alone", () => {
    const text =
      "Staying late at work can feel isolating.  What was the moment you texted to cancel that felt so hard?";
    expect(clean(text)).toBe(text);
  });
});

describe("M11 — call sites are pinned (a future edit cannot drop one)", () => {
  const read = (rel: string) =>
    readFileSync(join(process.cwd(), rel), "utf-8");

  // Updated in place 2026-08-01 by M11b: the call sites now COMPOSE the two
  // rules, so the pin matches the composition rather than the bare M11 call.
  // Deleting the pin instead of updating it would lose the "cannot drop one"
  // guarantee it exists for.
  it("App.tsx composes both rules at BOTH finalize points, wrapping truncateToLastSentence", () => {
    const app = read("src/App.tsx");
    const calls = app.match(
      /const finalContent = stripSelfQuotingWrapper\(\s*stripUnmatchedLeadingQuote\(truncateToLastSentence\(acc\)\)\s*\);/g
    );
    expect(calls).toHaveLength(2);
  });

  it("App.tsx applies M11b AFTER M11, never the other way round", () => {
    // Order matters: M11 makes the count even by removing a ragged opener, and
    // only then can M11b's exactly-two test see a genuine wrapper.
    const app = read("src/App.tsx");
    const composed = app.match(
      /stripSelfQuotingWrapper\(\s*stripUnmatchedLeadingQuote\(/g
    );
    expect(composed).toHaveLength(2);
    expect(app).not.toContain("stripUnmatchedLeadingQuote(stripSelfQuotingWrapper(");
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

  // Updated in place 2026-08-01 by M11b: both eval paths now go through one
  // `cleanReply` helper, so the live path and `--rescore` cannot drift apart.
  it("evalDriver.ts applies the cleanup on BOTH the live and the re-score paths", () => {
    const driver = read("src/utils/evalDriver.ts");
    const calls = driver.match(/evaluateResponse\(cleanReply\(response\), c\)/g);
    expect(calls).toHaveLength(2);
  });

  it("evalDriver.ts's helper composes the two rules in the app's order", () => {
    const driver = read("src/utils/evalDriver.ts");
    expect(driver).toContain(
      "return stripSelfQuotingWrapper(stripUnmatchedLeadingQuote(response));"
    );
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
