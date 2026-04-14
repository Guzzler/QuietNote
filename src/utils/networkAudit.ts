/**
 * Development-mode network audit utility.
 *
 * Intercepts fetch, XMLHttpRequest, sendBeacon, and WebSocket to log
 * all outbound requests. Used to verify that no user data leaves the
 * device after the AI model has been downloaded.
 *
 * Stripped from production builds via import.meta.env.DEV checks.
 */

export interface NetworkRequest {
  url: string;
  method: string;
  type: "fetch" | "xhr" | "beacon" | "websocket";
  timestamp: number;
}

export class NetworkAudit {
  private log: NetworkRequest[] = [];
  private active = false;

  private originalFetch: typeof globalThis.fetch | null = null;
  private originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalSendBeacon: typeof Navigator.prototype.sendBeacon | null = null;
  private originalWebSocket: typeof globalThis.WebSocket | null = null;

  isActive(): boolean {
    return this.active;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.log = [];

    // Intercept fetch
    this.originalFetch = globalThis.fetch;
    const self = this;
    globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      self.log.push({
        url,
        method: init?.method ?? "GET",
        type: "fetch",
        timestamp: Date.now(),
      });
      return self.originalFetch!.call(globalThis, input, init);
    } as typeof globalThis.fetch;

    // Intercept XMLHttpRequest.open (only if available — not present in Node test env)
    if (typeof XMLHttpRequest !== "undefined") {
      this.originalXhrOpen = XMLHttpRequest.prototype.open;
      const xhrSelf = self;
      XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        ...rest: any[]
      ) {
        xhrSelf.log.push({
          url: typeof url === "string" ? url : url.href,
          method,
          type: "xhr",
          timestamp: Date.now(),
        });
        return xhrSelf.originalXhrOpen!.apply(this, [method, url, ...rest] as any);
      } as typeof XMLHttpRequest.prototype.open;
    }

    // Intercept sendBeacon (only if available)
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      this.originalSendBeacon = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (url: string, data?: BodyInit | null) {
        self.log.push({
          url,
          method: "POST",
          type: "beacon",
          timestamp: Date.now(),
        });
        return self.originalSendBeacon!(url, data);
      };
    }

    // Intercept WebSocket (only if available)
    if (typeof globalThis.WebSocket === "undefined") return;
    this.originalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = class extends self.originalWebSocket! {
      constructor(url: string | URL, protocols?: string | string[]) {
        const urlStr = typeof url === "string" ? url : url.href;
        self.log.push({
          url: urlStr,
          method: "CONNECT",
          type: "websocket",
          timestamp: Date.now(),
        });
        super(url, protocols);
      }
    } as typeof WebSocket;
  }

  stop(): NetworkRequest[] {
    if (!this.active) return [];
    this.active = false;

    // Restore originals
    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }
    if (this.originalXhrOpen && typeof XMLHttpRequest !== "undefined") {
      XMLHttpRequest.prototype.open = this.originalXhrOpen;
      this.originalXhrOpen = null;
    }
    if (this.originalSendBeacon && typeof navigator !== "undefined") {
      navigator.sendBeacon = this.originalSendBeacon;
      this.originalSendBeacon = null;
    }
    if (this.originalWebSocket) {
      globalThis.WebSocket = this.originalWebSocket;
      this.originalWebSocket = null;
    }

    return [...this.log];
  }

  getLog(): NetworkRequest[] {
    return [...this.log];
  }

  clear(): void {
    this.log = [];
  }
}
