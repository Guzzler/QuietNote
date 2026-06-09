/**
 * Prior-turn entity surfacing — salience injection for multi-turn coherence.
 *
 * Background: across Days 3–6 critic samples, brief emotional follow-ups
 * ("I'm just so tired of everything." / "Yeah.") caused the model to latch
 * onto the surface words of the latest turn and drop the entity established
 * two turns earlier (the family dinner, the hurtful thing said to mom).
 * The prompt-only directive added on Day 3 did not change this on brief
 * follow-up shapes. The Day-8 BUILD plan authorizes a structural fix:
 * synthesize a 1-line recap of the established entities/feelings and place
 * it adjacent to the current user turn so the model reads it LAST.
 *
 * Pure, deterministic, no model call.
 */
export interface PriorTurn {
  role: string;
  content: string;
}

// Small curated lexicons. Lowercase entries; matched case-insensitively as
// whole words. Order in the output is the order of first appearance across
// the prior USER turns (oldest-first), which keeps the earliest-established
// entity in front.
const RELATION_LEX = [
  "mom",
  "mum",
  "mother",
  "dad",
  "father",
  "sister",
  "brother",
  "partner",
  "husband",
  "wife",
  "spouse",
  "boyfriend",
  "girlfriend",
  "boss",
  "manager",
  "friend",
  "coworker",
  "colleague",
  "son",
  "daughter",
  "child",
  "kid",
  "parents",
  "family",
] as const;

const EVENT_LEX = [
  "dinner",
  "lunch",
  "breakfast",
  "meeting",
  "graduation",
  "wedding",
  "funeral",
  "interview",
  "presentation",
  "argument",
  "fight",
  "layoff",
  "layoffs",
  "promotion",
  "vacation",
  "trip",
  "appointment",
  "party",
  "call",
  "date",
] as const;

const FEELING_LEX = [
  "ashamed",
  "shame",
  "guilty",
  "guilt",
  "tired",
  "exhausted",
  "lonely",
  "anxious",
  "anxiety",
  "scared",
  "afraid",
  "angry",
  "furious",
  "frustrated",
  "sad",
  "heartbroken",
  "grief",
  "hopeless",
  "worried",
  "overwhelmed",
  "hurt",
  "humiliated",
  "embarrassed",
  "devastated",
  "stressed",
  "numb",
  "empty",
] as const;

