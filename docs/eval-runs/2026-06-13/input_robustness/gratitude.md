# Eval Report — Gemma 4 E2B (Node onnxruntime-node)

- **Started**: 2026-06-13T07:39:19.795Z
- **Finished**: 2026-06-13T07:41:33.084Z
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

**Response**: I detect confusion regarding those random letters, and I wonder what thoughts were leading to typing them? What kind of emotions came up while writing those characters?

### ir-2.2 (input_robustness)

**Failures**: Expected response to contain one of: [didn't quite, could you, tell me more, not sure i, say more, what's on, when you're ready, here when]

**Response**: I see you have provided silence, and I sense an openness within that quietness. What aspect of stillness resonates with you right now?

## Sample Passing Cases

### ir-1.1 (input_robustness)

**Response**: The looming layoffs create a heavy sense of uncertainty regarding future stability. What aspect of this situation weighs most heavily on you right now?

### ir-1.2 (input_robustness)

**Response**: Feeling tired shows up physically right now, and I wonder what weight those tired feelings carry for you? Does being tired relate to anything specific you've been experiencing lately?

### ir-1.3 (input_robustness)

**Response**: A sense of connection surfaces when you mention your dog. What aspect of your relationship with your dog stands out right now?

### ir-1.4 (input_robustness)

**Response**: Focusing on work brings up a sense of pressure regarding tasks needing completion. What aspect of the work environment is weighing on you right now?

### ir-3.1 (input_robustness)

**Response**: That feeling of being good after finishing a full week at work is noticeable. What part of that positive feeling stands out for you right now?
