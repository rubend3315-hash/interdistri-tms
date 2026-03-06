// deleteTimeEntryCascade - v3 minimal - 2026-03-06
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return Response.json({ error: 'MISSING_ID', message: 'ID verplicht' }, { status: 400 });

  const svc = base44.asServiceRole;

  // Parallel fetch all related data
  const [entries, trips, spw] = await Promise.all([
    svc.entities.TimeEntry.filter({ id }),
    svc.entities.Trip.filter({ time_entry_id: id }),
    svc.entities.StandplaatsWerk.filter({ time_entry_id: id }),
  ]);

  if (!entries[0]) return Response.json({ error: 'NOT_FOUND', message: 'Niet gevonden' }, { status: 404 });

  // Parallel delete everything
  await Promise.all([
    ...trips.map(t => svc.entities.Trip.delete(t.id).catch(() => {})),
    ...spw.map(s => svc.entities.StandplaatsWerk.delete(s.id).catch(() => {})),
    svc.entities.TimeEntry.delete(id),
  ]);

  return Response.json({ success: true, message: 'Verwijderd' });
});