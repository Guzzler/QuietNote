# WebLLM Model Comparison for QuietNote

**Date:** 2026-03-22
**Purpose:** Evaluate WebLLM-compatible models <=3B parameters for suitability as an empathetic journaling companion.
**Current model:** Gemma 2B (quietnote-gemma-2b-q4f32_1-MLC)

## Comparison Table (q4f16_1 quantization)

| Model | Params | VRAM | Download | Context | IFEval | MT-Bench | MMLU |
|-------|--------|------|----------|---------|--------|----------|------|
| Phi-3-mini-4k | 3.8B | 3,672 MB | 2.15 GB | 4,096 | 54.8 | **8.38** | **69.0** |
| **Gemma 2 2B** | 2.6B | 1,895 MB | 1.49 GB | 4,096* | **56.7** | -- | 51.3 |
| SmolLM2-1.7B | 1.7B | 1,774 MB | 966 MB | 4,096* | **56.7** | 6.13 | -- |
| StableLM-2-1.6B | 1.6B | 2,088 MB | 933 MB | 4,096 | -- | 5.42 | 41.8 |
| Qwen2.5-1.5B | 1.54B | 1,630 MB | 880 MB | 4,096* | 42.5 | -- | 50.7 |
| TinyLlama-1.1B | 1.1B | 697 MB | 621 MB | 2,048 | -- | -- | 25.8 |

\* Native context is larger (8k-32k) but WebLLM caps at 4,096.

All six models have official MLC/WebLLM builds available in `@mlc-ai/web-llm`.

## Detailed Assessment

### 1. Gemma 2 2B (google/gemma-2-2b-it) — TOP CANDIDATE

- **WebLLM IDs:** `gemma-2-2b-it-q4f16_1-MLC`, `gemma-2-2b-it-q4f32_1-MLC`
- **Why consider:** Direct successor to current Gemma 2B. Best-in-class instruction following at 2B scale (IFEval: 56.7). Trained with knowledge distillation from larger Gemma models. SocialIQA score of 51.9 suggests meaningful social reasoning capability.
- **Concerns:** No published MT-Bench score. Context capped at 4k in WebLLM. Requires shader-f16 for q4f16_1 variant.
- **Empathetic conversation suitability:** HIGH. Strong instruction following means better system prompt compliance. Knowledge distillation approach means it punches above its weight class.
- **Migration effort:** LOW. Same architecture family as current model — WASM binary likely compatible. Same quantization format.

### 2. Phi-3-mini-4k (microsoft/Phi-3-mini-4k-instruct) — QUALITY LEADER

- **WebLLM IDs:** `Phi-3-mini-4k-instruct-q4f16_1-MLC`, `Phi-3-mini-4k-instruct-q4f32_1-MLC`
- **Why consider:** Highest overall quality. MT-Bench of 8.38 indicates excellent multi-turn conversational ability. Best MMLU (69.0) means stronger contextual understanding.
- **Concerns:** Largest model at 3.8B. VRAM requirement (3,672 MB) may exclude users with integrated GPUs or 4GB VRAM cards. Download is 2.15 GB. Trained primarily on synthetic data — may limit natural conversational tone.
- **Empathetic conversation suitability:** HIGH, but size is a barrier. Multi-turn capability is very valuable for extended journaling sessions.
- **Migration effort:** MODERATE. Different architecture requires new WASM binary and config updates.

### 3. SmolLM2-1.7B (HuggingFaceTB/SmolLM2-1.7B-Instruct) — BEST EFFICIENCY

- **WebLLM IDs:** `SmolLM2-1.7B-Instruct-q4f16_1-MLC`, `SmolLM2-1.7B-Instruct-q4f32_1-MLC`
- **Why consider:** Matches Gemma 2 2B on IFEval (56.7) at significantly smaller size. Purpose-built for on-device use. Trained on 11 trillion tokens. DPO-aligned for helpfulness. Only 966 MB download.
- **Concerns:** MT-Bench of 6.13 is moderate. May struggle with nuanced emotional contexts requiring world knowledge. Requires shader-f16 for q4f16_1.
- **Empathetic conversation suitability:** MEDIUM-HIGH. Good instruction following but less conversational depth than Gemma 2 or Phi-3.
- **Migration effort:** MODERATE. Different architecture.

