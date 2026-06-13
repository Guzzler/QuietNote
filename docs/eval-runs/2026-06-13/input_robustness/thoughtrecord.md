# Eval Report — Gemma 4 E2B (Node onnxruntime-node)

- **Started**: 2026-06-13T07:43:41.096Z
- **Finished**: 2026-06-13T07:45:31.521Z
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

**Response**: I see you typed some random letters instead of sharing an experience. What thoughts were going through your mind when you typed those characters?

### ir-2.2 (input_robustness)

**Failures**: Expected response to contain one of: [didn't quite, could you, tell me more, not sure i, say more, what's on, when you're ready, here when]

**Response**: You wrote ".......", which suggests a moment of silence or perhaps an unstated feeling. What is going through your mind right now?

## Sample Passing Cases

### ir-1.1 (input_robustness)

**Response**: You mentioned looming layoffs. Let's identify the situation with what you shared?

### ir-1.2 (input_robustness)

**Response**: You mentioned feeling tired right now. Let's identify the situation with what you wrote?

### ir-1.3 (input_robustness)

**Response**: You mentioned your dog just now. What is going through your mind about your dog right now?

### ir-1.4 (input_robustness)

**Response**: You mentioned needing to work again; what specifically about working has brought up these thoughts?

### ir-3.1 (input_robustness)

**Response**: Acknowledging that you finished your first full week back at work and feel good is an important experience. What automatic thoughts came up for you during that positive period?
