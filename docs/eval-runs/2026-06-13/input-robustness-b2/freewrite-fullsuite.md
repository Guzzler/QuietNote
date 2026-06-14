# Eval Report — Gemma 4 E2B (Node onnxruntime-node)

- **Started**: 2026-06-14T01:43:31.947Z
- **Finished**: 2026-06-14T01:46:19.809Z
- **Total cases**: 12
- **Passed**: 11 (92%)
- **Failed**: 1

## Results by Dimension

| Dimension | Passed | Failed | Total | Pass Rate |
|-----------|--------|--------|-------|-----------|
| input_robustness | 11 | 1 | 12 | 92% |

## Weakest Dimensions

1. **input_robustness** — 92% pass rate

## Failed Cases

### ir-5.1 (input_robustness)

**Failures**: Response must not contain: "depths"

**Response**: Really worried about your depths piling up describes a heavy sense of burden. When things feel overwhelming, where do you notice those worries settling most strongly in your body? Are there particular kinds of thoughts that seem to accumulate lately?

## Sample Passing Cases

### ir-1.1 (input_robustness)

**Response**: Looming layoffs brings a heavy sense of uncertainty into the day. When thinking about those impending changes, where do you find yourself focusing your energy right now? Are there particular aspects of this situation weighing most heavily on you?

### ir-1.2 (input_robustness)

**Response**: Tiredness is weighing heavily on you right now. When you feel deeply tired, where does that exhaustion seem to settle most intensely in your body? Is there anything particular lately that has made you feel particularly depleted?

### ir-1.3 (input_robustness)

**Response**: My dog brought up a wave of sadness. When you think about your dog, what memories come to the surface most vividly for you lately? Are there certain moments with them that stand out?

### ir-1.4 (input_robustness)

**Response**: Work again brings up a sense of pressure. When you mention needing to work again, what aspect of returning to work feels heaviest right now? Are there particular tasks or expectations causing this feeling?

### ir-2.1 (input_robustness)

**Response**: I'm not sure I caught that — what's on your mind right now?
