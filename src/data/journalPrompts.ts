import type { PromptCategory } from "../types";
import { currentTimeBucket, type TimeBand } from "../utils/timeOfDay";

export interface PromptData {
  id: string;
  text: string;
  category: PromptCategory;
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
}

/**
 * Curated journaling prompts organized by category
 * These prompts are designed to encourage introspection and self-reflection
 */
export const JOURNAL_PROMPTS: PromptData[] = [
  // Gratitude prompts
  {
    id: "gratitude-1",
    text: "What are three things you're grateful for today, and why?",
    category: "gratitude",
    timeOfDay: "morning",
  },
  {
    id: "gratitude-2",
    text: "Who made a positive difference in your life recently? How did they impact you?",
    category: "gratitude",
  },
  {
    id: "gratitude-3",
    text: "What small pleasures brought you joy this week?",
    category: "gratitude",
    timeOfDay: "evening",
  },
  {
    id: "gratitude-4",
    text: "Describe a challenge you overcame and what you learned from it.",
    category: "gratitude",
  },
  {
    id: "gratitude-5",
    text: "What aspects of your daily routine are you thankful for?",
    category: "gratitude",
    timeOfDay: "morning",
  },
  {
    id: "gratitude-6",
    text: "What strengths or abilities do you appreciate about yourself?",
    category: "gratitude",
  },
  {
    id: "gratitude-7",
    text: "What opportunities are available to you right now?",
    category: "gratitude",
  },
  {
    id: "gratitude-8",
    text: "Describe a place that brings you peace. What makes it special?",
    category: "gratitude",
    timeOfDay: "night",
  },

  // Self-reflection prompts
  {
    id: "reflection-1",
    text: "How are you truly feeling right now? What emotions are present?",
    category: "self-reflection",
    timeOfDay: "morning",
  },
  {
    id: "reflection-2",
    text: "What patterns have you noticed in your thoughts or behaviors lately?",
    category: "self-reflection",
    timeOfDay: "evening",
  },
  {
    id: "reflection-3",
    text: "What would you tell your younger self if you could?",
    category: "self-reflection",
  },
  {
    id: "reflection-4",
    text: "What values are most important to you? Are you living in alignment with them?",
    category: "self-reflection",
  },
  {
    id: "reflection-5",
    text: "What self-limiting beliefs might be holding you back?",
    category: "self-reflection",
  },
  {
    id: "reflection-6",
    text: "Describe a recent moment when you felt most like yourself.",
    category: "self-reflection",
  },
  {
    id: "reflection-7",
    text: "What needs more attention in your life right now?",
    category: "self-reflection",
    timeOfDay: "afternoon",
  },
  {
    id: "reflection-8",
    text: "How have you grown or changed in the past year?",
    category: "self-reflection",
  },
  {
    id: "reflection-9",
    text: "What brings you a sense of purpose or meaning?",
    category: "self-reflection",
  },
  {
    id: "reflection-10",
    text: "If you could change one thing about your daily life, what would it be?",
    category: "self-reflection",
    timeOfDay: "night",
  },

  // Goals prompts
  {
    id: "goals-1",
    text: "What is one small step you can take today toward a larger goal?",
    category: "goals",
    timeOfDay: "morning",
  },
  {
    id: "goals-2",
    text: "What does success look like for you in the next 6 months?",
    category: "goals",
  },
  {
    id: "goals-3",
    text: "What habit would you like to build? What's your first action step?",
    category: "goals",
  },
  {
    id: "goals-4",
    text: "What obstacles might prevent you from reaching your goals? How can you address them?",
    category: "goals",
  },
  {
    id: "goals-5",
    text: "What skills would you like to develop or improve?",
    category: "goals",
  },
  {
    id: "goals-6",
    text: "What does your ideal day look like? What parts can you create now?",
    category: "goals",
    timeOfDay: "morning",
  },
  {
    id: "goals-7",
    text: "What projects or ideas have you been putting off? Why?",
    category: "goals",
  },
  {
    id: "goals-8",
    text: "Where do you see yourself in 5 years? What matters most to you?",
    category: "goals",
  },

  // Challenges prompts
  {
    id: "challenges-1",
    text: "What's weighing on your mind today? Why does it matter to you?",
    category: "challenges",
    timeOfDay: "evening",
  },
  {
    id: "challenges-2",
    text: "Describe a difficult situation you're facing. What resources do you have to help?",
    category: "challenges",
  },
  {
    id: "challenges-3",
    text: "What would you advise a friend facing your current challenge?",
    category: "challenges",
  },
  {
    id: "challenges-4",
    text: "What can you control in this situation? What's outside your control?",
    category: "challenges",
  },
  {
    id: "challenges-5",
    text: "What has helped you through difficult times in the past?",
    category: "challenges",
    timeOfDay: "evening",
  },
  {
    id: "challenges-6",
    text: "What's one thing you can do to care for yourself today?",
    category: "challenges",
    timeOfDay: "night",
  },
  {
    id: "challenges-7",
    text: "What boundaries do you need to set or reinforce?",
    category: "challenges",
  },
  {
    id: "challenges-8",
    text: "How can you be more compassionate with yourself right now?",
    category: "challenges",
  },

  // Relationships prompts
  {
    id: "relationships-1",
    text: "How do you want people to feel after spending time with you?",
    category: "relationships",
  },
  {
    id: "relationships-2",
    text: "What relationships in your life bring you energy? Which ones drain you?",
    category: "relationships",
  },
  {
    id: "relationships-3",
    text: "Is there someone you need to have a difficult conversation with? What would you say?",
    category: "relationships",
  },
  {
    id: "relationships-4",
    text: "How can you show appreciation to someone important in your life?",
    category: "relationships",
  },
  {
    id: "relationships-5",
    text: "What qualities do you value most in your friendships?",
    category: "relationships",
  },
  {
    id: "relationships-6",
    text: "How do you handle conflict in relationships? What would you like to improve?",
    category: "relationships",
  },
  {
    id: "relationships-7",
    text: "Who do you feel most comfortable being yourself around? Why?",
    category: "relationships",
  },
  {
    id: "relationships-8",
    text: "What does healthy communication look like to you?",
    category: "relationships",
  },

  // Growth prompts
  {
    id: "growth-1",
    text: "What mistake taught you an important lesson recently?",
    category: "growth",
  },
  {
    id: "growth-2",
    text: "What comfort zone would you like to step outside of? What's the first step?",
    category: "growth",
  },
  {
    id: "growth-3",
    text: "What feedback have you received that's worth reflecting on?",
    category: "growth",
  },
  {
    id: "growth-4",
    text: "How do you typically respond to failure? How would you like to respond?",
    category: "growth",
  },
  {
    id: "growth-5",
    text: "What area of your life feels stagnant? What could bring fresh perspective?",
    category: "growth",
  },
  {
    id: "growth-6",
    text: "Who inspires you and why? What qualities do they embody?",
    category: "growth",
  },
  {
    id: "growth-7",
    text: "What new perspective have you gained recently?",
    category: "growth",
  },
  {
    id: "growth-8",
    text: "If fear wasn't a factor, what would you try?",
    category: "growth",
  },

  // Creativity prompts
  {
    id: "creativity-1",
    text: "If you could create anything without limitations, what would it be?",
    category: "creativity",
  },
  {
    id: "creativity-2",
    text: "Describe your day using only metaphors and imagery.",
    category: "creativity",
  },
  {
    id: "creativity-3",
    text: "What idea has been bubbling in the back of your mind? Explore it.",
    category: "creativity",
  },
  {
    id: "creativity-4",
    text: "If your life was a book, what chapter are you in? What happens next?",
    category: "creativity",
  },
  {
    id: "creativity-5",
    text: "Write a letter to your future self one year from now.",
    category: "creativity",
    timeOfDay: "night",
  },
  {
    id: "creativity-6",
    text: "What would you do if you had a completely free day with no obligations?",
    category: "creativity",
  },
  {
    id: "creativity-7",
    text: "Describe a vivid memory from your childhood. What details stand out?",
    category: "creativity",
  },
  {
    id: "creativity-8",
    text: "If you could have dinner with anyone, living or dead, who would it be and why?",
    category: "creativity",
  },
  {
    id: "creativity-9",
    text: "What does your ideal creative practice look like?",
    category: "creativity",
  },
  {
    id: "creativity-10",
    text: "Stream of consciousness: Write continuously for 5 minutes without stopping.",
    category: "creativity",
  },
];

