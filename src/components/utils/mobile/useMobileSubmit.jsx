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
    if (trips.length === 0) {
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

    // Single-day: validate trip times vs service times
    if (!isMultiDay || !formData.end_date || formData.end_date === formData.date) {
      for (let i = 0; i < trips.length; i++) {
        const trip = trips[i];
        const tripStart = timeToMinutes(trip.start_time);
        const tripEnd = timeToMinutes(trip.end_time);
        const dienstStart = timeToMinutes(formData.start_time);
        const dienstEnd = timeToMinutes(formData.end_time);

        if (tripStart !== null && dienstStart !== null && tripStart < dienstStart) {
          toast.error(`Rit ${i + 1}: starttijd (${trip.start_time}) vóór start dienst (${formData.start_time}).`, { duration: 6000 });
          setActiveTab("ritten");
          return false;
        }
        if (tripEnd !== null && dienstEnd !== null && tripEnd > dienstEnd) {
          toast.error(`Rit ${i + 1}: eindtijd (${trip.end_time}) na einde dienst (${formData.end_time}).`, { duration: 6000 });
          setActiveTab("ritten");
          return false;
        }
      }
    }

    return true;
  }, [trips, formData, isMultiDay, setActiveTab]);

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
      toast.error(result.message || 'Er is een fout opgetreden bij het indienen.');
    }

    return result;
  }, [signature, formData, trips, standplaatsWerk, currentEmployee, isMultiDay, submitEntry, resetForm, setActiveTab, queryClient]);

  // --- Save draft ---
  const handleSaveDraft = useCallback(async () => {
    if (!currentEmployee?.id) {
      toast.error('Medewerker niet gevonden.');
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
  }, [formData, trips, standplaatsWerk, currentEmployee, isMultiDay, saveDraft]);

  // --- Orchestrated submit flow (with signature check) ---
  const startSubmitFlow = useCallback(async () => {
    if (!validateBeforeSubmit()) return;
    if (!signature) {
      return { needsSignature: true };
    }
    return handleSubmitEntry();
  }, [validateBeforeSubmit, signature, handleSubmitEntry]);

  // --- Called after signature is captured ---
  const handleSignatureAndSubmit = useCallback((dataUrl) => {
    setSignature(dataUrl);
    handleSubmitEntry(dataUrl);
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