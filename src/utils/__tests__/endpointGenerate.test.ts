import { describe, it, expect, vi } from "vitest";
import { createEndpointGenerateOnce, type ChatMessage } from "../endpointGenerate";

const OPTS = { maxTokens: 200, temperature: 0.6, repetitionPenalty: 1.3 };
const MESSAGES: ChatMessage[] = [
  { role: "system", content: "be kind" },
  { role: "user", content: "hello" },
];

function okResponse(content: unknown) {
  return {
    ok: true,
    status: 200,
    text: async () => "",
    json: async () => ({ choices: [{ message: { content } }] }),
  };
}

describe("endpointGenerate (M4a — OpenAI-compatible eval bridge)", () => {
  it("POSTs messages with app sampling parity mapped to llama-server names", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse("A warm reply. "));
    const generateOnce = createEndpointGenerateOnce("http://127.0.0.1:8080", OPTS, fetchMock);
    const reply = await generateOnce(MESSAGES);

    expect(reply).toBe("A warm reply."); // trimmed
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8080/v1/chat/completions");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.messages).toEqual(MESSAGES);
    expect(body.max_tokens).toBe(200);
    expect(body.temperature).toBe(0.6);
    expect(body.repeat_penalty).toBe(1.3);
    expect(body.stream).toBe(false);
  });

  // M9 (2026-07-29): seed is opt-in. Absent unless asked for, so every
  // pre-M9 run's request body stays byte-identical.
  it("omits `seed` from the body when no seed is given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse("ok"));
    await createEndpointGenerateOnce("http://localhost:8080", OPTS, fetchMock)(MESSAGES);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect("seed" in body).toBe(false);
  });

  it("sends `seed` when one is given (including 0)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse("ok"));
    await createEndpointGenerateOnce(
      "http://localhost:8080",
      { ...OPTS, seed: 11 },
      fetchMock,
    )(MESSAGES);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).seed).toBe(11);

    const zero = vi.fn().mockResolvedValue(okResponse("ok"));
    await createEndpointGenerateOnce("http://localhost:8080", { ...OPTS, seed: 0 }, zero)(MESSAGES);
    expect(JSON.parse(zero.mock.calls[0][1].body).seed).toBe(0);
  });

  // M12 (2026-07-30): cache_prompt gets the same "absent unless asked for"
  // treatment as seed, for the same reason — no historical run's request body
  // may change. `false` is the value that matters, so the test must prove the
  // key is present AND false, not merely falsy.
  it("omits `cache_prompt` from the body when cachePrompt is not given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse("ok"));
    await createEndpointGenerateOnce("http://localhost:8080", OPTS, fetchMock)(MESSAGES);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect("cache_prompt" in body).toBe(false);
  });

  it("sends `cache_prompt: false` when cachePrompt is false", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse("ok"));
    await createEndpointGenerateOnce(
      "http://localhost:8080",
      { ...OPTS, cachePrompt: false },
      fetchMock,
    )(MESSAGES);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect("cache_prompt" in body).toBe(true);
    expect(body.cache_prompt).toBe(false);
  });

  it("sends `cache_prompt: true` when cachePrompt is true (the knob is not one-way)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse("ok"));
    await createEndpointGenerateOnce(
      "http://localhost:8080",
      { ...OPTS, cachePrompt: true },
      fetchMock,
    )(MESSAGES);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).cache_prompt).toBe(true);
  });

  it("seed and cache_prompt are independent keys — both ride the same body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse("ok"));
    await createEndpointGenerateOnce(
      "http://localhost:8080",
      { ...OPTS, seed: 22, cachePrompt: false },
      fetchMock,
    )(MESSAGES);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.seed).toBe(22);
    expect(body.cache_prompt).toBe(false);
  });

  it("normalizes a trailing slash on the base URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse("ok"));
    await createEndpointGenerateOnce("http://localhost:8080/", OPTS, fetchMock)(MESSAGES);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8080/v1/chat/completions");
  });

  it("throws loudly on a non-OK response, quoting status and body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "loading model",
      json: async () => ({}),
    });
    await expect(
      createEndpointGenerateOnce("http://localhost:8080", OPTS, fetchMock)(MESSAGES),
    ).rejects.toThrow(/HTTP 503.*loading model/);
  });

  it("throws when the reply has no assistant text (never scores an empty reply)", async () => {
    const missing = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "",
      json: async () => ({ choices: [] }),
    });
    await expect(
      createEndpointGenerateOnce("http://localhost:8080", OPTS, missing)(MESSAGES),
    ).rejects.toThrow(/missing choices\[0\]\.message\.content/);

    const nonString = vi.fn().mockResolvedValue(okResponse(null));
    await expect(
      createEndpointGenerateOnce("http://localhost:8080", OPTS, nonString)(MESSAGES),
    ).rejects.toThrow(/missing choices\[0\]\.message\.content/);
  });
});
