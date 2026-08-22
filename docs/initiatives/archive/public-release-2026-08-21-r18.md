# Archive: public-release R18 (item body, frozen 2026-08-21)

Snapshot of the R18 queue item as it was ruled and queued by the planner on 2026-08-21,
moved here verbatim when it shipped as PR #154. Cite as the evidence a decision was made
on, never as a current fact — the live doc is [`../public-release.md`](../public-release.md).

- [ ] 2026-08-21 · **R18 — six more bare words stop being read as feelings.** Edit the keyword
  lists in `src/utils/emotionExtractor.ts` (`EMOTION_KEYWORDS`) and add cases to
  `src/utils/__tests__/emotionExtractor.test.ts`. **List edits only — do not touch the matcher,
  the `matches × 0.3 + 0.2` confidence formula, the 0.4 threshold, or the declaration order.**
  Six bare words are replaced by the framed forms measured below; each replacement set was
  measured this run at **zero false positives across its adversarial corpus while still catching
  100 % of its true-positive corpus**.

  | list | delete | insert (exactly these) |
  |---|---|---|
  | `content` | `"content"` | `feel content`, `feeling content`, `felt content`, `so content`, `quite content` |
  | `sad` | `"loss"` | `loss of my`, `such a loss`, `the loss of her`, `the loss of him`, `sense of loss`, `feel the loss` |
  | `lonely` | `"alone"` | `feel alone`, `feeling alone`, `felt alone`, `so alone`, `all alone`, `alone in this` |
  | `lonely` | `"no one"`, `"nobody"` | `no one to talk to`, `no one understands`, `no one cares`, `nobody to talk to`, `nobody understands`, `nobody cares`, `no one else` |
  | `angry` | `"mad"` | `mad at`, `so mad`, `really mad`, `mad about it`, `get mad`, `got mad` |

  Also add `feel low` and `felt low` to `sad` — `feeling low` is already there, and the two
  missing inflections are the **pre-existing** recall gap R17 recorded rather than created
  (measured today: *"I feel low today"* and *"I felt low all afternoon"* both return `null`).

  **Verification — two tables, both with the *today* column already measured, so execute asserts
  rather than predicts.** Must return `null` from `getTopEmotion` after the change (all are
  `<emotion> 0.50` today): *"I watched some content on my phone before bed"*, *"the content of
  the email upset me"* (today: **`content`** — an upset entry reported as contentment), *"content
  strategy is my whole job"*, *"the loss of the contract set the whole team back"*, *"we had a
  net loss this quarter"*, *"hearing loss runs in my family"*, *"it was a tough loss for the team
  last night"*, *"I worked alone on the deck today and it was great"*, *"that alone was worth the
  trip"*, *"I like being alone with a book"*, *"no one had to remind me, I just did it"*,
  *"nobody was hurt in the crash"*, *"I made a mad dash for the train"*, *"she is mad about
  gardening"*, *"it was mad busy at work"*. Must **still** fire, each pinned to the specific form
  that catches it: *"I felt content after dinner"* → `content`, *"the loss of my grandmother
  still hits me"* → `sad`, *"I keep feeling the loss of her in the small moments"* → `sad`, *"I
  feel alone even in a full room"* → `lonely`, *"sitting here all alone again"* → `lonely`,
  *"there is no one to talk to about any of this"* → `lonely`, *"I am so mad at myself for
  forgetting"* → `angry`, *"I feel low today"* → `sad` (**new**; `null` today).

  **Exactly one existing assertion must be amended, and no other.**
  `emotionExtractor.test.ts:81` asserts `matchedKeywords` `toContain("alone")` for *"I feel so
  alone and isolated, like nobody cares"*. Under the new list that sentence still resolves to
  `lonely` — it matches `isolated`, `so alone` and `nobody cares` — so change the expectation to
  `"so alone"`. **Nothing else in the file mentions any of the six words** (re-checked against
  `emotionExtractor.test.ts` and confirmed it is the only test file importing this module).
  → `npm run test` and `npm run build` green. **No gate read** — generation is untouched.
