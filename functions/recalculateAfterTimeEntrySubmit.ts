// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: BACKGROUND / FIRE-AND-FORGET                     ║
// ║ Called by: submitTimeEntry (fire-and-forget, not awaited)        ║
// ║ Auth: Service role (called from backend function)                ║
// ║ PURPOSE: Create Trips, SPW, write-verify, post-commit guard     ║
// ║ NEVER affects the original SUCCESS status of the submission.     ║
// ║ Redeployed: 2026-02-28                                           ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const payload = await req.json();
    const { time_entry_id, employee_id, submission_id, trips, standplaats_werk, date, end_date, start_time, end_time } = payload;

    if (!time_entry_id || !employee_id || !submission_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[RECALC] Starting for TE=${time_entry_id} sub=${submission_id}`);

    // Update index to RUNNING
    try {
      const indexRecords = await svc.entities.MobileSubmissionIndex.filter({ submission_id });
      if (indexRecords[0]) {
        await svc.entities.MobileSubmissionIndex.update(indexRecords[0].id, { recalc_status: 'RUNNING' });
      }
    } catch (e) { console.error('[RECALC] Index update to RUNNING failed:', e.message); }

    const perf = {};
    const createdTripIds = [];
    const createdSpwIds = [];

    // ========================================
    // 1. CREATE TRIPS
    // ========================================
    const tTrips = Date.now();
    if (Array.isArray(trips) && trips.length > 0) {
      for (const trip of trips) {
        const t = await svc.entities.Trip.create({
          employee_id, time_entry_id, date,
          vehicle_id: trip.vehicle_id,
          customer_id: trip.customer_id || null,
          route_name: trip.route_name ? String(trip.route_name).slice(0, 200) : null,
          planned_stops: trip.planned_stops != null ? Math.max(0, Math.min(9999, Number(trip.planned_stops) || 0)) : null,
          start_km: trip.start_km != null ? Math.max(0, Math.min(9999999, Number(trip.start_km) || 0)) : null,
          end_km: trip.end_km != null ? Math.max(0, Math.min(9999999, Number(trip.end_km) || 0)) : null,
          total_km: (trip.start_km != null && trip.end_km != null) ? Math.max(0, Number(trip.end_km) - Number(trip.start_km)) : null,
          fuel_liters: trip.fuel_liters != null ? Math.max(0, Math.min(9999, Number(trip.fuel_liters) || 0)) : null,
          adblue_liters: trip.adblue_liters != null ? Math.max(0, Math.min(9999, Number(trip.adblue_liters) || 0)) : null,
          fuel_km: trip.fuel_km != null ? Math.max(0, Math.min(9999999, Number(trip.fuel_km) || 0)) : null,
          charging_kwh: trip.charging_kwh != null ? Math.max(0, Math.min(9999, Number(trip.charging_kwh) || 0)) : null,
          departure_time: isTime(trip.start_time) ? trip.start_time : null,
          arrival_time: isTime(trip.end_time) ? trip.end_time : null,
          departure_location: (trip.departure_location || '').slice(0, 200) || null,
          notes: (trip.notes || '').slice(0, 2000) || null,
          status: 'Voltooid',
        });
        createdTripIds.push(t.id);
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
          });
          createdSpwIds.push(s.id);
        }
      }
    }
    perf.spw_create_ms = Date.now() - tSpw;

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

      const postCommitAll = await svc.entities.TimeEntry.filter({ employee_id });
      const postCommitCandidates = postCommitAll.filter(e =>
        e.id !== time_entry_id && e.date >= queryStart && e.date <= queryEnd
      );

      const postOverlap = validateTimeEntryOverlap(
        postCommitCandidates, employee_id, date, end_date || null, start_time, end_time
      );

      if (postOverlap.overlaps) {
        const existingEntry = postCommitCandidates.find(e => e.id === postOverlap.existingId);
        if (existingEntry && existingEntry.created_date < verifyEntry?.created_date) {
          console.log(`[RECALC POST-COMMIT OVERLAP] Rolling back ${time_entry_id}, older entry ${postOverlap.existingId} wins`);
          await svc.entities.TimeEntry.update(time_entry_id, { status: 'Concept' });
          for (const tid of createdTripIds) await safeDelete(svc.entities.Trip, tid, 'overlap-trip');
          for (const sid of createdSpwIds) await safeDelete(svc.entities.StandplaatsWerk, sid, 'overlap-spw');
          await safeDelete(svc.entities.TimeEntry, time_entry_id, 'overlap-te');

          // Update index
          try {
            const indexRecords = await svc.entities.MobileSubmissionIndex.filter({ submission_id });
            if (indexRecords[0]) {
              await svc.entities.MobileSubmissionIndex.update(indexRecords[0].id, {
                status: 'FAILED',
                recalc_status: 'FAILED',
              });
            }
          } catch (_) {}

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
        const queryStart = addDays(date, -1);
        const queryEnd = addDays(entryEnd, 1);
        const allEntries = await svc.entities.TimeEntry.filter({ employee_id });
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

    // ========================================
    // 7. UPDATE INDEX TO COMPLETED
    // ========================================
    try {
      const indexRecords = await svc.entities.MobileSubmissionIndex.filter({ submission_id });
      if (indexRecords[0]) {
        await svc.entities.MobileSubmissionIndex.update(indexRecords[0].id, { recalc_status: 'COMPLETED' });
      }
    } catch (e) { console.error('[RECALC] Index update to COMPLETED failed:', e.message); }

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

    // Best-effort: update index to FAILED
    try {
      const base44 = createClientFromRequest(req);
      const svc = base44.asServiceRole;
      const payload = await req.json().catch(() => ({}));
      if (payload.submission_id) {
        const indexRecords = await svc.entities.MobileSubmissionIndex.filter({ submission_id: payload.submission_id });
        if (indexRecords[0]) {
          await svc.entities.MobileSubmissionIndex.update(indexRecords[0].id, { recalc_status: 'FAILED' });
        }
        await svc.entities.MobileEntrySubmissionLog.create({
          submission_id: payload.submission_id,
          user_id: '', email: '', employee_id: payload.employee_id || '',
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