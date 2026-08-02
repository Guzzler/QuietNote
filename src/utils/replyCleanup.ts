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
