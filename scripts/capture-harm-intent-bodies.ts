/**
 * One-off Day-9 evidence capture: run ONLY the two gratitude harm-intent
 * cases (redteam-7.2, gratitude-modecoherence-1) through the exact same
 * generate path as scripts/run-eval.ts (incl. the mechanism-B deflection
 * guard) and print the bodies, so the SHIP call can quote genuine
 * acknowledge+question responses rather than trusting scorer keywords.
 *
 * Run: npx tsx scripts/capture-harm-intent-bodies.ts
 */
import { EVAL_CASES, evaluateResponse } from "../src/utils/evalRunner.ts";
import { getBaseSystemInstruction } from "../src/prompts/systemPrompts.ts";
import { buildPriorTurnRecap } from "../src/utils/conversationContext.ts";
import { isBareDeflection, withDeflectionReprompt } from "../src/utils/responseShaping.ts";

const MODEL_ID = "onnx-community/gemma-4-E2B-it-ONNX";
const GEN_DEFAULTS = { max_new_tokens: 200, temperature: 0.6, repetition_penalty: 1.3, do_sample: true };
const CASE_IDS = ["redteam-7.2", "gratitude-modecoherence-1"];

async function main() {
  const { AutoTokenizer, AutoModelForCausalLM } = await import("@huggingface/transformers");
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, { dtype: "q4f16" });
  console.log("[capture] model loaded");

  async function generateOnce(messages: { role: string; content: string }[]): Promise<string> {
    const inputs = (tokenizer as any).apply_chat_template(messages, {
      tokenize: true, return_dict: true, add_generation_prompt: true,
    });
    const out = await (model as any).generate({ ...inputs, ...GEN_DEFAULTS });
    const inputIdsLen = inputs.input_ids?.dims?.at(-1) ?? 0;
    const outIds: number[][] = typeof (out as any).tolist === "function" ? (out as any).tolist() : (out as any);
    const text = (tokenizer as any).decode(outIds[0].slice(inputIdsLen), { skip_special_tokens: true });
    return typeof text === "string" ? text.trim() : String(text).trim();
  }

  const systemInstruction = getBaseSystemInstruction("gratitude");
  for (const id of CASE_IDS) {
    const c = EVAL_CASES.find((x) => x.id === id)!;
    for (let sample = 1; sample <= 2; sample++) {
      const recap = buildPriorTurnRecap(c.priorTurns ?? []);
      const currentUserContent = recap ? `${recap}\n\n${c.prompt}` : c.prompt;
      const messages = [
        { role: "system", content: systemInstruction },
        ...(c.priorTurns ?? []),
        { role: "user", content: currentUserContent },
      ];
      const first = await generateOnce(messages);
      const deflected = isBareDeflection(first);
      const final = deflected ? await generateOnce(withDeflectionReprompt(messages)) : first;
      const r = evaluateResponse(final, c);
      console.log(`\n=== ${id} sample ${sample} | mechanismB_fired=${deflected} | scorer=${r.passed ? "PASS" : "FAIL"}`);
      if (deflected) console.log(`--- first pass (rejected): ${first}`);
      console.log(`--- final: ${final}`);
      if (!r.passed) console.log(`--- failures: ${r.failures.join("; ")}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
