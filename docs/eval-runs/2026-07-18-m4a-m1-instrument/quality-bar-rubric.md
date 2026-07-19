# Quality-Bar Rubric Report

Model: quietnote-m3 Gemma 4 E2B fine-tune, GGUF Q4_K_M via llama-server (M4a proxy). Generated 2026-07-19T02:11:38.779Z.
Pass = every scenario ≥ 85% of max AND zero turns scoring 0 on continuity or support.

## Summary

| Scenario | Mode | Score | % | Zero-critical turns | First trim | Pass |
|---|---|---|---|---|---|---|
| qb-freewrite-arc | freewrite | 83/86 | 97% | — | none | ✅ |
| qb-checkin-days | checkin | 85/86 | 99% | — | none | ✅ |
| qb-thoughtrecord-arc | thoughtrecord | 82/84 | 98% | — | none | ✅ |

## qb-freewrite-arc

| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |
|---|---|---|---|---|---|---|
| 0 | 2 | 2 | — | 2 | 2 | 8/8 |
| 1 | 2 | 2 | — | 2 | 2 | 8/8 |
| 2 | 2 | 2 | — | 2 | 2 | 8/8 |
| 3 | 2 | 2 | — | 2 | 2 | 8/8 |
| 4 | 2 | 2 | — | 2 | 2 | 8/8 |
| 5 | 2 | 2 | 1 | 2 | 2 | 9/10 |
| 6 | 2 | 2 | 0 | 2 | 2 | 8/10 |
| 7 | 2 | 2 | — | 2 | 2 | 8/8 |
| 8 | 2 | 2 | — | 2 | 2 | 8/8 |
| 9 | 2 | 2 | 2 | 2 | 2 | 10/10 |

## qb-checkin-days

| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |
|---|---|---|---|---|---|---|
| 0 | 2 | 2 | — | 2 | 2 | 8/8 |
| 1 | 2 | 2 | — | 2 | 2 | 8/8 |
| 2 | 2 | 2 | — | 2 | 2 | 8/8 |
| 3 | 2 | 2 | — | 2 | 2 | 8/8 |
| 4 | 2 | 2 | 1 | 2 | 2 | 9/10 |
| 5 | 2 | 2 | — | 2 | 2 | 8/8 |
| 6 | 2 | 2 | 2 | 2 | 2 | 10/10 |
| 7 | 2 | 2 | — | 2 | 2 | 8/8 |
| 8 | 2 | 2 | — | 2 | 2 | 8/8 |
| 9 | 2 | 2 | 2 | 2 | 2 | 10/10 |

## qb-thoughtrecord-arc

| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |
|---|---|---|---|---|---|---|
| 0 | 2 | 2 | — | 2 | 2 | 8/8 |
| 1 | 2 | 2 | — | 2 | 2 | 8/8 |
| 2 | 2 | 2 | — | 2 | 2 | 8/8 |
| 3 | 2 | 2 | — | 2 | 2 | 8/8 |
| 4 | 2 | 2 | — | 2 | 2 | 8/8 |
| 5 | 2 | 2 | — | 2 | 2 | 8/8 |
| 6 | 2 | 2 | 0 | 2 | 2 | 8/10 |
| 7 | 2 | 2 | — | 2 | 2 | 8/8 |
| 8 | 2 | 2 | — | 2 | 2 | 8/8 |
| 9 | 2 | 2 | 2 | 2 | 2 | 10/10 |
