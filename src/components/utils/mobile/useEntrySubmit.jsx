import { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { addToSyncQueue } from '@/components/utils/offlineStorage';
import { createClientSubmitLogger } from './clientSubmitLogger';
import { invokeWithRetry, checkPayloadSize } from './safariHardenedFetch';

/**
 * useEntrySubmit — Atomic time entry submission hook.
 * 
 * - 25s hard safety timeout guarantees UI never stays stuck
 * - submittingRef + isSubmitting always reset in finally block
 * - Double-submit protection via submittingRef
 */
export function useEntrySubmit() {
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timeoutRef = useRef(null);

  const submitEntry = useCallback(async ({
    formData, trips, standplaatsWerk, signature, userEmail, employeeId
  }) => {
    if (submittingRef.current) {
      return { success: false, error: 'ALREADY_SUBMITTING' };
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    // 🔐 HARD SAFETY TIMEOUT (25s absolute) — guarantees UI reset
    timeoutRef.current = setTimeout(() => {
      console.warn('[SubmitTimeout] 25s hard safety timeout — force reset');
      submittingRef.current = false;
      setIsSubmitting(false);
    }, 25000);

    const clientLogger = createClientSubmitLogger({
      userEmail: userEmail || '',
      employeeId: employeeId || '',
      entryDate: formData.date,
    });

    let abortCleanup = null;

    try {
      // --- Signature upload ---
      let signatureUrl = signature;
      if (signature && signature.startsWith('data:')) {
        const blob = await fetch(signature).then(r => r.blob());
        const mimeMatch = signature.match(/^data:(image\/\w+);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
        const file = new File([blob], `sig-${Date.now()}.${ext}`, { type: mime });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        signatureUrl = file_url;
      }

      const submissionId = crypto.randomUUID();

      const payload = {
        submission_id: submissionId,
        date: formData.date,
        end_date: formData.end_date || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        break_minutes: Number(formData.break_minutes) || 0,
        break_manual: formData.break_manual === true,
        notes: formData.notes || '',
        signature_url: signatureUrl || null,
        trips: (trips || []).map(t => ({
          start_time: t.start_time,
          end_time: t.end_time,
          vehicle_id: t.vehicle_id,
          customer_id: t.customer_id || null,
          route_name: t.route_name || null,
          departure_location: t.departure_location || null,
          start_km: t.start_km ? Number(t.start_km) : null,
          end_km: t.end_km ? Number(t.end_km) : null,
          fuel_liters: t.fuel_liters ? Number(t.fuel_liters) : null,
          adblue_liters: t.adblue_liters ? Number(t.adblue_liters) : null,
          fuel_km: t.fuel_km ? Number(t.fuel_km) : null,
          charging_kwh: t.charging_kwh ? Number(t.charging_kwh) : null,
          planned_stops: t.planned_stops ? Number(t.planned_stops) : null,
          notes: t.notes || null,
        })),
        standplaats_werk: (standplaatsWerk || [])
          .filter(s => s.customer_id || s.activity_id)
          .map(s => ({
            start_time: s.start_time || null,
            end_time: s.end_time || null,
            customer_id: s.customer_id || null,
            project_id: s.project_id || null,
            activity_id: s.activity_id || null,
            notes: s.notes || null,
          })),
      };

      // --- Client logging ---
      clientLogger.logClicked(submissionId, payload, signature).catch(() => {});

      // --- Payload size guard ---
      const payloadWarning = checkPayloadSize(payload);
      if (payloadWarning) {
        await clientLogger.logResponseError('PAYLOAD_TOO_LARGE: ' + payloadWarning);
        return { success: false, error: 'PAYLOAD_TOO_LARGE', message: payloadWarning };
      }

      // --- Offline fallback ---
      if (!navigator.onLine) {
        const correlationId = crypto.randomUUID();
        await addToSyncQueue('submitTimeEntry', { ...payload, _correlationId: correlationId });
        return { success: true, offline: true };
      }

      // --- Online: submit with retry ---
      await clientLogger.logRequestStarted();
      abortCleanup = setupAbortDetection(clientLogger);

      const { response, retryCount } = await invokeWithRetry(
        base44.functions.invoke.bind(base44.functions),
        'submitTimeEntry',
        payload,
        {
          onRetry: (count) => {
            console.log(`[useEntrySubmit] Retry #${count}`);
          },
          onTimeout: () => {
            console.warn('[useEntrySubmit] Request timed out, retrying...');
          },
        }
      );

      const result = response.data;

      if (result.success) {
        await clientLogger.logResponseOk(retryCount);
        return { success: true, offline: false, data: result.data, retryCount };
      } else {
        await clientLogger.logResponseError(result.error + ': ' + (result.message || ''), retryCount);
        return {
          success: false,
          error: result.error,
          message: result.message,
          details: result.details || [],
          retryCount,
        };
      }

    } catch (error) {
      const isTimeout = error?._isTimeout === true;
      const errMsg = isTimeout
        ? 'CLIENT_TIMEOUT'
        : (error?.response?.data?.message || error?.message || 'Unknown error');

      await clientLogger.logResponseError(errMsg);

      if (isTimeout) {
        return { success: false, error: 'CLIENT_TIMEOUT', message: 'Verbinding duurt te lang — probeer opnieuw.' };
      }

      if (error?.response) {
        const status = error.response.status;
        const data = error.response.data;
        if (status === 409) return { success: false, error: data?.error || 'DUPLICATE_SUBMISSION', message: data?.message || 'Conflict gedetecteerd', details: data?.details || [] };
        if (status === 422) return { success: false, error: data?.error || 'VALIDATION_ERROR', message: data?.message || 'Validatiefout', details: data?.details || [] };
        if (status === 401 || status === 403) return { success: false, error: data?.error || 'UNAUTHORIZED', message: 'Sessie verlopen — log opnieuw in' };
        return { success: false, error: data?.error || 'SERVER_ERROR', message: data?.message || `Serverfout (${status})` };
      }

      return { success: false, error: 'NETWORK_ERROR', message: 'Geen verbinding — probeer opnieuw.' };

    } finally {
      // 🔐 GUARANTEED CLEANUP — always runs
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (abortCleanup) {
        abortCleanup();
      }
      submittingRef.current = false;
      setIsSubmitting(false);
      console.log('[SubmitCleanup] reset executed — submittingRef=false, isSubmitting=false');
    }
  }, []);

  /**
   * Save as draft — server-side upsert
   */
  const saveDraft = useCallback(async ({ formData, trips, standplaatsWerk, employeeId }) => {
    if (submittingRef.current) return { success: false };
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const hours = calculateHoursSimple(formData.start_time, formData.end_time, formData.break_minutes);

      const response = await base44.functions.invoke('upsertDraftTimeEntry', {
        employee_id: employeeId,
        date: formData.date,
        end_date: formData.end_date || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        break_minutes: Number(formData.break_minutes) || 0,
        total_hours: hours,
        notes: formData.notes || null,
        status: 'Concept',
      });

      const result = response.data;
      if (result.success) return { success: true, id: result.id };
      return { success: false, error: result.message || 'Opslaan mislukt' };
    } catch (error) {
      return { success: false, error: error?.message || 'Opslaan mislukt' };
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return { submitEntry, saveDraft, isSubmitting, submittingRef };
}

// --- Abort detection (page unload / tab close) ---
function setupAbortDetection(clientLogger) {
  const onBeforeUnload = () => {
    try {
      clientLogger.logResponseError('ABORTED: page unload');
    } catch (e) { /* best-effort */ }
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      onBeforeUnload();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('beforeunload', onBeforeUnload);
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('beforeunload', onBeforeUnload);
  };
}

// Simple client-side hour calculation for draft display
function calculateHoursSimple(start, end, breakMinutes) {
  if (!start || !end) return 0;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let mins = (eH * 60 + eM) - (sH * 60 + sM);
  if (mins < 0) mins += 24 * 60;
  mins = Math.max(0, mins - Math.max(0, breakMinutes || 0));
  return Math.round(mins / 60 * 100) / 100;
}