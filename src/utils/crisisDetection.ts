/**
 * Crisis Detection Utility
 * Detects crisis-related keywords in user messages and provides appropriate resources
 */

export interface CrisisDetectionResult {
  isCrisis: boolean;
  severity: "none" | "low" | "medium" | "high" | "critical";
  detectedKeywords: string[];
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

/**
 * Analyze text for crisis-related content
 */
export function detectCrisis(text: string): CrisisDetectionResult {
  const lowerText = text.toLowerCase();
  const detectedKeywords: string[] = [];
  let highestSeverity: CrisisDetectionResult["severity"] = "none";
  let recommendedAction: CrisisDetectionResult["recommendedAction"] = "continue";

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
  if (highestSeverity === "none") {
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

  return {
    isCrisis: highestSeverity !== "none",
    severity: highestSeverity,
    detectedKeywords,
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
