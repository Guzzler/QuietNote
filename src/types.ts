// Core chat types
export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  ts: number;
  temp?: boolean; // Flag for streaming messages
}

export interface Thread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Session {
  id: string;
  title: string;
  affirmation?: string;
  questions: string[];
  threads: Thread[];
  createdAt: number;
  updatedAt: number;
  model: ModelRef;
  reflection?: string;
  reflectionUpdatedAt?: number;
}

export interface ModelRef {
  modelUrl: string;
  modelId: string;
  localId: string;
}

// Mood tracking types
export type MoodEmotion =
  | "happy"
  | "sad"
  | "anxious"
  | "angry"
  | "calm"
  | "excited"
  | "frustrated"
  | "content"
  | "lonely"
  | "grateful";

export type MoodContext =
  | "work"
  | "relationships"
  | "health"
  | "family"
  | "friends"
  | "finances"
  | "personal"
  | "other";

export interface MoodEntry {
  id: string;
  sessionId?: string; // Optional link to journal session
  emotion: MoodEmotion;
  intensity: number; // 1-10 scale
  contexts: MoodContext[];
  note?: string;
  ts: number;
}

// CBT types
export type CognitiveDistortion =
  | "all-or-nothing"
  | "overgeneralization"
  | "mental-filter"
  | "disqualifying-positive"
  | "jumping-to-conclusions"
  | "magnification"
  | "emotional-reasoning"
  | "should-statements"
  | "labeling"
  | "personalization";

export interface ThoughtRecord {
  id: string;
  sessionId?: string;
  situation: string;
  automaticThought: string;
  emotions: { emotion: string; intensity: number }[];
  evidenceFor: string[];
  evidenceAgainst: string[];
  alternativeThought: string;
  reratings: { emotion: string; intensity: number }[];
  detectedDistortions?: CognitiveDistortion[];
  ts: number;
  updatedAt: number;
}

// DBT types
export type DBTSkillCategory =
  | "mindfulness"
  | "distress-tolerance"
  | "emotion-regulation"
  | "interpersonal-effectiveness";

export interface DBTSkillPractice {
  id: string;
  category: DBTSkillCategory;
  skillName: string;
  description: string;
  practiced: boolean;
  practiceDate?: number;
  notes?: string;
  effectiveness?: number; // 1-10 scale
}

// Journaling prompts
export type PromptCategory =
  | "gratitude"
  | "self-reflection"
  | "goals"
  | "challenges"
  | "relationships"
  | "growth"
  | "creativity";

export interface JournalPrompt {
  id: string;
  text: string;
  category: PromptCategory;
  used: boolean;
  lastUsed?: number;
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
}

// User settings
export interface UserSettings {
  theme: "light" | "dark" | "auto";
  fontSize: "small" | "medium" | "large";
  aiPersonality: {
    warmth: number; // 0-10 scale (clinical to friendly)
    verbosity: number; // 0-10 scale (concise to detailed)
    questionFrequency: number; // 0-10 scale (few to many)
    style: "socratic" | "supportive" | "direct";
  };
  temperature: number;
  maxTokens: number;
  enableCrisisDetection: boolean;
  enableMoodTracking: boolean;
  enableVoiceInput: boolean;
  customInstruction?: string;
}

// Analytics & insights
export interface MoodPattern {
  type: "correlation" | "trend" | "trigger";
  description: string;
  confidence: number; // 0-1
  data: {
    emotion?: MoodEmotion;
    context?: MoodContext;
    timeOfDay?: string;
    dayOfWeek?: string;
  };
}

export interface WellnessReport {
  id: string;
  periodStart: number;
  periodEnd: number;
  moodAverage: number;
  moodTrend: "improving" | "stable" | "declining";
  patterns: MoodPattern[];
  journalCount: number;
  thoughtRecordCount: number;
  topEmotions: { emotion: MoodEmotion; count: number }[];
  topContexts: { context: MoodContext; count: number }[];
  insights: string[];
  generatedAt: number;
}

// Eval scoring types
export type ScoringDimension =
  | "persona"
  | "medical_refusal"
  | "jailbreak"
  | "format"
  | "empathy"
  | "boundary"
  | "specificity"
  | "input_robustness";

export interface DimensionScore {
  dimension: ScoringDimension;
  score: number; // 0–5 scale
  confidence: number; // 0–1
  signals: string[]; // patterns that influenced the score
}

export interface ScoredEvalResult {
  caseId: string;
  dimension: ScoringDimension;
  response: string;
  scores: DimensionScore[];
  weightedScore: number;
}

export interface ScoredEvalReport {
  timestamp: number;
  modelId: string;
  results: ScoredEvalResult[];
  dimensionAverages: Record<ScoringDimension, number>;
  weightedOverall: number;
  flaggedCases: Array<{ caseId: string; dimension: ScoringDimension; score: number }>;
}