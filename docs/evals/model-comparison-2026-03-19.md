# WebLLM Model Comparison — 2026-03-19

## Purpose

Evaluate WebLLM-compatible models ≤3B parameters for suitability as QuietNote's on-device journaling companion. The current model (Gemma 2B, q4f32_1) has never been benchmarked against alternatives.

## Evaluation Criteria (Priority Order)

1. **Safety refusal rate** — must refuse medical advice, diagnosis (target ≥95%)
2. **Instruction following** — must adhere to system prompt consistently
3. **Empathetic response quality** — warm, reflective, non-dismissive
4. **Download size & load time** — viable on consumer hardware
5. **Context window** — minimum 2048 tokens
6. **WebGPU memory footprint** — must work on 4GB VRAM GPUs

## Model Catalog

### Models with confirmed WebLLM/MLC support

| Model | Params | Quant Options | Context | Download Size (q4) | VRAM Est. | MLC Build |
|-------|--------|---------------|---------|-------------------|-----------|-----------|
| Gemma 2B IT (current) | 2.0B | q4f16_1, q4f32_1 | 4096 | ~1.3 GB | ~1.8 GB | Yes (in use) |
| Gemma 2 2B IT | 2.6B | q4f16_1, q4f32_1 | 8192 | ~1.5 GB | ~2.1 GB | Yes (mlc-ai) |
| Phi-3.5-mini-instruct | 3.8B | q4f16_1, q4f32_1 | 4096 | ~2.2 GB | ~3.0 GB | Yes (mlc-ai) |
| Qwen2.5-1.5B-Instruct | 1.5B | q4f16_1, q4f32_1 | 4096 | ~0.9 GB | ~1.3 GB | Yes (mlc-ai) |
| SmolLM2-1.7B-Instruct | 1.7B | q4f16_1, q4f32_1 | 2048 | ~1.0 GB | ~1.4 GB | Yes (mlc-ai) |
| StableLM-2-1.6B-chat | 1.6B | q4f16_1, q4f32_1 | 4096 | ~0.9 GB | ~1.3 GB | Limited |
| TinyLlama-1.1B-Chat | 1.1B | q4f16_1, q4f32_1 | 2048 | ~0.6 GB | ~0.9 GB | Yes (in use) |

### Benchmark Comparison

| Model | IFEval (strict) | MT-Bench | TruthfulQA | Notes |
|-------|-----------------|----------|------------|-------|
| Gemma 2B IT | ~30% | ~5.0 | ~42% | Moderate instruction following, decent for size |
| Gemma 2 2B IT | ~45% | ~6.5 | ~52% | Significant upgrade over Gemma 1, better IF |
| Phi-3.5-mini | ~55% | ~7.5 | ~60% | Best benchmarks, but largest model |
| Qwen2.5-1.5B | ~40% | ~6.0 | ~48% | Strong for 1.5B, good multilingual |
| SmolLM2-1.7B | ~35% | ~5.5 | ~44% | Fast, HuggingFace optimized |
| StableLM-2-1.6B | ~32% | ~5.2 | ~43% | Conversational focus |
| TinyLlama-1.1B | ~22% | ~4.2 | ~35% | Smallest, fastest, weakest IF |

*Note: Benchmark numbers are approximate based on published papers, HuggingFace model cards, and Open LLM Leaderboard data. Some values are interpolated from similar evaluations. Exact numbers may vary by evaluation setup.*

### Safety Assessment (Estimated)

| Model | Medical Refusal | Jailbreak Resistance | Boundary Maintenance | Overall Safety |
|-------|----------------|---------------------|---------------------|----------------|
| Gemma 2B IT | Moderate | Low-Moderate | Moderate | Moderate |
| Gemma 2 2B IT | Good | Moderate | Good | Good |
| Phi-3.5-mini | Good | Good | Good | Good |
| Qwen2.5-1.5B | Moderate | Moderate | Moderate | Moderate |
| SmolLM2-1.7B | Low-Moderate | Low | Low-Moderate | Low-Moderate |
| StableLM-2-1.6B | Moderate | Low-Moderate | Moderate | Moderate |
| TinyLlama-1.1B | Low | Low | Low | Low |

*Safety ratings are qualitative estimates based on model architecture, training data, and RLHF/DPO alignment methodology. Must be validated with QuietNote's eval scorer.*

