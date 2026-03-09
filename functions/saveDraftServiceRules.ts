// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Employee via mobile app (autosave draft regels)       ║
// ║ Auth: User session (any authenticated employee)                  ║
// ║ v1 — 2026-03-09                                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
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

    const svc = base44.asServiceRole;

    // 1. Delete existing draft trips (status=Gepland) for this employee+date
    const existingTrips = await svc.entities.Trip.filter({
      employee_id,
      date,
      status: 'Gepland',
    });
    for (const t of existingTrips) {
      try { await svc.entities.Trip.delete(t.id); } catch (e) {
        console.error(`[saveDraftRules] Failed to delete trip ${t.id}: ${e?.message}`);
      }
    }

    // 2. Delete existing draft standplaatswerk for this employee+date
    //    StandplaatsWerk has no status field, so filter by time_entry_id or employee+date
    const existingSpw = await svc.entities.StandplaatsWerk.filter({
      employee_id,
      date,
    });
    // Only delete SPW that are not linked to a submitted time entry
    for (const s of existingSpw) {
      // If linked to a time_entry_id that is a Concept, or same as our draft, delete it
      if (!s.time_entry_id || s.time_entry_id === time_entry_id) {
        try { await svc.entities.StandplaatsWerk.delete(s.id); } catch (e) {
          console.error(`[saveDraftRules] Failed to delete SPW ${s.id}: ${e?.message}`);
        }
      }
    }

    // 3. Save all current dienstRegels
    let createdTrips = 0;
    let createdSpw = 0;

    for (const regel of dienstRegels) {
      if (regel.type === 'rit') {
        const vehicleId = regel.vehicle_id || regel.vehicle?.id || regel.vehicle;

        if (!vehicleId) {
          console.log("[Draft trip skipped] missing vehicle_id", regel);
          continue;
        }

        console.log("[Draft trip create]", {
          vehicle_id: vehicleId,
          original_vehicle_id: regel.vehicle_id,
          vehicle_object: regel.vehicle
        });

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
        } catch (err) {
          console.error("[Draft trip create error]", err?.message, { vehicleId, regel_keys: Object.keys(regel) });
        }
      } else if (regel.type === 'standplaats') {
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
      }
    }

    console.log(`[saveDraftRules] Saved ${createdTrips} trips + ${createdSpw} SPW for employee=${employee_id} date=${date}`);
    return Response.json({ success: true, createdTrips, createdSpw });

  } catch (error) {
    console.error('[saveDraftRules] Error:', error?.message);
    return Response.json({ success: false, error: error.message || 'Onbekende fout' }, { status: 500 });
  }
});