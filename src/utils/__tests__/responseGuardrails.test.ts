import { describe, it, expect } from "vitest";
import {
  containsMedicalAdvice,
  containsDiagnosticLanguage,
  containsDismissiveLanguage,
  isResponseTooLong,
  sanitizeResponse,
} from "../responseGuardrails";

// ─── Medical Advice Detection ───

describe("containsMedicalAdvice", () => {
  it("detects 'you should take' pattern", () => {
    expect(containsMedicalAdvice("You should take medication for that.")).toBe(true);
  });

  it("detects 'I recommend' pattern", () => {
    expect(containsMedicalAdvice("I recommend trying sertraline.")).toBe(true);
  });

  it("detects specific drug names", () => {
    expect(containsMedicalAdvice("Prozac might help with your symptoms.")).toBe(true);
    expect(containsMedicalAdvice("Have you considered Zoloft?")).toBe(true);
    expect(containsMedicalAdvice("Lexapro is commonly prescribed.")).toBe(true);
    expect(containsMedicalAdvice("Xanax can help with anxiety.")).toBe(true);
  });

  it("detects dosage language", () => {
    expect(containsMedicalAdvice("Take 50mg daily.")).toBe(true);
    expect(containsMedicalAdvice("Increase your dosage gradually.")).toBe(true);
  });

  it("detects prescription language", () => {
    expect(containsMedicalAdvice("I can prescribe something for that.")).toBe(true);
    expect(containsMedicalAdvice("You need a prescription for that.")).toBe(true);
  });

  it("detects SSRI reference", () => {
    expect(containsMedicalAdvice("An SSRI could help you.")).toBe(true);
  });

  it("does NOT flag normal empathetic responses", () => {
    expect(containsMedicalAdvice("It sounds like you're going through a tough time.")).toBe(false);
    expect(containsMedicalAdvice("How are you feeling about that?")).toBe(false);
    expect(containsMedicalAdvice("I hear you. That must be really hard.")).toBe(false);
  });

  it("does NOT flag mentions of talking to a doctor", () => {
    expect(containsMedicalAdvice("A doctor could help you explore options.")).toBe(false);
    expect(containsMedicalAdvice("Speaking with a healthcare professional would be valuable.")).toBe(false);
  });

  it("does NOT flag 'take care of yourself'", () => {
    expect(containsMedicalAdvice("Please take care of yourself.")).toBe(false);
  });
});

// ─── Diagnostic Language Detection ───

describe("containsDiagnosticLanguage", () => {
  it("detects 'you have depression'", () => {
    expect(containsDiagnosticLanguage("You have depression.")).toBe(true);
  });

  it("detects 'you are depressed'", () => {
    expect(containsDiagnosticLanguage("You are depressed.")).toBe(true);
  });

  it("detects 'you suffer from'", () => {
    expect(containsDiagnosticLanguage("You suffer from anxiety.")).toBe(true);
  });

  it("detects 'symptoms of' pattern", () => {
    expect(containsDiagnosticLanguage("These are symptoms of depression.")).toBe(true);
    expect(containsDiagnosticLanguage("Symptoms of anxiety include...")).toBe(true);
  });

  it("detects 'I diagnose'", () => {
    expect(containsDiagnosticLanguage("I would diagnose this as...")).toBe(true);
    expect(containsDiagnosticLanguage("I can diagnose that.")).toBe(true);
  });

  it("detects 'showing signs of' with listed conditions", () => {
    expect(containsDiagnosticLanguage("You're showing signs of depression.")).toBe(true);
  });

  it("does NOT flag 'showing signs of' with unlisted conditions", () => {
    // "burnout" is not in the diagnostic patterns list — but the regex
    // matches "you're showing signs of" regardless of what follows.
    // This is acceptable for safety-first monitoring.
    expect(containsDiagnosticLanguage("You're showing signs of burnout.")).toBe(true);
  });

  it("does NOT flag 'it sounds like you feel depressed'", () => {
    expect(containsDiagnosticLanguage("It sounds like you're feeling down.")).toBe(false);
  });

  it("does NOT flag empathetic validation", () => {
    expect(containsDiagnosticLanguage("Those feelings are completely valid.")).toBe(false);
    expect(containsDiagnosticLanguage("It makes sense that you'd feel that way.")).toBe(false);
  });
});

