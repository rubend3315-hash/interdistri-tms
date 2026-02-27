// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: BACKGROUND (fire-and-forget)                     ║
// ║ Called by: submitTimeEntry after SUCCESS commit                  ║
// ║ Auth: Service role (called internally)                           ║
// ║ MUST NOT affect SUCCESS status of original submission            ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// --- HELPERS (duplicated from submitTimeEntry — no local imports allowed) ---

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
function isTime(t) { return typeof t === 'string' && TIME_RE.test(t); }
function clamp(v, lo, hi) { if (v == null) return null; const n = Number(v); return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null; }
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
      return { overlaps: true, existingId: ex.id };
    }
  }
  return { overlaps: false };
}

function sanitizeTrip(t, empId, date, teId) {
  return {
    employee_id: empId, time_entry_id: teId, date,
    vehicle_id: t.vehicle_id,
    customer_id: t.customer_id || null,
    route_name: t.route_name ? String(t.route_name).slice(0, 200) : null,
    planned_stops: clamp(t.planned_stops, 0, 9999),
    start_km: clamp(t.start_km, 0, 9999999),
    end_km: clamp(t.end_km, 0, 9999999),
    total_km: (t.start_km != null && t.end_km != null) ? Math.max(0, Number(t.end_km) - Number(t.start_km)) : null,
    fuel_liters: clamp(t.fuel_liters, 0, 9999),
    adblue_liters: clamp(t.adblue_liters, 0, 9999),
    fuel_km: clamp(t.fuel_km, 0, 9999999),
    charging_kwh: clamp(t.charging_kwh, 0, 9999),
    departure_time: isTime(t.start_time) ? t.start_time : null,
    arrival_time: isTime(t.end_time) ? t.end_time : null,
    departure_location: (t.departure_location || '').slice(0, 200) || null,
    notes: (t.notes || '').slice(0, 2000) || null,
    status: 'Voltooid',
  };
}

function sanitizeSPW(s, empId, date, teId) {
  return {
    employee_id: empId, time_entry_id: teId, date,
    start_time: isTime(s.start_time) ? s.start_time : null,
    end_time: isTime(s.end_time) ? s.end_time : null,
    customer_id: s.customer_id || null,
    project_id: s.project_id || null,
    activity_id: s.activity_id || null,
    notes: (s.notes || '').slice(0, 2000) || null,
  };
}

async function safeDelete(entity, id, label) {
  try { await entity.delete(id); }
  catch (e) { console.error(`Failed to delete ${label} ${id}: ${e.message}`); }
}

