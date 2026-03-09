// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Employee via mobile app (autosave draft regels)       ║
// ║ Auth: User session (any authenticated employee)                  ║
// ║ v2 — 2026-03-09 — prevent_duplicate_draft_trips_v1              ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// In-memory concurrency guard: prevents parallel saves for same employee+date
const activeSaves = new Map();

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
    if (!dienstRegels || !Array.isArray(dienstRegels) || dienstRegels.length === 0) {
      return Response.json({ success: true, message: 'Geen regels om op te slaan' });
    }

    // ── Concurrency guard ──
    lockKey = `${employee_id}::${date}`;
    if (activeSaves.has(lockKey)) {
      console.log(`[saveDraftRules] SKIPPED — parallel save in progress for ${lockKey}`);
      return Response.json({ success: true, skipped: true, reason: 'parallel_save_in_progress' });
    }
    activeSaves.set(lockKey, Date.now());

    console.log(`[saveDraftRules] START employee=${employee_id} date=${date} rules=${dienstRegels.length} time_entry_id=${time_entry_id || 'none'}`);

    const svc = base44.asServiceRole;

    // ── 1. Delete ALL existing draft trips (status=Gepland) for this employee+date ──
    const existingTrips = await svc.entities.Trip.filter({
      employee_id,
      date,
      status: 'Gepland',
    });

    if (existingTrips.length > 0) {
      console.log(`[saveDraftRules] Deleting ${existingTrips.length} existing draft trips`);
      await Promise.all(
        existingTrips.map(t =>
          svc.entities.Trip.delete(t.id).catch(e =>
            console.error(`[saveDraftRules] Delete trip ${t.id} failed: ${e?.message}`)
          )
        )
      );
    }

    // ── 2. Delete existing draft standplaatswerk ──
    const existingSpw = await svc.entities.StandplaatsWerk.filter({
      employee_id,
      date,
    });
    const spwToDelete = existingSpw.filter(s => !s.time_entry_id || s.time_entry_id === time_entry_id);
    if (spwToDelete.length > 0) {
      console.log(`[saveDraftRules] Deleting ${spwToDelete.length} existing draft SPW`);
      await Promise.all(
        spwToDelete.map(s =>
          svc.entities.StandplaatsWerk.delete(s.id).catch(e =>
            console.error(`[saveDraftRules] Delete SPW ${s.id} failed: ${e?.message}`)
          )
        )
      );
    }

    // ── 3. Create new records sequentially (to avoid race conditions) ──
    let createdTrips = 0;
    let createdSpw = 0;

    for (let idx = 0; idx < dienstRegels.length; idx++) {
      const regel = dienstRegels[idx];

      if (regel.type === 'rit') {
        const vehicleId = regel.vehicle_id || regel.vehicle?.id || regel.vehicle;

        if (!vehicleId) {
          console.log(`[saveDraftRules] SKIP rule[${idx}] — missing vehicle_id`);
          continue;
        }

        try {
          await svc.entities.Trip.create({
            employee_id,
            date,
            time_entry_id: time_entry_id || undefined,
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
          createdTrips++;
          console.log(`[saveDraftRules] Created trip[${idx}] vehicle=${vehicleId} route=${regel.route_name || '-'}`);
        } catch (err) {
          console.error(`[saveDraftRules] Trip create error[${idx}]:`, err?.message);
        }
      } else if (regel.type === 'standplaats') {
        try {
          await svc.entities.StandplaatsWerk.create({
            employee_id,
            date,
            time_entry_id: time_entry_id || undefined,
            start_time: regel.start_time || undefined,
            end_time: regel.end_time || undefined,
            customer_id: regel.customer_id || undefined,
            project_id: regel.project_id || undefined,
            activity_id: regel.activity_id || undefined,
            notes: regel.notes || undefined,
          });
          createdSpw++;
          console.log(`[saveDraftRules] Created SPW[${idx}]`);
        } catch (err) {
          console.error(`[saveDraftRules] SPW create error[${idx}]:`, err?.message);
        }
      }
    }

    console.log(`[saveDraftRules] DONE ${createdTrips} trips + ${createdSpw} SPW for ${lockKey}`);
    return Response.json({ success: true, createdTrips, createdSpw });

  } catch (error) {
    console.error('[saveDraftRules] Error:', error?.message);
    return Response.json({ success: false, error: error.message || 'Onbekende fout' }, { status: 500 });
  } finally {
    // Always release the lock
    if (lockKey) activeSaves.delete(lockKey);
  }
});