/**
 * WebGPU capability detection for QuietNote.
 *
 * Checks both navigator.gpu presence AND successful adapter request,
 * since some browsers expose the API but fail on requestAdapter().
 */

export interface WebGPUStatus {
  supported: boolean;
  reason?: string;
}

/**
 * Check if the current browser supports WebGPU.
 * Tests both API presence and adapter availability.
 */
export async function checkWebGPUSupport(): Promise<WebGPUStatus> {
  // Check if the WebGPU API exists
  if (!(navigator as any).gpu) {
    return {
      supported: false,
      reason: "Your browser does not support the WebGPU API.",
    };
  }

  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        reason:
          "WebGPU API is available but no compatible GPU adapter was found.",
      };
    }
    return { supported: true };
  } catch (err) {
    return {
      supported: false,
      reason: `WebGPU adapter request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