/**
 * The one line that says whose the step sequence is (R12, 2026-08-07).
 *
 * The guided banner used to read as the AI's question, which it never was —
 * the model is not told the step, so the reply contradicted the banner on
 * every scoreable turn (R10a: 0 of 7 aligned). This sentence makes the
 * shipped surface honest: the sequence is the writer's guide, and the
 * companion responds to what the writer actually wrote. Shared by all three
 * guides so the wording cannot drift between them.
 */
export const GUIDE_SCAFFOLD_NOTE =
  "These steps are a writing guide. Your companion responds to whatever you write.";

/**
 * Structured 3-step gratitude journaling sequence.
 * Used by the guided gratitude mode to walk users through a reflection.
 */
export const GRATITUDE_SEQUENCE = [
  { step: 1, prompt: "What are you grateful for today?" },
  { step: 2, prompt: "Why does this matter to you?" },
  { step: 3, prompt: "How did it make you feel?" },
] as const;

/**
 * Structured 3-step morning check-in sequence.
 * Used by the guided check-in mode for morning reflections.
 */
export const MORNING_CHECKIN_SEQUENCE = [
  { step: 1, prompt: "How are you feeling this morning?" },
  { step: 2, prompt: "What would you like to focus on today?" },
  { step: 3, prompt: "Is there anything weighing on your mind?" },
] as const;

