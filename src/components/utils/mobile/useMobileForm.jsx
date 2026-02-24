import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";

/**
 * useMobileForm — Form state, localStorage autosave, and server draft loading.
 * 
 * @param {Object} options
 * @param {boolean} options.isMultiDay - Multi-day entry mode
 * @param {Object|null} options.currentEmployee - Current employee record
 */
export function useMobileForm({ isMultiDay = false, currentEmployee, businessMode = "HANDMATIG" }) {
  const storageKey = isMultiDay ? 'mobile-entry-multiday-draft' : 'mobile-entry-draft';
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // --- Form data ---
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData?.date === todayStr) return parsed.formData;
      }
    } catch {}
    return {
      date: todayStr,
      ...(isMultiDay ? { end_date: todayStr } : {}),
      start_time: "", end_time: "",
      break_minutes: 30, notes: ""
    };
  });

  // --- DienstRegels (unified rit + standplaats) ---
  const [dienstRegels, setDienstRegels] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData?.date === todayStr) {
          // Support new format
          if (parsed.dienstRegels?.length) return parsed.dienstRegels;
          // Migrate legacy format
          const rules = [];
          if (parsed.trips?.length) {
            parsed.trips.forEach(t => rules.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, type: "rit", ...t }));
          }
          if (parsed.standplaatsWerk?.length) {
            parsed.standplaatsWerk.forEach(s => rules.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, type: "standplaats", ...s }));
          }
          if (rules.length > 0) return rules;
        }
      }
    } catch {}
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

  useEffect(() => {
    // CRITICAL: Don't autosave until server draft has been loaded/attempted
    // Otherwise localStorage overwrites with stale data before server draft arrives
    if (!draftLoaded) return;

    setIsSaving(true);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          formData, dienstRegels, savedAt: Date.now()
        }));
        setLastSavedAt(Date.now());
      } catch {}
      setIsSaving(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData, dienstRegels, storageKey, draftLoaded]);

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
    const [sH, sM] = startTime.split(':').map(Number);
    if (isNaN(sH) || isNaN(sM)) return;

    // Open Rit model: start = dienst.start + 1 min, end = empty (OPEN)
    const startMin = sH * 60 + sM + 1;
    const fmt = (m) => {
      const h = Math.floor(((m % 1440) + 1440) % 1440 / 60);
      const mm = ((m % 1440) + 1440) % 1440 % 60;
      return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };

    setDienstRegels([{
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      type: "rit",
      start_time: fmt(startMin),
      end_time: "", // OPEN — filled later at end of day
      departure_location: "Standplaats",
      vehicle_id: "", damage_occurred: "Nee",
      start_km: "", end_km: "", fuel_liters: "", adblue_liters: "",
      fuel_km: "", charging_kwh: "", customer_id: postNLCustomerId || "", route_name: "",
      planned_stops: "", notes: "",
      autoGenerated: true,
      openRit: true, // Mark as OPEN rit
    }]);
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
  const progressStep = (() => {
    if (!formData.start_time) return 0;
    if (dienstRegels.length === 0) return 1;
    if (!formData.end_time) return 2;
    if (!signature) return 3;
    return 4;
  })();

  useEffect(() => {
    if (!currentEmployee?.id || draftLoaded) return;

    const loadDraft = async () => {
      try {
        const draftEntries = await base44.entities.TimeEntry.filter({
          employee_id: currentEmployee.id,
          date: todayStr,
          status: 'Concept'
        });

        if (draftEntries.length > 0) {
          const draft = draftEntries[0];
          setFormData(prev => ({
            ...prev,
            date: draft.date || todayStr,
            ...(isMultiDay ? { end_date: draft.end_date || todayStr } : {}),
            start_time: draft.start_time || "",
            end_time: draft.end_time || "",
            break_minutes: draft.break_minutes ?? 30,
            notes: draft.notes || ""
          }));
          if (draft.signature_url) setSignature(draft.signature_url);
        }

        const existingTrips = await base44.entities.Trip.filter({
          employee_id: currentEmployee.id, date: todayStr
        });
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
          employee_id: currentEmployee.id, date: todayStr
        });
        if (existingSpw.length > 0) {
          existingSpw.forEach(s => loadedRegels.push({
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
        if (loadedRegels.length > 0) setDienstRegels(loadedRegels);
      } catch (error) {
        console.error('Draft laden mislukt:', error);
      } finally {
        setDraftLoaded(true);
      }
    };

    loadDraft();
  }, [currentEmployee?.id, draftLoaded, todayStr, isMultiDay]);

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
    setDienstRegels([]);
    setSignature(null);
    setFormData({
      date: todayStr,
      ...(isMultiDay ? { end_date: todayStr } : {}),
      start_time: "", end_time: "",
      break_minutes: 30, notes: ""
    });
    try { localStorage.removeItem(storageKey); } catch {}
  }, [todayStr, isMultiDay, storageKey]);

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
    storageKey,
    generateAutoRit,
    autoRitDismissed,
  };
}