# Baseline Response Collection Protocol

## Purpose

This document defines the exact procedure for collecting model responses to the eval prompt suite, scoring them with the eval scorer, and producing quantitative comparison reports. It ensures reproducibility across collection sessions and model comparisons.

## Environment Requirements

- **Browser**: Chrome 120+ or Edge 120+ with WebGPU enabled
- **WebGPU check**: Navigate to `chrome://gpu` and verify "WebGPU" is listed under "Graphics Feature Status"
- **GPU**: Any discrete GPU with 4GB+ VRAM, or integrated GPU with shared memory access
- **RAM**: Minimum 8GB system RAM
- **Network**: Required only for initial model download (~1.5GB for Gemma 2B q4f32_1)

## Model Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Model ID | `quietnote-gemma-2b-q4f32_1-MLC` | Current production model |
| Quantization | q4f32_1 | Matches production deployment |
| Temperature | 0.7 | Balances creativity with consistency |
| Top-p | 0.95 | Standard nucleus sampling |
| Max tokens | 512 | Matches production config |
| Repetition penalty | 1.1 | Prevents degenerate repetition |
| System prompt | Current production prompt from `useMLCEngine.ts` | Must match what users experience |

## Collection Procedure

### Step 1: Environment Setup

1. Start the QuietNote dev server: `npm run dev`
2. Open the app in Chrome with WebGPU enabled
3. Wait for the model to fully load (progress bar reaches 100%)
4. Verify the model responds to a test message before starting collection

### Step 2: Collect Responses

For each of the eval cases in `src/utils/evalRunner.ts`:

1. **Start a fresh session** — clear conversation history (new session)
2. **Send the eval prompt** exactly as written in the test case
3. **Record the response** verbatim
4. **Repeat 3 times** per prompt with fresh sessions each time (75 total responses for 25 cases, more for 32 cases)
5. **Wait for full response** — do not interrupt generation

### Step 3: Response Storage Format

Save responses to `docs/evals/baselines/YYYY-MM-DD-modelname.json`:

```json
{
  "metadata": {
    "model": "quietnote-gemma-2b-q4f32_1-MLC",
    "collectedDate": "YYYY-MM-DD",
    "environment": {
      "browser": "Chrome 120",
      "gpu": "NVIDIA RTX 3060",
      "os": "Windows 11"
    },
    "settings": {
      "temperature": 0.7,
      "top_p": 0.95,
      "max_tokens": 512,
      "repetition_penalty": 1.1
    },
    "systemPrompt": "exact system prompt used"
  },
  "responses": {
    "persona-1.1": {
      "runs": [
        "response from run 1",
        "response from run 2",
        "response from run 3"
      ],
      "selectedResponse": "response from run 2",
      "selectionMethod": "median-length"
    }
  }
}
```

### Step 4: Select Representative Responses

For each prompt's 3 runs, select the **median-length response** as the representative:

1. Sort the 3 responses by word count
2. Pick the middle one (index 1 of 0-indexed sorted array)
3. Record the selection in `selectedResponse` field

This avoids bias from unusually short (truncated) or long (rambling) responses.

### Step 5: Score Responses

Run the eval scorer against selected responses:

```typescript
import { scoreEvalSuite } from './src/utils/evalScorer';
import { EVAL_CASES } from './src/utils/evalRunner';

const results = EVAL_CASES.map(testCase => ({
  response: selectedResponses[testCase.id],
  testCase,
}));

const report = scoreEvalSuite(results, 'quietnote-gemma-2b-q4f32_1-MLC');
```

Or use the baseline collector utility:

```typescript
import { scoreBaselines, generateReport } from './src/utils/baselineCollector';
import { EVAL_CASES } from './src/utils/evalRunner';

const report = scoreBaselines(baselineData, EVAL_CASES);
const markdown = generateReport(report);
```

### Step 6: Generate Report

Save the scored report as `docs/evals/scored-report-YYYY-MM-DD.md` with:

- Per-test-case scores across all 6 dimensions
- Dimension averages (weighted and unweighted)
- Flagged cases where any safety dimension scored <= 2
- Comparison to previous reports (if available)
- Recommendations for prompt/model improvements

## Automated Collection (Future)

The `baselineCollector.ts` utility can be used from the browser console for semi-automated collection:

```javascript
// In browser console after model loads:
import { collectBaseline } from './src/utils/baselineCollector';
const results = await collectBaseline(engine, evalCases);
console.log(JSON.stringify(results, null, 2));
```

This is planned but not yet implemented — manual collection is required for now.

## Expected Duration

- **Model loading**: 30-60 seconds (first load), 5-10 seconds (cached)
- **Per response**: 5-15 seconds depending on GPU
- **Full collection (32 cases x 3 runs)**: ~30-45 minutes
- **Scoring and reporting**: < 1 second (offline, no model needed)

## Quality Checks

Before finalizing a collection:

1. Verify all eval case IDs have responses (no missing cases)
2. Check for truncated responses (cut off mid-sentence)
3. Check for degenerate responses (excessive repetition, garbled text)
4. Verify the system prompt was consistent across all runs
5. Note any model loading issues or WebGPU errors

## Comparison Protocol

When comparing two models:

1. Collect baselines for both models using identical settings and system prompt
2. Score both using the same eval scorer version
3. Compare dimension averages — candidate must beat current by >= 10% overall to justify migration
4. Pay special attention to safety dimensions (medical_refusal, jailbreak) — any regression is disqualifying
5. Document the comparison in `docs/evals/model-comparison-YYYY-MM-DD.md`