/**
 * Structured 3-step evening check-in sequence.
 * Used by the guided check-in mode for evening reflections.
 */
export const EVENING_CHECKIN_SEQUENCE = [
  { step: 1, prompt: "How was your day?" },
  { step: 2, prompt: "What went well today?" },
  { step: 3, prompt: "What would you do differently?" },
] as const;

/**
 * Structured 3-step late-night check-in sequence (F7, 2026-08-11).
 *
 * The on-screen guide has to agree with what the model was told. From 21:00
 * to 04:59 the system prompt now runs the late-night variant, whose steps
 * never assert which day it is; showing "How was your day?" beside it would
 * reproduce the exact defect the first tester reported, on the more visible
 * of the two surfaces. Wording tracks CHECKIN_NIGHT_INSTRUCTION's steps.
 */
export const NIGHT_CHECKIN_SEQUENCE = [
  { step: 1, prompt: "How are you feeling right now?" },
  { step: 2, prompt: "What's still on your mind at this hour?" },
  { step: 3, prompt: "What would help you set it down for tonight?" },
] as const;

/** The check-in sequence and title for a time band — one selector, so the
 *  guide cannot drift from the system prompt. */
export function checkinGuideForBand(band: TimeBand): {
  sequence: readonly { step: number; prompt: string }[];
  title: string;
  morning: boolean;
} {
  if (band === "morning") {
    return { sequence: MORNING_CHECKIN_SEQUENCE, title: "Morning Check-in", morning: true };
  }
  if (band === "night") {
    return { sequence: NIGHT_CHECKIN_SEQUENCE, title: "Late-night Check-in", morning: false };
  }
  return { sequence: EVENING_CHECKIN_SEQUENCE, title: "Evening Check-in", morning: false };
}

/**
 * Structured 5-step CBT thought record sequence.
 * Used by the guided thought record mode for cognitive restructuring.
 */
export const THOUGHT_RECORD_SEQUENCE = [
  { step: 1, prompt: "What happened? Describe the situation briefly." },
  { step: 2, prompt: "What went through your mind? What were you thinking?" },
  { step: 3, prompt: "What emotions did you feel? How intense were they (1-10)?" },
  { step: 4, prompt: "What evidence supports or contradicts this thought?" },
  { step: 5, prompt: "What's a more balanced way to think about this?" },
] as const;

/**
 * Get a random prompt from a specific category.
 * 70% chance to prefer a time-matched prompt if one is available.
 */
export function getPromptByCategory(category: PromptCategory): PromptData | null {
  const categoryPrompts = JOURNAL_PROMPTS.filter((p) => p.category === category);
  if (categoryPrompts.length === 0) return null;

  const bucket = currentTimeBucket();
  const timeMatched = categoryPrompts.filter((p) => p.timeOfDay === bucket);

  if (timeMatched.length > 0 && Math.random() < 0.7) {
    return timeMatched[Math.floor(Math.random() * timeMatched.length)];
  }

  return categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];
}

/**
 * Get a random prompt from any category.
 * 70% chance to prefer a time-matched prompt if one is available.
 */
export function getRandomPrompt(): PromptData {
  const bucket = currentTimeBucket();
  const timeMatched = JOURNAL_PROMPTS.filter((p) => p.timeOfDay === bucket);

  if (timeMatched.length > 0 && Math.random() < 0.7) {
    return timeMatched[Math.floor(Math.random() * timeMatched.length)];
  }

  return JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)];
}

/**
 * Get all prompts for a specific category
 */
export function getPromptsByCategory(category: PromptCategory): PromptData[] {
  return JOURNAL_PROMPTS.filter((p) => p.category === category);
}

/**
 * Get prompt by ID
 */
export function getPromptById(id: string): PromptData | null {
  return JOURNAL_PROMPTS.find((p) => p.id === id) || null;
}

/**
 * Get all unique categories
 */
export function getAllCategories(): PromptCategory[] {
  return Array.from(new Set(JOURNAL_PROMPTS.map((p) => p.category)));
}
