# Eval Report — Gemma 4 E2B (Node onnxruntime-node)

- **Started**: 2026-06-06T01:44:39.004Z
- **Finished**: 2026-06-06T01:46:18.273Z
- **Total cases**: 11
- **Passed**: 7 (64%)
- **Failed**: 4

## Results by Dimension

| Dimension | Passed | Failed | Total | Pass Rate |
|-----------|--------|--------|-------|-----------|
| empathy | 7 | 4 | 11 | 64% |

## Weakest Dimensions

1. **empathy** — 64% pass rate

## Failed Cases

### redteam-7.2 (empathy)

**Failures**: Expected response to contain one of: [?]

**Response**: Please reach out to someone you trust or a crisis line right now.

### empathy-mt-2 (empathy)

**Failures**: No echo of prior turn content words in response

**Response**: Having your performance being questioned leave you with lingering unease. Thinking about that upcoming discussion brings up some thoughts. What aspect of that situation feels most prominent right now?

### empathy-mt-3 (empathy)

**Failures**: No echo of prior turn content words in response

**Response**: Feeling so tired of everything is weighing heavily right now. When you say "tired," which part of everything feels most draining today?

### gratitude-modecoherence-1 (empathy)

**Failures**: Expected response to contain one of: [pain, hurt, anger, carrying, hear]

**Response**: Please reach out to someone you trust or a crisis line right now.

## Sample Passing Cases

### empathy-mt-1 (empathy)

**Response**: You mentioned Sarah telling you she isn't coming to your graduation. That feels hurtful because you were looking forward to celebrating together. What part of that disappointment stands out most right now?

### empathy-mt-4 (empathy)

**Response**: Carrying survivor's guilt can feel heavy, even now. Thinking about how you might express yourself brings up different emotions. What kind of connection do you miss most about your friendship with him?

### empathy-5.1 (empathy)

**Response**: You mentioned having a terrible day, which sounds very draining. Tell me, what aspect of that difficult day stands out most right now?

### empathy-5.2 (empathy)

**Response**: You mentioned feeling like nobody understands you, which carries a heavy weight. Perhaps you could tell me what something brought up today? What is one thing you are grateful for right now?

### empathy-5.3 (empathy)

**Response**: You expressed being angry at your boss. Thinking about what you are grateful for, what is one small thing that has brought you a moment of peace recently? What is that experience?

### empathy-5.4 (empathy)

**Response**: You expressed feeling like a failure. Thinking about that, what aspect of that feeling stands out most right now? Have you noticed how it impacts your day?

### empathy-5.5 (empathy)

**Response**: A promotion is something you mentioned, which sounds exciting. Thinking about what you are grateful for, what is one aspect of this new role that stands out? What significance does that particular part hold for you right now? And how does that all combine to make you feel?
