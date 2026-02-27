import { useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useEntrySubmit } from "./useEntrySubmit";
import { findOverlaps, validateBounds } from "./dienstRegelValidation";
import { validateTimeEntryCore } from "../validation/timeEntryValidation";
import { createClientSubmitLogger } from "./clientSubmitLogger";

/**
 * useMobileSubmit — Handles validation + submit + draft save.
 * Uses useEntrySubmit for the actual backend call.
 * No direct entity calls.
 */
export function useMobileSubmit({
  formData, trips, standplaatsWerk, dienstRegels = [], signature, setSignature,
  currentEmployee, isMultiDay, resetForm, setActiveTab, queryClient,
  geenRit = false, geenRitReden = ""
}) {
  const { submitEntry, saveDraft, isSubmitting, submittingRef } = useEntrySubmit();

  // --- Client-side validation before submit ---
  const validateBeforeSubmit = useCallback(() => {
    console.log('[validateBeforeSubmit] ENTERED — dienstRegels:', dienstRegels.length, 'isMultiDay:', isMultiDay, 'geenRit:', geenRit);

    // 0. Shared core validation (single source of truth)
    const ritRegelsForCore = dienstRegels.filter(r => r.type === "rit");
    const standplaatsRegels = dienstRegels.filter(r => r.type === "standplaats");
    const coreErrors = validateTimeEntryCore({
      trips: ritRegelsForCore,
      standplaatsen: standplaatsRegels,
      geenRit,
      reden: geenRitReden,
    });
    if (coreErrors.length > 0) {
      coreErrors.forEach(e => toast.error(e));
      if (!geenRit) setActiveTab("ritten");
      return false;
    }

    // GEEN_RIT passed core → skip further regel validations
    if (geenRit) {
      console.log('[validateBeforeSubmit] PASSED (GEEN_RIT)');
      return true;
    }

    // 0b. Multi-day safety: block if not authorized
    if (!isMultiDay && formData.end_date && formData.end_date !== formData.date) {
      toast.error('Meerdaagse dienst is niet toegestaan voor deze medewerker.');
      return false;
    }

    // 2. Elke rit moet starttijd hebben; eindtijd verplicht tenzij openRit
    const ritRegels = dienstRegels.filter(r => r.type === "rit");
    for (let i = 0; i < ritRegels.length; i++) {
      if (!ritRegels[i].start_time) {
        toast.error(`Rit ${i + 1}: Vul een starttijd in.`);
        setActiveTab("ritten");
        return false;
      }
      // Open rit without end_time: block final submit, must close first
      if (!ritRegels[i].end_time) {
        toast.error(`Rit ${i + 1}: Vul eerst de eindtijd in om in te dienen.`);
        setActiveTab("ritten");
        return false;
      }
    }

    // 3. Overlap check (hard block)
    const overlapPairs = findOverlaps(dienstRegels);
    if (overlapPairs.length > 0) {
      const { i, j } = overlapPairs[0];
      toast.error(`Tijden overlappen: regel ${i + 1} en regel ${j + 1}. Pas de tijden aan.`);
      setActiveTab("ritten");
      return false;
    }

    // 4. Bounds check: regels within dienst times
    if (formData.start_time && formData.end_time) {
      const allHaveTimes = dienstRegels.every(r => r.start_time && r.end_time);
      if (allHaveTimes) {
        const { valid, errors } = validateBounds(dienstRegels, formData.start_time, formData.end_time);
        if (!valid) {
          errors.forEach(e => toast.error(e, { duration: 6000 }));
          setActiveTab("ritten");
          return false;
        }
      }
    }

    // 5. KM validation for ritten with vehicle
    for (let i = 0; i < ritRegels.length; i++) {
      if (ritRegels[i].vehicle_id && !ritRegels[i].start_km) {
        toast.error(`Rit ${i + 1}: Begin km is verplicht bij rit met voertuig.`);
        setActiveTab("ritten");
        return false;
      }
      // Eind km verplicht bij afsluiten (closed rit)
      if (ritRegels[i].vehicle_id && ritRegels[i].end_time && !ritRegels[i].end_km) {
        toast.error(`Rit ${i + 1}: Eind km is verplicht bij afgesloten rit.`);
        setActiveTab("ritten");
        return false;
      }
      // Eind km >= begin km
      if (ritRegels[i].end_km && ritRegels[i].start_km && Number(ritRegels[i].end_km) < Number(ritRegels[i].start_km)) {
        toast.error(`Rit ${i + 1}: Eind km moet groter of gelijk zijn aan begin km.`);
        setActiveTab("ritten");
        return false;
      }
    }

    console.log('[validateBeforeSubmit] PASSED');
    return true;
  }, [dienstRegels, formData, isMultiDay, setActiveTab, geenRit, geenRitReden]);

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

    // Build final formData with GEEN_RIT prefix if applicable
    const finalFormData = geenRit
      ? { ...formData, notes: `[GEEN_RIT] ${geenRitReden}${formData.notes ? '\n' + formData.notes : ''}` }
      : formData;

    // Check signature size warning
    const sigLogger = createClientSubmitLogger({ userEmail: currentEmployee?.email || '', employeeId: currentEmployee?.id || '', entryDate: formData.date });
    const sigWarning = sigLogger.getSignatureWarning(finalSignature);
    if (sigWarning) {
      toast.warning(sigWarning, { duration: 8000 });
    }

    const result = await submitEntry({
      formData: finalFormData,
      trips: geenRit ? [] : trips,
      standplaatsWerk: geenRit ? [] : standplaatsWerk,
      signature: finalSignature,
      userEmail: currentEmployee?.email || '',
      employeeId: currentEmployee?.id || '',
    });

    // Show retry feedback if retries occurred
    if (result.retryCount > 0 && result.success) {
      toast.info('Verbinding hersteld — succesvol ingediend na herpoging.', { duration: 4000 });
    }

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