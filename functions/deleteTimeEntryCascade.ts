// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Admin via frontend (TimeTracking page)                ║
// ║ Auth: User session (admin only)                                  ║
// ║ Optimized: parallel fetches + parallel deletes                   ║
// ║ Redeployed: 2026-03-06                                           ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

    // 1. Parallel: fetch TimeEntry + Trips + StandplaatsWerk
    const [entries, trips, spw] = await Promise.all([
      svc.entities.TimeEntry.filter({ id }),
      svc.entities.Trip.filter({ time_entry_id: id }),
      svc.entities.StandplaatsWerk.filter({ time_entry_id: id }),
    ]);

    if (!entries[0]) {
      return Response.json({ error: 'NOT_FOUND', message: 'TimeEntry niet gevonden' }, { status: 404 });
    }

    // 2. Parallel: delete all related records + the TimeEntry itself
    const deleteOps = [
      ...trips.map(t => svc.entities.Trip.delete(t.id).catch(e => console.error('[del trip]', e?.message))),
      ...spw.map(s => svc.entities.StandplaatsWerk.delete(s.id).catch(e => console.error('[del spw]', e?.message))),
      svc.entities.TimeEntry.delete(id),
    ];
    await Promise.all(deleteOps);

    console.log(`[deleteTimeEntryCascade] Deleted TE=${id}, ${trips.length} trip(s), ${spw.length} spw(s)`);
    return Response.json({ success: true, message: 'TimeEntry en gerelateerde records verwijderd' });
  } catch (error) {
    console.error('[deleteTimeEntryCascade] Error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});