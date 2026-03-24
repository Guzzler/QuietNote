# Guardrail Blocking Mode + Medical Refusal Hardening

**Date:** 2026-03-23
**Branch:** `safety/2026-03-23-guardrail-blocking`
**Plan:** `docs/daily-plans/2026-03-23-plan.md`

## Summary

Implemented response guardrail blocking mode (V2) that replaces medical/diagnostic model responses with a safe fallback before they reach the user. Hardened the system prompt with explicit medical refusal instructions and a few-shot example. Added 8 new medical edge-case eval cases targeting supplements, dosages, and indirect diagnosis patterns.

## Motivation

The response guardrails were previously monitoring-only — harmful responses containing medication recommendations or diagnostic claims were logged to the console but shown to the user unchanged. For a mental health app targeting potentially vulnerable users, this was the most critical safety gap. Small quantized models also follow in-context examples more reliably than abstract rules, so adding a medical refusal few-shot example strengthens generation-time safety.

## User Impact

- **Direct safety improvement:** Responses containing medical advice, medication names, supplement recommendations, or diagnostic claims are now automatically replaced with a safe, empathetic fallback that redirects to professional help
- **Better model behavior:** System prompt now includes explicit "NEVER recommend medications/supplements" language and a concrete medical refusal example
- **No UX regression:** The app loads and functions identically; the fallback response is natural and empathetic

## Technical Details

### Priority 1: Blocking Mode (`src/utils/responseGuardrails.ts`)
- Added `GuardrailSeverity` type: `"block" | "warn" | "monitor"`
- Added `BLOCKED_RESPONSE_FALLBACK` constant (safe empathetic redirect)
- Added `isBlocked` field to `GuardrailResult` interface
- Severity mapping: medical_advice → BLOCK, diagnostic_language → BLOCK, dismissive → WARN, too_long → MONITOR
- `sanitizeResponse()` now replaces response text with fallback when any BLOCK-severity pattern matches
- Added 8 new supplement/natural remedy patterns (melatonin, St. John's Wort, CBD oil, valerian, 5-HTP, herbal remedies, natural remedies)

### Priority 2: System Prompt Hardening (`src/App.tsx`)
- Added 2 new guideline bullets: explicit medication/supplement/treatment refusal + health condition redirect
- Added medical refusal few-shot example (melatonin/insomnia scenario)
- Both `newSession()` and `replyInThread()` updated to use `guardrailResult.text` (safe content) instead of raw `finalContent`

### Priority 3: Medical Edge-Case Evals (`src/utils/evalRunner.ts`)
- 8 new eval cases: medical-2.6 through medical-2.13
- Covers: supplement advice, dosage questions, St. John's Wort, CBD oil, bipolar diagnosis, ADHD symptoms, medication compliance, natural remedy requests
- 8 new synthetic baselines added to `docs/evals/baseline-responses.json`

## Safety Review

- **Blocking only applies to unambiguously harmful patterns:** medication names, dosage language, diagnostic claims, supplement names
- **False-positive risk is low:** Professional referrals ("your doctor can help") do not trigger blocking. Dismissive language is WARN-only.
- **Known false positive:** "I'm not able to prescribe anything" triggers the `prescri(be|ption)` pattern. This is acceptable — the fallback is still appropriate and safe.
- **Defense in depth:** Prompt-level prevention (Priority 2) + output-level blocking (Priority 1) = two independent safety layers

## Validation

- 295 tests passing (was 273 before today's changes)
- TypeScript type check clean
- App loads and renders correctly in browser (verified via Claude Preview)
- No console errors

## Rollback

- Revert the commit. The only behavioral change is in `sanitizeResponse()` — reverting restores monitoring-only mode.
- System prompt changes are additive and can be removed independently.

## Next Steps

1. Collect real model responses against the expanded 40-case eval suite
2. A/B score current Gemma 2B vs Gemma 2 2B candidate
3. Consider adding blocking for dismissive patterns (currently WARN-only)
4. Address the "prescribe" false-positive with a negative lookahead pattern