### 4. Qwen2.5-1.5B (Qwen/Qwen2.5-1.5B-Instruct) — SMALLEST FOOTPRINT

- **WebLLM IDs:** `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`, `Qwen2.5-1.5B-Instruct-q4f32_1-MLC`
- **Why consider:** Smallest download (880 MB) and lowest VRAM (1,630 MB). Strong knowledge benchmarks (MMLU-Pro 32.4 is highest among sub-2B). Excellent multilingual support.
- **Concerns:** Weakest IFEval (42.5) — may not follow the system prompt reliably. No MT-Bench score published. Not optimized for emotional support.
- **Empathetic conversation suitability:** MEDIUM. Strong knowledge but weak instruction following is concerning for a safety-critical application.
- **Migration effort:** MODERATE. Different architecture.

### 5. StableLM-2-1.6B (stabilityai/stablelm-2-zephyr-1_6b) — NOT RECOMMENDED

- **WebLLM IDs:** `stablelm-2-zephyr-1_6b-q4f16_1-MLC`, `stablelm-2-zephyr-1_6b-q4f32_1-MLC`
- **Why consider:** Zephyr fine-tuning via DPO targets conversational helpfulness.
- **Concerns:** Lowest MT-Bench (5.42). Lowest MMLU (41.8). Higher VRAM than comparable models. Stability AI has reduced model development — effectively unmaintained. No IFEval score.
- **Empathetic conversation suitability:** LOW. Poor benchmarks and unmaintained status make it a poor choice.
- **Migration effort:** MODERATE. Different architecture.

### 6. TinyLlama-1.1B (TinyLlama/TinyLlama-1.1B-Chat-v1.0) — FALLBACK ONLY

- **WebLLM IDs:** `TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC`, `TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC`
- **Why consider:** Smallest model (697 MB VRAM, 621 MB download). Runs on virtually any WebGPU device.
- **Concerns:** MMLU of 25.8 is near random. Only 2,048 token context. Likely to produce generic, shallow responses. Obsoleted by newer small models.
- **Empathetic conversation suitability:** LOW. Too limited for meaningful empathetic conversation. Useful only as a last-resort fallback for very low-end hardware.
- **Migration effort:** LOW (already partially configured in codebase as `quietnote-tinyllama-1.1b-q4f16_1-MLC-test`).

## Ranked Shortlist

### Top 3 candidates to test (in priority order):

1. **Gemma 2 2B** — Best balance of quality, size, and migration simplicity. Direct successor to current model with improved instruction following. Recommended first candidate.

2. **SmolLM2-1.7B** — Best size-to-quality ratio. Strong IFEval matching Gemma 2 at 30% smaller size. Good second candidate, especially if Gemma 2 VRAM proves too high for target devices.

3. **Phi-3-mini-4k** — Highest absolute quality but largest footprint. Worth testing to establish a quality ceiling, but VRAM requirements may disqualify it for broad deployment.

## Recommendation Criteria (ordered by priority)

1. **Safety refusal rate** on medical/harmful prompts (minimum 95%) — measured via eval scorer
2. **Instruction following consistency** (IFEval >= 50) — system prompt adherence is critical
3. **Empathetic response quality** — measured via empathy dimension in eval scorer
4. **Download size and load time** — must be viable on consumer hardware (< 2 GB download)
5. **Context window** (minimum 2,048 tokens, prefer 4,096)
6. **WebGPU memory footprint** — must work on 4 GB VRAM GPUs (< 3,000 MB)

## Migration Plan

1. Collect baseline scores for current Gemma 2B using eval scorer and baseline collection protocol
2. Configure candidate model in `useMLCEngine.ts` (update model ID, WASM binary, model URL)
3. Collect baseline scores for candidate model using identical settings and system prompt
4. Compare composite scores — candidate must beat current by >= 10% to justify migration
5. If candidate passes: update `MODEL_REF` in `App.tsx`, run full eval suite, verify crisis detection still works
6. User testing for 1 week before committing to production

## Next Steps

- [ ] Collect real Gemma 2B baselines using the baseline collection protocol
- [ ] Test Gemma 2 2B with current system prompt and score via eval pipeline
- [ ] If Gemma 2 2B improves scores: plan migration
- [ ] If not: test SmolLM2-1.7B as alternative
