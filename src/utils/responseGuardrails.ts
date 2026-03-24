/**
 * Response guardrails for model output safety.
 *
 * Detects medical advice patterns, diagnostic language, dismissive language,
 * and response length violations. V2 adds blocking mode — responses matching
 * BLOCK-severity patterns are replaced with a safe fallback before reaching
 * the user.
 */

export type GuardrailSeverity = "block" | "warn" | "monitor";

/**
 * Safe fallback response used when a BLOCK-severity pattern is matched.
 * Empathetic, redirects to professional help, and invites continued journaling.
 */
export const BLOCKED_RESPONSE_FALLBACK =
  "I appreciate you sharing that with me. That sounds like something worth exploring with a healthcare professional who can give you personalized guidance. In the meantime, how are you feeling about it?";

/** Patterns that indicate the model is giving medical/medication advice */
const MEDICAL_ADVICE_PATTERNS = [
  /\byou should take\b/i,
  /\bi recommend\b/i,
  /\bprescri(?:be|ption)\b/i,
  /\btreatment plan\b/i,
  /\btake \d+ ?mg\b/i,
  /\bincrease (?:your|the) dos(?:e|age)\b/i,
  /\breduce (?:your|the) dos(?:e|age)\b/i,
  /\btaper off\b/i,
  /\bstop taking\b/i,
  /\bstart taking\b/i,
  /\bmedication (?:for|that|which|to)\b/i,
  /\bsertraline\b/i,
  /\bprozac\b/i,
  /\bzoloft\b/i,
  /\blexapro\b/i,
  /\bwellbutrin\b/i,
  /\bxanax\b/i,
  /\bvalium\b/i,
  /\bativan\b/i,
  /\bssri\b/i,
  /\bbenzodiazepine\b/i,
  /\bmelatonin\b/i,
  /\bst\.?\s*john'?s?\s*wort\b/i,
  /\bcbd\s*oil\b/i,
  /\bvalerian\b/i,
  /\b5-?htp\b/i,
  /\bsupplement(?:s)?\s+(?:for|that|which|to|like|such)\b/i,
  /\bherbal remed(?:y|ies)\b/i,
  /\bnatural remed(?:y|ies)\b/i,
];

/** Patterns that indicate the model is diagnosing a condition */
const DIAGNOSTIC_PATTERNS = [
  /\byou have (?:depression|anxiety|bipolar|ptsd|adhd|ocd|bpd)\b/i,
  /\byou (?:are|seem to be) (?:depressed|anxious|bipolar|manic)\b/i,
  /\byou suffer from\b/i,
  /\byour (?:condition|disorder|diagnosis)\b/i,
  /\bsymptoms of (?:depression|anxiety|bipolar|ptsd|adhd|ocd)\b/i,
  /\bi (?:can |would )?diagnose\b/i,
  /\bmy diagnosis\b/i,
  /\bbased on (?:your|what you've) (?:said|described|shared).*(?:you (?:have|may have|likely have|probably have))/i,
  /\byou(?:'re| are) showing signs of\b/i,
];

/** Patterns that dismiss user feelings (toxic positivity) */
const DISMISSIVE_PATTERNS = [
  /\bjust cheer up\b/i,
  /\bjust think positive\b/i,
  /\bit's not that bad\b/i,
  /\byou(?:'re| are) overreacting\b/i,
  /\bcalm down\b/i,
  /\bjust relax\b/i,
  /\blook on the bright side\b/i,
  /\bother(?:s| people) have it worse\b/i,
  /\bjust get over it\b/i,
  /\bstop (?:worrying|being sad|feeling)\b/i,
];

export interface GuardrailWarning {
  type: "medical_advice" | "diagnostic_language" | "dismissive" | "too_long";
  detail: string;
  matchedPattern?: string;
}

export interface GuardrailResult {
  text: string;
  warnings: GuardrailWarning[];
  hasCriticalWarning: boolean;
  /** True when a BLOCK-severity pattern matched and the response was replaced */
  isBlocked: boolean;
}

function findPatternMatches(
  text: string,
  patterns: RegExp[]
): string[] {
  const matches: string[] = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  return matches;
}

/**
 * Check if a response contains medical advice patterns.
 */
export function containsMedicalAdvice(response: string): boolean {
  return MEDICAL_ADVICE_PATTERNS.some((p) => p.test(response));
}

/**
 * Check if a response contains diagnostic language.
 */
export function containsDiagnosticLanguage(response: string): boolean {
  return DIAGNOSTIC_PATTERNS.some((p) => p.test(response));
}

/**
 * Check if a response contains dismissive language.
 */
export function containsDismissiveLanguage(response: string): boolean {
  return DISMISSIVE_PATTERNS.some((p) => p.test(response));
}

/**
 * Check if a response exceeds the word limit.
 */
export function isResponseTooLong(
  response: string,
  maxWords: number = 150
): boolean {
  const wordCount = response.trim().split(/\s+/).filter(Boolean).length;
  return wordCount > maxWords;
}

/** Severity assignment per warning type */
const SEVERITY_MAP: Record<GuardrailWarning["type"], GuardrailSeverity> = {
  medical_advice: "block",
  diagnostic_language: "block",
  dismissive: "warn",
  too_long: "monitor",
};

/**
 * Run all guardrails on a response.
 * V2: BLOCK-severity matches replace the response text with a safe fallback.
 * WARN-severity matches are flagged but the original text is preserved.
 * MONITOR-severity matches are logged only.
 */
export function sanitizeResponse(
  response: string,
  maxWords: number = 150
): GuardrailResult {
  const warnings: GuardrailWarning[] = [];

  // Check medical advice
  const medicalMatches = findPatternMatches(response, MEDICAL_ADVICE_PATTERNS);
  for (const match of medicalMatches) {
    warnings.push({
      type: "medical_advice",
      detail: `Response contains medical advice pattern: "${match}"`,
      matchedPattern: match,
    });
  }

  // Check diagnostic language
  const diagnosticMatches = findPatternMatches(response, DIAGNOSTIC_PATTERNS);
  for (const match of diagnosticMatches) {
    warnings.push({
      type: "diagnostic_language",
      detail: `Response contains diagnostic language: "${match}"`,
      matchedPattern: match,
    });
  }

  // Check dismissive language
  const dismissiveMatches = findPatternMatches(response, DISMISSIVE_PATTERNS);
  for (const match of dismissiveMatches) {
    warnings.push({
      type: "dismissive",
      detail: `Response contains dismissive language: "${match}"`,
      matchedPattern: match,
    });
  }

  // Check length
  if (isResponseTooLong(response, maxWords)) {
    const wordCount = response.trim().split(/\s+/).filter(Boolean).length;
    warnings.push({
      type: "too_long",
      detail: `Response is ${wordCount} words (max ${maxWords})`,
    });
  }

  const hasCriticalWarning = warnings.some(
    (w) => w.type === "medical_advice" || w.type === "diagnostic_language"
  );

  // Determine if any warning triggers blocking
  const isBlocked = warnings.some(
    (w) => SEVERITY_MAP[w.type] === "block"
  );

  return {
    text: isBlocked ? BLOCKED_RESPONSE_FALLBACK : response,
    warnings,
    hasCriticalWarning,
    isBlocked,
  };
}
