# Archive — human-feedback, snapshot 2026-08-14

Verbatim snapshot of material removed from
[`../human-feedback.md`](../human-feedback.md) by the 2026-08-14 planning run, per the
initiatives README's *Doc size, and the archive* rule. **Nothing here was rewritten.**

Removed this run: the closed queue-item bodies for **F3** (PR #144) and **F9** (PR #145),
and the **F9 result** block. Both items are DONE, both have full Ledger rows in the live
doc, and F9's screenshots are on disk at `docs/screenshots/2026-08-12/`. No open item, no
*Blocked on Sharang* entry and no still-live defect was pruned.

Earlier snapshots: [`human-feedback-2026-08-11.md`](human-feedback-2026-08-11.md),
[`human-feedback-2026-08-12.md`](human-feedback-2026-08-12.md).

---

- [x] 2026-08-12 · **F3 — Write the field-note intake convention.** DONE 2026-08-12
  (PR #144 — see Ledger). Field note:
  [`2026-08-11-first-tester.md`](../field-notes/2026-08-11-first-tester.md) — F3
  has been ACTIVE since that note landed and the convention still exists only as
  an example, in one file, undocumented. The next report (T2) will otherwise be
  filed by whatever the planner remembers that day. **New file
  `docs/field-notes/README.md`, ~50–70 lines**, written from what the 2026-08-11
  note actually did rather than from theory:
  1. **Intake shape, stated first, because the loop got this wrong for weeks.**
     Feedback arrives as a **private message to Sharang, relayed interactively** —
     not as a GitHub issue. `gh issue list` returning empty is **not** evidence
     that no feedback exists. `docs/field-notes/` is the primary intake; issues
     are a secondary channel that has never yet fired.
  2. **De-identification (hard rule).** Testers are `T1`, `T2`, …; personal
     disclosures are **paraphrased, never quoted**; raw messages stay in
     Sharang's inbox and never enter a tracked file, PR body or ntfy body. Cite
     the two precedents: `2026-06-09-real-user-data-plan.md:4` and the
     2026-08-11 note's own "Identity and quoting rules" section.
  3. **Triage means checking each claim against `src/` before queueing it** —
     with the measured payoff from the 2026-08-11 note, which is the argument for
     the rule: one reported "bug" was **four** coupled defects (one of them
     writing fabricated records to IndexedDB), one suggestion was already shipped
     but undiscoverable, and one tone complaint was a **shipped-model** finding,
     not a copy finding.
  4. **The four triage buckets that note used**, kept as the required section
     shape: **A** confirmed defects · **B** discovery findings · **C** blocked on
     a model/infra answer · **D** declined, with reasons (D is not optional —
     §D1's decline is written using the tester's own reasoning).
  5. **File naming** `YYYY-MM-DD-<slug>.md`, and the closing **"Sequencing this
     note implies"** section, which is what the planner turns into queue items.
  6. One line pointing at the README's **field-note carve-out** and its five
     conditions — a note is what makes the carve-out available, so the two
     documents have to reference each other.
  Then add one line to [`README.md`](README.md)'s *How the loop works* pointing at
  it. **Do not** invent process the loop has not actually performed — no cadence
  promises, no triage SLA, no templates for feedback nobody has sent.
  → **Verify:** `docs/field-notes/README.md` exists with all six elements; every
  claim in it is traceable to the 2026-08-11 note or the initiatives README (no
  new policy); `npm run build` + `npm run test` green (docs-only — but the
  cross-links must not break a link test). **Not gate-triggering** — no `src/`.

- [x] 2026-08-12 · **F9 — Walk T1's exact path on the live URL and capture the
  before/after.** DONE 2026-08-12 (PR #145 — see the **F9 result** block below and
  the Ledger). Field note
  [`2026-08-11-first-tester.md`](../field-notes/2026-08-11-first-tester.md) §A1,
  §A2, §A3, §B1. The planner confirmed at the **bundle** level that all three
  fixes are deployed (Grounding, this doc); this item confirms them at the
  **behaviour** level on the origin a tester actually opens, which is the F1b
  precedent (measurement on `https://guzzler.github.io/QuietNote/`, **not**
  `vite preview`). Chromium via Playwright, **375px**, clean profile, clock
  pinned to **00:35** to reproduce T1's hour:
  1. First paint: is the empty state's Thought Record suggestion shown, and are
     **all four** mode labels visible without horizontal scroll?
     (`document.scrollWidth === window.innerWidth`.)
  2. Is **New** labelled and visible in the header?
  3. Write one Gratitude turn, switch to Check-in: fresh session, the quiet
     inline notice, guide reads **Step 1 of 3** (not "Complete"), old entry in
     Sessions.
  4. Start a Check-in at the pinned 00:35 clock and confirm the **Late-night**
     variant is what renders — the surface T1 hit.
  **Model download:** the run needs the model once (~2 GB, MediaPipe default) —
  it is the same cost F1b paid; reuse the browser profile across steps rather
  than clearing it between them, and clear only what step 1 requires.
  → **Verify:** an **F9 result** block in this doc — one line per step, pass/fail,
  plus anything that behaves differently on the live origin than it did on
  `vite preview` — and screenshots into `docs/screenshots/<date>/` covering the
  mobile header, the four-mode strip, and the late-night check-in. Console errors
  logged, count stated. **Measurement only — no `src/` diff.** If something is
  broken on the live origin, file it as a proposed item and **do not fix it in the
  same run**. **Not gate-triggering.**

### F9 result — T1's path on the live origin (execute, 2026-08-12)

Chromium via Playwright on **https://guzzler.github.io/QuietNote/** (the deployed
origin, not `vite preview`), viewport **375 × 812**, app data cleared to a true
first-visit state. **All four steps PASS. 0 console errors.**

| # | check | result |
|---|---|---|
| 1a | zero-data empty state offers Thought Record | **PASS** — *"Something on your mind? Try a thought record."* rendered with **no** mood history, in the 21:00–04:59 band, i.e. exactly T1's hour. This is the branch F6 fixed; before it, this band returned `null` for everyone |
| 1b | all four mode labels visible, no horizontal scroll | **PASS** — `document.scrollWidth === window.innerWidth === 375`; the strip **wraps to 2 rows** (Free Write / Gratitude / Check-in, then Thought Record) with all four rects inside the viewport |
| 2 | **New** labelled and visible in the header | **PASS** — renders as a labelled `New` control at 375px once a session exists |
| 3 | Gratitude → Check-in starts a fresh session | **PASS** — transcript cleared, quiet inline notice *"Started a new Check-in — your previous entry is saved in Sessions."*, guide reads **Step 1 of 3** (not "Complete"), and the Gratitude entry is intact in Sessions |
| 4 | 00:35 renders the Late-night variant | **PASS** — guide header **"Late-night Check-in"**, step 1 *"How are you feeling right now?"*, advancing to step 2 *"What's still on your mind at this hour?"* |

**Nothing behaved differently on the live origin than it did on `vite preview`** —
the three fixes are confirmed at the behaviour level, not merely present in the
bundle. Both console warnings are pre-existing and benign (MediaPipe WebGPU:
`powerPreference` ignored on Windows, experimental WGSL subgroups); neither is an
error and neither is new.

Screenshots in [`docs/screenshots/2026-08-12/`](../screenshots/2026-08-12/):
`f9-01` empty state + four-mode strip, `f9-02` labelled **New** in the mobile
header, `f9-03` Late-night Check-in step 1 with the switch notice, `f9-04` the
00:35 exchange.

**Method notes, so the numbers are reproducible and their limits are visible:**
- **The clock.** The walk ran at a real local **22:48–22:52**, which is already
  inside the **same night band (21:00–04:59)** as T1's 00:35 — so steps 1–3 hit
  T1's band on the real clock. For step 4 the page clock was then pinned to a
  literal **00:35** by shifting `Date` by a constant offset (monotonic, so
  timestamps stay coherent) and the exchange was sent under it.
- **The model was already cached** (`mediapipe-cache`, ~2.0 GB) in this profile, so
  the run paid no download — the item's "reuse the profile" instruction, followed.
- **What was cleared:** only `quietnote-db` (which held **1** session and no moods
  or thought records, created by an earlier loop verification run — not a human's
  data) plus `localStorage`; the model cache was deliberately kept. The two
  sessions this walk wrote were left in place.
- **Observation, not a defect, recorded because it is T1's §C1 signal:** the
  live replies still reach for *"sounds like…"* phrasing **mid-sentence**
  ("…sounds really draining"). The FIRST LINE RULE bans it as an **opener** and
  was not violated in either exchange. This is the shipped-model tone question,
  which is F8/C1 and stays **blocked** — filed here as evidence, not queued.