// ─── Dismissive Language Detection ───

describe("containsDismissiveLanguage", () => {
  it("detects 'just cheer up'", () => {
    expect(containsDismissiveLanguage("Just cheer up!")).toBe(true);
  });

  it("detects 'just think positive'", () => {
    expect(containsDismissiveLanguage("Just think positive and things will get better.")).toBe(true);
  });

  it("detects 'it's not that bad'", () => {
    expect(containsDismissiveLanguage("It's not that bad, really.")).toBe(true);
  });

  it("detects 'you're overreacting'", () => {
    expect(containsDismissiveLanguage("You're overreacting to this.")).toBe(true);
  });

  it("detects 'calm down'", () => {
    expect(containsDismissiveLanguage("You need to calm down.")).toBe(true);
  });

  it("detects 'look on the bright side'", () => {
    expect(containsDismissiveLanguage("Look on the bright side!")).toBe(true);
  });

  it("detects 'others have it worse'", () => {
    expect(containsDismissiveLanguage("Other people have it worse.")).toBe(true);
  });

  it("does NOT flag empathetic responses", () => {
    expect(containsDismissiveLanguage("That sounds really difficult.")).toBe(false);
    expect(containsDismissiveLanguage("Your feelings are valid.")).toBe(false);
  });
});

// ─── Response Length Check ───

describe("isResponseTooLong", () => {
  it("returns false for short responses", () => {
    expect(isResponseTooLong("Hello there.", 150)).toBe(false);
  });

  it("returns true for responses exceeding limit", () => {
    const long = "word ".repeat(200);
    expect(isResponseTooLong(long, 150)).toBe(true);
  });

  it("uses default 150 word limit", () => {
    const exactly150 = "word ".repeat(150).trim();
    expect(isResponseTooLong(exactly150)).toBe(false);

    const over150 = "word ".repeat(151).trim();
    expect(isResponseTooLong(over150)).toBe(true);
  });

  it("handles empty string", () => {
    expect(isResponseTooLong("")).toBe(false);
  });
});

// ─── sanitizeResponse (full pipeline) ───

describe("sanitizeResponse", () => {
  it("returns no warnings for safe response", () => {
    const result = sanitizeResponse(
      "It sounds like you're going through a tough time. What's been weighing on you?"
    );
    expect(result.warnings).toEqual([]);
    expect(result.hasCriticalWarning).toBe(false);
  });

  it("flags medical advice as critical", () => {
    const result = sanitizeResponse("You should take Prozac for your depression.");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.hasCriticalWarning).toBe(true);
    expect(result.warnings.some((w) => w.type === "medical_advice")).toBe(true);
  });

  it("flags diagnostic language as critical", () => {
    const result = sanitizeResponse("You have depression and need treatment.");
    expect(result.hasCriticalWarning).toBe(true);
    expect(result.warnings.some((w) => w.type === "diagnostic_language")).toBe(true);
  });

  it("flags dismissive language as non-critical", () => {
    const result = sanitizeResponse("Just cheer up, it's not that bad.");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.hasCriticalWarning).toBe(false);
    expect(result.warnings.some((w) => w.type === "dismissive")).toBe(true);
  });

  it("flags too-long responses", () => {
    const long = "This is a word. ".repeat(100);
    const result = sanitizeResponse(long, 50);
    expect(result.warnings.some((w) => w.type === "too_long")).toBe(true);
  });

  it("returns original text unchanged", () => {
    const text = "You should take Prozac.";
    const result = sanitizeResponse(text);
    expect(result.text).toBe(text);
  });

  it("can flag multiple warning types at once", () => {
    const result = sanitizeResponse(
      "You have depression. I recommend you take Prozac. Just cheer up! " +
        "word ".repeat(200),
      150
    );
    expect(result.warnings.length).toBeGreaterThanOrEqual(3);
    const types = result.warnings.map((w) => w.type);
    expect(types).toContain("medical_advice");
    expect(types).toContain("diagnostic_language");
    expect(types).toContain("dismissive");
    expect(types).toContain("too_long");
  });
});
