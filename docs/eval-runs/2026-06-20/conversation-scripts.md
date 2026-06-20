# Conversation-Script Eval Report

- **Scripts run**: 3
- **Strategies**: raw, managed, managed-norecap

## Summary

| Script | Mode | Strategy | Turns Passed | Probes Passed | Step-Coherent | First-Trim Turn | Probes After-Trim |
|--------|------|----------|--------------|---------------|---------------|-----------------|-------------------|
| script-freewrite-longtrim | freewrite | raw | 10/10 | 0/2 | — | — | — |
| script-freewrite-longtrim | freewrite | managed | 10/10 | 2/2 | — | 14 | 2/2 |
| script-freewrite-longtrim | freewrite | managed-norecap | 10/10 | 0/2 | — | 18 | 0/1 |

## script-freewrite-longtrim (freewrite, raw)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 128 | no | 0 | no | — |
| 2 | 263 | no | 0 | no | — |
| 3 | 418 | no | 0 | no | — |
| 4 | 578 | no | 0 | no | — |
| 5 | 729 | no | 0 | no | — |
| 6 | 887 | no | 0 | no | — |
| 7 | 1013 | no | 0 | no | — |
| 8 | 1155 | no | 0 | no | — |
| 9 | 1318 | no | 0 | no | — |
| 10 | 1456 | no | 0 | no | — |
| 11 | 1624 | no | 0 | no | — |
| 12 | 1774 | no | 0 | no | — |
| 13 | 1916 | no | 0 | no | — |
| 14 | 2060 | no | 0 | no | — |
| 15 | 2196 | no | 0 | no | — |
| 16 | 2329 | no | 0 | no | yes |
| 17 | 2412 | no | 0 | no | — |
| 18 | 2522 | no | 0 | no | yes |

### Failing turns

#### Turn 16 [probe]

**User**: I really don't know what to do here.

**Failures**: Retention probe failed: reply did not ground in "Maya / the birthday dinner" (expected one of [maya, sister, dinner, birthday, toast])

**Response**: Not knowing what to do sits heavily when facing such mixed signals. When feeling completely unsure, sometimes simply observing what comes next offers some grounding. What is the smallest step—no matter how small—that feels possible to take right now?

#### Turn 18 [probe]

**User**: Yeah. I think you're right.

**Failures**: Retention probe failed: reply did not ground in "Maya / the birthday dinner" (expected one of [maya, sister, dinner, birthday, photo, apolog])

**Response**: Allowing that belief settles a little bit of the anxious energy you’ve been holding. As you sit with that understanding, what emerging feeling accompanies this newfound openness?

## script-freewrite-longtrim (freewrite, managed)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 116 | no | 0 | yes | — |
| 2 | 258 | no | 0 | yes | — |
| 3 | 414 | no | 0 | yes | — |
| 4 | 590 | no | 0 | yes | — |
| 5 | 760 | no | 0 | yes | — |
| 6 | 934 | no | 0 | yes | — |
| 7 | 1101 | no | 0 | yes | — |
| 8 | 1269 | no | 0 | yes | — |
| 9 | 1439 | no | 0 | yes | — |
| 10 | 1606 | no | 0 | yes | — |
| 11 | 1772 | no | 0 | yes | — |
| 12 | 1940 | no | 0 | yes | — |
| 13 | 2082 | no | 0 | yes | — |
| 14 | 2123 | yes | 2 | yes | — |
| 15 | 2140 | yes | 4 | yes | — |
| 16 | 2144 | yes | 6 | yes | yes |
| 17 | 2193 | yes | 7 | yes | — |
| 18 | 2210 | yes | 8 | yes | yes |

_All turns passed._

## script-freewrite-longtrim (freewrite, managed-norecap)

### Context telemetry

| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |
|------|---------------------|---------|---------|-------|-----------------|
| 0 | 0 | no | 0 | no | — |
| 1 | 133 | no | 0 | no | — |
| 2 | 275 | no | 0 | no | — |
| 3 | 415 | no | 0 | no | — |
| 4 | 560 | no | 0 | no | — |
| 5 | 695 | no | 0 | no | — |
| 6 | 837 | no | 0 | no | — |
| 7 | 969 | no | 0 | no | — |
| 8 | 1094 | no | 0 | no | — |
| 9 | 1224 | no | 0 | no | — |
| 10 | 1377 | no | 0 | no | — |
| 11 | 1531 | no | 0 | no | — |
| 12 | 1653 | no | 0 | no | — |
| 13 | 1788 | no | 0 | no | — |
| 14 | 1924 | no | 0 | no | — |
| 15 | 2056 | no | 0 | no | — |
| 16 | 2199 | no | 0 | no | yes |
| 17 | 2267 | no | 0 | no | — |
| 18 | 2242 | yes | 2 | no | yes |

### Failing turns

#### Turn 16 [probe]

**User**: I really don't know what to do here.

**Failures**: Retention probe failed: reply did not ground in "Maya / the birthday dinner" (expected one of [maya, sister, dinner, birthday, toast])

**Response**: Not knowing what to do often accompanies intense emotional uncertainty, like you described. When feeling completely unsure, where do you notice your energy tends to go when facing that blank space?

#### Turn 18 [probe]

**User**: Yeah. I think you're right.

**Failures**: Retention probe failed: reply did not ground in "Maya / the birthday dinner" (expected one of [maya, sister, dinner, birthday, photo, apolog])

**Response**: Acknowledging that suggestion opens a path forward after enduring prolonged silence. Knowing that reaching out might be possible begins to ease some of the heavy weight. How does simply allowing yourself to consider reaching out feel physically?
