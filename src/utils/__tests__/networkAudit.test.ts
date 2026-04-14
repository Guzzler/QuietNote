import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NetworkAudit } from "../networkAudit";

describe("NetworkAudit", () => {
  let audit: NetworkAudit;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    audit = new NetworkAudit();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    // Ensure audit is stopped and originals restored
    if (audit.isActive()) {
      audit.stop();
    }
    // Safety: restore fetch in case tests fail mid-way
    globalThis.fetch = originalFetch;
  });

  it("starts inactive", () => {
    expect(audit.isActive()).toBe(false);
  });

  it("becomes active after start()", () => {
    audit.start();
    expect(audit.isActive()).toBe(true);
  });

  it("becomes inactive after stop()", () => {
    audit.start();
    audit.stop();
    expect(audit.isActive()).toBe(false);
  });

  it("start() is idempotent", () => {
    audit.start();
    audit.start(); // should not throw or double-patch
    expect(audit.isActive()).toBe(true);
    audit.stop();
  });

  it("intercepts fetch calls and logs them", async () => {
    // Mock fetch to avoid actual network requests
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok"));

    audit.start();
    await globalThis.fetch("https://example.com/api");
    await globalThis.fetch("https://cdn.test/model.bin", { method: "POST" });

    const log = audit.stop();
    expect(log).toHaveLength(2);
    expect(log[0].url).toBe("https://example.com/api");
    expect(log[0].method).toBe("GET");
    expect(log[0].type).toBe("fetch");
    expect(log[1].url).toBe("https://cdn.test/model.bin");
    expect(log[1].method).toBe("POST");
  });

  it("restores original fetch after stop()", () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    globalThis.fetch = mockFetch;

    audit.start();
    // fetch should be patched
    expect(globalThis.fetch).not.toBe(mockFetch);

    audit.stop();
    // fetch should be restored
    expect(globalThis.fetch).toBe(mockFetch);
  });

  it("getLog() returns current log without stopping", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok"));

    audit.start();
    await globalThis.fetch("https://example.com/test");

    const log = audit.getLog();
    expect(log).toHaveLength(1);
    expect(audit.isActive()).toBe(true);

    audit.stop();
  });

  it("clear() empties the log", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok"));

    audit.start();
    await globalThis.fetch("https://example.com/test");
    expect(audit.getLog()).toHaveLength(1);

    audit.clear();
    expect(audit.getLog()).toHaveLength(0);

    audit.stop();
  });

  it("stop() returns empty array when not active", () => {
    const log = audit.stop();
    expect(log).toEqual([]);
  });

  it("logs include timestamps", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok"));

    audit.start();
    const before = Date.now();
    await globalThis.fetch("https://example.com/time");
    const after = Date.now();

    const log = audit.stop();
    expect(log[0].timestamp).toBeGreaterThanOrEqual(before);
    expect(log[0].timestamp).toBeLessThanOrEqual(after);
  });
});
