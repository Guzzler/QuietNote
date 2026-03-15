/**
 * Crisis Detection Utility
 * Detects crisis-related keywords in user messages and provides appropriate resources
 */

export type CrisisMatchType = "keyword" | "indirect" | "contextual";

export interface CrisisDetectionResult {
  isCrisis: boolean;
  severity: "none" | "low" | "medium" | "high" | "critical";
  detectedKeywords: string[];
  matchType: CrisisMatchType;
  recommendedAction: "continue" | "show_resources" | "immediate_help";
}

// Crisis keywords categorized by severity
const CRITICAL_KEYWORDS = [
  "suicide",
  "kill myself",
  "end my life",
  "want to die",
  "better off dead",
  "no reason to live",
  "suicide plan",
  "going to kill",
];

const HIGH_SEVERITY_KEYWORDS = [
  "self-harm",
  "hurt myself",
  "cutting",
  "self harm",
  "self injury",
  "suicidal",
  "suicide ideation",
  "ending it",
  "can't go on",
  "overdose",
];

const MEDIUM_SEVERITY_KEYWORDS = [
  "hopeless",
  "worthless",
  "unbearable pain",
  "can't take it",
  "give up",
  "no hope",
  "life isn't worth",
  "deeply depressed",
  "severe depression",
];

const LOW_SEVERITY_KEYWORDS = [
  "depressed",
  "anxious",
  "overwhelmed",
  "struggling",
  "crisis",
  "emergency",
  "desperate",
  "breaking point",
];

// Indirect expression categories — phrase-level matching for expressions
// that don't use explicit crisis keywords but indicate serious distress.
// These are well-documented in clinical suicide risk assessment literature.

const INDIRECT_HIGH_PHRASES = [
  "don't want to be here anymore",
  "can't do this anymore",
  "there's no way out",
  "trapped with no escape",
  "everyone would be better off without me",
  "i'm a burden",
  "i am a burden",
  "what's the point of going on",
  "whats the point of going on",
  "i won't be around much longer",
  "i wont be around much longer",
  "no point in living",
  "can't keep going",
  "don't want to exist",
];

const PASSIVE_DEATH_WISH_PHRASES = [
  "wish i could disappear",
  "wish i didn't exist",
  "wish i didnt exist",
  "wish i could just sleep forever",
  "wouldn't mind if i didn't wake up",
  "wouldnt mind if i didnt wake up",
  "don't care if i live or die",
  "dont care if i live or die",
  "wish i was never born",
  "rather not be alive",
];

const FAREWELL_PHRASES = [
  "saying goodbye to everyone",
  "want you to know i love you",
  "giving away my stuff",
  "giving away my things",
  "writing letters to everyone",
  "putting my affairs in order",
  "this is my last",
  "won't see me again",
  "wont see me again",
];

const ESCALATING_HOPELESSNESS_PHRASES = [
  "nothing ever gets better",
  "i'll never be happy",
  "ill never be happy",
  "there's no point",
  "theres no point",
  "why bother trying",
  "it's never going to change",
  "its never going to change",
  "i'm done fighting",
  "im done fighting",
  "nothing will ever change",
  "no reason to keep trying",
  "given up on everything",
];

/**
 * Analyze text for crisis-related content
 */
/**
 * Severity priority for comparison
 */
const SEVERITY_RANK: Record<CrisisDetectionResult["severity"], number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function detectCrisis(text: string): CrisisDetectionResult {
  const lowerText = text.toLowerCase();
  const detectedKeywords: string[] = [];
  let highestSeverity: CrisisDetectionResult["severity"] = "none";
  let recommendedAction: CrisisDetectionResult["recommendedAction"] = "continue";
  let matchType: CrisisMatchType = "keyword";

  // --- Explicit keyword checks (original behavior) ---

  // Check critical keywords
  for (const keyword of CRITICAL_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      detectedKeywords.push(keyword);
      highestSeverity = "critical";
      recommendedAction = "immediate_help";
    }
  }

  // Check high severity keywords
  if (highestSeverity !== "critical") {
    for (const keyword of HIGH_SEVERITY_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        detectedKeywords.push(keyword);
        if (highestSeverity !== "critical") {
          highestSeverity = "high";
          recommendedAction = "immediate_help";
        }
      }
    }
  }

  // Check medium severity keywords
  if (SEVERITY_RANK[highestSeverity] < SEVERITY_RANK["medium"]) {
    for (const keyword of MEDIUM_SEVERITY_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        detectedKeywords.push(keyword);
        highestSeverity = "medium";
        recommendedAction = "show_resources";
      }
    }
  }

  // Check low severity keywords
  if (highestSeverity === "none") {
    for (const keyword of LOW_SEVERITY_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        detectedKeywords.push(keyword);
        highestSeverity = "low";
        recommendedAction = "show_resources";
      }
    }
  }

  // --- Indirect expression checks ---
  // Indirect expressions trigger show_resources (not immediate_help) on their own.
  // If combined with explicit keywords that already set immediate_help, that takes precedence.

  const hadExplicitMatch = detectedKeywords.length > 0;

  // Indirect high phrases → severity "high", but only show_resources (not immediate_help)
  for (const phrase of INDIRECT_HIGH_PHRASES) {
    if (lowerText.includes(phrase)) {
      detectedKeywords.push(phrase);
      if (SEVERITY_RANK[highestSeverity] < SEVERITY_RANK["high"]) {
        highestSeverity = "high";
        recommendedAction = "show_resources";
      }
      if (!hadExplicitMatch) matchType = "indirect";
    }
  }

  // Passive death wishes → severity "high", show_resources
  for (const phrase of PASSIVE_DEATH_WISH_PHRASES) {
    if (lowerText.includes(phrase)) {
      detectedKeywords.push(phrase);
      if (SEVERITY_RANK[highestSeverity] < SEVERITY_RANK["high"]) {
        highestSeverity = "high";
        recommendedAction = "show_resources";
      }
      if (!hadExplicitMatch) matchType = "indirect";
    }
  }

  // Farewell language → severity "medium", show_resources
  for (const phrase of FAREWELL_PHRASES) {
    if (lowerText.includes(phrase)) {
      detectedKeywords.push(phrase);
      if (SEVERITY_RANK[highestSeverity] < SEVERITY_RANK["medium"]) {
        highestSeverity = "medium";
        recommendedAction = "show_resources";
      }
      if (!hadExplicitMatch) matchType = "indirect";
    }
  }

  // Escalating hopelessness → severity "medium", show_resources
  for (const phrase of ESCALATING_HOPELESSNESS_PHRASES) {
    if (lowerText.includes(phrase)) {
      detectedKeywords.push(phrase);
      if (SEVERITY_RANK[highestSeverity] < SEVERITY_RANK["medium"]) {
        highestSeverity = "medium";
        recommendedAction = "show_resources";
      }
      if (!hadExplicitMatch) matchType = "indirect";
    }
  }

  // If we only had indirect matches but also have explicit keywords,
  // the matchType stays "keyword" (explicit takes precedence)
  if (!hadExplicitMatch && detectedKeywords.length === 0) {
    matchType = "keyword"; // default, no matches
  }

  return {
    isCrisis: highestSeverity !== "none",
    severity: highestSeverity,
    detectedKeywords,
    matchType,
    recommendedAction,
  };
}

