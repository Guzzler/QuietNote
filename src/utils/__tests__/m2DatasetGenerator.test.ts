import { describe, it, expect } from "vitest";
import {
  buildM2Deck,
  interleaveDeck,
  ingestBatch,
  estimateMaxTokens,
  M2_TARGET_COUNT,
  sampleScenarioCards,
  allocateCounts,
  renderTeacherPrompt,
  parseTeacherReply,
  repairTurns,
  classifyLengthBand,
  runFilters,
  mockTeacher,
  generateDataset,
  DOSE_ADVICE_BANS,
  DIAGNOSIS_VOCAB_BANS,
  STYLE_CONSTRAINTS,
  SLICE_SHARES,
  type ScenarioCard,
  type DialogueTurn,
} from "../m2DatasetGenerator";

/** Minimal card factory for filter tests. */
function card(overrides: Partial<ScenarioCard> = {}): ScenarioCard {
  return {
    id: "fw-0001",
    mode: "freewrite",
    topic: "a work deadline",
    persona: "expansive",
    arc: ["tense", "steadier"],
    userTurns: 1,
    lengthBand: "single",
    plantedDetail: null,
    safetyKind: null,
    tags: ["anti-echo"],
    ...overrides,
  };
}

describe("m2DatasetGenerator (M2b — DATASET.md §5 pipeline)", () => {
  describe("allocateCounts", () => {
    it("hits the total exactly with largest-remainder rounding", () => {
      const counts = allocateCounts(20, [0.4, 0.25, 0.2, 0.15]);
      expect(counts.reduce((a, b) => a + b, 0)).toBe(20);
      expect(counts).toEqual([8, 5, 4, 3]);
    });
  });

  describe("card sampler (§3 shares + §4 composition)", () => {
    const cards = sampleScenarioCards(200, 42);

    it("honors §3 slice shares within ±5%", () => {
      for (const { mode, share } of SLICE_SHARES) {
        const actual = cards.filter((c) => c.mode === mode).length / cards.length;
        expect(Math.abs(actual - share)).toBeLessThanOrEqual(0.05);
      }
    });

    it("honors the §4 length mix within ±5%", () => {
      const bands = { single: 0.3, medium: 0.4, long: 0.3 } as const;
      for (const [band, share] of Object.entries(bands)) {
        const actual = cards.filter((c) => c.lengthBand === band).length / cards.length;
        expect(Math.abs(actual - share)).toBeLessThanOrEqual(0.05);
      }
    });

    it("assigns ~35% callback, ~10% safety, ~10% hard anti-echo", () => {
      const frac = (tag: string) =>
        cards.filter((c) => c.tags.some((t) => t.startsWith(tag))).length / cards.length;
      expect(frac("callback")).toBeGreaterThanOrEqual(0.28);
      expect(frac("callback")).toBeLessThanOrEqual(0.42);
      expect(frac("safety-")).toBeGreaterThanOrEqual(0.06);
      expect(frac("safety-")).toBeLessThanOrEqual(0.14);
      expect(frac("hard-anti-echo")).toBeGreaterThanOrEqual(0.06);
      expect(frac("hard-anti-echo")).toBeLessThanOrEqual(0.14);
    });

    it("keeps callbacks and safety mirrors off single-exchange cards", () => {
      for (const c of cards.filter((x) => x.lengthBand === "single")) {
        expect(c.tags).not.toContain("callback");
        expect(c.safetyKind).toBeNull();
      }
    });

    it("is deterministic for a given seed and has unique ids", () => {
      const again = sampleScenarioCards(200, 42);
      expect(again).toEqual(cards);
      expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    });

    it("respects turn-count bands (1 / 3–6 / 8–12)", () => {
      for (const c of cards) {
        if (c.lengthBand === "single") expect(c.userTurns).toBe(1);
        if (c.lengthBand === "medium") expect(c.userTurns).toBeGreaterThanOrEqual(3);
        if (c.lengthBand === "medium") expect(c.userTurns).toBeLessThanOrEqual(6);
        if (c.lengthBand === "long") expect(c.userTurns).toBeGreaterThanOrEqual(8);
        if (c.lengthBand === "long") expect(c.userTurns).toBeLessThanOrEqual(12);
      }
    });
  });

  describe("teacher prompt (§1 contract + card)", () => {
    it("renders the behavior contract and card facts", () => {
      const prompt = renderTeacherPrompt(
        card({
          mode: "checkin",
          userTurns: 5,
          lengthBand: "medium",
          plantedDetail: "Harlow report",
          tags: ["anti-echo", "callback"],
        }),
      );
      expect(prompt).toContain("NO ECHO");
      expect(prompt).toContain("PERSONALIZATION");
      expect(prompt).toContain("mode: checkin");
      expect(prompt).toContain("exactly 5");
      expect(prompt).toContain("Harlow report");
      expect(prompt).toContain("JSON array");
    });

    it("parseTeacherReply extracts turns and rejects garbage", () => {
      const turns = parseTeacherReply(
        'Here you go:\n[{"role":"user","content":"hi"},{"role":"assistant","content":"welcome back"}]',
      );
      expect(turns).toHaveLength(2);
      expect(() => parseTeacherReply("no json here")).toThrow();
    });

    it("spells out the exact object count and shape (M2c: fixes the observed shape-reject rate)", () => {
      const prompt = renderTeacherPrompt(card({ userTurns: 6, lengthBand: "medium" }));
      expect(prompt).toContain("EXACTLY 12 objects");
      expect(prompt).toContain("no markdown fences");
    });

    it("gives a concrete callback example instead of only a meta-instruction", () => {
      const prompt = renderTeacherPrompt(
        card({ userTurns: 5, lengthBand: "medium", plantedDetail: "Harlow report", tags: ["anti-echo", "callback"] }),
      );
      expect(prompt).toContain('Is the Harlow report still the thing pulling hardest at you?');
      expect(prompt).toContain("NOT a meta phrase");
    });

    it("bans the overused surface-worry->childhood-fear->therapy arc and assigns a deterministic alternate closing shape", () => {
      const c = card({ userTurns: 8, lengthBand: "long" });
      const prompt = renderTeacherPrompt(c);
      expect(prompt).toContain("already been overused");
      expect(prompt).toContain("how THIS dialogue should close:");
      // Same card -> same style every render (deterministic, not random).
      expect(renderTeacherPrompt(c)).toBe(prompt);
    });

    it("assigns different closing styles across different cards (not one style for everything)", () => {
      const cards = sampleScenarioCards(30, 42).filter((c) => c.userTurns > 1);
      const styles = new Set(
        cards.map((c) => renderTeacherPrompt(c).split("how THIS dialogue should close: ")[1]?.split("\n")[0]),
      );
      expect(styles.size).toBeGreaterThan(1);
    });

    it("warns against stopping short of the required turn count on multi-turn cards", () => {
      const prompt = renderTeacherPrompt(card({ userTurns: 6, lengthBand: "medium" }));
      expect(prompt).toContain("do NOT stop early");
      expect(prompt).not.toBe(renderTeacherPrompt(card({ userTurns: 1, lengthBand: "single" })));
    });

    it("omits the closing-style and no-early-stop lines for single-exchange cards", () => {
      const prompt = renderTeacherPrompt(card({ userTurns: 1, lengthBand: "single" }));
      expect(prompt).not.toContain("how THIS dialogue should close:");
      expect(prompt).not.toContain("do NOT stop early");
    });

    it("M7: applies ALL style constraints to every card, deterministically", () => {
      const c = card({ userTurns: 8, lengthBand: "long" });
      const prompt = renderTeacherPrompt(c);
      expect(prompt).toContain("stylistic constraints for THIS dialogue — ALL of these apply");
      // Every one of the five constraints is present on a multi-turn card.
      for (const constraint of STYLE_CONSTRAINTS) expect(prompt).toContain(constraint);
      // Same card -> same rendered block every render.
      expect(renderTeacherPrompt(c)).toBe(prompt);
    });

    it("M7: the anti-em-dash constraint reaches EVERY card, not ~1-in-5 (the M4 zero-effect fix)", () => {
      const cards = sampleScenarioCards(60, 42);
      for (const c of cards) {
        // STYLE_CONSTRAINTS[0] is the anti-em-dash rule — must appear on all.
        expect(renderTeacherPrompt(c)).toContain(STYLE_CONSTRAINTS[0]);
      }
    });

    it("M7: single-exchange cards drop the two multi-turn-only constraints but keep the rest", () => {
      const cards = sampleScenarioCards(60, 42).filter((c) => c.userTurns === 1);
      expect(cards.length).toBeGreaterThan(0);
      for (const c of cards) {
        const prompt = renderTeacherPrompt(c);
        expect(prompt).not.toContain(STYLE_CONSTRAINTS[1]);
        expect(prompt).not.toContain(STYLE_CONSTRAINTS[3]);
        expect(prompt).toContain(STYLE_CONSTRAINTS[0]);
        expect(prompt).toContain(STYLE_CONSTRAINTS[2]);
        expect(prompt).toContain(STYLE_CONSTRAINTS[4]);
      }
    });

    it("M7: the constraint ORDER is salted (not a static block across cards)", () => {
      const cards = sampleScenarioCards(200, 42).filter((c) => c.userTurns > 1);
      const blocks = new Set(
        cards.map(
          (c) =>
            renderTeacherPrompt(c)
              .split("ALL of these apply, not just one:\n")[1]
              ?.split("\n- user turns:")[0],
        ),
      );
      // Same five lines, different orderings via the ${id}#style salt.
      expect(blocks.size).toBeGreaterThan(1);
    });

    it("M7: the contract demands short sentences / no run-ons", () => {
      const prompt = renderTeacherPrompt(card({ userTurns: 5, lengthBand: "medium" }));
      expect(prompt).toContain("Keep every sentence short");
      expect(prompt).toContain("no run-ons");
    });

    it("M7: the medical safety exemplar forbids echoing the user's dose figure", () => {
      const prompt = renderTeacherPrompt(
        card({ userTurns: 3, lengthBand: "medium", safetyKind: "medical", tags: ["safety-medical"] }),
      );
      expect(prompt).toContain("never repeating back any dose, number, or medication name");
    });

    it("M2e: fixes the pilot's pronoun guess and asks for one invented detail", () => {
      const prompt = renderTeacherPrompt(card({ userTurns: 5, lengthBand: "medium" }));
      expect(prompt).toContain("never assume a pronoun for a named person");
      expect(prompt).toContain("INVENT ONE DETAIL");
    });
  });

  describe("estimateMaxTokens (M2c: fixed 4096 truncated long dialogues)", () => {
    it("scales up with userTurns and stays within the model's output ceiling", () => {
      const single = estimateMaxTokens(card({ userTurns: 1 }));
      const long = estimateMaxTokens(card({ userTurns: 12, lengthBand: "long" }));
      expect(single).toBeLessThan(long);
      expect(long).toBeLessThanOrEqual(8192);
      expect(single).toBeGreaterThanOrEqual(1200);
    });
  });

  describe("filters (§5 reject-and-regenerate)", () => {
    const pass: DialogueTurn[] = [
      { role: "user", content: "The Harlow report is due Thursday and my brain will not stop circling it." },
      { role: "assistant", content: "Where does the circling bite hardest — the work itself, or what Thursday means?" },
    ];

    it("accepts a clean dialogue", () => {
      expect(runFilters(pass, card())).toEqual([]);
    });

    it("rejects a pronoun-swapped echo opening", () => {
      const echo: DialogueTurn[] = [
        pass[0],
        { role: "assistant", content: "The Harlow report is due Thursday and your brain will not stop circling it." },
      ];
      expect(runFilters(echo, card()).some((r) => r.startsWith("echo:"))).toBe(true);
    });

    it("rejects template smell and banned openers", () => {
      const smelly: DialogueTurn[] = [
        pass[0],
        { role: "assistant", content: "It sounds like a lot. Thank you for sharing that with me." },
      ];
      const reasons = runFilters(smelly, card());
      expect(reasons.some((r) => r.startsWith("template-smell"))).toBe(true);
      expect(reasons.some((r) => r.startsWith("banned-opener"))).toBe(true);
    });

    it("rejects format violations: >4 sentences, markdown, two questions", () => {
      const longWinded: DialogueTurn[] = [
        pass[0],
        { role: "assistant", content: "One. Two. Three. Four. Five whole sentences." },
      ];
      expect(runFilters(longWinded, card()).some((r) => r.includes(">4 sentences"))).toBe(true);

      const markdown: DialogueTurn[] = [
        pass[0],
        { role: "assistant", content: "Here is a plan:\n- breathe\n- write" },
      ];
      expect(runFilters(markdown, card()).some((r) => r.includes("markdown"))).toBe(true);

      const interrogation: DialogueTurn[] = [
        pass[0],
        { role: "assistant", content: "What happened? And how did that land?" },
      ];
      expect(runFilters(interrogation, card()).some((r) => r.includes("more than one question"))).toBe(true);
    });

    it("M7: rejects a run-on sentence and accepts short ones", () => {
      const runOn: DialogueTurn[] = [
        pass[0],
        {
          role: "assistant",
          content:
            "It really does sound like the circling never quite lets up and keeps pulling you back around to Thursday again and again in a way that leaves almost no room to breathe or think straight at all.",
        },
      ];
      expect(runFilters(runOn, card()).some((r) => r.includes("run-on"))).toBe(true);
      // The clean two-short-sentence baseline still passes the run-on guard.
      expect(runFilters(pass, card()).some((r) => r.includes("run-on"))).toBe(false);
    });

    it("rejects a missing callback and accepts a present one", () => {
      const cbCard = card({
        userTurns: 3,
        lengthBand: "medium",
        plantedDetail: "Harlow report",
        tags: ["anti-echo", "callback"],
      });
      const noCallback: DialogueTurn[] = [
        { role: "user", content: "The Harlow report looms and I slept badly on it." },
        { role: "assistant", content: "What did the bad night leave you carrying into today?" },
        { role: "user", content: "Mostly dread, a little resolve." },
        { role: "assistant", content: "Resolve showing up next to dread is worth noticing." },
        { role: "user", content: "Trying to hold onto that." },
        { role: "assistant", content: "What would tomorrow-you thank you for doing tonight?" },
      ];
      expect(runFilters(noCallback, cbCard).some((r) => r.startsWith("callback"))).toBe(true);

      const withCallback = noCallback.map((t, i) =>
        i === 5
          ? { role: "assistant" as const, content: "Something here sounds firmer than last night. Is the Harlow report still the piece pulling hardest at you?" }
          : t,
      );
      expect(runFilters(withCallback, cbCard)).toEqual([]);
    });

    it("safety mirror: requires referral vocab and rejects dose advice", () => {
      const safetyCard = card({
        userTurns: 1,
        safetyKind: "medical",
        tags: ["anti-echo", "safety-medical"],
      });
      const leaky: DialogueTurn[] = [
        { role: "user", content: "Would upping my medication help with this?" },
        { role: "assistant", content: "Going up to 100mg should help with the worst of it." },
      ];
      const reasons = runFilters(leaky, safetyCard);
      expect(reasons.some((r) => r.includes("dose/advice ban"))).toBe(true);
      expect(reasons.some((r) => r.includes("professional-referral"))).toBe(true);

      const clean: DialogueTurn[] = [
        { role: "user", content: "Would upping my medication help with this?" },
        { role: "assistant", content: "A question that size belongs with your doctor, not a journal. What the worry felt like today, though — that we can stay with." },
      ];
      expect(runFilters(clean, safetyCard)).toEqual([]);
    });

    it("rejects wrong shape: non-alternating, wrong turn count", () => {
      const doubled: DialogueTurn[] = [
        { role: "user", content: "one" },
        { role: "user", content: "two" },
        { role: "assistant", content: "A reply that arrives late." },
      ];
      expect(runFilters(doubled, card()).some((r) => r.startsWith("shape:"))).toBe(true);
    });

    it("DOSE_ADVICE_BANS catch the M0 dose-echo shape", () => {
      expect(DOSE_ADVICE_BANS.some((re) => re.test("taking ten milligrams — wait, 10 mg nightly"))).toBe(true);
    });

    it("M2e: rejects diagnosis-adjacent vocabulary in any assistant turn (the tr-0296 leak)", () => {
      const leaky: DialogueTurn[] = [
        pass[0],
        { role: "assistant", content: "What you're describing is actually a diagnosable stress response." },
      ];
      expect(runFilters(leaky, card()).some((r) => r.startsWith("diagnosis-vocab"))).toBe(true);

      const clinical: DialogueTurn[] = [
        pass[0],
        { role: "assistant", content: "That pattern is clinically significant, a textbook case even." },
      ];
      expect(runFilters(clinical, card()).some((r) => r.startsWith("diagnosis-vocab"))).toBe(true);

      // The vocab appearing in a USER turn is fine — only assistant turns are policed.
      const userSaysIt: DialogueTurn[] = [
        { role: "user", content: "My sister says this is diagnosable and I should get checked out." },
        { role: "assistant", content: "What did hearing that from your sister stir up for you?" },
      ];
      expect(runFilters(userSaysIt, card()).some((r) => r.startsWith("diagnosis-vocab"))).toBe(false);

      expect(DIAGNOSIS_VOCAB_BANS.some((re) => re.test("that's actually diagnosable stress response"))).toBe(true);
    });
  });

  describe("M2f — shape repair + band tolerance (long-arc yield)", () => {
    it("repairTurns merges consecutive same-role objects, joining content", () => {
      const split: DialogueTurn[] = [
        { role: "user", content: "one" },
        { role: "user", content: "two" },
        { role: "assistant", content: "A reply that lands." },
      ];
      const fixed = repairTurns(split);
      expect(fixed).toHaveLength(2);
      expect(fixed[0]).toEqual({ role: "user", content: "one\n\ntwo" });
      expect(fixed[1].role).toBe("assistant");
    });

    it("repairTurns leaves an already-alternating dialogue unchanged (idempotent)", () => {
      const clean: DialogueTurn[] = [
        { role: "user", content: "a" },
        { role: "assistant", content: "b" },
      ];
      expect(repairTurns(clean)).toEqual(clean);
      expect(repairTurns(repairTurns(clean))).toEqual(clean);
    });

    it("parseTeacherReply tolerates code fences and a trailing comma, then merges splits", () => {
      const messy =
        '```json\n[\n{"role":"user","content":"one"},\n{"role":"user","content":"two"},\n' +
        '{"role":"assistant","content":"A quiet nudge — what sits under it today?"},\n]\n```';
      const turns = parseTeacherReply(messy);
      expect(turns).toHaveLength(2);
      expect(turns[0]).toEqual({ role: "user", content: "one\n\ntwo" });
      expect(turns[1].role).toBe("assistant");
    });

    it("classifyLengthBand mirrors the deck bands (single=1, medium=3–6, long=7+)", () => {
      expect(classifyLengthBand(1)).toBe("single");
      expect([3, 4, 5, 6].map(classifyLengthBand)).toEqual([
        "medium",
        "medium",
        "medium",
        "medium",
      ]);
      expect([7, 8, 11, 12].map(classifyLengthBand)).toEqual(["long", "long", "long", "long"]);
    });

    it("accepts a long-band dialogue that runs short of the exact ask (wanted 11, got 9)", async () => {
      const nineTurn = await mockTeacher(card({ userTurns: 9, lengthBand: "long" }), 0);
      expect(nineTurn.filter((t) => t.role === "user")).toHaveLength(9);
      // Filtered against a card that asked for 11 — both are the long band.
      expect(runFilters(nineTurn, card({ userTurns: 11, lengthBand: "long" }))).toEqual([]);
    });

    it("still rejects a severe early-stop that falls out of band (long card, 5-turn arc)", async () => {
      const fiveTurn = await mockTeacher(card({ userTurns: 5, lengthBand: "medium" }), 0);
      const reasons = runFilters(fiveTurn, card({ userTurns: 11, lengthBand: "long" }));
      expect(reasons.some((r) => r.startsWith("shape:") && r.includes("band"))).toBe(true);
    });

    it("ingestBatch repairs a split-turn authored dialogue and stores the merged turns", async () => {
      const deck = buildM2Deck(8, 42);
      const target = deck.find((c) => c.lengthBand === "single")!;
      const good = await mockTeacher(target, 0);
      // Artificially split the single user entry into two consecutive objects.
      const splitTurns: DialogueTurn[] = [
        { role: "user", content: good[0].content.slice(0, 20) },
        { role: "user", content: good[0].content.slice(20) },
        good[1],
      ];
      const { accepted, rejected } = ingestBatch(
        deck,
        new Set<string>(),
        [{ cardId: target.id, turns: splitTurns }],
        "test",
      );
      expect(rejected).toHaveLength(0);
      expect(accepted).toHaveLength(1);
      expect(accepted[0].turns.filter((t) => t.role === "user")).toHaveLength(1);
    });
  });

  describe("loop-as-teacher deck + ingest (M2c)", () => {
    it("the deck is stable across calls and full-size", () => {
      const deck = buildM2Deck();
      expect(deck).toHaveLength(M2_TARGET_COUNT);
      expect(buildM2Deck()).toEqual(deck);
    });

    it("interleaveDeck round-robins modes and preserves every card", () => {
      const deck = buildM2Deck(40, 42);
      const interleaved = interleaveDeck(deck);
      expect(interleaved).toHaveLength(deck.length);
      expect(new Set(interleaved.map((c) => c.id)).size).toBe(deck.length);
      const firstFour = interleaved.slice(0, 4).map((c) => c.mode);
      expect(new Set(firstFour).size).toBe(4);
    });

    it("ingestBatch accepts filter-passing dialogues and rejects unknowns, dupes, and filter failures", async () => {
      const deck = buildM2Deck(8, 42);
      const good = await mockTeacher(deck[0], 0);
      const { accepted, rejected } = ingestBatch(
        deck,
        new Set([deck[1].id]),
        [
          { cardId: deck[0].id, turns: good },
          { cardId: deck[0].id, turns: good }, // dupe within batch
          { cardId: deck[1].id, turns: good }, // already fulfilled
          { cardId: "zz-9999", turns: good }, // unknown card
          {
            cardId: deck[2].id,
            turns: [{ role: "user", content: "hello" }], // fails shape filters
          },
        ],
        "claude (loop-as-teacher, Claude Code session)",
      );
      expect(accepted).toHaveLength(1);
      expect(accepted[0].id).toBe(deck[0].id);
      expect(accepted[0].teacher).toContain("loop-as-teacher");
      expect(rejected).toHaveLength(4);
      expect(rejected.map((r) => r.reasons[0])).toEqual([
        expect.stringContaining("duplicate"),
        expect.stringContaining("duplicate"),
        expect.stringContaining("unknown card"),
        expect.stringContaining("shape"),
      ]);
    });
  });

  describe("mock teacher + end-to-end generation", () => {
    it("mock dialogues pass every filter for a broad card sample", async () => {
      const cards = sampleScenarioCards(60, 7);
      for (const c of cards) {
        const turns = await mockTeacher(c, 0);
        expect(runFilters(turns, c), `card ${c.id} [${c.tags.join(",")}]`).toEqual([]);
      }
    });

    it("generateDataset emits schema-valid records with correct slice shares (count 20)", async () => {
      const { records, failedCards } = await generateDataset({
        count: 20,
        seed: 42,
        teacher: mockTeacher,
        teacherLabel: "mock",
      });
      expect(failedCards).toEqual([]);
      expect(records).toHaveLength(20);
      const byMode = (m: string) => records.filter((r) => r.mode === m).length;
      expect(byMode("freewrite")).toBe(8);
      expect(byMode("checkin")).toBe(5);
      expect(byMode("thoughtrecord")).toBe(4);
      expect(byMode("gratitude")).toBe(3);
      for (const r of records) {
        expect(r.id).toMatch(/^(fw|gr|ci|tr)-\d{4}$/);
        expect(r.teacher).toBe("mock");
        expect(r.review).toEqual({ status: "pending", by: "loop" });
        expect(r.turns[0].role).toBe("user");
        expect(r.turns[r.turns.length - 1].role).toBe("assistant");
      }
    });

    it("reject-and-regenerate: retries with the attempt salt and records telemetry", async () => {
      let calls = 0;
      const flakyTeacher = async (c: ScenarioCard, attempt: number) => {
        calls++;
        if (attempt === 0) {
          // Echoing candidate — must be rejected, not silently accepted.
          return [
            { role: "user" as const, content: "The Harlow report is due Thursday and I cannot focus." },
            { role: "assistant" as const, content: "The Harlow report is due Thursday and you cannot focus." },
          ];
        }
        return mockTeacher(c, attempt);
      };
      const { records, rejects, failedCards } = await generateDataset({
        count: 1,
        seed: 1,
        teacher: flakyTeacher,
        teacherLabel: "mock",
      });
      expect(failedCards).toEqual([]);
      expect(records).toHaveLength(1);
      expect(rejects.length).toBeGreaterThanOrEqual(1);
      expect(rejects[0].reasons.some((r) => r.startsWith("echo:") || r.startsWith("shape:"))).toBe(true);
      expect(calls).toBeGreaterThanOrEqual(2);
    });
  });
});
