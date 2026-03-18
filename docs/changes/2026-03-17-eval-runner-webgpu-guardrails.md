# Eval Runner, WebGPU Fallback, and Response Guardrails

**Date**: 2026-03-17
**Plan**: `docs/daily-plans/2026-03-17-plan.md`
**Branch**: `feat/2026-03-17-eval-runner-webgpu-guardrails`
**PR**: https://github.com/Guzzler/QuietNote/pull/7

## Summary

Built three safety and infrastructure features: an automated system prompt evaluation runner, WebGPU capability detection with fallback UI, and response output guardrails for monitoring model behavior.

## Motivation

The system prompt evaluation framework (created 2026-03-16) had 25 test prompts but no automated way to validate model responses. The model loading path had no fallback for browsers without WebGPU. And there were no guardrails to detect when the model might be giving medical advice or diagnostic language.

## User Impact

- **WebGPU fallback**: Users on unsupported browsers now see a clear, informative message instead of a broken app
- **Guardrails**: Model responses are now monitored for safety violations (logging only in v1)
- **Eval runner**: Developers can now run automated eval suites to validate model behavior

## Technical Details

### Eval Runner (`src/utils/evalRunner.ts`)
- 25 structured eval cases across 6 dimensions: persona, medical refusal, jailbreak resistance, format compliance, empathy quality, boundary maintenance
- `evaluateResponse()` checks mustContainAny, mustNotContainAny, and maxWords criteria
- `runEvalSuite()` produces per-dimension pass/fail summary
- Baseline responses in `docs/evals/baseline-responses.json` for offline testing

### WebGPU Detection (`src/utils/webgpuCheck.ts`, `src/components/WebGPUFallback.tsx`)
- Checks both `navigator.gpu` presence AND successful `requestAdapter()` call
- Fallback component shows browser compatibility info and reassurance about local journaling
- Integrated into `useMLCEngine.ts` — check runs before engine creation attempt

### Response Guardrails (`src/utils/responseGuardrails.ts`)
- Detects medical advice patterns (drug names, dosage language, prescription terms)
- Detects diagnostic language ("you have depression", "symptoms of...")
- Detects dismissive patterns ("just cheer up", "calm down", "others have it worse")
- Response length monitoring (default 150 word limit)
- V1 is monitoring-only: logs `console.warn` without blocking responses

## Safety Review

- **Eval runner**: Tests document expected behavior; does not change model behavior
- **WebGPU fallback**: Graceful degradation only; no functional changes when WebGPU is available
- **Guardrails**: Monitoring-only in v1 — logs warnings but never blocks or modifies responses
- **False positive risk**: Guardrail patterns are broad enough to catch genuine violations while avoiding over-flagging empathetic responses (e.g., "it sounds like you're feeling depressed" is NOT flagged)

## Validation

- 244 total tests pass (71 new: 34 eval tests + 37 guardrail tests)
- TypeScript type check clean
- App loads and runs correctly in browser with WebGPU
- No console errors

## Limitations

- Baseline responses are synthetic (written to match expected model behavior), not actual model outputs
- Eval runner uses keyword matching, which may miss nuanced failures
- WebGPU fallback not tested in actual unsupported browser (manual Firefox test recommended)
- Guardrails v1 only logs — no blocking or response modification

## Next Steps

- Collect actual model responses to replace synthetic baselines
- Add guardrail blocking mode (v2) with configurable severity thresholds
- Test WebGPU fallback in Firefox/Safari
- Extend eval cases for conversation continuation and multi-turn scenarios
