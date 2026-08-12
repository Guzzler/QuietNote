# Field note — first real tester (T1), 2026-08-11

**Date received:** 2026-08-11 (~00:35 local, on the tester's phone)
**Source:** private message to Sharang, relayed into the loop by him interactively.
**Status:** this is the **first human use of QuietNote by someone other than Sharang.**
`human-feedback`'s F2 ("hand it to Sharang") has therefore completed end-to-end,
and F3/F4 activate.

## Identity and quoting rules for this note (read before editing it)

**The repo is public.** This note is de-identified on purpose and must stay that
way: the tester is referred to as **T1**, and their personal disclosures are
**paraphrased, not quoted** — same convention `2026-06-09-real-user-data-plan.md`
set for the old-app corpus. The verbatim message was not committed and lives only
in Sharang's messages.

Specifically: T1 described using a frontier assistant for CBT-style work on their
own thoughts and said they feel uneasy that a provider now retains that record.
The *product* signal is what matters and is recorded below. **Do not add the
tester's name, the raw text, or any of the personal content they disclosed to
this or any other tracked file, and never to a PR body or an ntfy notification.**

## What T1 reported (paraphrased, grouped)

1. **Liked the core concept** — "a personal LLM" for journaling, and preferred it
   to a similar app they had tried before. Not faint praise; it is the only
   comparative datapoint the project has.
2. **Could not find how to start a new session** — solved it by hitting browser
   refresh. (Silver lining they noted: reload-to-ready took a few seconds, which
   incidentally confirms the warm model cache works on a real device.)
3. **Gratitude mode reads too therapy-flavoured** — called out "it sounds like…"
   by name, and asked for something more energetic/excited in that mode
   specifically.
4. **Switching Gratitude → Check-in continued the same session** — flagged as
   possibly-unintended rather than as a complaint.
5. **Wondered about simple tools (search / clock)** — reasoning given: someone
   checking in at midnight may be in an "odd state". T1 flagged this themself as
   their least-confident suggestion.
6. **The privacy thesis landed, unprompted** — the discomfort of handing a
   provider a log of CBT-style reflection is exactly why they see on-device as
   the right shape for this. This is the first external confirmation of the
   product's core bet.

## Triage against the actual code (planner, 2026-08-11, verified by reading src/)

Every claim below was checked against the source this run. Line refs are current.

### A. Confirmed defects, no model dependency, not gate-triggering

**A1 — "New" is invisible on a phone.** `App.tsx:854` renders the button only
when `{current && …}`, and its label is `hidden sm:inline` (Tailwind `sm` =
640px). On a ~390px phone the header is four unlabelled icons — `[+] [book]
[heart] [gear]`. Refreshing was the rational move. `Cmd/Ctrl+N` exists
(`App.tsx:210`) and is irrelevant on mobile.

**A2 — the mode switch is three coupled bugs, not one.** `App.tsx:928` is only
`setJournalingMode(mode)`; `current` is untouched. Consequences, all verified:
- The next reply (`App.tsx:581`) sends the **new** mode's system prompt over the
  **old** mode's transcript.
- `mode` is written once at creation (`App.tsx:356`) and never updated, so
  `resolveSessionMode` (`App.tsx:715`) restores the **original** mode on reload —
  the switch silently reverts.
- `deriveGuidedStep` (`src/utils/guidedSession.ts`) counts user messages
  **session-wide**, so switching to Check-in after 3 gratitude turns lands on
  step 4 of a 3-step flow and `CheckInGuide.tsx:63` immediately renders
  **"Complete"**. T1 would have been handed a check-in that was already over.

**A3 — the midnight check-in asks the wrong question.** `isMorning()`
(`systemPrompts.ts:186`) is `hour >= 5 && hour < 12`, so at 00:35 T1 got
`CHECKIN_EVENING_INSTRUCTION`, whose step 1 is "How their day was overall" —
about a day that had ended 35 minutes earlier. This is the honest, local,
zero-network reading of T1's "clock" suggestion (item 5), and it is a defect
rather than a feature request.

### B. The discovery finding — highest ROI in this note

**B1 — T1 never found Thought Record.** They volunteered that CBT
cognitive-distortion work and reframing is their main use of an assistant, and
did not mention that QuietNote ships a 5-step CBT thought record:
`THOUGHT_RECORD_INSTRUCTION`, `ThoughtRecordGuide`, `ThoughtRecordHistory`,
structured persistence, and its own eval mode. They did not judge it badly —
they never saw it.

Why: `ChatPanel.tsx:567` renders `JournalingModeSelector` as `text-xs
text-slate-400` buttons in an `inline-flex … overflow-x-auto` strip beside
`PromptSelector`, and "Thought Record" is **4th of 4** — the widest label, last
in the row, with no visible scroll affordance at phone widths.

**The project's single highest-intent user could not see its most differentiated
feature.** No model work, no prompt change, not gate-triggering.

Note the tension worth recording: `2026-06-09-real-user-data-plan.md:84` ranked
Thought Record "keep, but watch usage" and speculated 5 steps may exceed most
users' appetite. T1 is one datapoint *against* that — the appetite existed and
the discoverability didn't. One user is not a reversal, but it is evidence, and
it is cheap to act on.

### C. Blocked on the model question, not on design

**C1 — the tone complaint is a shipped-model finding, not a copy finding.**
`systemPrompts.ts:18` bans "It sounds like" as the **"FIRST LINE RULE — strictest
rule, never break"**, and `:39` bans it again. T1 got it anyway.

The app has never run the fine-tune. `src/inference/index.ts:45` serves stock
`gemma-4-E2B-it-web.task` (litert-community); the alternatives are stock ONNX
E2B (`:39`) and stock Gemma 2 2B MLC (`:33`). The `quietnote-m3-m6` QLoRA has
never been in a browser — which is precisely what `initiatives/README.md:62-73`
already says and what M16 exists to measure.

So the first tester's main quality complaint is a direct hit on the gap the
initiatives already flag: **a ~2000-token prompt losing to a 2B model.** The old
corpus agrees empirically — `2026-06-09-real-user-data-plan.md:27` measured 48%
of the old app's responses opening with "it sounds like".

**Planner ruling:** do not spend gate time tuning gratitude tone on a model that
is intended to be replaced. A 3-seed gate read costs ~2.75h (measured; see
`MEMORY`/`model-quality`), and tone, distortion-naming and any prompt fix are
each gate-triggering. **Batch every prompt-touching change into one PR and take
one gate read**, and sequence it after the model question resolves.

**C2 — distortion-naming is a genuine gap.** The 5 steps do evidence-for/against
and a balanced perspective (steps 4–5 are the reframe T1 wants), but the prompt
never *names* the distortion — "catastrophising", "mind-reading". That is the one
real feature gap T1's ask implies. Prompt + dataset change ⇒ gate-triggering ⇒
batches with C1.

### D. Declined, with reasons

**D1 — web search: no.** A search puts journal text into a network request,
which is the exact discomfort that brought T1 to an on-device app (their item 6
is the argument against their item 5). It also contradicts a shipped promise —
`systemPrompts.ts:12` states "You cannot write code, search the web…" — and the
`boundary` (4/4) and `jailbreak` gate dimensions test that refusal. The local-only
rule in `initiatives/README.md` is non-negotiable and this would break it.
**The useful half of the suggestion is A3**, which needs no tools at all.

**D2 — personalization stays gated.** `initiatives/README.md:36-41` gates it on
model-quality's bar and that gating is *strengthened* by this note: a model that
cannot obey a one-line opener rule will parrot an injected profile block the way
it currently parrots the entry. Personalization is the payoff that justifies the
privacy trade — shipping it badly costs more than shipping it late.

## Sequencing this note implies

1. **A1 + A2 as one PR** (the fixes converge: switching modes should start a
   fresh session, which also gives "new session" a second, discoverable entry
   point). No gate.
2. **B1** — surface Thought Record at phone widths. No gate. Cheapest real win.
3. **A3** — time-of-day correctness. Touches `systemPrompts.ts` ⇒ gate applies.
4. **M16**, then the model question (below).
5. **C1 + C2 as one batched, gated PR** — only after 4.

## Blocked on Sharang (do not queue)

- **Can the QLoRA actually reach the browser?** Sharang has referred to "weird
  limitations" around adapter → LiteRT-web conversion. This one fact decides the
  order of everything gated:
  - **If reachable:** C1/C2 wait for the tuned model; tone is a training target.
  - **If structurally blocked:** prompt-only is the permanent shipped ceiling,
    and C1 is promoted to top priority instead of parked — because then no
    amount of waiting fixes the opener.

  The loop must not guess this. Until it is answered, C1/C2 stay out of the queue
  and items 1–3 above are the workable set.
