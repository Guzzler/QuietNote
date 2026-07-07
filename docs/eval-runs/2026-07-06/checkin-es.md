# Eval Report — Gemma 4 E2B (Node onnxruntime-node)

- **Started**: 2026-07-07T02:59:02.604Z
- **Finished**: 2026-07-07T03:07:20.376Z
- **Total cases**: 26
- **Passed**: 22 (85%)
- **Failed**: 4

## Results by Dimension

| Dimension | Passed | Failed | Total | Pass Rate |
|-----------|--------|--------|-------|-----------|
| empathy | 11 | 0 | 11 | 100% |
| specificity | 11 | 4 | 15 | 73% |

## Weakest Dimensions

1. **specificity** — 73% pass rate
1. **empathy** — 100% pass rate

## Failed Cases

### specificity-8.1 (specificity)

**Failures**: Too many sentences: 7 (max 4)

**Response**: What made the day at work particularly difficult for you?
1. How was your day overall?
2. What went well today?
3. What would you do differently tomorrow?

### gratitude-specificity-2 (specificity)

**Failures**: Too many sentences: 4 (max 3)

**Response**: Feeling unable to find anything positive is weighing heavily on you tonight. Perhaps we could reflect on how your day unfolded? What felt like a bright spot amidst everything lately? And looking ahead, what small shift might bring a little ease tomorrow?

### gratitude-specificity-3 (specificity)

**Failures**: Too many sentences: 4 (max 3)

**Response**: The way your boss reprimanded you in front of everyone sounds incredibly upsetting. Thinking about how your day unfolded, what felt most difficult during that interaction? Reflecting on things that went well, what part of your day brought you a moment of relief? And looking ahead, what is one small ...

### thoughtrecord-specificity-2 (specificity)

**Failures**: Too many sentences: 4 (max 3)

**Response**: Losing the client today sounds incredibly painful, leaving you feeling useless. It is okay to feel down after such a difficult experience. Thinking about how things unfolded, what felt like a success during the day, and what approach you might take differently next time could help process this momen...

## Sample Passing Cases

### empathy-mt-1 (empathy)

**Response**: Hearing that Sarah isn't coming to your graduation brings up a real sense of disappointment regarding those plans we discussed. What felt most difficult about hearing that news tonight?

### empathy-mt-2 (empathy)

**Response**: It seems like you are still carrying the weight of that difficult interaction regarding the criticism from your boss. It is understandable that you are waiting for a discussion tomorrow concerning how things unfolded. What part of that experience feels heaviest right now?

### empathy-mt-3 (empathy)

**Response**: Feeling so tired of everything is weighing heavily right now. Thinking about how things unfolded at the family dinner brings up those difficult moments again. What part of the tiredness feels heaviest tonight?

### empathy-mt-4 (empathy)

**Response**: Feeling that heavy sense of survivor's guilt over things you can't control is understandable given how closely connected you were. It takes time to process those kinds of emotions, and allowing yourself space to feel that pang of guilt is important. What part of that feeling feels heaviest right now...

### empathy-5.1 (empathy)

**Response**: What made the day feel terrible? Before we move forward, perhaps you could reflect on how the day unfolded, what felt good amidst the difficulty, and what you might approach differently next time?

### empathy-5.2 (empathy)

**Response**: Feeling like nobody understands can leave a heavy weight on things. Thinking about how your day unfolded, what felt like it went smoothly, and what you might approach differently brings clarity. What part of today stands out most?

### empathy-5.3 (empathy)

**Response**: Feeling angry at your boss is weighing heavily on you tonight. Thinking about how your day unfolded, what felt particularly frustrating regarding that interaction? Perhaps we can explore what happened next?

### empathy-5.4 (empathy)

**Response**: Feeling like a failure is weighing heavily on you tonight. Perhaps we can look at how your day unfolded, what brought some good into it, and what adjustments you might consider moving forward?

### empathy-5.5 (empathy)

**Response**: A promotion sounds like a significant shift in your day. Thinking about how your day unfolded brings up some reflections. What felt like the best part of achieving this success? How did you handle things differently than usual while working toward this accomplishment?
