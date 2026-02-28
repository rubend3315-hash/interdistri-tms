// redeploy: 2026-02-28T fix_deployment_v2
// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Admin via frontend (TimeTracking page)                ║
// ║ Auth: User session (admin only)                                  ║
// ║ DO NOT USE RAW ENTITY CALLS — USE tenantService for tenant data  ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) {
      return Response.json({ error: 'MISSING_ID', message: 'TimeEntry ID is verplicht' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // 1. Haal TimeEntry op om te bevestigen dat het bestaat
    let entry;
    try {
      const entries = await svc.entities.TimeEntry.filter({ id });
      entry = entries[0];
    } catch (e) {
      console.error('[deleteTimeEntryCascade] Fetch TimeEntry failed:', e?.message);
    }
    if (!entry) {
      return Response.json({ error: 'NOT_FOUND', message: 'TimeEntry niet gevonden' }, { status: 404 });
    }

    // 2. Verwijder alle Trip records met time_entry_id = entry.id
    try {
      const trips = await svc.entities.Trip.filter({ time_entry_id: id });
      for (const trip of trips) {
        await svc.entities.Trip.delete(trip.id);
      }
      console.log(`[deleteTimeEntryCascade] Deleted ${trips.length} Trip(s) for TimeEntry ${id}`);
    } catch (e) {
      console.error('[deleteTimeEntryCascade] Delete Trips failed:', e?.message);
    }

    // 3. Verwijder alle StandplaatsWerk records met time_entry_id = entry.id
    try {
      const spw = await svc.entities.StandplaatsWerk.filter({ time_entry_id: id });
      for (const item of spw) {
        await svc.entities.StandplaatsWerk.delete(item.id);
      }
      console.log(`[deleteTimeEntryCascade] Deleted ${spw.length} StandplaatsWerk(s) for TimeEntry ${id}`);
    } catch (e) {
      console.error('[deleteTimeEntryCascade] Delete StandplaatsWerk failed:', e?.message);
    }

    // 4. Verwijder de TimeEntry zelf
    await svc.entities.TimeEntry.delete(id);
    console.log(`[deleteTimeEntryCascade] Deleted TimeEntry ${id}`);

    return Response.json({ success: true, message: 'TimeEntry en gerelateerde records verwijderd' });
  } catch (error) {
    console.error('[deleteTimeEntryCascade] Error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});