const STOPWORDS = new Set([
  "I",
  "I'm",
  "I've",
  "I'll",
  "I'd",
  "My",
  "Me",
  "Mine",
  "We",
  "Our",
  "Us",
  "You",
  "Your",
  "He",
  "She",
  "It",
  "They",
  "Them",
  "Their",
  "This",
  "That",
  "These",
  "Those",
  "The",
  "A",
  "An",
  "And",
  "But",
  "Or",
  "So",
  "Yet",
  "Yeah",
  "Yes",
  "No",
  "Just",
  "Today",
  "Yesterday",
  "Tomorrow",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

function findWholeWord(haystackLower: string, needleLower: string): boolean {
  const escaped = needleLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystackLower);
}

function extractNamedPeople(text: string): string[] {
  // Capitalized tokens that aren't at sentence start and aren't common
  // pronouns/articles. Conservative — avoids fabricating anchors.
  const out: string[] = [];
  const seen = new Set<string>();
  const sentenceSplit = text.split(/(?<=[.!?])\s+/);
  for (const sentence of sentenceSplit) {
    const tokens = sentence.split(/\s+/);
    for (let i = 0; i < tokens.length; i++) {
      const raw = tokens[i].replace(/[^A-Za-z']/g, "");
      if (!raw) continue;
      // Skip the very first token of a sentence (likely sentence-start cap).
      if (i === 0) continue;
      if (!/^[A-Z][a-z']+$/.test(raw)) continue;
      if (STOPWORDS.has(raw)) continue;
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(raw);
    }
  }
  return out;
}

function findFirstLexHit(textLower: string, lex: readonly string[]): string | null {
  // Returns the lexicon entry that appears earliest in textLower.
  let bestIdx = -1;
  let bestEntry: string | null = null;
  for (const entry of lex) {
    const re = new RegExp(`\\b${entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const m = textLower.match(re);
    if (m && m.index !== undefined) {
      if (bestIdx === -1 || m.index < bestIdx) {
        bestIdx = m.index;
        bestEntry = entry;
      }
    }
  }
  return bestEntry;
}

function collectLexHits(textLower: string, lex: readonly string[]): string[] {
  // Preserves the order of first occurrence in the source text.
  const hits: { entry: string; idx: number }[] = [];
  for (const entry of lex) {
    const re = new RegExp(`\\b${entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const m = textLower.match(re);
    if (m && m.index !== undefined) {
      hits.push({ entry, idx: m.index });
    }
  }
  hits.sort((a, b) => a.idx - b.idx);
  return hits.map((h) => h.entry);
}

const MAX_RECAP_CHARS = 240;
const MAX_ANCHORS = 4;

/**
 * Builds a compact, single-line recap of the salient entities (named people,
 * relationships, events) and feelings the USER established in earlier turns
 * of THIS conversation. Returns null when there is nothing worth recapping
 * (0–1 trivial prior user turns, or no extractable anchors).
 *
 * Mechanism: salience injection. The caller should place the returned recap
 * adjacent to the current user turn so the model reads the established
 * entity LAST, defeating surface-word-latch on brief follow-ups.
 */
export function buildPriorTurnRecap(history: PriorTurn[]): string | null {
  if (!Array.isArray(history) || history.length === 0) return null;

  const userTurns = history.filter((m) => m && m.role === "user" && typeof m.content === "string");
  if (userTurns.length === 0) return null;

  // Single trivial opener → no recap.
  if (userTurns.length === 1 && userTurns[0].content.trim().length < 40) {
    return null;
  }

  const joinedRaw = userTurns.map((t) => t.content).join("\n");
  const joinedLower = joinedRaw.toLowerCase();

  // 1) Named people (oldest user turn first preserves entity order).
  const named: string[] = [];
  const seenNamed = new Set<string>();
  for (const t of userTurns) {
    for (const n of extractNamedPeople(t.content)) {
      const k = n.toLowerCase();
      if (!seenNamed.has(k)) {
        seenNamed.add(k);
        named.push(n);
      }
    }
  }

  // 2) Relationships (e.g., mom, boss).
  const relations = collectLexHits(joinedLower, RELATION_LEX);

  // 3) Events (e.g., dinner, layoff).
  const events = collectLexHits(joinedLower, EVENT_LEX);

  // 4) Feelings.
  const feelings = collectLexHits(joinedLower, FEELING_LEX);

  // Compose the anchors. Prefer concrete entities (people/relations/events)
  // before feelings — the entity is what the model drops on brief follow-ups.
  const entityAnchors: string[] = [];
  const pushUnique = (s: string) => {
    if (!entityAnchors.includes(s)) entityAnchors.push(s);
  };

  // Build event phrases where a relation + event co-occur in the same turn
  // ("family dinner", "boss meeting"). This produces a more natural anchor
  // and matches the mt-3 fixture's "family dinner" phrasing.
  for (const t of userTurns) {
    const low = t.content.toLowerCase();
    const rel = findFirstLexHit(low, RELATION_LEX);
    const ev = findFirstLexHit(low, EVENT_LEX);
    if (rel && ev) {
      pushUnique(`the ${rel} ${ev}`);
    }
  }

  for (const n of named) pushUnique(n);
  for (const r of relations) {
    if (!entityAnchors.some((a) => a.includes(r))) pushUnique(`their ${r}`);
  }
  for (const ev of events) {
    if (!entityAnchors.some((a) => a.includes(ev))) pushUnique(`the ${ev}`);
  }

  const topEntities = entityAnchors.slice(0, MAX_ANCHORS);
  const topFeelings = feelings.slice(0, 2);

  if (topEntities.length === 0 && topFeelings.length === 0) {
    return null;
  }

  // Safety: only include anchors whose key word(s) appear in the source text.
  const verifyToken = (phrase: string): boolean => {
    const words = phrase.split(/\s+/).filter((w) => w.length > 2);
    return words.every((w) => findWholeWord(joinedLower, w));
  };
  const safeEntities = topEntities.filter(verifyToken);
  const safeFeelings = topFeelings.filter((f) => findWholeWord(joinedLower, f));

  if (safeEntities.length === 0 && safeFeelings.length === 0) return null;

  const parts: string[] = [];
  if (safeEntities.length > 0) {
    parts.push(`they spoke about ${joinList(safeEntities)}`);
  }
  if (safeFeelings.length > 0) {
    parts.push(`and felt ${joinList(safeFeelings)}`);
  }

  let recap = `Earlier in this conversation ${parts.join(" ")}. Connect your reply to that before responding to their latest message.`;

  // Guard the cap. If we go over, drop the trailing instruction first.
  if (recap.length > MAX_RECAP_CHARS) {
    recap = `Earlier in this conversation ${parts.join(" ")}.`;
  }
  if (recap.length > MAX_RECAP_CHARS) {
    recap = recap.slice(0, MAX_RECAP_CHARS - 1) + ".";
  }
  return recap;
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
