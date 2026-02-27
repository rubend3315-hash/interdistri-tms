import { base44 } from "@/api/base44Client";

/**
 * clientSubmitLogger — Logs client-side submit lifecycle to ClientSubmitLog entity.
 * This captures events even when the backend is never reached (Safari/network issues).
 */

function detectDevice(ua) {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return "Unknown";
}

function detectBrowser(ua) {
  if (/CriOS/i.test(ua)) return "Chrome (iOS)";
  if (/FxiOS/i.test(ua)) return "Firefox (iOS)";
  if (/EdgiOS/i.test(ua)) return "Edge (iOS)";
  // Safari detection must come AFTER Chrome iOS etc.
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Edg/i.test(ua)) return "Edge";
  return "Unknown";
}

function getNetworkType() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return "unknown";
  return conn.effectiveType || conn.type || "unknown";
}

function getPayloadSizeKb(payload) {
  try {
    return Math.round(new Blob([JSON.stringify(payload)]).size / 1024 * 100) / 100;
  } catch { return 0; }
}

function getSignatureSizeKb(signature) {
  if (!signature) return 0;
  try {
    return Math.round(new Blob([signature]).size / 1024 * 100) / 100;
  } catch { return 0; }
}

export function createClientSubmitLogger({ userEmail, employeeId, entryDate }) {
  const ua = navigator.userAgent || "";
  let logId = null;
  let requestStartTime = null;

  const baseData = {
    user_email: userEmail,
    employee_id: employeeId,
    entry_date: entryDate,
    device: detectDevice(ua),
    browser: detectBrowser(ua),
    user_agent: ua.slice(0, 500),
    network_type: getNetworkType(),
  };

  const logger = {
    /** 1. Called when user clicks "Indienen" */
    async logClicked(submissionId, payload, signature) {
      const data = {
        ...baseData,
        submission_id: submissionId,
        clicked_at: new Date().toISOString(),
        payload_size_kb: getPayloadSizeKb(payload),
        signature_size_kb: getSignatureSizeKb(signature),
        status: "CLICKED",
      };
      try {
        const record = await base44.entities.ClientSubmitLog.create(data);
        logId = record.id;
      } catch (e) {
        console.error("[ClientSubmitLog] Failed to log CLICKED:", e.message);
      }
      return logId;
    },

    /** 2. Called just before the fetch/invoke call */
    async logRequestStarted() {
      requestStartTime = Date.now();
      if (!logId) return;
      try {
        await base44.entities.ClientSubmitLog.update(logId, { status: "REQUEST_STARTED" });
      } catch (e) {
        console.error("[ClientSubmitLog] Failed to log REQUEST_STARTED:", e.message);
      }
    },

    /** 3. Called on successful backend response */
    async logResponseOk() {
      if (!logId) return;
      const responseTimeMs = requestStartTime ? Date.now() - requestStartTime : null;
      try {
        await base44.entities.ClientSubmitLog.update(logId, {
          status: "RESPONSE_OK",
          response_time_ms: responseTimeMs,
        });
      } catch (e) {
        console.error("[ClientSubmitLog] Failed to log RESPONSE_OK:", e.message);
      }
    },

    /** 4. Called on backend error or network error */
    async logResponseError(errorMessage) {
      if (!logId) return;
      const responseTimeMs = requestStartTime ? Date.now() - requestStartTime : null;
      try {
        await base44.entities.ClientSubmitLog.update(logId, {
          status: "RESPONSE_ERROR",
          error_message: (errorMessage || "Unknown error").slice(0, 500),
          response_time_ms: responseTimeMs,
        });
      } catch (e) {
        console.error("[ClientSubmitLog] Failed to log RESPONSE_ERROR:", e.message);
      }
    },

    /** 5. Called on page unload/visibility change while still waiting */
    async logAborted() {
      if (!logId) return;
      const responseTimeMs = requestStartTime ? Date.now() - requestStartTime : null;
      try {
        // Use sendBeacon for reliability during unload
        const updatePayload = JSON.stringify({
          status: "ABORTED",
          error_message: "Page unload / tab closed during request",
          response_time_ms: responseTimeMs,
        });
        // Best-effort: try entity update first, fall back silently
        await base44.entities.ClientSubmitLog.update(logId, {
          status: "ABORTED",
          error_message: "Page unload / tab closed during request",
          response_time_ms: responseTimeMs,
        });
      } catch (e) {
        console.error("[ClientSubmitLog] Failed to log ABORTED:", e.message);
      }
    },

    /** Get the log record ID */
    getLogId() { return logId; },

    /** Get signature size warning */
    getSignatureWarning(signature) {
      const sizeKb = getSignatureSizeKb(signature);
      if (sizeKb > 1200) {
        return `Handtekening is ${Math.round(sizeKb)} KB — dit kan problemen geven bij slechte verbinding.`;
      }
      return null;
    },
  };

  return logger;
}