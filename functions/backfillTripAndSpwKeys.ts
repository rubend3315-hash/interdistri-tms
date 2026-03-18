// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: ADMIN UTILITY                                    ║
// ║ Called by: Admin manually (one-time backfill)                    ║
// ║ Auth: Admin only                                                 ║
// ║ PURPOSE: Backfill trip_key and spw_key for existing records     ║
// ║ SAFE: Only fills empty fields, no deletes, no status changes    ║
// ║ v1 — 2026-03-18                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function generateTripKey(employee_id, date, departure_time, arrival_time) {
  return `${employee_id || ''}_${date || ''}_${departure_time || ''}_${arrival_time || ''}`;
}

function generateSpwKey(employee_id, date, start_time, end_time, type = 'standplaats') {
  return `${employee_id || ''}_${date || ''}_${start_time || ''}_${end_time || ''}_${type}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const payload = await req.json().catch(() => ({}));
    const dryRun = payload.dry_run === true;
    const batchSize = payload.batch_size || 50;
    const maxRecords = payload.max_records || 500; // Limit per run to avoid timeout

    console.log(`[BACKFILL] Starting backfill (dry_run=${dryRun}, batch_size=${batchSize})`);

    const result = {
      trips: { scanned: 0, updated: 0, errors: [] },
      spw: { scanned: 0, updated: 0, errors: [] },
    };

    // ========================================
    // 1. BACKFILL TRIPS
    // ========================================
    let tripOffset = 0;
    let hasMoreTrips = true;

    while (hasMoreTrips && result.trips.scanned < maxRecords) {
      const trips = await svc.entities.Trip.filter({}, '-created_date', batchSize, tripOffset);
      
      if (trips.length === 0) {
        hasMoreTrips = false;
        break;
      }

      for (const trip of trips) {
        if (result.trips.scanned >= maxRecords) break;
        result.trips.scanned++;

        // Only backfill if trip_key is missing or empty
        if (!trip.trip_key) {
          const trip_key = generateTripKey(trip.employee_id, trip.date, trip.departure_time, trip.arrival_time);

          if (!dryRun) {
            try {
              await svc.entities.Trip.update(trip.id, { trip_key });
              result.trips.updated++;
            } catch (e) {
              result.trips.errors.push({ id: trip.id, error: e.message });
            }
          } else {
            result.trips.updated++;
          }
        }
      }

      tripOffset += batchSize;
      if (trips.length < batchSize) hasMoreTrips = false;
    }

    console.log(`[BACKFILL] Trips: scanned=${result.trips.scanned}, updated=${result.trips.updated}`);

    // ========================================
    // 2. BACKFILL STANDPLAATSWERK
    // ========================================
    let spwOffset = 0;
    let hasMoreSpw = true;

    while (hasMoreSpw && result.spw.scanned < maxRecords) {
      const spwRecords = await svc.entities.StandplaatsWerk.filter({}, '-created_date', batchSize, spwOffset);
      
      if (spwRecords.length === 0) {
        hasMoreSpw = false;
        break;
      }

      for (const spw of spwRecords) {
        if (result.spw.scanned >= maxRecords) break;
        result.spw.scanned++;

        // Only backfill if spw_key is missing or empty
        if (!spw.spw_key) {
          const spw_key = generateSpwKey(spw.employee_id, spw.date, spw.start_time, spw.end_time, 'standplaats');

          if (!dryRun) {
            try {
              await svc.entities.StandplaatsWerk.update(spw.id, { spw_key });
              result.spw.updated++;
            } catch (e) {
              result.spw.errors.push({ id: spw.id, error: e.message });
            }
          } else {
            result.spw.updated++;
          }
        }
      }

      spwOffset += batchSize;
      if (spwRecords.length < batchSize) hasMoreSpw = false;
    }

    console.log(`[BACKFILL] SPW: scanned=${result.spw.scanned}, updated=${result.spw.updated}`);

    return Response.json({
      status: 'OK',
      dry_run: dryRun,
      trips: result.trips,
      spw: result.spw,
      message: dryRun 
        ? `Dry run complete: ${result.trips.updated} trips and ${result.spw.updated} SPW records would be updated`
        : `Backfill complete: ${result.trips.updated} trips and ${result.spw.updated} SPW records updated`,
    });

  } catch (error) {
    console.error('[BACKFILL] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});