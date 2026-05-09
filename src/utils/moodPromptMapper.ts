import type { MoodEmotion, PromptCategory } from "../types";
import { getPromptsByCategory, type PromptData } from "../data/journalPrompts";

const EMOTION_TO_CATEGORIES: Record<MoodEmotion, [PromptCategory, PromptCategory]> = {
  anxious: ["challenges", "self-reflection"],
  frustrated: ["challenges", "self-reflection"],
  angry: ["challenges", "relationships"],
  sad: ["self-reflection", "relationships"],
  lonely: ["relationships", "self-reflection"],
  happy: ["gratitude", "growth"],
  excited: ["goals", "creativity"],
  grateful: ["gratitude", "growth"],
  calm: ["creativity", "self-reflection"],
  content: ["gratitude", "goals"],
};

export function getMoodAwarePrompts(emotion: MoodEmotion, count: number): PromptData[] {
  const categories = EMOTION_TO_CATEGORIES[emotion] ?? ["self-reflection", "challenges"];
  const [primary, secondary] = categories;

  const primaryPrompts = getPromptsByCategory(primary);
  const secondaryPrompts = getPromptsByCategory(secondary);

  const shuffled = (arr: PromptData[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const primaryShuffled = shuffled(primaryPrompts);
  const secondaryShuffled = shuffled(secondaryPrompts);

  const primaryCount = Math.min(Math.ceil(count * 0.6), primaryShuffled.length);
  const result = primaryShuffled.slice(0, primaryCount);

  const usedIds = new Set(result.map((p) => p.id));

  for (const prompt of secondaryShuffled) {
    if (result.length >= count) break;
    if (!usedIds.has(prompt.id)) {
      result.push(prompt);
      usedIds.add(prompt.id);
    }
  }

  if (result.length < count) {
    for (const prompt of primaryShuffled) {
      if (result.length >= count) break;
      if (!usedIds.has(prompt.id)) {
        result.push(prompt);
        usedIds.add(prompt.id);
      }
    }
  }

  return result.slice(0, count);
}
