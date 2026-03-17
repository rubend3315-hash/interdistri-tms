// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: BACKGROUND / FIRE-AND-FORGET                     ║
// ║ Called by: submitTimeEntry (fire-and-forget, not awaited)        ║
// ║ Auth: Service role (called from backend function)                ║
// ║ PURPOSE: Upsert Trips/SPW, write-verify, post-commit guard      ║
// ║ IDEMPOTENT: safe to call multiple times for same time_entry_id   ║
// ║ NEVER affects the original SUCCESS status of the submission.     ║
// ║ v2 — idempotent upsert — 2026-03-17                              ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// --- TIME HELPERS (duplicated from submitTimeEntry for independence) ---
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
function isTime(t) { return typeof t === 'string' && TIME_RE.test(t); }
function timeMin(t) { if (!isTime(t)) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function effectiveEndDate(service) {
  if (service.end_date) return service.end_date;
  const s = timeMin(service.start_time), e = timeMin(service.end_time);
  if (s !== null && e !== null && e <= s) return addDays(service.date, 1);
  return service.date;
}

function servicesOverlap(existing, incoming) {
  const exStart = existing.date;
  const exEnd = effectiveEndDate(existing);
  const newStart = incoming.date;
  const newEnd = effectiveEndDate(incoming);
  if (exEnd < newStart || newEnd < exStart) return false;
  if (exStart === exEnd && newStart === newEnd && exStart === newStart) {
    const ns = timeMin(incoming.start_time), ne = timeMin(incoming.end_time);
    const es = timeMin(existing.start_time), ee = timeMin(existing.end_time);
    if (ns === null || ne === null || es === null || ee === null) return false;
    return ns < ee && ne > es;
  }
  if (exStart < newEnd && exEnd > newStart) return true;
  const ns = timeMin(incoming.start_time), ne = timeMin(incoming.end_time);
  const es = timeMin(existing.start_time), ee = timeMin(existing.end_time);
  if (exEnd === newStart && ee !== null && ns !== null) return ee > ns;
  if (newEnd === exStart && ne !== null && es !== null) return ne > es;
  return false;
}

function validateTimeEntryOverlap(existingEntries, employeeId, date, endDate, startTime, endTime) {
  const incomingEntry = { date, end_date: endDate || null, start_time: startTime, end_time: endTime };
  const newEffEnd = effectiveEndDate(incomingEntry);
  const committed = existingEntries.filter(e => {
    if (e.employee_id !== employeeId) return false;
    if (e.status !== 'Ingediend' && e.status !== 'Goedgekeurd') return false;
    const exEffEnd = effectiveEndDate(e);
    return exEffEnd >= date && e.date <= newEffEnd;
  });
  for (const ex of committed) {
    if (servicesOverlap(ex, incomingEntry)) {
      const exEnd = ex.end_date || ex.date;
      const isSameDay = !endDate && !ex.end_date && date === ex.date;
      return {
        overlaps: true,
        errorCode: isSameDay ? 'TIME_OVERLAP' : 'DATE_OVERLAP',
        errorMsg: isSameDay
          ? `Overlapt met dienst ${ex.start_time}-${ex.end_time} op ${ex.date}`
          : `Overlapt met dienst ${ex.date} t/m ${exEnd}`,
        existingId: ex.id,
      };
    }
  }
  return { overlaps: false };
}

// --- SAFE DELETE ---
async function safeDelete(entity, id, label) {
  try { await entity.delete(id); }
  catch (e) { console.error(`Failed to delete ${label} ${id}: ${e.message}`); }
}

Deno.serve(async (req) => {
  const t0 = Date.now();
  // Outer-scope vars for error handler access (req body can only be read once)
  let _submission_id = null;
  let _employee_id = null;

  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const payload = await req.json();
    const { time_entry_id, employee_id, submission_id, trips, standplaats_werk, date, end_date, start_time, end_time } = payload;
    _submission_id = submission_id;
    _employee_id = employee_id;

    if (!time_entry_id || !employee_id || !submission_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[RECALC] Starting for TE=${time_entry_id} sub=${submission_id}`);

    const perf = {};
    const createdTripIds = [];
    const createdSpwIds = [];

    // ========================================
    // 1. CREATE TRIPS (with km continuity check)
    // ========================================
    const tTrips = Date.now();
    if (Array.isArray(trips) && trips.length > 0) {
      // Collect unique vehicle IDs for km continuity check
      const vehicleIds = [...new Set(trips.filter(t => t.vehicle_id).map(t => t.vehicle_id))];
      
      // Fetch last known trip per vehicle (for km continuity) — single bulk query
      const lastTripByVehicle = {};
      if (vehicleIds.length > 0) {
        try {
          const allVehicleTrips = await svc.entities.Trip.filter({
            vehicle_id: { $in: vehicleIds },
          }, '-date', 50);
          // Determine the most recent trip per vehicle in memory
          for (const vt of allVehicleTrips) {
            if (!vt.vehicle_id) continue;
            const existing = lastTripByVehicle[vt.vehicle_id];
            if (!existing || vt.date > existing.date || (vt.date === existing.date && vt.created_date > existing.created_date)) {
              lastTripByVehicle[vt.vehicle_id] = vt;
            }
          }
        } catch (e) { console.error('[KM_CHECK] Failed to fetch vehicle history:', e.message); }
      }

      for (const trip of trips) {
        // KM continuity warning
        let kmWarning = null;
        const totalKm = (trip.start_km != null && trip.end_km != null) ? Math.max(0, Number(trip.end_km) - Number(trip.start_km)) : null;
        
        const warnings = [];
        
        // Check 1: absolute km distance
        if (totalKm != null && totalKm > 400) {
          warnings.push(`Rode afwijking: ${totalKm} km gereden (>400 km)`);
        } else if (totalKm != null && totalKm > 250) {
          warnings.push(`Gele afwijking: ${totalKm} km gereden (>250 km)`);
        }
        
        // Check 2: km continuity with previous trip on same vehicle
        if (trip.vehicle_id && trip.start_km != null && lastTripByVehicle[trip.vehicle_id]) {
          const lastTrip = lastTripByVehicle[trip.vehicle_id];
          if (lastTrip.end_km != null) {
            const gap = Math.abs(Number(trip.start_km) - Number(lastTrip.end_km));
            if (gap > 50) {
              warnings.push(`KM-gat: begin ${trip.start_km} vs vorige eind ${lastTrip.end_km} (verschil ${gap} km, voertuig ${trip.vehicle_id}, vorige rit ${lastTrip.date})`);
            }
          }
        }
        
        if (warnings.length > 0) kmWarning = warnings.join(' | ');

        const t = await svc.entities.Trip.create({
          employee_id, time_entry_id, date,
          vehicle_id: trip.vehicle_id,
          customer_id: trip.customer_id || null,
          route_name: trip.route_name ? String(trip.route_name).slice(0, 200) : null,
          planned_stops: trip.planned_stops != null ? Math.max(0, Math.min(9999, Number(trip.planned_stops) || 0)) : null,
          start_km: trip.start_km != null ? Math.max(0, Math.min(9999999, Number(trip.start_km) || 0)) : null,
          end_km: trip.end_km != null ? Math.max(0, Math.min(9999999, Number(trip.end_km) || 0)) : null,
          total_km: totalKm,
          fuel_liters: trip.fuel_liters != null ? Math.max(0, Math.min(9999, Number(trip.fuel_liters) || 0)) : null,
          adblue_liters: trip.adblue_liters != null ? Math.max(0, Math.min(9999, Number(trip.adblue_liters) || 0)) : null,
          fuel_km: trip.fuel_km != null ? Math.max(0, Math.min(9999999, Number(trip.fuel_km) || 0)) : null,
          charging_kwh: trip.charging_kwh != null ? Math.max(0, Math.min(9999, Number(trip.charging_kwh) || 0)) : null,
          departure_time: isTime(trip.start_time) ? trip.start_time : null,
          arrival_time: isTime(trip.end_time) ? trip.end_time : null,
          departure_location: (trip.departure_location || '').slice(0, 200) || null,
          notes: (trip.notes || '').slice(0, 2000) || null,
          status: 'Voltooid',
          km_warning: kmWarning,
        });
        createdTripIds.push(t.id);
        
        // Update lastTripByVehicle for sequential trips on same vehicle in same submission
        if (trip.vehicle_id) lastTripByVehicle[trip.vehicle_id] = { end_km: trip.end_km != null ? Number(trip.end_km) : null, date };
      }
    }
    perf.trips_create_ms = Date.now() - tTrips;

    // ========================================
    // 2. CREATE STANDPLAATSWERK
    // ========================================
    const tSpw = Date.now();
    if (Array.isArray(standplaats_werk) && standplaats_werk.length > 0) {
      for (const spw of standplaats_werk) {
        if (spw.customer_id || spw.activity_id) {
          const s = await svc.entities.StandplaatsWerk.create({
            employee_id, time_entry_id, date,
            start_time: isTime(spw.start_time) ? spw.start_time : null,
            end_time: isTime(spw.end_time) ? spw.end_time : null,
            customer_id: spw.customer_id || null,
            project_id: spw.project_id || null,
            activity_id: spw.activity_id || null,
            notes: (spw.notes || '').slice(0, 2000) || null,
            status: 'Definitief',
          });
          createdSpwIds.push(s.id);
        }
      }
    }
    perf.spw_create_ms = Date.now() - tSpw;

    // ========================================
    // 2b. CLEANUP DRAFT ACTIVITIES (Gepland trips + Concept SPW)
    // ========================================
    const tDraftCleanup = Date.now();
    try {
      // Cleanup draft trips (status=Gepland) for this employee+date
      const draftTrips = await svc.entities.Trip.filter({
        employee_id,
        date,
        status: 'Gepland',
      });
      if (draftTrips.length > 0) {
        console.log(`[RECALC] Cleaning up ${draftTrips.length} draft trips (Gepland) for employee=${employee_id} date=${date}`);
        for (const dt of draftTrips) {
          await safeDelete(svc.entities.Trip, dt.id, 'draft-trip');
        }
      }

      // Cleanup draft SPW (status=Concept) for this employee+date
      const draftSpw = await svc.entities.StandplaatsWerk.filter({
        employee_id,
        date,
        status: 'Concept',
      });
      if (draftSpw.length > 0) {
        console.log(`[RECALC] Cleaning up ${draftSpw.length} draft SPW (Concept) for employee=${employee_id} date=${date}`);
        for (const ds of draftSpw) {
          await safeDelete(svc.entities.StandplaatsWerk, ds.id, 'draft-spw');
        }
      }
    } catch (draftCleanupErr) {
      console.error('[RECALC DRAFT CLEANUP] Non-critical:', draftCleanupErr.message);
    }
    perf.draft_cleanup_ms = Date.now() - tDraftCleanup;

    // ========================================
    // 3. WRITE VERIFICATION
    // ========================================
    const tVerify = Date.now();
    const verifyEntries = await svc.entities.TimeEntry.filter({ employee_id, submission_id });
    const verifyEntry = verifyEntries.find(e => e.id === time_entry_id && e.status === 'Ingediend');
    perf.write_verify_ms = Date.now() - tVerify;

    if (!verifyEntry) {
      console.error(`[RECALC] CRITICAL: TimeEntry ${time_entry_id} not found or not Ingediend in write verification`);
      // Log but do NOT rollback — the TimeEntry was already committed
      try {
        await svc.entities.MobileEntrySubmissionLog.create({
          submission_id, user_id: '', email: '', employee_id,
          timestamp_received: new Date().toISOString(),
          status: 'FAILED', failure_type: 'SYSTEM',
          http_status: 500,
          error_code: 'ASYNC_WRITE_VERIFY_FAILED',
          error_message: `TimeEntry ${time_entry_id} not found/not Ingediend in async write verify`,
          timestamp_completed: new Date().toISOString(),
          latency_ms: Date.now() - t0,
        });
      } catch (_) {}
    }

    // ========================================
    // 4. POST-COMMIT OVERLAP GUARD
    // ========================================
    const tPostCommit = Date.now();
    if (date && start_time && end_time) {
      const entryEnd = end_date || date;
      const queryStart = addDays(date, -1);
      const queryEnd = addDays(entryEnd, 1);

      const postCommitAll = await svc.entities.TimeEntry.filter({
        employee_id,
        date: { $gte: queryStart, $lte: queryEnd },
      });
      const postCommitCandidates = postCommitAll.filter(e =>
        e.id !== time_entry_id
      );

      const postOverlap = validateTimeEntryOverlap(
        postCommitCandidates, employee_id, date, end_date || null, start_time, end_time
      );

      if (postOverlap.overlaps) {
        const existingEntry = postCommitCandidates.find(e => e.id === postOverlap.existingId);
        if (existingEntry && existingEntry.created_date < verifyEntry?.created_date) {
          console.log(`[RECALC POST-COMMIT OVERLAP] Rejecting ${time_entry_id}, older entry ${postOverlap.existingId} wins`);
          await svc.entities.TimeEntry.update(time_entry_id, {
            status: 'Afgekeurd',
            rejection_reason: `Automatisch afgekeurd: overlap gedetecteerd met bestaande dienst ${postOverlap.existingId} (${postOverlap.errorMsg})`,
          });

          await svc.entities.MobileEntrySubmissionLog.create({
            submission_id, user_id: '', email: '', employee_id,
            timestamp_received: new Date().toISOString(),
            status: 'VALIDATION_FAILED', failure_type: 'BUSINESS',
            http_status: 409,
            error_code: 'ASYNC_POST_COMMIT_' + postOverlap.errorCode,
            error_message: `Async overlap: ${postOverlap.errorMsg}`,
            timestamp_completed: new Date().toISOString(),
            latency_ms: Date.now() - t0,
          });

          perf.post_commit_guard_ms = Date.now() - tPostCommit;
          perf.total_ms = Date.now() - t0;
          console.log('[RECALC PERF]', JSON.stringify(perf));
          return Response.json({ success: false, error: 'POST_COMMIT_OVERLAP', rolled_back: true });
        }
      }
    }
    perf.post_commit_guard_ms = Date.now() - tPostCommit;

    // ========================================
    // 5. CLEANUP OLD DRAFTS
    // ========================================
    const tCleanup = Date.now();
    try {
      if (date) {
        const entryEnd = end_date || date;
        const cleanupStart = addDays(date, -1);
        const cleanupEnd = addDays(entryEnd, 1);
        const allEntries = await svc.entities.TimeEntry.filter({
          employee_id,
          date: { $gte: cleanupStart, $lte: cleanupEnd },
        });
        const oldDrafts = allEntries.filter(e => {
          if (e.status !== 'Concept' || e.id === time_entry_id) return false;
          const draftEnd = e.end_date || e.date;
          return e.date <= entryEnd && draftEnd >= date;
        });
        for (const draft of oldDrafts) {
          console.log(`[RECALC CLEANUP] Removing draft ${draft.id}`);
          const [dTrips, dSpw] = await Promise.all([
            svc.entities.Trip.filter({ time_entry_id: draft.id }),
            svc.entities.StandplaatsWerk.filter({ time_entry_id: draft.id }),
          ]);
          await Promise.all([
            ...dTrips.map(t => safeDelete(svc.entities.Trip, t.id, 'cleanup-trip')),
            ...dSpw.map(s => safeDelete(svc.entities.StandplaatsWerk, s.id, 'cleanup-spw')),
          ]);
          await safeDelete(svc.entities.TimeEntry, draft.id, 'cleanup-te');
        }
      }
    } catch (cleanupErr) {
      console.error('[RECALC CLEANUP] Non-critical:', cleanupErr.message);
    }
    perf.cleanup_ms = Date.now() - tCleanup;

    // ========================================
    // 6. PRE-RESOLVE RECEIVED SIBLING
    // ========================================
    try {
      const receivedSiblings = await svc.entities.MobileEntrySubmissionLog.filter({
        submission_id, status: 'RECEIVED',
      });
      for (const sibling of receivedSiblings) {
        if (sibling.stuck_detected !== false || sibling.auto_resolved !== true) {
          await svc.entities.MobileEntrySubmissionLog.update(sibling.id, {
            stuck_detected: false, auto_resolved: true,
          });
        }
      }
    } catch (resolveErr) {
      console.error('[RECALC PRE-RESOLVE]:', resolveErr.message);
    }

    perf.total_ms = Date.now() - t0;
    console.log('[RECALC PERF]', JSON.stringify(perf));

    return Response.json({
      success: true,
      trip_ids: createdTripIds,
      standplaats_werk_ids: createdSpwIds,
      perf,
    });

  } catch (outerError) {
    console.error('[RECALC UNHANDLED]', outerError);

    // Best-effort error logging — uses outer-scope vars (req body already consumed)
    try {
      if (_submission_id) {
        const base44 = createClientFromRequest(req);
        const svc = base44.asServiceRole;
        await svc.entities.MobileEntrySubmissionLog.create({
          submission_id: _submission_id,
          user_id: '', email: '', employee_id: _employee_id || '',
          timestamp_received: new Date().toISOString(),
          status: 'FAILED', failure_type: 'SYSTEM',
          http_status: 500,
          error_code: 'ASYNC_RECALC_ERROR',
          error_message: (outerError.message || 'Onbekende fout').slice(0, 500),
          timestamp_completed: new Date().toISOString(),
          latency_ms: Date.now() - t0,
        });
      }
    } catch (_) {}

    return Response.json({ error: outerError.message }, { status: 500 });
  }
});