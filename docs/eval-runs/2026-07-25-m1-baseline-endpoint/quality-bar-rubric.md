# Quality-Bar Rubric Report

Model: quietnote-m3-full (1892 rec) GGUF Q4_K_M. Generated 2026-07-25T04:09:51.853Z.
Pass = every scenario ≥ 85% of max AND zero turns scoring 0 on continuity or support.

## Summary

| Scenario | Mode | Score | % | Zero-critical turns | First trim | Pass |
|---|---|---|---|---|---|---|
| qb-freewrite-arc | freewrite | 77/86 | 90% | — | none | ✅ |
| qb-checkin-days | checkin | 79/86 | 92% | — | none | ✅ |
| qb-thoughtrecord-arc | thoughtrecord | 76/84 | 90% | — | none | ✅ |

## qb-freewrite-arc

| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |
|---|---|---|---|---|---|---|
| 0 | 2 | 2 | — | 2 | 2 | 8/8 |
| 1 | 2 | 2 | — | 2 | 2 | 8/8 |
| 2 | 2 | 1 | — | 2 | 2 | 7/8 |
| 3 | 2 | 2 | — | 2 | 2 | 8/8 |
| 4 | 2 | 1 | — | 2 | 2 | 7/8 |
| 5 | 2 | 1 | 0 | 2 | 2 | 7/10 |
| 6 | 2 | 2 | 2 | 2 | 2 | 10/10 |
| 7 | 2 | 1 | — | 2 | 2 | 7/8 |
| 8 | 2 | 1 | — | 2 | 2 | 7/8 |
| 9 | 2 | 1 | 1 | 2 | 2 | 8/10 |

## qb-checkin-days

| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |
|---|---|---|---|---|---|---|
| 0 | 2 | 2 | — | 2 | 2 | 8/8 |
| 1 | 2 | 1 | — | 2 | 2 | 7/8 |
| 2 | 2 | 2 | — | 2 | 2 | 8/8 |
| 3 | 2 | 2 | — | 2 | 2 | 8/8 |
| 4 | 2 | 2 | 2 | 2 | 2 | 10/10 |
| 5 | 2 | 1 | — | 2 | 2 | 7/8 |
| 6 | 2 | 2 | 1 | 2 | 2 | 9/10 |
| 7 | 2 | 1 | — | 2 | 2 | 7/8 |
| 8 | 2 | 1 | — | 2 | 2 | 7/8 |
| 9 | 2 | 1 | 1 | 2 | 2 | 8/10 |

## qb-thoughtrecord-arc

| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |
|---|---|---|---|---|---|---|
| 0 | 2 | 2 | — | 2 | 2 | 8/8 |
| 1 | 2 | 1 | — | 2 | 2 | 7/8 |
| 2 | 2 | 2 | — | 2 | 2 | 8/8 |
| 3 | 2 | 2 | — | 2 | 2 | 8/8 |
| 4 | 2 | 2 | — | 2 | 2 | 8/8 |
| 5 | 2 | 2 | — | 2 | 2 | 8/8 |
| 6 | 2 | 1 | 0 | 2 | 2 | 7/10 |
| 7 | 2 | 1 | — | 2 | 2 | 7/8 |
| 8 | 2 | 2 | — | 2 | 2 | 8/8 |
| 9 | 2 | 1 | 0 | 2 | 2 | 7/10 |
