import { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { addToSyncQueue } from '@/components/utils/offlineStorage';

/**
 * useEntrySubmit — Client-side hook for atomic time entry submission
 * 
 * Online: Single API call to submitTimeEntry backend function (atomic, validated)
 * Offline: Queue to IndexedDB for later sync
 * 
 * Uses addToSyncQueue directly from offlineStorage instead of creating
 * a second useOfflineSync instance (the page already has one).
 */
export function useEntrySubmit() {
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Submit a time entry (online → backend function, offline → queue)
   * 
   * @param {Object} params
   * @param {Object} params.formData - { date, end_date?, start_time, end_time, break_minutes, notes }
   * @param {Array}  params.trips - Array of trip objects
   * @param {Array}  params.standplaatsWerk - Array of standplaatswerk objects
   * @param {string} params.signature - Signature URL (already uploaded) or base64
   * @returns {Object} { success, offline, data?, error?, details? }
   */
  const submitEntry = useCallback(async ({ formData, trips, standplaatsWerk, signature }) => {
    if (submittingRef.current) return { success: false, error: 'ALREADY_SUBMITTING' };
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Upload signature if it's still base64
      let signatureUrl = signature;
      if (signature && signature.startsWith('data:')) {
        const blob = await fetch(signature).then(r => r.blob());
        const file = new File([blob], `sig-${Date.now()}.png`, { type: 'image/png' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        signatureUrl = file_url;
      }

      // Build server payload (flat, clean structure)
      // submission_id: dedicated idempotency field — same ID = same result on retry
      const submissionId = crypto.randomUUID();
      const payload = {
        submission_id: submissionId,
        date: formData.date,
        end_date: formData.end_date || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        break_minutes: Number(formData.break_minutes) || 0,
        notes: formData.notes || '',
        signature_url: signatureUrl || null,
        trips: trips.map(t => ({
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

      // Check connectivity at moment of submit (not stale React state)
      const currentlyOnline = navigator.onLine;

      if (!currentlyOnline) {
        // Offline fallback: queue for later sync
        const correlationId = crypto.randomUUID();
        await addToSyncQueue('submitTimeEntry', { ...payload, _correlationId: correlationId });
        return { success: true, offline: true };
      }

      // Online: single atomic API call
      const response = await base44.functions.invoke('submitTimeEntry', payload);
      const result = response.data;

      if (result.success) {
        return {
          success: true,
          offline: false,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: result.message,
          details: result.details || [],
        };
      }

    } catch (error) {
      // Distinguish axios response errors from network errors
      if (error?.response) {
        // Backend returned an HTTP error (4xx, 5xx)
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 409) {
          return { success: false, error: 'DUPLICATE_SUBMISSION', message: data?.message || 'Dubbele indiening gedetecteerd' };
        }
        if (status === 422) {
          return { success: false, error: 'VALIDATION_ERROR', message: data?.message || 'Validatiefout', details: data?.details || [] };
        }
        if (status === 401 || status === 403) {
          return { success: false, error: 'UNAUTHORIZED', message: 'Sessie verlopen — log opnieuw in' };
        }
        return { success: false, error: data?.error || 'SERVER_ERROR', message: data?.message || `Serverfout (${status})` };
      }
      
      // True network error (no response at all)
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: error?.message || 'Onverwachte fout',
      };
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  /**
   * Save as draft (still uses old client-side approach for now,
   * can be migrated to a separate backend function later)
   */
  const saveDraft = useCallback(async ({ formData, trips, standplaatsWerk, employeeId }) => {
    if (submittingRef.current) return { success: false };
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Draft saving still uses direct entity calls for speed
      // (draft = Concept status, low-risk partial writes acceptable)
      const hours = calculateHoursSimple(
        formData.start_time, formData.end_time, formData.break_minutes
      );

      const timeEntryPayload = {
        employee_id: employeeId,
        date: formData.date,
        end_date: formData.end_date || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        break_minutes: Number(formData.break_minutes) || 0,
        total_hours: hours,
        notes: formData.notes || null,
        status: 'Concept',
      };

      const existing = await base44.entities.TimeEntry.filter({
        employee_id: employeeId,
        date: formData.date,
        status: 'Concept'
      });

      if (existing.length > 0) {
        await base44.entities.TimeEntry.update(existing[0].id, timeEntryPayload);
        for (let i = 1; i < existing.length; i++) {
          await base44.entities.TimeEntry.delete(existing[i].id);
        }
      } else {
        await base44.entities.TimeEntry.create(timeEntryPayload);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error?.message || 'Opslaan mislukt' };
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return { submitEntry, saveDraft, isSubmitting, submittingRef };
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