# Eval Report — Gemma 4 E2B (Node onnxruntime-node)

- **Started**: 2026-06-13T07:36:12.485Z
- **Finished**: 2026-06-13T07:39:19.794Z
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

### ir-2.2 (input_robustness)

**Failures**: Expected response to contain one of: [didn't quite, could you, tell me more, not sure i, say more, what's on, when you're ready, here when]

**Response**: You typed ".......", which leaves space for many things to surface. When you pause like that, what emotion surfaces right before the silence settles in? Is there a particular thought about that emptiness you are noticing?

## Sample Passing Cases

### ir-1.1 (input_robustness)

**Response**: Looming layoffs bring up a heavy sense of uncertainty about the future. When thinking about those impending changes, where do you find yourself focusing most of your energy right now? Are there particular aspects of the situation weighing heaviest on your thoughts?

### ir-1.2 (input_robustness)

**Response**: Tiredness settles in like a heavy blanket. When you say you are tired, where does that exhaustion seem to settle most heavily in your body right now? Is there anything particular weighing down on you lately?

### ir-1.3 (input_robustness)

**Response**: The mention of your dog brings up a sense of connection and perhaps a quiet comfort. When you think about your dog right now, what memories surface for you most vividly? Are there particular moments with them that stand out lately?

### ir-1.4 (input_robustness)

**Response**: Work again brings up a sense of pressure about getting things done. When you say work again, what aspect of returning to work feels most challenging right now? Are there particular tasks or expectations weighing heavily on you?

### ir-2.1 (input_robustness)

**Response**: I see you typed some random letters. Could you tell me more about what brought up those characters for you right now? Is there something specific weighing on your thoughts lately?
