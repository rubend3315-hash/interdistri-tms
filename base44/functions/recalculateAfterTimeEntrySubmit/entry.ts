// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: BACKGROUND / FIRE-AND-FORGET                     ║
// ║ Called by: submitTimeEntry (fire-and-forget, not awaited)        ║
// ║ Auth: Service role (called from backend function)                ║
// ║ PURPOSE: Upsert Trips/SPW to final status, write-verify         ║
// ║ IDEMPOTENT: safe to call multiple times for same time_entry_id   ║
// ║ NEVER affects the original SUCCESS status of the submission.     ║
// ║ v7 — DUPLICATE PREVENTION + DRAFT CLEANUP — 2026-03-31          ║
// ║  - Gepland drafts excluded from relevantTrips (cleaned up later)║
// ║  - trip_key + spw_key duplicate checks before create            ║
// ║  - Cleanup remaining Gepland trips + Concept SPW after upsert   ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// --- TIME HELPERS ---
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
function isTime(t) { return typeof t === 'string' && TIME_RE.test(t); }
function toMin(t) {
  if (!t || !TIME_RE.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

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

    const runId = crypto.randomUUID();
    console.log('[RECALC START]', { runId, time_entry_id, submission_id, ts: Date.now() });

    const perf = {};
    const finalTripIds = [];
    const finalSpwIds = [];
    const usedSpwIds = new Set();

    // ========================================
    // 1. SELF-HEALING TRIPS: fetch→match→claim→update
    // ========================================
    const tTrips = Date.now();

    // 1a. Fetch ALL trips for this employee+date (broad fetch)
    let allTripsForDay = await svc.entities.Trip.filter({ employee_id, date });
    console.log(`[RECALC] Found ${allTripsForDay.length} trips for employee=${employee_id} date=${date}`);

    // 1a-DEDUP: Remove duplicate trips with same trip_key (keep oldest by created_date)
    // This is a safety net for race conditions in saveDraftServiceRules
    const tripKeyGroups = {};
    for (const t of allTripsForDay) {
      if (!t.trip_key) continue;
      if (!tripKeyGroups[t.trip_key]) tripKeyGroups[t.trip_key] = [];
      tripKeyGroups[t.trip_key].push(t);
    }
    let dedupedCount = 0;
    for (const [key, trips] of Object.entries(tripKeyGroups)) {
      if (trips.length > 1) {
        // Sort by created_date ascending — keep the oldest
        trips.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        for (let i = 1; i < trips.length; i++) {
          try {
            await svc.entities.Trip.delete(trips[i].id);
            dedupedCount++;
            console.log(`[RECALC DEDUP] Deleted duplicate trip ${trips[i].id} with key=${key}`);
          } catch (e) {
            console.error(`[RECALC DEDUP] Failed to delete trip ${trips[i].id}: ${e.message}`);
          }
        }
      }
    }
    if (dedupedCount > 0) {
      console.log(`[RECALC] Deduplicated ${dedupedCount} trips`);
      // Refresh the list after dedup
      allTripsForDay = await svc.entities.Trip.filter({ employee_id, date });
    }

    // 1b. Smart filter: linked to this TE OR unlinked + matching time
    // IMPORTANT: Only include non-draft trips (Voltooid/Onderweg) or drafts linked to THIS TE.
    // We do NOT include "Gepland" drafts from saveDraftServiceRules here — 
    // they will be cleaned up in step 1e after final trips are established.
    const relevantTrips = allTripsForDay.filter(t => {
      // Already linked to this TimeEntry → include if not a draft (Gepland)
      // Gepland drafts are handled separately: they get cleaned up in step 1e
      if (t.time_entry_id === time_entry_id) {
        // Include Voltooid/Onderweg trips (already processed), skip Gepland (draft)
        return t.status !== 'Gepland';
      }
      // Linked to a DIFFERENT TimeEntry → skip (belongs to another shift)
      if (t.time_entry_id && t.time_entry_id !== time_entry_id) return false;
      // Skip draft trips not linked to any TE (orphaned drafts)
      if (t.status === 'Gepland') return false;
      // Unlinked non-draft trip → include only if times fall within shift ±5min tolerance
      const tStart = toMin(t.departure_time);
      const tEnd = toMin(t.arrival_time);
      const sStart = toMin(start_time);
      const sEnd = toMin(end_time);
      const tolerance = 5;

      const hasTime = tStart != null || tEnd != null;
      const startOk = tStart == null || (sStart != null && sEnd != null &&
        tStart >= (sStart - tolerance) &&
        tStart <= (sEnd + tolerance));
      const endOk = tEnd == null || (sStart != null && sEnd != null &&
        tEnd >= (sStart - tolerance) &&
        tEnd <= (sEnd + tolerance));

      return hasTime && startOk && endOk;
    });

    // DIAGNOSE: log alle trips zodat we kunnen zien waarom sommige niet matchen
    console.log('[RECALC DIAGNOSE] time_entry_id gezocht:', time_entry_id);
    console.log('[RECALC DIAGNOSE] shift start_time:', start_time, 'end_time:', end_time);
    console.log('[RECALC DIAGNOSE] Alle trips voor deze dag:', JSON.stringify(allTripsForDay.map(t => ({
      id: t.id,
      time_entry_id: t.time_entry_id,
      status: t.status,
      departure_time: t.departure_time,
      arrival_time: t.arrival_time,
    }))));
    console.log(`[RECALC] Filtered to ${relevantTrips.length} relevant trips (linked or time-matched)`);

    // 1c. Update + claim — SEQUENTIAL, skip if already correct
    for (const et of relevantTrips) {
      finalTripIds.push(et.id);

      // Skip write if already fully correct
      if (et.time_entry_id === time_entry_id && et.status === 'Voltooid' && et.trip_key) {
        continue;
      }

      const totalKm = (et.start_km != null && et.end_km != null) ? Math.max(0, Number(et.end_km) - Number(et.start_km)) : null;
      let kmWarning = null;
      if (totalKm != null && totalKm > 400) kmWarning = `Rode afwijking: ${totalKm} km gereden (>400 km)`;
      else if (totalKm != null && totalKm > 250) kmWarning = `Gele afwijking: ${totalKm} km gereden (>250 km)`;

      const trip_key = et.trip_key || generateTripKey(et.employee_id, et.date, et.departure_time, et.arrival_time);

      await svc.entities.Trip.update(et.id, {
        time_entry_id,
        status: 'Voltooid',
        total_km: totalKm,
        km_warning: kmWarning,
        trip_key,
      });
    }

    if (relevantTrips.length > 0) {
      console.log(`[RECALC] Claimed+updated ${relevantTrips.length} trips → Voltooid (sequential)`);
    }

    // 1d. Fallback: no existing trips matched → CHECK FOR DUPLICATES THEN CREATE from payload
    // Build trip key index for duplicate prevention
    const existingTripKeys = new Set(allTripsForDay.map(t => t.trip_key).filter(Boolean));
    
    if (relevantTrips.length === 0 && Array.isArray(trips) && trips.length > 0) {
      console.warn(`[RECALC] No existing trips matched → fallback create from payload`);
      for (const trip of trips) {
        const departure_time = isTime(trip.start_time) ? trip.start_time : null;
        const arrival_time = isTime(trip.end_time) ? trip.end_time : null;
        const trip_key = generateTripKey(employee_id, date, departure_time, arrival_time);

        // DUPLICATE CHECK: skip if trip_key already exists
        if (existingTripKeys.has(trip_key)) {
          console.log(`[RECALC] Skipping duplicate trip_key: ${trip_key}`);
          // Find and claim the existing trip instead
          const existingTrip = allTripsForDay.find(t => t.trip_key === trip_key);
          if (existingTrip && !finalTripIds.includes(existingTrip.id)) {
            await svc.entities.Trip.update(existingTrip.id, { time_entry_id, status: 'Voltooid' });
            finalTripIds.push(existingTrip.id);
            console.log(`[RECALC] Claimed existing trip ${existingTrip.id} by trip_key`);
          }
          continue;
        }

        let kmWarning = null;
        const totalKm = (trip.start_km != null && trip.end_km != null) ? Math.max(0, Number(trip.end_km) - Number(trip.start_km)) : null;
        const warnings = [];
        if (totalKm != null && totalKm > 400) warnings.push(`Rode afwijking: ${totalKm} km gereden (>400 km)`);
        else if (totalKm != null && totalKm > 250) warnings.push(`Gele afwijking: ${totalKm} km gereden (>250 km)`);
        if (warnings.length > 0) kmWarning = warnings.join(' | ');

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
        existingTripKeys.add(trip_key); // Prevent duplicates within same batch
      }
    }
    // 1e. CLEANUP: Delete remaining draft trips (status=Gepland) for this TE that were NOT claimed
    const remainingDraftTrips = allTripsForDay.filter(t =>
      t.time_entry_id === time_entry_id && t.status === 'Gepland' && !finalTripIds.includes(t.id)
    );
    if (remainingDraftTrips.length > 0) {
      console.log(`[RECALC] Cleaning up ${remainingDraftTrips.length} remaining Gepland draft trips`);
      for (const dt of remainingDraftTrips) {
        try { await svc.entities.Trip.delete(dt.id); }
        catch (e) { console.error(`[RECALC] Failed to delete draft trip ${dt.id}: ${e.message}`); }
      }
    }

    perf.trips_ms = Date.now() - tTrips;

    // ========================================
    // 2. IDEMPOTENT STANDPLAATSWERK: single-query + Map index
    // ========================================
    const tSpw = Date.now();

    // 2a. ONE query: fetch ALL SPW for this employee+date
    let allSpwForDay = await svc.entities.StandplaatsWerk.filter({ employee_id, date });
    console.log(`[RECALC] Fetched ${allSpwForDay.length} total SPW for employee=${employee_id} date=${date}`);

    // 2a-DEDUP: Remove duplicate SPW with same spw_key (keep oldest by created_date)
    const spwKeyGroups = {};
    for (const s of allSpwForDay) {
      if (!s.spw_key) continue;
      if (!spwKeyGroups[s.spw_key]) spwKeyGroups[s.spw_key] = [];
      spwKeyGroups[s.spw_key].push(s);
    }
    let dedupedSpwCount = 0;
    for (const [key, spws] of Object.entries(spwKeyGroups)) {
      if (spws.length > 1) {
        spws.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        for (let i = 1; i < spws.length; i++) {
          try {
            await svc.entities.StandplaatsWerk.delete(spws[i].id);
            dedupedSpwCount++;
            console.log(`[RECALC DEDUP] Deleted duplicate SPW ${spws[i].id} with key=${key}`);
          } catch (e) {
            console.error(`[RECALC DEDUP] Failed to delete SPW ${spws[i].id}: ${e.message}`);
          }
        }
      }
    }
    if (dedupedSpwCount > 0) {
      console.log(`[RECALC] Deduplicated ${dedupedSpwCount} SPW`);
      allSpwForDay = await svc.entities.StandplaatsWerk.filter({ employee_id, date });
    }

    // 2b. Build multi-map index for O(1) lookups (key → array of records)
    const spwIndex = new Map();
    for (const s of allSpwForDay) {
      const key = `${s.start_time || ''}_${s.end_time || ''}_${s.customer_id || ''}_${s.activity_id || ''}`;
      if (!spwIndex.has(key)) spwIndex.set(key, []);
      spwIndex.get(key).push(s);
    }

    // 2c. Update SPW already linked to this time_entry_id → Definitief — PARALLEL
    const linkedSpw = allSpwForDay.filter(s => s.time_entry_id === time_entry_id);
    if (linkedSpw.length > 0) {
      await Promise.all(linkedSpw.map(es => {
        const spw_key = es.spw_key || generateSpwKey(es.employee_id, es.date, es.start_time, es.end_time, 'standplaats');
        const updateData = { spw_key };
        if (es.status !== 'Definitief') updateData.status = 'Definitief';

        finalSpwIds.push(es.id);
        usedSpwIds.add(es.id);

        return svc.entities.StandplaatsWerk.update(es.id, updateData);
      }));
      console.log(`[RECALC] Updated ${linkedSpw.length} linked SPW → Definitief (parallel)`);
    }

    // 2d. Match payload items against index — no extra DB queries
    // Build linkedIndex for O(1) "already handled" lookups
    const linkedIndex = new Map();
    for (const ls of linkedSpw) {
      const byKey = ls.spw_key || generateSpwKey(ls.employee_id, ls.date, ls.start_time, ls.end_time, 'standplaats');
      const byFull = `${ls.start_time || ''}_${ls.end_time || ''}_${ls.customer_id || ''}_${ls.activity_id || ''}`;
      if (!linkedIndex.has(byKey)) linkedIndex.set(byKey, ls);
      if (!linkedIndex.has(byFull)) linkedIndex.set(byFull, ls);
    }

    if (Array.isArray(standplaats_werk) && standplaats_werk.length > 0) {
      for (const spw of standplaats_werk) {
        if (!spw.customer_id && !spw.activity_id) continue;

        const spwStartTime = isTime(spw.start_time) ? spw.start_time : null;
        const spwEndTime = isTime(spw.end_time) ? spw.end_time : null;

        // Guard: skip null-time items to prevent vague lookupKey matches
        if (!spwStartTime && !spwEndTime) continue;

        const spw_key = generateSpwKey(employee_id, date, spwStartTime, spwEndTime, 'standplaats');

        // Skip if already handled in 2c — O(1) via linkedIndex
        const lookupKey = `${spwStartTime || ''}_${spwEndTime || ''}_${spw.customer_id || ''}_${spw.activity_id || ''}`;
        const alreadyHandled = linkedIndex.get(spw_key) || linkedIndex.get(lookupKey);
        if (alreadyHandled) {
          if (!usedSpwIds.has(alreadyHandled.id)) {
            finalSpwIds.push(alreadyHandled.id);
            usedSpwIds.add(alreadyHandled.id);
          }
          continue;
        }

        // Lookup from in-memory index — O(1)
        const matches = spwIndex.get(lookupKey) || [];
        const match = matches.find(m => !usedSpwIds.has(m.id));

        if (match) {
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
          usedSpwIds.add(match.id);
          console.log(`[RECALC] Claimed existing SPW ${match.id} → TE=${time_entry_id}, Definitief`);
        } else {
          // DUPLICATE CHECK: look for existing SPW with same spw_key before creating
          const existingByKey = allSpwForDay.find(s => s.spw_key === spw_key && !usedSpwIds.has(s.id));
          if (existingByKey) {
            await svc.entities.StandplaatsWerk.update(existingByKey.id, {
              time_entry_id,
              customer_id: spw.customer_id || existingByKey.customer_id || null,
              project_id: spw.project_id || existingByKey.project_id || null,
              activity_id: spw.activity_id || existingByKey.activity_id || null,
              notes: (spw.notes || existingByKey.notes || '').slice(0, 2000) || null,
              status: 'Definitief',
            });
            finalSpwIds.push(existingByKey.id);
            usedSpwIds.add(existingByKey.id);
            console.log(`[RECALC] Claimed existing SPW ${existingByKey.id} by spw_key → TE=${time_entry_id}, Definitief`);
          } else {
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
            usedSpwIds.add(s.id);
            console.log(`[RECALC] Created new SPW ${s.id}`);
          }
        }
      }
    }

    // 2e. CLEANUP: Delete remaining draft SPW (status=Concept) for this TE that were NOT claimed
    const remainingDraftSpw = allSpwForDay.filter(s =>
      s.time_entry_id === time_entry_id && s.status === 'Concept' && !usedSpwIds.has(s.id)
    );
    if (remainingDraftSpw.length > 0) {
      console.log(`[RECALC] Cleaning up ${remainingDraftSpw.length} remaining Concept draft SPW`);
      for (const ds of remainingDraftSpw) {
        try { await svc.entities.StandplaatsWerk.delete(ds.id); }
        catch (e) { console.error(`[RECALC] Failed to delete draft SPW ${ds.id}: ${e.message}`); }
      }
    }

    perf.spw_ms = Date.now() - tSpw;

    // ========================================
    // 3. WRITE VERIFICATION
    // ========================================
    const tVerify = Date.now();
    const verifyEntries = await svc.entities.TimeEntry.filter({ employee_id, submission_id });
    const verifyEntry = verifyEntries.find(e => e.id === time_entry_id && e.status === 'Ingediend');
    perf.write_verify_ms = Date.now() - tVerify;

    if (!verifyEntry) {
      console.error(`[RECALC] CRITICAL: TimeEntry ${time_entry_id} not found or not Ingediend in write verification`);
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

    // NOTE: Sections removed in v5 (moved to future async cron jobs):
    // - Post-commit overlap guard (was section 4)
    // - Old draft cleanup (was section 5)
    // - Duplicate SPW cleanup (was section 2c)
    // - Orphan draft cleanup (was section 2d)

    // ========================================
    // 4. PRE-RESOLVE RECEIVED SIBLING
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
    console.log('[RECALC END]', { runId, time_entry_id, duration: Date.now() - t0 });
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