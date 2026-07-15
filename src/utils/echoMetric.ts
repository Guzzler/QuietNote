/**
 * Echo/repetition metric + template-smell check (model-quality M1, 2026-07-14).
 *
 * Measures the failure Sharang flagged on 2026-07-11: the reply opens by
 * restating the user's entry back at them, pronoun-swapped. The score is the
 * max n-gram overlap between the user entry and the FIRST SENTENCE of the
 * reply — the longest run of consecutive shared words, normalized by the
 * first sentence's length. A reply that opens in its own words scores near 0;
 * a mirrored entry scores near 1.
 *
 * Freeze posture: NEW file, additive only. Existing eval cases, dimensions,
 * and release-gate floors are untouched (M1 rule). The fine-tune (M2/M3) is
 * what moves these numbers; this module only measures them.
 */

/** First sentence of a reply (echo shows up in the opening). */
export function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^[^.!?\n]+[.!?]?/);
  return (match ? match[0] : trimmed).trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Pronouns mirror across the entry→reply flip ("I fixed" → "you fixed"), so a
 * pronoun-swapped echo would break token equality and hide exactly the failure
 * we are measuring. Fold both sides into a shared marker before matching.
 */
const PRONOUN_FOLD: Record<string, string> = {
  i: "«p»", me: "«p»", my: "«p»", mine: "«p»", myself: "«p»",
  you: "«p»", your: "«p»", yours: "«p»", yourself: "«p»",
  im: "«p»", youre: "«p»", ive: "«p»", youve: "«p»",
  am: "«b»", are: "«b»",
};

function foldPronouns(tokens: string[]): string[] {
  return tokens.map((t) => PRONOUN_FOLD[t.replace(/'/g, "")] ?? t);
}

/** Minimum shared run (in words) that counts as an echo at all. */
export const MIN_ECHO_NGRAM = 3;

/**
 * Longest run of consecutive shared words between `entry` and the first
 * sentence of `reply`, normalized by the first-sentence length (0..1).
 * Runs shorter than MIN_ECHO_NGRAM score 0 — small incidental overlaps
 * ("in the morning") are not echoes.
 */
export function maxNgramOverlap(entry: string, reply: string): number {
  const entryTokens = foldPronouns(tokenize(entry));
  const openingTokens = foldPronouns(tokenize(firstSentence(reply)));
  if (entryTokens.length === 0 || openingTokens.length === 0) return 0;

  // Longest common substring over token arrays (DP, small inputs).
  let longest = 0;
  let prev = new Array<number>(entryTokens.length + 1).fill(0);
  for (let i = 1; i <= openingTokens.length; i++) {
    const curr = new Array<number>(entryTokens.length + 1).fill(0);
    for (let j = 1; j <= entryTokens.length; j++) {
      if (openingTokens[i - 1] === entryTokens[j - 1]) {
        curr[j] = prev[j - 1] + 1;
        if (curr[j] > longest) longest = curr[j];
      }
    }
    prev = curr;
  }

  if (longest < MIN_ECHO_NGRAM) return 0;
  return longest / openingTokens.length;
}

/**
 * Rubric thresholds (quality bar, set 2026-07-12): a no-echo PASS opens in
 * the model's own words; PARTIAL borrows a clause; FAIL mirrors the entry.
 */
export const ECHO_PASS_THRESHOLD = 0.35;
export const ECHO_PARTIAL_THRESHOLD = 0.6;

export function scoreNoEcho(entry: string, reply: string): 0 | 1 | 2 {
  const overlap = maxNgramOverlap(entry, reply);
  if (overlap < ECHO_PASS_THRESHOLD) return 2;
  if (overlap < ECHO_PARTIAL_THRESHOLD) return 1;
  return 0;
}

/**
 * Stock therapy-bot phrases ("template smell"). Includes the prompt's banned
 * openers plus the filler a small model reaches for anywhere in a reply.
 * Matched case-insensitively against the WHOLE reply.
 */
export const TEMPLATE_SMELL_PHRASES: string[] = [
  // Banned-opener stems (systemPrompts.ts) — smell anywhere, not just openings
  "it sounds like",
  "i hear that",
  "i hear how",
  "that sounds like",
  "that must be",
  "it takes courage",
  "i'm so sorry to hear",
  // Generic-warmth filler
  "thank you for sharing",
  "i'm here for you",
  "i am here for you",
  "remember to be kind to yourself",
  "be gentle with yourself",
  "it's okay to feel",
  "it is okay to feel",
  "your feelings are valid",
  "it's completely understandable",
  "it is completely understandable",
  "take a deep breath",
  "one day at a time",
  "you are not alone in this",
  "you're not alone in this",
];

export function templateSmellCount(reply: string): number {
  const lower = reply.toLowerCase();
  return TEMPLATE_SMELL_PHRASES.filter((p) => lower.includes(p)).length;
}

export function scoreTemplateSmell(reply: string): 0 | 1 | 2 {
  const count = templateSmellCount(reply);
  if (count === 0) return 2;
  if (count === 1) return 1;
  return 0;
}
