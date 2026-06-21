# Conversation-Script Eval Report

- **Scripts run**: 12
- **Strategies**: raw, managed, managed-norecap

## Summary

| Script | Mode | Strategy | Turns Passed | Probes Passed | Step-Coherent | First-Trim Turn | Probes After-Trim |
|--------|------|----------|--------------|---------------|---------------|-----------------|-------------------|
| script-freewrite-retention | freewrite | raw | 7/7 | 1/2 | — | — | — |
| script-freewrite-longtrim | freewrite | raw | 10/10 | 0/2 | — | — | — |
| script-thoughtrecord-steps | thoughtrecord | raw | 5/5 | 0/0 | yes | — | — |
| script-checkin-retention | checkin | raw | 6/6 | 1/1 | — | — | — |
| script-freewrite-retention | freewrite | managed | 7/7 | 2/2 | — | — | — |
| script-freewrite-longtrim | freewrite | managed | 10/10 | 2/2 | — | 14 | 2/2 |
| script-thoughtrecord-steps | thoughtrecord | managed | 5/5 | 0/0 | yes | — | — |
| script-checkin-retention | checkin | managed | 6/6 | 1/1 | — | — | — |
| script-freewrite-retention | freewrite | managed-norecap | 7/7 | 0/2 | — | — | — |
| script-freewrite-longtrim | freewrite | managed-norecap | 10/10 | 0/2 | — | 15 | 0/2 |
| script-thoughtrecord-steps | thoughtrecord | managed-norecap | 5/5 | 0/0 | yes | — | — |
| script-checkin-retention | checkin | managed-norecap | 6/6 | 1/1 | — | — | — |

## script-freewrite-retention (freewrite, raw)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 97 | no | 0 | no | — |
| 2 | 223 | no | 0 | no | — |
| 3 | 317 | no | 0 | no | — |
| 4 | 411 | no | 0 | no | — |
| 5 | 521 | no | 0 | no | — |
| 6 | 625 | no | 0 | no | — |
| 7 | 719 | no | 0 | no | yes |
| 8 | 801 | no | 0 | no | — |
| 9 | 877 | no | 0 | no | — |
| 10 | 953 | no | 0 | no | yes |
| 11 | 1012 | no | 0 | no | — |

### Failing turns

#### Turn 7 [probe]

**User**: I don't know anymore.

**Failures**: Retention probe failed: reply did not ground in "Maya / the dinner" (expected one of [maya, sister, dinner, dad, birthday])

**Response**: Not knowing where to begin after all that uncertainty settles heavily upon you. Feeling unsure about the next step is completely understandable given the history. What small piece of peace or comfort would feel necessary for you before attempting to reach out again?

## script-freewrite-longtrim (freewrite, raw)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 125 | no | 0 | no | — |
| 2 | 253 | no | 0 | no | — |
| 3 | 407 | no | 0 | no | — |
| 4 | 550 | no | 0 | no | — |
| 5 | 692 | no | 0 | no | — |
| 6 | 855 | no | 0 | no | — |
| 7 | 994 | no | 0 | no | — |
| 8 | 1141 | no | 0 | no | — |
| 9 | 1295 | no | 0 | no | — |
| 10 | 1436 | no | 0 | no | — |
| 11 | 1578 | no | 0 | no | — |
| 12 | 1733 | no | 0 | no | — |
| 13 | 1855 | no | 0 | no | — |
| 14 | 1980 | no | 0 | no | — |
| 15 | 2117 | no | 0 | no | — |
| 16 | 2249 | no | 0 | no | yes |
| 17 | 2343 | no | 0 | no | — |
| 18 | 2454 | no | 0 | no | yes |

### Failing turns

#### Turn 16 [probe]

**User**: I really don't know what to do here.

**Failures**: Retention probe failed: reply did not ground in "Maya / the birthday dinner" (expected one of [maya, sister, dinner, birthday, toast])

