/**
 * safariHardenedFetch — Fetch wrapper with timeout, retry, and Safari-specific tuning.
 * 
 * Features:
 * - AbortController-based timeout (12s Safari, 15s others)
 * - 1 automatic retry on network errors, timeouts, or 5xx
 * - No retry on 4xx (client errors)
 * - Safari detection for adjusted timeouts
 */

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

if (isSafari) {
  console.warn("[safariHardenedFetch] Safari detected — using shorter timeouts and longer retry delays");
}

const DEFAULT_TIMEOUT = isSafari ? 12000 : 15000;
const RETRY_DELAY = isSafari ? 5000 : 1500;
const MAX_RETRIES = 1;

/**
 * Submit with timeout and retry logic.
 * 
 * @param {Function} invokeFn - Async function that performs the actual API call (e.g. base44.functions.invoke)
 * @param {string} fnName - Function name to invoke
 * @param {Object} payload - Payload to send
 * @param {Object} options
 * @param {Function} options.onRetry - Called when a retry is about to happen
 * @param {Function} options.onTimeout - Called when timeout occurs
 * @returns {{ response, retryCount }}
 */
export async function invokeWithRetry(invokeFn, fnName, payload, options = {}) {
  let lastError = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      // We create a race between the actual invoke and the abort signal
      const response = await Promise.race([
        invokeFn(fnName, payload),
        new Promise((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error("CLIENT_TIMEOUT"));
          });
        }),
      ]);

      clearTimeout(timeoutId);
      
      // If we got a response, return it regardless of status
      // (4xx/5xx are handled by the caller)
      return { response, retryCount };

    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      const isTimeout = error.message === "CLIENT_TIMEOUT";
      const isNetworkError = !error.response && error.message !== "CLIENT_TIMEOUT";
      const isServerError = error.response?.status >= 500;
      const isRetryable = isTimeout || isNetworkError || isServerError;

      // Don't retry 4xx errors
      if (!isRetryable || attempt >= MAX_RETRIES) {
        // Attach timeout flag for caller
        if (isTimeout) {
          error._isTimeout = true;
        }
        throw error;
      }

      // Retry
      retryCount = attempt + 1;
      if (isTimeout && options.onTimeout) options.onTimeout();
      if (options.onRetry) options.onRetry(retryCount);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  throw lastError;
}

/**
 * Check payload size and return warning if too large.
 * @param {Object} payload
 * @param {number} maxKb - Max allowed size in KB (default 1500)
 * @returns {string|null} Warning message or null
 */
export function checkPayloadSize(payload, maxKb = 1500) {
  try {
    const sizeKb = JSON.stringify(payload).length / 1024;
    if (sizeKb > maxKb) {
      return `Payload te groot (${Math.round(sizeKb)} KB). Probeer de handtekening opnieuw te zetten.`;
    }
    return null;
  } catch {
    return null;
  }
}

export { isSafari };