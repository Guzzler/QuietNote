import type { Session } from "../types";

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  journaledToday: boolean;
}

function toDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round(Math.abs(da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeStreak(sessions: Session[]): StreakInfo {
  if (sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalDays: 0, journaledToday: false };
  }

  const daySet = new Set(sessions.map((s) => toDateKey(s.createdAt)));
  const sortedDays = [...daySet].sort().reverse();
  const totalDays = sortedDays.length;
  const todayKey = toDateKey(Date.now());
  const journaledToday = daySet.has(todayKey);

  let currentStreak = 0;
  const startDay = journaledToday ? todayKey : sortedDays[0];
  const startIndex = sortedDays.indexOf(startDay);

  if (startIndex >= 0) {
    if (!journaledToday && daysBetween(startDay, todayKey) > 1) {
      currentStreak = 0;
    } else {
      currentStreak = 1;
      for (let i = startIndex; i < sortedDays.length - 1; i++) {
        if (daysBetween(sortedDays[i], sortedDays[i + 1]) === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  let longestStreak = 0;
  let streak = 1;
  for (let i = sortedDays.length - 1; i > 0; i--) {
    if (daysBetween(sortedDays[i], sortedDays[i - 1]) === 1) {
      streak++;
    } else {
      longestStreak = Math.max(longestStreak, streak);
      streak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, streak);

  return { currentStreak, longestStreak, totalDays, journaledToday };
}