**Response**: Feeling unsure about what to do after seeing that picture captures a state of suspended indecision. When you feel completely stuck, sometimes simply allowing the feeling of confusion to settle can be important. What aspect of this entire situation feels heaviest weighing on you right now?

#### Turn 18 [probe]

**User**: Yeah. I think you're right.

**Failures**: Retention probe failed: reply did not ground in "Maya / the birthday dinner" (expected one of [maya, sister, dinner, birthday, photo, apolog])

**Response**: Acknowledging that instinct provides a path forward. Allowing yourself to explore these nuanced feelings quietly can often lead somewhere meaningful. What small step feels manageable for you to take next?

## script-thoughtrecord-steps (thoughtrecord, raw)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 50 | no | 0 | no | — |
| 2 | 116 | no | 0 | no | — |
| 3 | 206 | no | 0 | no | — |
| 4 | 297 | no | 0 | no | — |
| 5 | 385 | no | 0 | no | — |

_All turns passed._

## script-checkin-retention (checkin, raw)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 87 | no | 0 | no | — |
| 2 | 186 | no | 0 | no | — |
| 3 | 277 | no | 0 | no | — |
| 4 | 358 | no | 0 | no | — |
| 5 | 451 | no | 0 | no | — |
| 6 | 527 | no | 0 | no | — |
| 7 | 610 | no | 0 | no | — |
| 8 | 682 | no | 0 | no | yes |
| 9 | 772 | no | 0 | no | — |

_All turns passed._

## script-freewrite-retention (freewrite, managed)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 112 | no | 0 | yes | — |
| 2 | 228 | no | 0 | yes | — |
| 3 | 346 | no | 0 | yes | — |
| 4 | 442 | no | 0 | yes | — |
| 5 | 566 | no | 0 | yes | — |
| 6 | 690 | no | 0 | yes | — |
| 7 | 800 | no | 0 | yes | yes |
| 8 | 898 | no | 0 | yes | — |
| 9 | 1000 | no | 0 | yes | — |
| 10 | 1104 | no | 0 | yes | yes |
| 11 | 1199 | no | 0 | yes | — |

_All turns passed._

## script-freewrite-longtrim (freewrite, managed)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 121 | no | 0 | yes | — |
| 2 | 262 | no | 0 | yes | — |
| 3 | 409 | no | 0 | yes | — |
| 4 | 570 | no | 0 | yes | — |
| 5 | 717 | no | 0 | yes | — |
| 6 | 896 | no | 0 | yes | — |
| 7 | 1047 | no | 0 | yes | — |
| 8 | 1240 | no | 0 | yes | — |
| 9 | 1411 | no | 0 | yes | — |
| 10 | 1582 | no | 0 | yes | — |
| 11 | 1755 | no | 0 | yes | — |
| 12 | 1919 | no | 0 | yes | — |
| 13 | 2064 | no | 0 | yes | — |
| 14 | 2125 | yes | 2 | yes | — |
| 15 | 2152 | yes | 4 | yes | — |
| 16 | 2148 | yes | 6 | yes | yes |
| 17 | 2205 | yes | 7 | yes | — |
| 18 | 2213 | yes | 9 | yes | yes |

_All turns passed._

## script-thoughtrecord-steps (thoughtrecord, managed)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 45 | no | 0 | no | — |
| 2 | 106 | no | 0 | no | — |
| 3 | 183 | no | 0 | no | — |
| 4 | 251 | no | 0 | yes | — |
| 5 | 335 | no | 0 | yes | — |

_All turns passed._

## script-checkin-retention (checkin, managed)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 91 | no | 0 | yes | — |
| 2 | 199 | no | 0 | yes | — |
| 3 | 304 | no | 0 | yes | — |
| 4 | 407 | no | 0 | yes | — |
| 5 | 528 | no | 0 | yes | — |
| 6 | 628 | no | 0 | yes | — |
| 7 | 745 | no | 0 | yes | — |
| 8 | 852 | no | 0 | yes | yes |
| 9 | 955 | no | 0 | yes | — |

_All turns passed._

