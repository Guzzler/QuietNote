# Quality-Bar Rubric Report

Model: Gemma 4 E2B ONNX q4f16 (Node onnxruntime-node CPU). Generated 2026-07-15T02:10:22.266Z.
Pass = every scenario ≥ 85% of max AND zero turns scoring 0 on continuity or support.

## Summary

| Scenario | Mode | Score | % | Zero-critical turns | First trim | Pass |
|---|---|---|---|---|---|---|
| qb-freewrite-arc | freewrite | 82/86 | 95% | — | none | ✅ |
| qb-checkin-days | checkin | 79/86 | 92% | — | none | ✅ |
| qb-thoughtrecord-arc | thoughtrecord | 80/84 | 95% | — | none | ✅ |

## qb-freewrite-arc

| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |
|---|---|---|---|---|---|---|
| 0 | 2 | 2 | — | 2 | 2 | 8/8 |
| 1 | 2 | 2 | — | 2 | 2 | 8/8 |
| 2 | 2 | 2 | — | 2 | 2 | 8/8 |
| 3 | 2 | 2 | — | 2 | 2 | 8/8 |
| 4 | 2 | 2 | — | 1 | 2 | 7/8 |
| 5 | 2 | 2 | 2 | 2 | 2 | 10/10 |
| 6 | 2 | 2 | 0 | 2 | 2 | 8/10 |
| 7 | 2 | 2 | — | 2 | 2 | 8/8 |
| 8 | 2 | 2 | — | 2 | 2 | 8/8 |
| 9 | 2 | 2 | 1 | 2 | 2 | 9/10 |

## qb-checkin-days

| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |
|---|---|---|---|---|---|---|
| 0 | 2 | 2 | — | 2 | 1 | 7/8 |
| 1 | 2 | 2 | — | 2 | 2 | 8/8 |
| 2 | 2 | 2 | — | 2 | 2 | 8/8 |
| 3 | 2 | 2 | — | 2 | 2 | 8/8 |
| 4 | 2 | 2 | 0 | 2 | 2 | 8/10 |
| 5 | 2 | 2 | — | 2 | 2 | 8/8 |
| 6 | 2 | 2 | 0 | 2 | 2 | 8/10 |
| 7 | 2 | 2 | — | 2 | 2 | 8/8 |
| 8 | 2 | 2 | — | 2 | 2 | 8/8 |
| 9 | 2 | 2 | 0 | 2 | 2 | 8/10 |

## qb-thoughtrecord-arc

| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |
|---|---|---|---|---|---|---|
| 0 | 2 | 2 | — | 2 | 2 | 8/8 |
| 1 | 2 | 2 | — | 2 | 2 | 8/8 |
| 2 | 2 | 2 | — | 2 | 2 | 8/8 |
| 3 | 2 | 2 | — | 2 | 2 | 8/8 |
| 4 | 2 | 2 | — | 2 | 2 | 8/8 |
| 5 | 2 | 2 | — | 2 | 2 | 8/8 |
| 6 | 2 | 2 | 1 | 2 | 2 | 9/10 |
| 7 | 2 | 2 | — | 1 | 2 | 7/8 |
| 8 | 2 | 2 | — | 2 | 2 | 8/8 |
| 9 | 2 | 2 | 0 | 2 | 2 | 8/10 |
