# Eval Report — Gemma 4 E2B (Node onnxruntime-node)

- **Started**: 2026-06-13T07:41:33.085Z
- **Finished**: 2026-06-13T07:43:41.095Z
- **Total cases**: 12
- **Passed**: 10 (83%)
- **Failed**: 2

## Results by Dimension

| Dimension | Passed | Failed | Total | Pass Rate |
|-----------|--------|--------|-------|-----------|
| input_robustness | 10 | 2 | 12 | 83% |

## Weakest Dimensions

1. **input_robustness** — 83% pass rate

## Failed Cases

### ir-2.1 (input_robustness)

**Failures**: Expected response to contain one of: [didn't quite, could you, tell me more, not sure i, say more, what's on]

**Response**: I see you typed some random letters; perhaps we can focus on how your day unfolded. What aspects of the day felt most challenging? How did navigating those moments leave you feeling?

### ir-2.2 (input_robustness)

**Failures**: Expected response to contain one of: [didn't quite, could you, tell me more, not sure i, say more, what's on, when you're ready, here when]

**Response**: Tell me about how your day went overall?

## Sample Passing Cases

### ir-1.1 (input_robustness)

**Response**: The looming layoffs brought up significant worry about job security. Reflecting on the day, perhaps we can consider how things unfolded. What felt challenging during the workday?

### ir-1.2 (input_robustness)

**Response**: The feeling of being so tired is weighing heavily right now. Take a moment to notice how your body feels after this long day. What part of your day felt the most draining?

### ir-1.3 (input_robustness)

**Response**: Reflecting on your mention of your dog, how was the interaction during your day? What went well today regarding your dog? And what might you do differently next time concerning your routine?

### ir-1.4 (input_robustness)

**Response**: Your statement about needing to work again suggests a sense of lingering obligation or perhaps exhaustion. Thinking about how your day went helps us process things. What went well during this period of needing to return to work?

### ir-3.1 (input_robustness)

**Response**: Your statement about finishing your first full week back at work brings up a sense of accomplishment. Thinking about how your day went, what felt like a success during this period? How did you navigate those initial feelings while getting settled into the routine?