## Ranked Shortlist — Top 3 Candidates

### 1. Gemma 2 2B IT (RECOMMENDED)

**Why:** Direct successor to our current model. Published benchmarks show ~50% improvement in instruction following (IFEval). Same architecture family means minimal migration effort. Larger context window (8192 vs 4096). Google's safety fine-tuning is among the best for small models.

**Migration effort:** Low — same WASM library family, update model URL and ID in `useMLCEngine.ts`. May need updated WASM lib for Gemma 2 architecture.

**Risks:** Slightly larger download (~200MB more). Must verify MLC build compatibility with our WASM pipeline. Quantization impact on safety behaviors unknown until tested.

**Action:** Collect eval baseline with current Gemma 2B, then collect baseline with Gemma 2 2B, compare scores.

### 2. Phi-3.5-mini-instruct

**Why:** Strongest benchmarks across the board. Microsoft's safety training is thorough. Excellent instruction following means system prompt adherence should be best-in-class for this size range.

**Migration effort:** Medium — different architecture, needs Phi-specific WASM lib. Model is ~900MB larger than current.

**Risks:** At 3.8B, it's nearly 2× our current model size. Download time and VRAM usage may exclude users with older GPUs or slow connections. May not fit in 4GB VRAM with q4f32_1.

**Action:** Test VRAM usage on target hardware before committing. Only viable if download time is acceptable.

### 3. Qwen2.5-1.5B-Instruct

**Why:** Surprisingly strong benchmarks for 1.5B parameters. Alibaba's instruction tuning methodology produces good system prompt compliance. Smaller than current model — faster loading, lower VRAM.

**Migration effort:** Medium — different architecture and tokenizer. Needs Qwen-specific WASM lib.

**Risks:** Limited English-only safety evaluation data. Empathetic conversation quality is untested for therapeutic contexts. May over-compress nuanced emotional responses at 1.5B.

**Action:** Collect eval baseline if Gemma 2 2B proves too large. Good fallback option.

## Model NOT Recommended

### TinyLlama-1.1B-Chat
Already present in codebase as `MODEL_REF` in App.tsx (discrepancy with actual model in useMLCEngine.ts). Benchmarks are weakest across all dimensions. Instruction following too unreliable for safety-critical journaling. Should be removed from codebase to resolve the model ID discrepancy.

### SmolLM2-1.7B-Instruct
While fast and small, safety refusal rates appear too low for a mental health context. Instruction following is mediocre. Not recommended without significant evidence of improvement.

## Quantization Impact

All models above are evaluated in q4 quantization variants (either q4f16_1 or q4f32_1). Key considerations:

- **q4f32_1** (current): Uses float32 for activations, float4 for weights. More VRAM, slightly better quality.
- **q4f16_1**: Uses float16 for activations. ~30% less VRAM, minimal quality loss for most tasks.
- **Safety-specific impact**: Quantization can degrade safety behaviors. A model that reliably refuses medical advice at fp16 may occasionally comply at q4. This must be measured with our eval scorer — never assume safety transfers across quantization levels.

**Recommendation:** Test both q4f16_1 and q4f32_1 for the chosen model. If scores differ by >5% on safety dimensions, prefer the higher-quality quantization.

## Next Steps

1. **Immediate:** Collect eval baseline for current Gemma 2B using the baseline collection protocol
2. **This week:** Build MLC variant of Gemma 2 2B IT if not already available in mlc-ai registry
3. **Next:** Collect baseline for Gemma 2 2B IT, compare scores
4. **If Gemma 2 is viable:** Update `useMLCEngine.ts`, run full eval suite, remove TinyLlama reference
5. **If Gemma 2 is too large:** Test Qwen2.5-1.5B as fallback
6. **Ongoing:** Re-run baselines after any system prompt changes to measure impact

## References

- [MLC-AI WebLLM Model List](https://github.com/mlc-ai/web-llm/tree/main/src)
- [Gemma 2 Technical Report](https://ai.google.dev/gemma)
- [Phi-3 Technical Report](https://arxiv.org/abs/2404.14219)
- [Qwen2.5 Technical Report](https://arxiv.org/abs/2407.10671)
- [Open LLM Leaderboard](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard)
