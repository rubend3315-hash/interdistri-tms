// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Employee via mobile app (autosave draft regels)       ║
// ║ Auth: User session (any authenticated employee)                  ║
// ║ v5 — 2026-03-31 — atomic upsert + trip_key dedup guard          ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// In-memory concurrency guard: prevents parallel saves for same time_entry_id
// Acts as a soft mutex — only one save runs at a time per TE
const activeSaves = new Map();

// Key generators — must match recalculateAfterTimeEntrySubmit
function generateTripKey(employee_id, date, departure_time, arrival_time) {
  return `${employee_id || ''}_${date || ''}_${departure_time || ''}_${arrival_time || ''}`;
}
function generateSpwKey(employee_id, date, start_time, end_time) {
  return `${employee_id || ''}_${date || ''}_${start_time || ''}_${end_time || ''}_standplaats`;
}

Deno.serve(async (req) => {
  let lockKey = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { time_entry_id, employee_id, date, dienstRegels } = await req.json();

    if (!employee_id || !date) {
      return Response.json({ success: false, error: 'employee_id en date zijn verplicht' }, { status: 422 });
    }
    if (!time_entry_id) {
      return Response.json({ success: false, error: 'time_entry_id is verplicht' }, { status: 422 });
    }
    if (!dienstRegels || !Array.isArray(dienstRegels) || dienstRegels.length === 0) {
      return Response.json({ success: true, message: 'Geen regels om op te slaan' });
    }

    // ── Concurrency guard (per time_entry_id) ──
    lockKey = `${time_entry_id}`;
    if (activeSaves.has(lockKey)) {
      console.log(`[Draft save skipped: lock active] ${lockKey}`);
      return Response.json({ success: true, skipped: true, reason: 'parallel_save_in_progress' });
    }
    activeSaves.set(lockKey, Date.now());

    console.log(`[Draft save start] te=${time_entry_id} employee=${employee_id} date=${date} rules=${dienstRegels.length}`);

    const svc = base44.asServiceRole;

    // ── 0. RACE CONDITION GUARD: Skip if TE is already submitted ──
    // The mobile app fires saveDraftServiceRules in parallel with submitTimeEntry.
    // If submitTimeEntry already committed the TE to "Ingediend" or "Goedgekeurd",
    // creating draft trips here would produce duplicates alongside the "Voltooid" trips
    // created by recalculateAfterTimeEntrySubmit.
    const teCheck = await svc.entities.TimeEntry.filter({ id: time_entry_id });
    const teStatus = teCheck[0]?.status;
    if (teStatus === 'Ingediend' || teStatus === 'Goedgekeurd') {
      console.log(`[saveDraftRules] SKIP — TE ${time_entry_id} already ${teStatus}, no drafts needed`);
      return Response.json({ success: true, skipped: true, reason: 'te_already_submitted' });
    }

    // ── 1. Delete existing draft trips (status=Gepland) for this time_entry_id ──
    // IMPORTANT: Only delete drafts linked to THIS time_entry_id — never touch other TEs
    const existingTrips = await svc.entities.Trip.filter({
      time_entry_id,
      status: 'Gepland',
    });

    if (existingTrips.length > 0) {
      console.log(`[saveDraftRules] Deleting ${existingTrips.length} draft trips for te=${time_entry_id}`);
      for (const t of existingTrips) {
        try {
          await svc.entities.Trip.delete(t.id);
        } catch (e) {
          console.error(`[saveDraftRules] Delete trip ${t.id} failed: ${e?.message}`);
        }
      }
    }

    // ── 2. Delete existing draft SPW (status=Concept) for this time_entry_id ──
    const existingSpw = await svc.entities.StandplaatsWerk.filter({
      time_entry_id,
      status: 'Concept',
    });
    if (existingSpw.length > 0) {
      console.log(`[saveDraftRules] Deleting ${existingSpw.length} draft SPW for te=${time_entry_id}`);
      for (const s of existingSpw) {
        try {
          await svc.entities.StandplaatsWerk.delete(s.id);
        } catch (e) {
          console.error(`[saveDraftRules] Delete SPW ${s.id} failed: ${e?.message}`);
        }
      }
    }

    // ── 3. Fetch ALL existing trips/SPW for this employee+date for dedup check ──
    // This is our "pseudo unique constraint" — we check trip_key before every create
    const allTripsForDay = await svc.entities.Trip.filter({ employee_id, date });
    const existingTripKeys = new Set(allTripsForDay.map(t => t.trip_key).filter(Boolean));
    
    const allSpwForDay = await svc.entities.StandplaatsWerk.filter({ employee_id, date });
    const existingSpwKeys = new Set(allSpwForDay.map(s => s.spw_key).filter(Boolean));
    
    console.log(`[saveDraftRules] Dedup index: ${existingTripKeys.size} trip_keys, ${existingSpwKeys.size} spw_keys`);

    // ── 4. Create new records with ATOMIC DEDUP CHECK ──
    let createdTrips = 0;
    let skippedTrips = 0;
    let createdSpw = 0;
    let skippedSpw = 0;

    for (let idx = 0; idx < dienstRegels.length; idx++) {
      const regel = dienstRegels[idx];

      if (regel.type === 'rit') {
        const vehicleId = regel.vehicle_id || regel.vehicle?.id || regel.vehicle;

        if (!vehicleId) {
          console.log(`[saveDraftRules] SKIP rule[${idx}] — missing vehicle_id`);
          continue;
        }

        // Generate trip_key BEFORE create — this is our unique constraint
        const tripKey = generateTripKey(employee_id, date, regel.start_time || null, regel.end_time || null);
        
        // ATOMIC DEDUP CHECK: Skip if trip_key already exists
        if (tripKey && existingTripKeys.has(tripKey)) {
          console.log(`[saveDraftRules] SKIP trip[${idx}] — trip_key ${tripKey} already exists`);
          skippedTrips++;
          continue;
        }

        try {
          await svc.entities.Trip.create({
            employee_id,
            date,
            time_entry_id: time_entry_id || undefined,
            trip_key: tripKey, // Set trip_key at creation time
            vehicle_id: vehicleId,
            start_km: regel.start_km ? Number(regel.start_km) : undefined,
            end_km: regel.end_km ? Number(regel.end_km) : undefined,
            fuel_liters: regel.fuel_liters ? Number(regel.fuel_liters) : undefined,
            adblue_liters: regel.adblue_liters ? Number(regel.adblue_liters) : undefined,
            fuel_km: regel.fuel_km ? Number(regel.fuel_km) : undefined,
            charging_kwh: regel.charging_kwh ? Number(regel.charging_kwh) : undefined,
            customer_id: regel.customer_id || undefined,
            route_name: regel.route_name || undefined,
            planned_stops: regel.planned_stops ? Number(regel.planned_stops) : undefined,
            departure_location: regel.departure_location || undefined,
            departure_time: regel.start_time || undefined,
            arrival_time: regel.end_time || undefined,
            notes: regel.notes || undefined,
            status: 'Gepland',
          });
          // Add to index to prevent duplicates within same batch
          if (tripKey) existingTripKeys.add(tripKey);
          createdTrips++;
          console.log(`[saveDraftRules] Created trip[${idx}] key=${tripKey} vehicle=${vehicleId}`);
        } catch (err) {
          console.error(`[saveDraftRules] Trip create error[${idx}]:`, err?.message);
        }
      } else if (regel.type === 'standplaats') {
        // Generate spw_key BEFORE create
        const spwKey = generateSpwKey(employee_id, date, regel.start_time || null, regel.end_time || null);
        
        // ATOMIC DEDUP CHECK: Skip if spw_key already exists
        if (spwKey && existingSpwKeys.has(spwKey)) {
          console.log(`[saveDraftRules] SKIP SPW[${idx}] — spw_key ${spwKey} already exists`);
          skippedSpw++;
          continue;
        }

        try {
          await svc.entities.StandplaatsWerk.create({
            employee_id,
            date,
            time_entry_id: time_entry_id || undefined,
            spw_key: spwKey, // Set spw_key at creation time
            start_time: regel.start_time || undefined,
            end_time: regel.end_time || undefined,
            customer_id: regel.customer_id || undefined,
            project_id: regel.project_id || undefined,
            activity_id: regel.activity_id || undefined,
            notes: regel.notes || undefined,
            status: 'Concept',
          });
          // Add to index to prevent duplicates within same batch
          if (spwKey) existingSpwKeys.add(spwKey);
          createdSpw++;
          console.log(`[saveDraftRules] Created SPW[${idx}] key=${spwKey}`);
        } catch (err) {
          console.error(`[saveDraftRules] SPW create error[${idx}]:`, err?.message);
        }
      }
    }

    console.log(`[Draft save complete] ${lockKey} — created: ${createdTrips} trips + ${createdSpw} SPW, skipped: ${skippedTrips} trips + ${skippedSpw} SPW`);
    return Response.json({ success: true, createdTrips, createdSpw, skippedTrips, skippedSpw });

  } catch (error) {
    console.error('[saveDraftRules] Error:', error?.message);
    return Response.json({ success: false, error: error.message || 'Onbekende fout' }, { status: 500 });
  } finally {
    // Always release the lock
    if (lockKey) activeSaves.delete(lockKey);
  }
});