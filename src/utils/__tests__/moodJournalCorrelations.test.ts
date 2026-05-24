import { describe, it, expect } from "vitest";
import { buildCorrelations } from "../moodJournalCorrelations";
import type { Session, MoodEntry, MoodEmotion } from "../../types";

const NOW = Date.parse("2026-05-23T12:00:00Z");

function makeSession(
  id: string,
  text: string,
  updatedAt: number = NOW - 86400000
): Session {
  return {
    id,
    title: `Session ${id}`,
    questions: [],
    threads: [
      {
        id: `thread-${id}`,
        title: "Thread",
        messages: [{ id: `msg-${id}`, role: "user", content: text, ts: updatedAt }],
        createdAt: updatedAt,
        updatedAt,
      },
    ],
    createdAt: updatedAt,
    updatedAt,
    model: { modelUrl: "", modelId: "", localId: "" },
  };
}

function makeMood(
  id: string,
  emotion: MoodEmotion,
  intensity: number,
  ts: number,
  sessionId?: string
): MoodEntry {
  return { id, emotion, intensity, contexts: [], ts, sessionId };
}

describe("buildCorrelations", () => {
  it("returns empty for 0 sessions", () => {
    const moods = [makeMood("m1", "happy", 7, NOW - 3600000)];
    expect(buildCorrelations([], moods, NOW)).toEqual([]);
  });

  it("returns empty for 0 moods", () => {
    const sessions = [makeSession("s1", "I feel grateful today")];
    expect(buildCorrelations(sessions, [], NOW)).toEqual([]);
  });

  it("returns empty when every theme has < 3 sessions", () => {
    const sessions = [
      makeSession("s1", "I'm grateful for my family", NOW - 86400000),
      makeSession("s2", "Feeling grateful and blessed", NOW - 86400000 * 2),
    ];
    const moods = [
      makeMood("m1", "happy", 8, NOW - 86400000, "s1"),
      makeMood("m2", "happy", 7, NOW - 86400000 * 2, "s2"),
    ];
    expect(buildCorrelations(sessions, moods, NOW)).toEqual([]);
  });

  it("detects theme-emotion correlation when dominant emotion >= 60%", () => {
    const ts = (daysAgo: number) => NOW - daysAgo * 86400000;
    const sessions = [
      makeSession("s1", "Work has been so stressful, under pressure and struggling", ts(1)),
      makeSession("s2", "Work challenges are overwhelming, the problem is burnout", ts(2)),
      makeSession("s3", "More work problems, tough obstacles at the office", ts(3)),
      makeSession("s4", "Difficult work situation, struggling with setback", ts(4)),
    ];
    const moods = [
      makeMood("m1", "anxious", 7, ts(1), "s1"),
      makeMood("m2", "anxious", 6, ts(2), "s2"),
      makeMood("m3", "anxious", 8, ts(3), "s3"),
      makeMood("m4", "frustrated", 5, ts(4), "s4"),
    ];
    const result = buildCorrelations(sessions, moods, NOW);
    const themeEmotion = result.find((o) => o.kind === "theme-emotion");
    expect(themeEmotion).toBeDefined();
    expect(themeEmotion!.text).toContain("anxious");
    expect(themeEmotion!.text).toContain("challenges");
  });

  it("detects best-mood-theme with multiple themes", () => {
    const ts = (daysAgo: number) => NOW - daysAgo * 86400000;
    // Gratitude sessions → happy moods
    const sessions = [
      makeSession("s1", "I'm grateful and thankful for my blessings", ts(1)),
      makeSession("s2", "Feeling so grateful and appreciative today", ts(2)),
      makeSession("s3", "Counting my blessings, feeling grateful", ts(3)),
      // Challenge sessions → sad moods
      makeSession("s4", "Struggling with a tough challenge", ts(4)),
      makeSession("s5", "Under pressure, difficult obstacle ahead", ts(5)),
      makeSession("s6", "Hard time dealing with this setback", ts(6)),
    ];
    const moods = [
      makeMood("m1", "happy", 9, ts(1), "s1"),
      makeMood("m2", "happy", 8, ts(2), "s2"),
      makeMood("m3", "grateful", 9, ts(3), "s3"),
      makeMood("m4", "sad", 7, ts(4), "s4"),
      makeMood("m5", "sad", 6, ts(5), "s5"),
      makeMood("m6", "sad", 8, ts(6), "s6"),
    ];
    const result = buildCorrelations(sessions, moods, NOW);
    const best = result.find((o) => o.kind === "best-mood-theme");
    expect(best).toBeDefined();
    expect(best!.text).toContain("gratitude");
  });

  it("emits worst-mood-theme only when score <= 4", () => {
    const ts = (daysAgo: number) => NOW - daysAgo * 86400000;
    const sessions = [
      makeSession("s1", "Grateful and thankful for everything", ts(1)),
      makeSession("s2", "So grateful and blessed today", ts(2)),
      makeSession("s3", "Feeling truly grateful and appreciative", ts(3)),
      makeSession("s4", "Goals and planning my future career", ts(4)),
      makeSession("s5", "Working on my goals and improvement", ts(5)),
      makeSession("s6", "Planning my habit and discipline routine", ts(6)),
    ];
    const moods = [
      makeMood("m1", "happy", 9, ts(1), "s1"),
      makeMood("m2", "happy", 8, ts(2), "s2"),
      makeMood("m3", "grateful", 9, ts(3), "s3"),
      makeMood("m4", "calm", 6, ts(4), "s4"),
      makeMood("m5", "content", 5, ts(5), "s5"),
      makeMood("m6", "calm", 7, ts(6), "s6"),
    ];
    const result = buildCorrelations(sessions, moods, NOW);
    const worst = result.find((o) => o.kind === "worst-mood-theme");
    // Both themes have positive valence → no worst-mood-theme
    expect(worst).toBeUndefined();
  });

  it("respects 60-day window cutoff", () => {
    const oldTs = NOW - 90 * 86400000;
    const sessions = [
      makeSession("s1", "I'm grateful and thankful", oldTs),
      makeSession("s2", "Grateful and appreciative", oldTs + 86400000),
      makeSession("s3", "Counting blessings, grateful", oldTs + 86400000 * 2),
    ];
    const moods = [
      makeMood("m1", "happy", 8, oldTs, "s1"),
      makeMood("m2", "happy", 7, oldTs + 86400000, "s2"),
      makeMood("m3", "happy", 9, oldTs + 86400000 * 2, "s3"),
    ];
    expect(buildCorrelations(sessions, moods, NOW)).toEqual([]);
  });

  it("links moods by time proximity (±2 hours, same day) when no sessionId", () => {
    const sessionTs = NOW - 86400000;
    const moodTs = sessionTs + 3600000; // 1 hour after session
    const sessions = [
      makeSession("s1", "Grateful and thankful for blessings", sessionTs),
      makeSession("s2", "So grateful and appreciative today", sessionTs - 86400000),
      makeSession("s3", "Counting blessings, feeling grateful", sessionTs - 86400000 * 2),
    ];
    const moods = [
      makeMood("m1", "happy", 8, moodTs), // no sessionId, but within 2 hours
      makeMood("m2", "happy", 7, sessionTs - 86400000 + 1800000),
      makeMood("m3", "happy", 9, sessionTs - 86400000 * 2 + 3600000),
    ];
    const result = buildCorrelations(sessions, moods, NOW);
    expect(result.length).toBeGreaterThan(0);
  });

  it("all moods same emotion still produces observations", () => {
    const ts = (daysAgo: number) => NOW - daysAgo * 86400000;
    const sessions = [
      makeSession("s1", "Grateful and thankful today", ts(1)),
      makeSession("s2", "So grateful and blessed", ts(2)),
      makeSession("s3", "Grateful and appreciative", ts(3)),
      makeSession("s4", "Struggling with a tough challenge", ts(4)),
      makeSession("s5", "Under pressure, feeling overwhelmed", ts(5)),
      makeSession("s6", "Hard time, difficult problem", ts(6)),
    ];
    const moods = [
      makeMood("m1", "calm", 5, ts(1), "s1"),
      makeMood("m2", "calm", 5, ts(2), "s2"),
      makeMood("m3", "calm", 5, ts(3), "s3"),
      makeMood("m4", "calm", 5, ts(4), "s4"),
      makeMood("m5", "calm", 5, ts(5), "s5"),
      makeMood("m6", "calm", 5, ts(6), "s6"),
    ];
    const result = buildCorrelations(sessions, moods, NOW);
    // Should still emit theme-emotion for each qualifying theme
    const themeEmotions = result.filter((o) => o.kind === "theme-emotion");
    expect(themeEmotions.length).toBeGreaterThanOrEqual(1);
  });

  it("caps output at 4 observations", () => {
    const ts = (daysAgo: number) => NOW - daysAgo * 86400000;
    // Create sessions across many themes
    const sessions: Session[] = [];
    const moods: MoodEntry[] = [];
    const themes = [
      { text: "grateful thankful blessed", emotion: "happy" as MoodEmotion },
      { text: "struggling challenge difficult", emotion: "anxious" as MoodEmotion },
      { text: "friend partner relationship", emotion: "calm" as MoodEmotion },
      { text: "goal career ambition plan", emotion: "excited" as MoodEmotion },
      { text: "learn growing growth evolve", emotion: "content" as MoodEmotion },
    ];
    let idx = 0;
    for (const t of themes) {
      for (let i = 0; i < 4; i++) {
        idx++;
        sessions.push(makeSession(`s${idx}`, t.text, ts(idx)));
        moods.push(makeMood(`m${idx}`, t.emotion, 7, ts(idx), `s${idx}`));
      }
    }
    const result = buildCorrelations(sessions, moods, NOW);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it("assigns confidence based on sample size", () => {
    const ts = (daysAgo: number) => NOW - daysAgo * 86400000;
    const sessions: Session[] = [];
    const moods: MoodEntry[] = [];
    for (let i = 0; i < 10; i++) {
      sessions.push(makeSession(`s${i}`, "grateful thankful blessed counting my blessings", ts(i + 1)));
      moods.push(makeMood(`m${i}`, "happy", 8, ts(i + 1), `s${i}`));
    }
    const result = buildCorrelations(sessions, moods, NOW);
    const highConf = result.find((o) => o.confidence === "high");
    expect(highConf).toBeDefined();
  });
});
