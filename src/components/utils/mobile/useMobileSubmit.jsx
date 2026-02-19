import { useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useEntrySubmit } from "./useEntrySubmit";

const timeToMinutes = (time) => {
  if (!time || time.length < 5) return null;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

/**
 * Build service range for single-day only.
 * Handles overnight shifts (end_time <= start_time → +1440).
 */
function buildSingleDayServiceRange(formData) {
  const sMin = timeToMinutes(formData.start_time);
  const eMin = timeToMinutes(formData.end_time);
  if (sMin === null || eMin === null) return null;
  return {
    serviceStart: sMin,
    serviceEnd: eMin <= sMin ? eMin + 1440 : eMin,
  };
}

/**
 * Convert minutes to absolute offset for single-day validation.
 * If m < serviceStart, treat as next day (+1440) for overnight shifts.
 * Accepts raw minutes (number) or time string.
 */
function toAbsoluteMinutes(timeOrMinutes, serviceStart) {
  const m = typeof timeOrMinutes === 'number' ? timeOrMinutes : timeToMinutes(timeOrMinutes);
  if (m === null) return null;
  return m < serviceStart ? m + 1440 : m;
}

/**
 * useMobileSubmit — Handles validation + submit + draft save.
 * Uses useEntrySubmit for the actual backend call.
 * No direct entity calls.
 */
export function useMobileSubmit({
  formData, trips, standplaatsWerk, signature, setSignature,
  currentEmployee, isMultiDay, resetForm, setActiveTab, queryClient
}) {
  const { submitEntry, saveDraft, isSubmitting, submittingRef } = useEntrySubmit();

  // --- Client-side validation before submit ---
  const validateBeforeSubmit = useCallback(() => {
    console.log('[validateBeforeSubmit] ENTERED — trips:', trips.length, 'isMultiDay:', isMultiDay);
    if (trips.length === 0) {
      console.log('[validateBeforeSubmit] FAIL: no trips');
      toast.error('Je moet minimaal één rit invoeren.');
      setActiveTab("ritten");
      return false;
    }

    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i];
      if (!trip.start_time || !trip.end_time) {
        toast.error(`Rit ${i + 1}: Vul zowel start- als eindtijd in.`);
        setActiveTab("ritten");
        return false;
      }
    }

    // Single-day only: validate trip + standplaatswerk times vs service range.
    // Multi-day is skipped — trips have no date field, backend handles full validation.
    const isSingleDay = !isMultiDay || !formData.end_date || formData.end_date === formData.date;
    console.log('[validateBeforeSubmit] isSingleDay:', isSingleDay);
    if (isSingleDay) {
      const range = buildSingleDayServiceRange(formData);
      console.log('[validateBeforeSubmit] range:', range);
      if (range) {
        const { serviceStart, serviceEnd } = range;
        const dienstLabel = `${formData.start_time}–${formData.end_time}`;
        const errors = [];

        for (let i = 0; i < trips.length; i++) {
          const trip = trips[i];
          const rawTs = timeToMinutes(trip.start_time);
          const rawTe = timeToMinutes(trip.end_time);

          const absTs = toAbsoluteMinutes(rawTs, serviceStart);
          const absTe = toAbsoluteMinutes(rawTe, serviceStart);
          console.log(`[validateBeforeSubmit] Rit ${i+1}: rawTs=${rawTs}, rawTe=${rawTe}, absTs=${absTs}, absTe=${absTe}, serviceStart=${serviceStart}, serviceEnd=${serviceEnd}`);
          if (rawTs !== null && rawTs < serviceStart && absTs > serviceEnd) {
            errors.push(`Rit ${i + 1} start vóór je diensttijd (${dienstLabel}).`);
          }
          if (rawTe !== null && absTe > serviceEnd) {
            errors.push(`Rit ${i + 1} eindigt na je diensttijd (${dienstLabel}).`);
          }
        }

        for (let i = 0; i < (standplaatsWerk || []).length; i++) {
          const spw = standplaatsWerk[i];
          if (!spw.start_time && !spw.end_time) continue;
          const rawSs = timeToMinutes(spw.start_time);
          const rawSe = timeToMinutes(spw.end_time);

          const absSs = toAbsoluteMinutes(rawSs, serviceStart);
          const absSe = toAbsoluteMinutes(rawSe, serviceStart);
          console.log(`[validateBeforeSubmit] SPW ${i+1}: rawSs=${rawSs}, rawSe=${rawSe}, absSs=${absSs}, absSe=${absSe}, serviceStart=${serviceStart}, serviceEnd=${serviceEnd}`);
          if (rawSs !== null && rawSs < serviceStart && absSs > serviceEnd) {
            errors.push(`Standplaatswerk ${i + 1} start vóór je diensttijd (${dienstLabel}).`);
          }
          if (rawSe !== null && absSe > serviceEnd) {
            errors.push(`Standplaatswerk ${i + 1} eindigt na je diensttijd (${dienstLabel}).`);
          }
        }

        if (errors.length > 0) {
          console.log('[validateBeforeSubmit] ERRORS:', errors);
          errors.forEach(e => toast.error(e, { duration: 6000 }));
          setTimeout(() => setActiveTab("ritten"), 0);
          return false;
        }
      }
    }

    console.log('[validateBeforeSubmit] PASSED');
    return true;
  }, [trips, standplaatsWerk, formData, isMultiDay, setActiveTab]);

  // --- Error mapping for backend HTTP status codes ---
  const mapErrorToMessage = useCallback((result) => {
    const code = result.error;
    const msg = result.message;
    
    if (code === 'DUPLICATE_SUBMISSION') return 'Deze dienst is al ingediend. Ververs de pagina.';
    if (code === 'TIME_OVERLAP' || code === 'DATE_OVERLAP' || code === 'OVERLAP_DETECTED') return msg || 'Overlap met bestaande dienst gedetecteerd.';
    if (code === 'CONCURRENT_SUBMIT') return 'Gelijktijdige submit gedetecteerd — probeer opnieuw.';
    if (code === 'VALIDATION_ERROR' || code === 'VALIDATION_FAILED') {
      const details = result.details;
      if (Array.isArray(details) && details.length) return details.join('\n');
      return msg || 'Validatiefout — controleer je invoer.';
    }
    if (code === 'UNAUTHORIZED' || code === 'AUTH_ERROR') return 'Je sessie is verlopen. Log opnieuw in.';
    if (code === 'EMPLOYEE_NOT_FOUND' || code === 'EMPLOYEE_INACTIVE') return 'Medewerker niet gevonden of niet actief — neem contact op met je supervisor.';
    if (code === 'ALREADY_SUBMITTING') return 'Bezig met indienen, even geduld...';
    if (code === 'NETWORK_ERROR') return 'Geen verbinding — probeer opnieuw.';
    if (code === 'TRANSACTION_FAILED') return 'Indienen mislukt — probeer opnieuw.';
    return msg || 'Er is een fout opgetreden bij het indienen.';
  }, []);

  // --- Submit handler ---
  const handleSubmitEntry = useCallback(async (signatureOverride) => {
    const finalSignature = signatureOverride || signature;

    if (!finalSignature) {
      // Will be called again after signature dialog
      return { needsSignature: true };
    }

    base44.analytics.track({
      eventName: "mobile_entry_submit_start",
      properties: { employeeId: currentEmployee?.id, date: formData.date, tripCount: trips.length }
    });

    const result = await submitEntry({
      formData,
      trips,
      standplaatsWerk,
      signature: finalSignature,
    });

    if (result.success) {
      const hasDamage = trips.some(t => t.damage_occurred === "Ja");

      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });

      base44.analytics.track({
        eventName: "mobile_entry_submit_success",
        properties: {
          employeeId: currentEmployee?.id, date: formData.date,
          tripCount: trips.length, isOnline: !result.offline,
          entryType: isMultiDay ? "multi_day" : "single_day"
        }
      });

      if (result.offline) {
        toast.info('📡 Offline opgeslagen — wordt automatisch verstuurd bij verbinding.');
      } else {
        toast.success('✅ Dienst afgerond — goede rit vandaag!');
      }

      resetForm();

      if (hasDamage) {
        window.open('https://mijn.bumper.nl', '_blank');
      }

      setActiveTab("home");
    } else {
      base44.analytics.track({
        eventName: "mobile_entry_submit_fail",
        properties: {
          employeeId: currentEmployee?.id, date: formData.date,
          error: result.error || "unknown", entryType: isMultiDay ? "multi_day" : "single_day"
        }
      });
      
      // Map backend error codes to user-friendly Dutch messages
      const userMessage = mapErrorToMessage(result);
      
      if (result.error === 'UNAUTHORIZED' || result.error === 'AUTH_ERROR') {
        toast.error(userMessage, { duration: 8000 });
        setTimeout(() => base44.auth.redirectToLogin(), 3000);
      } else if (result.error === 'DUPLICATE_SUBMISSION') {
        toast.warning(userMessage, { duration: 6000 });
        queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      } else if (result.error === 'TIME_OVERLAP' || result.error === 'DATE_OVERLAP') {
        toast.error(userMessage, { duration: 8000 });
        queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      } else {
        toast.error(userMessage, { duration: 6000 });
      }
    }

    return result;
  }, [signature, formData, trips, standplaatsWerk, currentEmployee, isMultiDay, submitEntry, resetForm, setActiveTab, queryClient, mapErrorToMessage]);

  // --- Save draft (guarded: blocks if submit is in progress) ---
  const handleSaveDraft = useCallback(async () => {
    if (!currentEmployee?.id) {
      toast.error('Medewerker niet gevonden.');
      return;
    }
    // Block draft save if a submit is already in progress
    if (submittingRef.current) {
      toast.info('Even wachten — indienen is bezig...');
      return;
    }

    const result = await saveDraft({
      formData,
      trips,
      standplaatsWerk,
      employeeId: currentEmployee.id,
    });

    if (result.success) {
      base44.analytics.track({
        eventName: "mobile_entry_draft_saved",
        properties: { employeeId: currentEmployee.id, date: formData.date, tripCount: trips.length, entryType: isMultiDay ? "multi_day" : "single_day" }
      });
      toast.success('✅ Concept opgeslagen — je kunt later verder');
    } else {
      toast.error('Concept opslaan mislukt.');
    }
  }, [formData, trips, standplaatsWerk, currentEmployee, isMultiDay, saveDraft, submittingRef]);

  // --- Orchestrated submit flow (with signature check) ---
  const startSubmitFlow = useCallback(async () => {
    console.log('[startSubmitFlow] ENTERED');
    if (!validateBeforeSubmit()) {
      console.log('[startSubmitFlow] validateBeforeSubmit returned FALSE');
      return { success: false };
    }
    if (!signature) {
      return { needsSignature: true };
    }
    return handleSubmitEntry();
  }, [validateBeforeSubmit, signature, handleSubmitEntry]);

  // --- Called after signature is captured ---
  const handleSignatureAndSubmit = useCallback(async (dataUrl) => {
    setSignature(dataUrl);
    const result = await handleSubmitEntry(dataUrl);
    // If submit failed, keep the signature so user doesn't have to re-draw
    // Signature is already set via setSignature above
    return result;
  }, [setSignature, handleSubmitEntry]);

  return {
    isSubmitting,
    submittingRef,
    validateBeforeSubmit,
    handleSubmitEntry,
    handleSaveDraft,
    startSubmitFlow,
    handleSignatureAndSubmit,
  };
}