// --- MAIN HANDLER ---

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

    console.log(`[ASYNC_RECALC] Starting for TE ${time_entry_id}, employee ${employee_id}, submission ${submission_id}`);

    const perf = {};

    // ========================================
    // 1. VERIFY TimeEntry still exists and is Ingediend
    // ========================================
    const tVerify = Date.now();
    const teCheck = await svc.entities.TimeEntry.filter({
      employee_id,
      submission_id,
    });
    const te = teCheck.find(e => e.id === time_entry_id && e.status === 'Ingediend');
    perf.write_verify = Date.now() - tVerify;

    if (!te) {
      console.warn(`[ASYNC_RECALC] TimeEntry ${time_entry_id} not found or not Ingediend — skipping`);
      return Response.json({ success: false, reason: 'TimeEntry not found or wrong status' });
    }

    // ========================================
    // 2. CREATE TRIPS
    // ========================================
    const tTrips = Date.now();
    const tripIds = [];
    if (Array.isArray(trips) && trips.length > 0) {
      for (const trip of trips) {
        const t = await svc.entities.Trip.create(sanitizeTrip(trip, employee_id, date, time_entry_id));
        tripIds.push(t.id);
      }
    }
    perf.trips_create = Date.now() - tTrips;

    // ========================================
    // 3. CREATE STANDPLAATSWERK
    // ========================================
    const tSpw = Date.now();
    const spwIds = [];
    if (Array.isArray(standplaats_werk) && standplaats_werk.length > 0) {
      for (const spw of standplaats_werk) {
        if (spw.customer_id || spw.activity_id) {
          const s = await svc.entities.StandplaatsWerk.create(sanitizeSPW(spw, employee_id, date, time_entry_id));
          spwIds.push(s.id);
        }
      }
    }
    perf.spw_create = Date.now() - tSpw;

    // ========================================
    // 4. POST-COMMIT OVERLAP GUARD
    // ========================================
    const tPostGuard = Date.now();
    const entryEnd = end_date || date;
    const queryStart = addDays(date, -1);
    const queryEnd = addDays(entryEnd, 1);

    const allEntries = await svc.entities.TimeEntry.filter({ employee_id });
    const candidates = allEntries.filter(e => e.id !== time_entry_id && e.date >= queryStart && e.date <= queryEnd);

    const postOverlap = validateTimeEntryOverlap(candidates, employee_id, date, end_date || null, start_time, end_time);

    if (postOverlap.overlaps) {
      const existingEntry = candidates.find(e => e.id === postOverlap.existingId);
      if (existingEntry && existingEntry.created_date < te.created_date) {
        console.log(`[ASYNC_RECALC] POST-COMMIT OVERLAP detected! Rolling back TE ${time_entry_id}`);
        await svc.entities.TimeEntry.update(time_entry_id, { status: 'Concept' });
        for (const tid of tripIds) await safeDelete(svc.entities.Trip, tid, 'overlap-trip');
        for (const sid of spwIds) await safeDelete(svc.entities.StandplaatsWerk, sid, 'overlap-spw');
        await safeDelete(svc.entities.TimeEntry, time_entry_id, 'overlap-te');

        // Update index to FAILED
        const indexRecords = await svc.entities.MobileSubmissionIndex.filter({ submission_id });
        if (indexRecords[0]) {
          await svc.entities.MobileSubmissionIndex.update(indexRecords[0].id, {
            status: 'FAILED',
            completed_at: new Date().toISOString(),
          });
        }

        // Log the failure
        await svc.entities.MobileEntrySubmissionLog.create({
          submission_id,
          user_id: te.created_by_id || '',
          employee_id,
          timestamp_received: new Date().toISOString(),
          status: 'VALIDATION_FAILED',
          failure_type: 'BUSINESS',
          http_status: 409,
          error_code: 'POST_COMMIT_OVERLAP_ASYNC',
          error_message: `Async post-commit overlap: bestaande dienst ${postOverlap.existingId}`,
          timestamp_completed: new Date().toISOString(),
          latency_ms: Date.now() - t0,
        });

        perf.post_commit_guard = Date.now() - tPostGuard;
        perf.total = Date.now() - t0;
        console.log('[ASYNC_RECALC PERF]', JSON.stringify(perf));
        return Response.json({ success: false, reason: 'POST_COMMIT_OVERLAP', rolled_back: true });
      }
    }
    perf.post_commit_guard = Date.now() - tPostGuard;

    // ========================================
    // 5. CLEANUP OLD DRAFTS
    // ========================================
    try {
      const drafts = allEntries.filter(e => {
        if (e.status !== 'Concept' || e.id === time_entry_id) return false;
        const draftEnd = e.end_date || e.date;
        return e.date <= entryEnd && draftEnd >= date;
      });
      for (const draft of drafts) {
        console.log(`[ASYNC_CLEANUP] Removing draft ${draft.id}`);
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
    } catch (cleanupErr) {
      console.error('[ASYNC_CLEANUP] Non-critical:', cleanupErr.message);
    }

    // ========================================
    // 6. PRE-RESOLVE RECEIVED SIBLINGS
    // ========================================
    try {
      const receivedSiblings = await svc.entities.MobileEntrySubmissionLog.filter({
        submission_id,
        status: 'RECEIVED',
      });
      for (const sibling of receivedSiblings) {
        if (sibling.stuck_detected !== false || sibling.auto_resolved !== true) {
          await svc.entities.MobileEntrySubmissionLog.update(sibling.id, {
            stuck_detected: false,
            auto_resolved: true,
          });
        }
      }
    } catch (resolveErr) {
      console.error('[ASYNC_PRE-RESOLVE] Non-critical:', resolveErr.message);
    }

    // ========================================
    // 7. LOG PERFORMANCE
    // ========================================
    perf.total = Date.now() - t0;
    console.log('[ASYNC_RECALC PERF]', JSON.stringify(perf));

    try {
      await svc.entities.MobileEntryPerformanceLog.create({
        submission_id,
        employee_id,
        write_verify_ms: perf.write_verify || null,
        trips_and_spw_create_ms: (perf.trips_create || 0) + (perf.spw_create || 0),
        post_commit_guard_ms: perf.post_commit_guard || null,
        total_ms: perf.total,
        outcome: 'SUCCESS',
        user_email: payload.user_email || null,
      });
    } catch (perfErr) { console.error('[ASYNC_PERF_LOG]', perfErr.message); }

    return Response.json({
      success: true,
      trip_ids: tripIds,
      spw_ids: spwIds,
      perf,
    });

  } catch (error) {
    console.error('[ASYNC_RECALC FATAL]', error.message);

    // Best-effort error logging
    try {
      const base44Fb = createClientFromRequest(req);
      const svcFb = base44Fb.asServiceRole;
      const payload = await req.json().catch(() => ({}));
      if (payload.submission_id) {
        await svcFb.entities.MobileEntrySubmissionLog.create({
          submission_id: payload.submission_id,
          employee_id: payload.employee_id || '',
          user_id: '',
          timestamp_received: new Date().toISOString(),
          status: 'FAILED',
          failure_type: 'SYSTEM',
          http_status: 500,
          error_code: 'ASYNC_RECALC_FAILED',
          error_message: (error.message || 'Onbekende fout').slice(0, 500),
          timestamp_completed: new Date().toISOString(),
          latency_ms: Date.now() - t0,
        });
      }
    } catch (_) {}

    return Response.json({ error: error.message }, { status: 500 });
  }
});