## script-freewrite-retention (freewrite, managed-norecap)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 105 | no | 0 | no | — |
| 2 | 210 | no | 0 | no | — |
| 3 | 309 | no | 0 | no | — |
| 4 | 394 | no | 0 | no | — |
| 5 | 492 | no | 0 | no | — |
| 6 | 594 | no | 0 | no | — |
| 7 | 673 | no | 0 | no | yes |
| 8 | 727 | no | 0 | no | — |
| 9 | 804 | no | 0 | no | — |
| 10 | 877 | no | 0 | no | yes |
| 11 | 945 | no | 0 | no | — |

### Failing turns

#### Turn 7 [probe]

**User**: I don't know anymore.

**Failures**: Retention probe failed: reply did not ground in "Maya / the dinner" (expected one of [maya, sister, dinner, dad, birthday])

**Response**: Not knowing how to proceed leaves a quiet space filled with uncertainty. When you feel unable to find the right words, what small step feels manageable to take next?

#### Turn 10 [probe]

**User**: Yeah, exactly.

**Failures**: Retention probe failed: reply did not ground in "Maya / the dinner" (expected one of [maya, sister, dinner, text, apolog])

**Response**: When revisiting what you wished to express causes hesitation, it reveals how much significance that communication holds. As you sit with that unsaid thought, what is the main hope attached to finally sending that message?

## script-freewrite-longtrim (freewrite, managed-norecap)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 122 | no | 0 | no | — |
| 2 | 284 | no | 0 | no | — |
| 3 | 443 | no | 0 | no | — |
| 4 | 598 | no | 0 | no | — |
| 5 | 747 | no | 0 | no | — |
| 6 | 909 | no | 0 | no | — |
| 7 | 1058 | no | 0 | no | — |
| 8 | 1220 | no | 0 | no | — |
| 9 | 1357 | no | 0 | no | — |
| 10 | 1512 | no | 0 | no | — |
| 11 | 1676 | no | 0 | no | — |
| 12 | 1823 | no | 0 | no | — |
| 13 | 1966 | no | 0 | no | — |
| 14 | 2110 | no | 0 | no | — |
| 15 | 2207 | yes | 1 | no | — |
| 16 | 2273 | yes | 2 | no | yes |
| 17 | 2196 | yes | 4 | no | — |
| 18 | 2238 | yes | 5 | no | yes |

### Failing turns

#### Turn 16 [probe]

**User**: I really don't know what to do here.

**Failures**: Retention probe failed: reply did not ground in "Maya / the birthday dinner" (expected one of [maya, sister, dinner, birthday, toast])

**Response**: Not knowing what to do is a heavy place to be when navigating complicated feelings. When you feel stuck, sometimes simply allowing the confusion to settle can offer a little space. What is one tiny, non-demanding action you could take for yourself right now?

#### Turn 18 [probe]

**User**: Yeah. I think you're right.

**Failures**: Retention probe failed: reply did not ground in "Maya / the birthday dinner" (expected one of [maya, sister, dinner, birthday, photo, apolog])

**Response**: Acknowledging that realization provides a soft opening for exploring future steps together. Now that you see that possibility, what small step feels manageable to explore next?

## script-thoughtrecord-steps (thoughtrecord, managed-norecap)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 48 | no | 0 | no | — |
| 2 | 108 | no | 0 | no | — |
| 3 | 176 | no | 0 | no | — |
| 4 | 232 | no | 0 | no | — |
| 5 | 299 | no | 0 | no | — |

_All turns passed._

## script-checkin-retention (checkin, managed-norecap)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 82 | no | 0 | no | — |
| 2 | 177 | no | 0 | no | — |
| 3 | 265 | no | 0 | no | — |
| 4 | 337 | no | 0 | no | — |
| 5 | 428 | no | 0 | no | — |
| 6 | 504 | no | 0 | no | — |
| 7 | 589 | no | 0 | no | — |
| 8 | 659 | no | 0 | no | yes |
| 9 | 737 | no | 0 | no | — |

_All turns passed._
