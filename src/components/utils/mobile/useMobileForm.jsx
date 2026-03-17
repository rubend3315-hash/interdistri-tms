import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { applyPostnlOffset, formatMinutes } from "./timePolicy";

/**
 * useMobileForm — Form state, localStorage autosave, and server draft loading.
 * Date-aware: switching date in WeekHeader resets form + loads correct draft.
 */
export function useMobileForm({ isMultiDay = false, currentEmployee, businessMode = "HANDMATIG" }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Per-datum storage key
  const getStorageKey = (date) => {
    const empId = currentEmployee?.id || 'unknown';
    return `mobile_draft_${empId}_${date}`;
  };

  // Track current date to detect changes and prevent race conditions
  const currentDateRef = useRef(todayStr);

  const makeEmptyForm = (date) => ({
    date,
    ...(isMultiDay ? { end_date: date } : {}),
    start_time: "", end_time: "",
    break_minutes: 0, break_manual: false, notes: ""
  });

  // Load localStorage draft for a specific date
  const loadLocalDraft = (date) => {
    try {
      const key = getStorageKey(date);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData?.date === date) return parsed;
      }
    } catch {}
    return null;
  };

  // --- Form data ---
  const [formData, setFormData] = useState(() => {
    const draft = loadLocalDraft(todayStr);
    return draft?.formData || makeEmptyForm(todayStr);
  });

  // --- DienstRegels (unified rit + standplaats) ---
  const [dienstRegels, setDienstRegels] = useState(() => {
    const draft = loadLocalDraft(todayStr);
    if (draft?.dienstRegels?.length) return draft.dienstRegels;
    return [];
  });

  // Derived: trips and standplaatsWerk for backwards compatibility with submit/save
  const trips = dienstRegels.filter(r => r.type === "rit");
  const standplaatsWerk = dienstRegels.filter(r => r.type === "standplaats");

  // --- Signature ---
  const [signature, setSignature] = useState(null);

  // --- Inspection ---
  const [inspectionData, setInspectionData] = useState({
    vehicle_id: "", mileage: "",
    exterior_clean: true, interior_clean: true, lights_working: true,
    tires_ok: true, brakes_ok: true, oil_level_ok: true, coolant_level_ok: true,
    windshield_ok: true, mirrors_ok: true, horn_working: true,
    first_aid_kit: true, fire_extinguisher: true, warning_triangle: true, safety_vest: true,
    damage_present: false, damage_description: "", notes: "", damage_photos: []
  });

  // --- Expense ---
  const [expenseData, setExpenseData] = useState({
    date: todayStr, category: "Brandstof",
    description: "", amount: "", receipt_file: null, receipt_url: ""
  });

  // --- Load server draft on mount ---
  const [draftLoaded, setDraftLoaded] = useState(false);

  // --- AutoSave (blocked until server draft is loaded to prevent race condition) ---
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Track last server-saved dienstRegels to avoid redundant writes
  const lastSavedRegelsRef = useRef(null);
  // In-flight guard: prevent parallel saveDraftServiceRules calls
  const draftRulesSavingRef = useRef(false);
  // Track the current draft TimeEntry id for saveDraftServiceRules
  const draftTimeEntryIdRef = useRef(null);
  // Guard: skip autosave on initial mount and after date change (hydration cycle)
  const isInitialMount = useRef(true);

  useEffect(() => {
    // CRITICAL: Don't autosave until server draft has been loaded/attempted
    if (!draftLoaded) return;
    if (!currentEmployee?.id) return;

    // Skip the first autosave trigger after mount or date change (data hydration)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // GUARD: skip autosave if form has no meaningful content
    const hasContent = !!(formData.start_time || formData.end_time || dienstRegels.length > 0);
    if (!hasContent) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        // 1. Save to localStorage (instant)
        const key = getStorageKey(formData.date);
        localStorage.setItem(key, JSON.stringify({
          formData, dienstRegels, savedAt: Date.now()
        }));

        // 2. Save TimeEntry to server
        const upsertRes = await base44.functions.invoke('upsertDraftTimeEntry', {
          employee_id: currentEmployee.id,
          date: formData.date,
          start_time: formData.start_time || '',
          end_time: formData.end_time || '',
          break_minutes: formData.break_minutes ?? 0,
          break_manual: formData.break_manual ?? false,
          notes: formData.notes || '',
          ...(isMultiDay ? { end_date: formData.end_date } : {}),
        });
        if (upsertRes?.data?.id) {
          draftTimeEntryIdRef.current = upsertRes.data.id;
        }

        // 3. Save dienstRegels to server (only if changed AND no other save in flight)
        const regelsJson = JSON.stringify(dienstRegels);
        const needsSave = (dienstRegels.length > 0 && regelsJson !== lastSavedRegelsRef.current)
          || (dienstRegels.length === 0 && lastSavedRegelsRef.current && lastSavedRegelsRef.current !== '[]');

        if (needsSave && !draftRulesSavingRef.current && draftTimeEntryIdRef.current) {
          draftRulesSavingRef.current = true;
          try {
            await base44.functions.invoke('saveDraftServiceRules', {
              employee_id: currentEmployee.id,
              date: formData.date,
              time_entry_id: draftTimeEntryIdRef.current,
              dienstRegels,
            });
            lastSavedRegelsRef.current = dienstRegels.length === 0 ? '[]' : regelsJson;
          } finally {
            draftRulesSavingRef.current = false;
          }
        }

        // 4. Only show "Concept opgeslagen" after all server writes succeed
        setLastSavedAt(Date.now());
      } catch (e) {
        console.error('[useMobileForm] Autosave failed:', e?.message);
      }
      setIsSaving(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData, dienstRegels, draftLoaded, currentEmployee?.id]);

  // =============================================
  // DATE CHANGE DETECTION — reset + reload draft
  // =============================================
  useEffect(() => {
    const newDate = formData.date;
    if (newDate === currentDateRef.current) return;
    
    console.log(`[useMobileForm] Date changed: ${currentDateRef.current} → ${newDate}`);
    currentDateRef.current = newDate;

    // Reset isInitialMount so first autosave after hydration on new date is skipped
    isInitialMount.current = true;

    // 1. Reset form fields for new date — start clean, server draft will overwrite
    setFormData(makeEmptyForm(newDate));
    setDienstRegels([]);
    setSignature(null);
    draftTimeEntryIdRef.current = null;
    lastSavedRegelsRef.current = null;

    // 2. Re-trigger server draft loading for new date
    setDraftLoaded(false);
  }, [formData.date]);

  // --- AUTO_RIT: generate 1 rit when PostNL klanttype selected ---
  const [autoRitDismissed, setAutoRitDismissed] = useState(false);

  // This effect is triggered externally via triggerAutoRit
  // Kept for backward compat with AUTO_RIT businessMode
  useEffect(() => {
    if (businessMode !== "AUTO_RIT") return;
    if (autoRitDismissed) return;
    if (dienstRegels.length > 0) return;
    if (!formData.start_time || !formData.end_time) return;

    generateAutoRit(formData.start_time, formData.end_time, "");
  }, [businessMode, formData.start_time, formData.end_time, dienstRegels.length, autoRitDismissed]);

  const generateAutoRit = useCallback((startTime, endTime, postNLCustomerId) => {
    // GUARD: only generate when no regels exist (prevents double offset)
    setDienstRegels(prev => {
      if (prev.length > 0) return prev; // Already has regels — skip

      const [sH, sM] = startTime.split(':').map(Number);
      if (isNaN(sH) || isNaN(sM)) return prev;

      // SINGLE offset point: PostNL auto-rit starts dienst.start + offset via TimePolicy
      const startMin = applyPostnlOffset(sH * 60 + sM);

      return [{
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        type: "rit",
        start_time: formatMinutes(startMin),
        end_time: "", // OPEN — filled later at end of day
        departure_location: "Standplaats",
        vehicle_id: "", damage_occurred: "Nee",
        start_km: "", end_km: "", fuel_liters: "", adblue_liters: "",
        fuel_km: "", charging_kwh: "", customer_id: postNLCustomerId || "", route_name: "",
        planned_stops: "", notes: "",
        autoGenerated: true,
        openRit: true,
      }];
    });
  }, [setDienstRegels]);

  // Mark dismissed when user manually removes all regels (so we don't re-generate)
  const wrappedSetDienstRegels = useCallback((updater) => {
    setDienstRegels(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (prev.length > 0 && next.length === 0) setAutoRitDismissed(true);
      return next;
    });
  }, []);

  // --- Progress ---
  // Open rit: treat "Regels" step as complete for morning phase
  const hasOpenRit = dienstRegels.some(r => r.openRit && !r.end_time);
  const progressStep = (() => {
    if (!formData.start_time) return 0;
    if (dienstRegels.length === 0) return 1;
    // With open rit and no end_time yet → step 2 (Regels done, Eind pending)
    if (hasOpenRit && !formData.end_time) return 2;
    if (!formData.end_time) return 2;
    if (!signature) return 3;
    return 4;
  })();

  useEffect(() => {
    if (!currentEmployee?.id || draftLoaded) return;

    // Capture the date at the start of this async operation for race-condition guard
    const targetDate = formData.date;

    const loadDraft = async () => {
      try {
        const draftEntries = await base44.entities.TimeEntry.filter({
          employee_id: currentEmployee.id,
          date: targetDate,
          status: 'Concept'
        });

        // Race condition guard: if user changed date while we were fetching, discard
        if (currentDateRef.current !== targetDate) {
          console.log(`[useMobileForm] Draft fetch for ${targetDate} discarded — date changed to ${currentDateRef.current}`);
          return;
        }

        if (draftEntries.length > 0) {
          const draft = draftEntries[0];
          draftTimeEntryIdRef.current = draft.id;
          setFormData(prev => ({
            ...prev,
            date: targetDate,
            ...(isMultiDay ? { end_date: draft.end_date || targetDate } : {}),
            start_time: draft.start_time || "",
            end_time: draft.end_time || "",
            break_minutes: draft.break_minutes ?? 0,
            notes: draft.notes || ""
          }));
          if (draft.signature_url) setSignature(draft.signature_url);
        }

        const existingTrips = await base44.entities.Trip.filter({
          employee_id: currentEmployee.id, date: targetDate
        });

        // Race guard again after second fetch
        if (currentDateRef.current !== targetDate) return;

        const draftTrips = existingTrips.filter(t => t.status === 'Gepland');
        const loadedRegels = [];
        if (draftTrips.length > 0) {
          draftTrips.forEach(t => loadedRegels.push({
            id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
            type: "rit",
            start_time: t.departure_time || "",
            end_time: t.arrival_time || "",
            departure_location: t.departure_location || "Standplaats",
            vehicle_id: t.vehicle_id || "",
            damage_occurred: "Nee",
            start_km: t.start_km ? String(t.start_km) : "",
            end_km: t.end_km ? String(t.end_km) : "",
            fuel_liters: t.fuel_liters ? String(t.fuel_liters) : "",
            adblue_liters: t.adblue_liters ? String(t.adblue_liters) : "",
            fuel_km: t.fuel_km ? String(t.fuel_km) : "",
            charging_kwh: t.charging_kwh ? String(t.charging_kwh) : "",
            customer_id: t.customer_id || "",
            route_name: t.route_name || "",
            planned_stops: t.planned_stops ? String(t.planned_stops) : "",
            notes: t.notes || "",
            _existingId: t.id
          }));
        }

        const existingSpw = await base44.entities.StandplaatsWerk.filter({
          employee_id: currentEmployee.id, date: targetDate
        });

        // Race guard again
        if (currentDateRef.current !== targetDate) return;

        const draftSpw = existingSpw.filter(s => s.status === 'Concept');
        if (draftSpw.length > 0) {
          draftSpw.forEach(s => loadedRegels.push({
            id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
            type: "standplaats",
            start_time: s.start_time || "",
            end_time: s.end_time || "",
            customer_id: s.customer_id || "",
            project_id: s.project_id || "",
            activity_id: s.activity_id || "",
            notes: s.notes || "",
            _existingId: s.id
          }));
        }
        // CRITICAL: Replace (not merge) — prevents duplication from localStorage + server
        if (loadedRegels.length > 0) {
          setDienstRegels(loadedRegels);
          // Update lastSavedRef so autosave doesn't immediately re-save identical data
          lastSavedRegelsRef.current = JSON.stringify(loadedRegels);
        }
      } catch (error) {
        console.error('Draft laden mislukt:', error);
      } finally {
        // Only mark loaded if we're still on the same date
        if (currentDateRef.current === targetDate) {
          setDraftLoaded(true);
        }
      }
    };

    loadDraft();
  }, [currentEmployee?.id, draftLoaded, formData.date, isMultiDay]);

  // --- Calculate hours (client-side for display only) ---
  const calculateHours = useCallback((start, end, breakMin, startDate, endDate) => {
    if (!start || !end) return 0;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let mins = (eH * 60 + eM) - (sH * 60 + sM);
    if (isMultiDay && endDate && startDate && endDate > startDate) {
      const d1 = new Date(startDate + 'T12:00:00');
      const d2 = new Date(endDate + 'T12:00:00');
      mins += Math.round((d2 - d1) / 864e5) * 1440;
    } else if (mins < 0) {
      mins += 1440;
    }
    return Math.round(Math.max(0, mins - Math.max(0, breakMin || 0)) / 60 * 100) / 100;
  }, [isMultiDay]);

  // --- Reset after successful submit ---
  const resetForm = useCallback(() => {
    const dateToReset = formData.date;
    setDienstRegels([]);
    setSignature(null);
    setFormData(makeEmptyForm(todayStr));
    currentDateRef.current = todayStr;
    draftTimeEntryIdRef.current = null;
    try { localStorage.removeItem(getStorageKey(dateToReset)); } catch {}
  }, [todayStr, isMultiDay, formData.date, currentEmployee?.id]);

  return {
    formData, setFormData,
    dienstRegels, setDienstRegels: wrappedSetDienstRegels,
    trips, standplaatsWerk,
    signature, setSignature,
    inspectionData, setInspectionData,
    expenseData, setExpenseData,
    lastSavedAt, isSaving,
    progressStep,
    calculateHours,
    resetForm,
    storageKey: getStorageKey(formData.date),
    generateAutoRit,
    autoRitDismissed,

  };
}