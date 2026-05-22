export interface PersonalitySettings {
  warmth: number;
  verbosity: "concise" | "balanced" | "detailed";
  style: "socratic" | "supportive" | "direct";
}

export const DEFAULT_PERSONALITY: PersonalitySettings = {
  warmth: 7,
  verbosity: "balanced",
  style: "supportive",
};

export function buildPersonalityDirective(settings: PersonalitySettings): string {
  const parts: string[] = [];

  if (settings.warmth <= 3) {
    parts.push("Keep responses neutral and observational.");
  } else if (settings.warmth <= 7) {
    parts.push("Be warm and supportive.");
  } else {
    parts.push("Be deeply warm, validating, and encouraging.");
  }

  if (settings.verbosity === "concise") {
    parts.push("Keep responses to 1-2 sentences.");
  } else if (settings.verbosity === "balanced") {
    parts.push("Keep responses to 2-4 sentences.");
  } else {
    parts.push("You may give longer reflections when warranted, up to 5-6 sentences.");
  }

  if (settings.style === "socratic") {
    parts.push("Lead with thoughtful questions.");
  } else if (settings.style === "supportive") {
    parts.push("Reflect back what the user said before asking questions.");
  } else {
    parts.push("Offer gentle observations directly.");
  }

  return parts.join(" ");
}
