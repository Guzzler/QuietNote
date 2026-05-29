# QuietNote Decision Log

One-line entries. Newest at top. The planner MUST consult this and append before proposing anything that resembles a prior attempt.

Format: `YYYY-MM-DD | tried: <thing> | expected: <outcome> | actual: <outcome or "pending">`

---

- 2026-05-28 | tried: bootstrap the critic loop (commit governance files, write critic protocol, produce first critic report + north-star rows, document SKILL changes the user must make) | expected: EVAL phase starts accumulating daily critic reports + north-star signal; planner stops being forced into the diagnosis branch | actual: pending
- 2026-05-25 | tried: install closed feedback loop (critic agent + phase gates + rot pass + decisions log) | expected: stop the feat-PR ratchet, get a north-star signal, default toward deletion | actual: 2026-05-28 — scaffolding-only; the docs (PHASE.md, decisions.md, north-star.csv, critic-reports/) were created but left UNTRACKED and no critic/rot-pass scheduled task was ever registered, so zero critic reports were produced. Loop being actually stood up via 2026-05-28 plan.
- 2026-05-25 | tried: bump MODEL_CONTEXT_LIMIT 2048→4096 + sticky guided-mode banner (PR #40) | expected: multi-turn coherent past 4 messages, guided modes usable past first keystroke | actual: pending — needs critic run to confirm