/**
 * Get crisis resources based on user's location (default: US)
 */
export interface CrisisResource {
  name: string;
  phone: string;
  text?: string;
  website?: string;
  description: string;
  available: string;
}

export function getCrisisResources(country: string = "US"): CrisisResource[] {
  const resources: Record<string, CrisisResource[]> = {
    US: [
      {
        name: "988 Suicide & Crisis Lifeline",
        phone: "988",
        text: "Text 988",
        website: "https://988lifeline.org",
        description: "24/7 free and confidential support for people in distress",
        available: "24/7",
      },
      {
        name: "Crisis Text Line",
        phone: "",
        text: "Text HOME to 741741",
        website: "https://www.crisistextline.org",
        description: "Free, 24/7 support for those in crisis",
        available: "24/7",
      },
      {
        name: "SAMHSA National Helpline",
        phone: "1-800-662-4357",
        website: "https://www.samhsa.gov/find-help/national-helpline",
        description: "Treatment referral and information service",
        available: "24/7",
      },
      {
        name: "Veterans Crisis Line",
        phone: "988 then Press 1",
        text: "Text 838255",
        website: "https://www.veteranscrisisline.net",
        description: "Support for veterans and their families",
        available: "24/7",
      },
      {
        name: "The Trevor Project (LGBTQ Youth)",
        phone: "1-866-488-7386",
        text: "Text START to 678678",
        website: "https://www.thetrevorproject.org",
        description: "Crisis support for LGBTQ young people",
        available: "24/7",
      },
    ],
    UK: [
      {
        name: "Samaritans",
        phone: "116 123",
        website: "https://www.samaritans.org",
        description: "24-hour support for anyone in emotional distress",
        available: "24/7",
      },
      {
        name: "Crisis Text Line UK",
        phone: "",
        text: "Text SHOUT to 85258",
        website: "https://giveusashout.org",
        description: "Free, confidential 24/7 text support",
        available: "24/7",
      },
    ],
    CA: [
      {
        name: "Crisis Services Canada",
        phone: "1-833-456-4566",
        text: "Text 45645",
        website: "https://www.crisisservicescanada.ca",
        description: "24/7 support for people in crisis",
        available: "24/7",
      },
    ],
    AU: [
      {
        name: "Lifeline Australia",
        phone: "13 11 14",
        website: "https://www.lifeline.org.au",
        description: "24-hour crisis support and suicide prevention",
        available: "24/7",
      },
      {
        name: "Beyond Blue",
        phone: "1300 22 4636",
        website: "https://www.beyondblue.org.au",
        description: "Support for anxiety, depression and suicide prevention",
        available: "24/7",
      },
    ],
  };

  return resources[country] || resources.US;
}

/**
 * Generate crisis response message for AI
 */
export function getCrisisResponseMessage(severity: CrisisDetectionResult["severity"]): string {
  if (severity === "critical" || severity === "high") {
    return (
      "I'm deeply concerned about what you've shared. Your life matters, and there are people who want to help you right now. " +
      "Please reach out to a crisis counselor immediately:\n\n" +
      "🆘 **Call or text 988** (US Suicide & Crisis Lifeline) - Available 24/7\n" +
      "💬 **Text HOME to 741741** (Crisis Text Line) - Free, confidential support\n\n" +
      "If you're in immediate danger, please call 911 or go to your nearest emergency room. " +
      "You don't have to face this alone. Professional support is available right now."
    );
  } else if (severity === "medium") {
    return (
      "I hear that you're going through a really difficult time. While I'm here to listen, " +
      "I want to make sure you have access to professional support:\n\n" +
      "📞 **988 Suicide & Crisis Lifeline**: Call or text 988 anytime, 24/7\n" +
      "💬 **Crisis Text Line**: Text HOME to 741741\n\n" +
      "These services are free, confidential, and staffed by trained counselors who can provide the support you need."
    );
  } else {
    return (
      "Thank you for sharing what you're experiencing. Remember that support is available if you need it:\n\n" +
      "📞 988 Suicide & Crisis Lifeline (call or text)\n" +
      "💬 Crisis Text Line: Text HOME to 741741\n\n" +
      "I'm here to listen and support you through journaling."
    );
  }
}
