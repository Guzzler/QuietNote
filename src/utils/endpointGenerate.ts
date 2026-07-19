/**
 * OpenAI-compatible chat-completions adapter for the eval harness (M4a,
 * 2026-07-18).
 *
 * Why: the fine-tuned merged checkpoint (Sharangp/quietnote-m3-gemma4-e2b-
 * merged) cannot be exported to ONNX today (optimum-onnx pins
 * transformers<4.58, which predates the gemma4 architecture), so the M4
 * scoring path runs the model via llama.cpp's `llama-server` (GGUF q4 proxy)
 * instead. This adapter lets `scripts/run-m1-baseline.ts` and
 * `scripts/run-eval.ts` target any OpenAI-compatible /v1/chat/completions
 * endpoint behind a `--endpoint=<url>` flag while keeping the exact same
 * driver, send-path guards, and rubric.
 *
 * Sampling parity: the app's generation defaults (transformersjs-engine.ts)
 * are mapped to llama-server's names — max_new_tokens → max_tokens,
 * repetition_penalty → repeat_penalty (llama-server accepts its native
 * sampling params in the OpenAI request body). `stream` is always false;
 * the harness scores complete replies.
 */

export interface EndpointGenOptions {
  maxTokens: number;
  temperature: number;
  repetitionPenalty: number;
}

export interface ChatMessage {
  role: string;
  content: string;
}

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

/**
 * Builds a `generateOnce(messages)` closure that POSTs to
 * `<baseUrl>/v1/chat/completions` and returns the assistant text, trimmed.
 * Throws (with the endpoint's status/body) on any non-OK response or a reply
 * missing `choices[0].message.content` — the harness must fail loudly, never
 * score an empty string as a model reply.
 */
export function createEndpointGenerateOnce(
  baseUrl: string,
  opts: EndpointGenOptions,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): (messages: ChatMessage[]) => Promise<string> {
  const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
  return async (messages) => {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        repeat_penalty: opts.repetitionPenalty,
        stream: false,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "<unreadable body>");
      throw new Error(`endpoint HTTP ${res.status}: ${body.slice(0, 500)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("endpoint reply missing choices[0].message.content");
    }
    return content.trim();
  };
}
