/**
 * Engine-output cleanup that belongs to the reply, not to any one engine.
 *
 * M11 (2026-07-31). The 2026-07-29 audit walk on the built app (`vite preview`,
 * shipped default engine = WebLLM / Gemma 2 2B) found BOTH assistant replies of
 * a two-turn free-write session opening with a stray unmatched `"`. Re-opening
 * the session after a reload showed the same text, so the quote is in the
 * STORED reply, not a render artifact — it is the first thing a stranger sees
 * the AI "say".
 *
 * Why here and not per-engine: M1c's `TurnMarkerStreamFilter`
 * (`mediapipe-engine.ts`) is the only cleanup precedent and it is MediaPipe-only;
 * this artifact was observed on WebLLM, so a per-engine fix would have to be
 * written three times and would drift. It belongs at the one place the whole
 * reply exists — the finalize point.
 *
 * Why not teacher-side: the planner scanned all 900 M6-GGUF replies across the
 * three `--rescore`-era corpora — **0 begin with a quote character**, 11/900
 * contain one anywhere. The artifact is absent from the fine-tune corpus, so
 * there is nothing to fix there.
 *
 * Accepted tradeoff, stated so nobody gets creative later: the stray `"` stays
 * visible DURING streaming and disappears at finalize. Stripping mid-stream is
 * not possible — "unmatched" is undecidable before the reply ends, and a
 * mid-stream rule would eat the opening quote of genuinely quoted text.
 *
 * This module is pure and classifies nothing. It is deliberately NOT a safety
 * util: `responseGuardrails.ts` still runs on whatever is stored, unchanged.
 */

const STRAIGHT = '"';
const CURLY_OPEN = "“";
const CURLY_CLOSE = "”";

function countOccurrences(text: string, ch: string): number {
  let n = 0;
  for (const c of text) if (c === ch) n++;
  return n;
}

/**
 * Strip a single leading quote character when the reply has no closing partner
 * for it.
 *
 * Rules, all deliberately narrow:
 * - Only the first non-whitespace character is ever considered, and only when
 *   it is `"` or `“`. Leading whitespace is preserved exactly.
 * - A straight `"` is stripped only when the reply contains an ODD number of
 *   them (an even count means the opener has a partner somewhere).
 * - A curly `“` is stripped only when the reply contains no `”` at all.
 * - At most ONE character is ever removed. The interior is never touched.
 * - Empty, whitespace-only, or non-quote-leading input is returned unchanged.
 * - Idempotent: stripping makes the count even / the pair absent, so a second
 *   call is a no-op.
 */
export function stripUnmatchedLeadingQuote(text: string): string {
  if (!text) return text;

  let i = 0;
  while (i < text.length && /\s/.test(text[i])) i++;
  if (i >= text.length) return text;

  const ch = text[i];

  if (ch === STRAIGHT) {
    if (countOccurrences(text, STRAIGHT) % 2 === 0) return text;
  } else if (ch === CURLY_OPEN) {
    if (text.includes(CURLY_CLOSE)) return text;
  } else {
    return text;
  }

  return text.slice(0, i) + text.slice(i + 1);
}

/** Minimum enclosed length for a span to count as "the model wrapped its whole
 *  reflection" rather than "the model quoted a short fragment back". */
const MIN_WRAPPED_SPAN = 40;

/**
 * Strip a balanced quote pair that wraps the model's own opening reflection.
 *
 * M11b (2026-08-01). M11 removed the *odd-count* subcase of a broader artifact.
 * The shipped default engine (WebLLM / Gemma 2 2B) wraps its whole opening
 * reflection paragraph in quotation marks — 2/2 turns in the M11 verification
 * screenshot (`docs/screenshots/2026-08-01/m11-two-turn-freewrite.png`) — and
 * `stripUnmatchedLeadingQuote` is *correct* to leave those alone, because the
 * pair is balanced. The unmatched openers the 2026-07-29 walk saw were simply
 * the cases where `truncateToLastSentence` dropped the tail carrying the
 * closing quote. So the user-visible defect — the AI appearing to *quote*
 * rather than *say* its own reflection — survived M11.
 *
 * Composed AFTER `stripUnmatchedLeadingQuote`, never folded into it: the two
 * rules carry different risk and must be testable apart.
 *
 * All five conditions must hold, and they are deliberately not widened:
 *  1. the first non-whitespace character is `"` (or `“`);
 *  2. the reply contains EXACTLY TWO of that quote character (for the curly
 *     form: exactly one `“` and one `”`) — so any reply with interior
 *     quotation is untouched;
 *  3. the closing quote ends the reply, or ends its line (trailing spaces
 *     allowed — see the discrepancy note at the check) — so a wrapper closing
 *     mid-sentence is left alone;
 *  4. the enclosed span is >= 40 characters AND contains `.`, `?` or `!`;
 *  5. nothing else is removed and the interior is untouched.
 *
 * (2)–(4) are what protect the one legitimate construction this could break:
 * an opening that quotes the user's own short phrase back, which is a real
 * reflection device.
 */
export function stripSelfQuotingWrapper(text: string): string {
  if (!text) return text;

  let start = 0;
  while (start < text.length && /\s/.test(text[start])) start++;
  if (start >= text.length) return text;

  const opener = text[start];
  let closer: string;

  if (opener === STRAIGHT) {
    // Condition 2, straight form: exactly two `"` in the whole reply.
    if (countOccurrences(text, STRAIGHT) !== 2) return text;
    closer = STRAIGHT;
  } else if (opener === CURLY_OPEN) {
    // Condition 2, curly form: exactly one of each.
    if (countOccurrences(text, CURLY_OPEN) !== 1) return text;
    if (countOccurrences(text, CURLY_CLOSE) !== 1) return text;
    closer = CURLY_CLOSE;
  } else {
    return text;
  }

  const end = text.indexOf(closer, start + 1);
  if (end === -1) return text;

  // Condition 3: the closer ends the reply, or ends its LINE.
  //
  // DISCREPANCY from the ruling's literal wording ("is the last character of
  // the reply, or is immediately followed by a newline"), found by driving the
  // real app rather than by reasoning — 2026-08-01, `vite preview`, WebLLM /
  // Gemma 2 2B. The live wrapper closes with a TRAILING SPACE before the
  // newline:
  //   `…even though she might have been understanding of the situation." ⏎What…`
  // so the literal rule leaves the very artifact it was written for in place.
  // Horizontal whitespace after the closer is skipped before the end/newline
  // test. This is the same class of defect as M10's substring-boundary bugs,
  // and it does not loosen the rule's purpose: condition 3 exists to reject a
  // wrapper that closes MID-SENTENCE, and trailing spaces do not make a line
  // mid-sentence. A closer followed by a space and then more text on the same
  // line is still rejected (pinned by test).
  const after = text.slice(end + 1);
  const afterTrimmed = after.replace(/^[^\S\n]+/, "");
  if (afterTrimmed !== "" && !afterTrimmed.startsWith("\n")) return text;

  // Condition 4: long enough, and a real sentence.
  const span = text.slice(start + 1, end);
  if (span.length < MIN_WRAPPED_SPAN) return text;
  if (!/[.?!]/.test(span)) return text;

  // Condition 5: remove exactly the two quote characters, nothing else.
  return text.slice(0, start) + span + after;
}
