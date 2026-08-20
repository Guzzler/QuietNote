import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { entriesForRecord } from "../ThoughtRecordHistory";
import type { ThoughtRecord } from "../../types";

// Guards for R13c (2026-08-19). R13b made the card show every captured entry
// under the question it was written against, but could not fix what R13a found
// underneath: the step-3 answer is stored only as `parseEmotions(...)`, a
// 16-word keyword match that falls back to the entry's FIRST TWO WORDS when
// nothing matches. The user's sentence was never written to IndexedDB at all.
//
// R13c is additive: `emotionsText` carries the raw turn alongside the parse.
// Records saved before it have no such field and must render exactly as they do
// today — their text is not stored and is not recoverable, so it is never
// re-derived.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

const app = read("../../App.tsx");
const storage = read("../../storage.ts");
const types = read("../../types.ts");

const HOW_YOU_FELT = "How you felt";

function record(over: Partial<ThoughtRecord> = {}): ThoughtRecord {
  return {
    id: "r1",
    situation: "My manager rewrote my section in the review doc.",
    automaticThought: "Everyone thinks I can't write.",
    emotions: [{ emotion: "ashamed", intensity: 8 }],
    evidenceFor: ["She has edited other people's sections too."],
    evidenceAgainst: [],
    alternativeThought: "One edit is not a verdict on my writing.",
    reratings: [],
    ts: 1,
    updatedAt: 1,
    ...over,
  };
}

const howYouFelt = (r: ThoughtRecord) =>
  entriesForRecord(r).find((e) => e.label === HOW_YOU_FELT)?.value;

describe("Thought Record keeps the sentence the user wrote (R13c)", () => {
  // The `today` column is what parseEmotions produces for each answer: the
  // first two words when no keyword matches, and the keyword alone when one
  // does — in both cases the rest of the sentence is gone.
  const cases: { answer: string; today: string; parsed: ThoughtRecord["emotions"] }[] = [
    {
      answer: "I felt completely humiliated, like everyone could see it. 9/10",
      today: "i felt (9/10)",
      parsed: [{ emotion: "i felt", intensity: 9 }],
    },
    {
      answer: "Mostly dread. It sat in my chest all afternoon.",
      today: "mostly dread (5/10)",
      parsed: [{ emotion: "mostly dread", intensity: 5 }],
    },
    {
      answer: "Embarrassed and small. 6",
      today: "embarrassed and (6/10)",
      parsed: [{ emotion: "embarrassed and", intensity: 6 }],
    },
    {
      answer: "Lonely, and underneath that resentful. About a 7.",
      today: "lonely and (7/10)",
      parsed: [{ emotion: "lonely and", intensity: 7 }],
    },
    {
      answer: "Terrified. 10 out of 10.",
      today: "terrified out (10/10)",
      parsed: [{ emotion: "terrified out", intensity: 10 }],
    },
    {
      answer: "anxious about the 3 meetings I still had left",
      today: "anxious (3/10)",
      parsed: [{ emotion: "anxious", intensity: 3 }],
    },
  ];

  for (const { answer, today, parsed } of cases) {
    it(`renders verbatim instead of "${today}"`, () => {
      const r = record({ emotions: parsed, emotionsText: answer });
      expect(howYouFelt(r)).toBe(answer);
      // The measured `today` string is what the same record shows without the
      // new field — the defect, pinned so a regression is visible.
      expect(howYouFelt(record({ emotions: parsed }))).toBe(today);
    });
  }

  it("a record stored before R13c is unchanged", () => {
    const legacy = record({
      emotions: [
        { emotion: "anxious", intensity: 8 },
        { emotion: "ashamed", intensity: 8 },
      ],
    });
    expect(legacy.emotionsText).toBeUndefined();
    expect(howYouFelt(legacy)).toBe("anxious (8/10), ashamed (8/10)");
  });

  it("falls back to the parse when the raw text is empty or whitespace", () => {
    expect(howYouFelt(record({ emotionsText: "   " }))).toBe("ashamed (8/10)");
    expect(howYouFelt(record({ emotionsText: "" }))).toBe("ashamed (8/10)");
  });

  it("keeps the other four entries and their order untouched", () => {
    const r = record({ emotionsText: "Ashamed, and a bit angry at myself." });
    expect(entriesForRecord(r).map((e) => e.label)).toEqual([
      "What happened",
      "What went through your mind",
      HOW_YOU_FELT,
      "The evidence",
      "A more balanced view",
    ]);
    expect(entriesForRecord(r)[0].value).toBe(r.situation);
    expect(entriesForRecord(r)[4].value).toBe(r.alternativeThought);
  });
});

describe("R13c is additive — nothing existing is rewritten", () => {
  it("the save path still stores the keyword parse byte-for-byte", () => {
    // R13b's guard asserts this line too; R13c adds a field beside it rather
    // than replacing it, so `emotions` keeps its shape for old and new records.
    expect(app).toContain("emotions: parseEmotions(userMessages[2].content)");
    expect(app).toContain("emotionsText: userMessages[2].content,");
  });

  it("emotionsText is optional, so no migration and no DB version bump", () => {
    expect(types).toContain("emotionsText?: string;");
    // storage.ts does a whole-object put into a keyPath store, so a new
    // optional field needs no schema change (same shape as R9's Session.mode).
    expect(storage).toContain("const DB_VERSION = 4;");
    expect(storage).toContain(
      'tx.objectStore(THOUGHT_RECORDS_STORE).put(record);'
    );
  });

  it("never re-derives an old record's text", () => {
    const history = read("../ThoughtRecordHistory.tsx");
    expect(history).toContain(
      "record.emotionsText?.trim() || formatEmotions(record.emotions)"
    );
    // formatEmotions and avgIntensity are untouched by R13c.
    expect(history).toContain("function formatEmotions(");
    expect(history).toContain("function avgIntensity(");
  });
});
