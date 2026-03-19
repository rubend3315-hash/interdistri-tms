// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: BACKGROUND / FIRE-AND-FORGET                     ║
// ║ Called by: submitTimeEntry (fire-and-forget, not awaited)        ║
// ║ Auth: Service role (called from backend function)                ║
// ║ PURPOSE: Upsert Trips/SPW to final status, write-verify         ║
// ║ IDEMPOTENT: safe to call multiple times for same time_entry_id   ║
// ║ NEVER affects the original SUCCESS status of the submission.     ║
// ║ v5 — LEAN: removed heavy cleanup/overlap/vehicle-history        ║
// ║      + SPW single-query Map index — 2026-03-19                  ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// --- TIME HELPERS ---
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
function isTime(t) { return typeof t === 'string' && TIME_RE.test(t); }

// --- KEY GENERATORS ---
function generateTripKey(employee_id, date, departure_time, arrival_time) {
  return `${employee_id || ''}_${date || ''}_${departure_time || ''}_${arrival_time || ''}`;
}

function generateSpwKey(employee_id, date, start_time, end_time, type = 'standplaats') {
  return `${employee_id || ''}_${date || ''}_${start_time || ''}_${end_time || ''}_${type}`;
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
    const finalTripIds = [];
    const finalSpwIds = [];

    // ========================================
    // 1. IDEMPOTENT TRIPS: fetch existing → update or create
    // ========================================
    const tTrips = Date.now();

    // 1a. Fetch ALL existing trips linked to this time_entry_id
    const existingTrips = await svc.entities.Trip.filter({ time_entry_id });
    console.log(`[RECALC] Found ${existingTrips.length} existing trips for TE=${time_entry_id}`);

    if (existingTrips.length > 0) {
      // 1b. UPDATE existing trips to Voltooid + KM warnings (no vehicle history lookup)
      for (const et of existingTrips) {
        let kmWarning = null;
        const totalKm = (et.start_km != null && et.end_km != null) ? Math.max(0, Number(et.end_km) - Number(et.start_km)) : null;
        const warnings = [];
        if (totalKm != null && totalKm > 400) warnings.push(`Rode afwijking: ${totalKm} km gereden (>400 km)`);
        else if (totalKm != null && totalKm > 250) warnings.push(`Gele afwijking: ${totalKm} km gereden (>250 km)`);
        if (warnings.length > 0) kmWarning = warnings.join(' | ');

        const trip_key = et.trip_key || generateTripKey(et.employee_id, et.date, et.departure_time, et.arrival_time);

        await svc.entities.Trip.update(et.id, {
          status: 'Voltooid',
          total_km: totalKm,
          km_warning: kmWarning,
          trip_key,
        });
        finalTripIds.push(et.id);
        console.log(`[RECALC] Updated existing trip ${et.id} → Voltooid`);
      }
    } else if (Array.isArray(trips) && trips.length > 0) {
      // 1c. No existing trips — CREATE from payload (no vehicle history lookup)
      for (const trip of trips) {
        let kmWarning = null;
        const totalKm = (trip.start_km != null && trip.end_km != null) ? Math.max(0, Number(trip.end_km) - Number(trip.start_km)) : null;
        const warnings = [];
        if (totalKm != null && totalKm > 400) warnings.push(`Rode afwijking: ${totalKm} km gereden (>400 km)`);
        else if (totalKm != null && totalKm > 250) warnings.push(`Gele afwijking: ${totalKm} km gereden (>250 km)`);
        if (warnings.length > 0) kmWarning = warnings.join(' | ');

        const departure_time = isTime(trip.start_time) ? trip.start_time : null;
        const arrival_time = isTime(trip.end_time) ? trip.end_time : null;
        const trip_key = generateTripKey(employee_id, date, departure_time, arrival_time);

        const t = await svc.entities.Trip.create({
          employee_id, time_entry_id, date,
          trip_key,
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
          departure_time,
          arrival_time,
          departure_location: (trip.departure_location || '').slice(0, 200) || null,
          notes: (trip.notes || '').slice(0, 2000) || null,
          status: 'Voltooid',
          km_warning: kmWarning,
        });
        finalTripIds.push(t.id);
      }
    }
    perf.trips_ms = Date.now() - tTrips;

    // ========================================
    // 2. IDEMPOTENT STANDPLAATSWERK: fetch existing → update or create
    // ========================================
    const tSpw = Date.now();

    // 2a. Update any existing SPW already linked to this time_entry_id
    const existingSpw = await svc.entities.StandplaatsWerk.filter({ time_entry_id });
    console.log(`[RECALC] Found ${existingSpw.length} existing SPW for TE=${time_entry_id}`);

    for (const es of existingSpw) {
      // Generate spw_key if missing
      const spw_key = es.spw_key || generateSpwKey(es.employee_id, es.date, es.start_time, es.end_time, 'standplaats');
      const updateData = { spw_key };
      if (es.status !== 'Definitief') updateData.status = 'Definitief';
      
      await svc.entities.StandplaatsWerk.update(es.id, updateData);
      console.log(`[RECALC] Updated linked SPW ${es.id} → Definitief`);
      finalSpwIds.push(es.id);
    }

    // 2b. Per-record matching: for each payload item, find existing by spw_key OR employee+date+times (fallback)
    if (Array.isArray(standplaats_werk) && standplaats_werk.length > 0) {
      for (const spw of standplaats_werk) {
        if (!spw.customer_id && !spw.activity_id) continue;

        const spwStartTime = isTime(spw.start_time) ? spw.start_time : null;
        const spwEndTime = isTime(spw.end_time) ? spw.end_time : null;
        const spw_key = generateSpwKey(employee_id, date, spwStartTime, spwEndTime, 'standplaats');

        // Skip if already handled in 2a (linked to this TE)
        const alreadyLinked = existingSpw.find(es =>
          (es.spw_key && es.spw_key === spw_key) ||
          (es.start_time === spwStartTime && es.end_time === spwEndTime)
        );
        if (alreadyLinked) {
          console.log(`[RECALC] SPW ${alreadyLinked.id} already linked, skipping`);
          continue;
        }

        // Search for unlinked or differently-linked match by spw_key OR employee+date+start+end (fallback)
        const matchFilter = { employee_id, date };
        if (spwStartTime) matchFilter.start_time = spwStartTime;
        if (spwEndTime) matchFilter.end_time = spwEndTime;
        const candidates = await svc.entities.StandplaatsWerk.filter(matchFilter);
        
        // Priority: match by spw_key first, then fallback to time-based matching
        const match = candidates.find(c =>
          !finalSpwIds.includes(c.id) &&
          ((c.spw_key && c.spw_key === spw_key) ||
           (c.start_time === spwStartTime && c.end_time === spwEndTime))
        );

        if (match) {
          // Update existing record: claim it for this TE + ensure spw_key is set
          await svc.entities.StandplaatsWerk.update(match.id, {
            time_entry_id,
            spw_key,
            customer_id: spw.customer_id || match.customer_id || null,
            project_id: spw.project_id || match.project_id || null,
            activity_id: spw.activity_id || match.activity_id || null,
            notes: (spw.notes || match.notes || '').slice(0, 2000) || null,
            status: 'Definitief',
          });
          finalSpwIds.push(match.id);
          console.log(`[RECALC] Claimed existing SPW ${match.id} → TE=${time_entry_id}, spw_key=${spw_key}, Definitief`);
        } else {
          // No match found — create new with spw_key
          const s = await svc.entities.StandplaatsWerk.create({
            employee_id, time_entry_id, date,
            spw_key,
            start_time: spwStartTime,
            end_time: spwEndTime,
            customer_id: spw.customer_id || null,
            project_id: spw.project_id || null,
            activity_id: spw.activity_id || null,
            notes: (spw.notes || '').slice(0, 2000) || null,
            status: 'Definitief',
          });
          finalSpwIds.push(s.id);
          console.log(`[RECALC] Created new SPW ${s.id} with spw_key=${spw_key}`);
        }
      }
    }

    // 2c. Cleanup duplicates: same employee+date+start_time+end_time, keep newest
    try {
      const allSpwForDay = await svc.entities.StandplaatsWerk.filter({ employee_id, date });
      const seen = new Map(); // key → { id, created_date }
      const toDelete = [];
      // Sort by created_date DESC so first encountered = newest
      allSpwForDay.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
      for (const s of allSpwForDay) {
        const key = `${s.start_time || ''}|${s.end_time || ''}|${s.customer_id || ''}|${s.activity_id || ''}`;
        if (seen.has(key)) {
          toDelete.push(s.id);
        } else {
          seen.set(key, s.id);
        }
      }
      if (toDelete.length > 0) {
        console.log(`[RECALC] Cleaning up ${toDelete.length} duplicate SPW records`);
        for (const did of toDelete) await safeDelete(svc.entities.StandplaatsWerk, did, 'dup-spw');
      }
    } catch (dupErr) {
      console.error('[RECALC SPW DEDUP] Non-critical:', dupErr.message);
    }

    perf.spw_ms = Date.now() - tSpw;

    // ========================================
    // 2d. CLEANUP ORPHAN DRAFTS (different time_entry_id)
    // ========================================
    const tDraftCleanup = Date.now();
    try {
      // Orphan draft trips: same employee+date, Gepland status, different time_entry_id
      const draftTrips = await svc.entities.Trip.filter({
        employee_id, date, status: 'Gepland',
      });
      const orphanTrips = draftTrips.filter(dt => dt.time_entry_id !== time_entry_id);
      if (orphanTrips.length > 0) {
        console.log(`[RECALC] Cleaning up ${orphanTrips.length} orphan draft trips`);
        for (const dt of orphanTrips) await safeDelete(svc.entities.Trip, dt.id, 'orphan-trip');
      }

      // Orphan draft SPW: same employee+date, Concept status, different time_entry_id
      const draftSpw = await svc.entities.StandplaatsWerk.filter({
        employee_id, date, status: 'Concept',
      });
      const orphanSpw = draftSpw.filter(ds => ds.time_entry_id !== time_entry_id);
      if (orphanSpw.length > 0) {
        console.log(`[RECALC] Cleaning up ${orphanSpw.length} orphan draft SPW`);
        for (const ds of orphanSpw) await safeDelete(svc.entities.StandplaatsWerk, ds.id, 'orphan-spw');
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
      trip_ids: finalTripIds,
      standplaats_werk_ids: finalSpwIds,
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