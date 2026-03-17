// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: ADMIN AUDIT                                      ║
// ║ Called by: Admin manually or via dashboard                       ║
// ║ Auth: Admin only                                                 ║
// ║ PURPOSE: Detect inconsistencies between TimeEntry, Trip, SPW     ║
// ║ v1 — 2026-03-17                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const payload = await req.json().catch(() => ({}));
    const sinceDate = payload.since_date || '2026-03-15';

    const staleCutoff = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const isRecent = (dateStr) => dateStr && (now - new Date(dateStr).getTime()) < staleCutoff;

    console.log(`[AUDIT] Starting integrity audit since ${sinceDate}`);

    // 1. Fetch all TimeEntries since date
    const entries = await svc.entities.TimeEntry.filter({
      date: { $gte: sinceDate },
    }, '-date', 500);

    console.log(`[AUDIT] Found ${entries.length} TimeEntries`);

    const report = [];

    // 2. Check each TimeEntry for consistency
    for (const te of entries) {
      // Skip active drafts (updated within last 24h) — normal autosave behavior
      if (te.status === 'Concept' && isRecent(te.updated_date)) {
        continue;
      }

      const [trips, spw] = await Promise.all([
        svc.entities.Trip.filter({ time_entry_id: te.id }),
        svc.entities.StandplaatsWerk.filter({ time_entry_id: te.id }),
      ]);

      const issues = [];

      // Ingediend/Goedgekeurd but trips not Voltooid
      if (te.status === 'Ingediend' || te.status === 'Goedgekeurd') {
        const badTrips = trips.filter(t => t.status !== 'Voltooid');
        if (badTrips.length > 0) {
          issues.push(`${badTrips.length} trip(s) niet Voltooid: ${badTrips.map(t => `${t.id}=${t.status}`).join(', ')}`);
        }

        const badSpw = spw.filter(s => s.status !== 'Definitief');
        if (badSpw.length > 0) {
          issues.push(`${badSpw.length} SPW niet Definitief: ${badSpw.map(s => `${s.id}=${s.status}`).join(', ')}`);
        }
      }

      // Stale Concept (>24h old)
      if (te.status === 'Concept') {
        issues.push(`Stale draft (>24h) — laatste update: ${te.updated_date || 'onbekend'}`);
      }

      // No trips AND no SPW for submitted entry (unless notes contain GEEN_RIT)
      if ((te.status === 'Ingediend' || te.status === 'Goedgekeurd') && trips.length === 0 && spw.length === 0) {
        const isGeenRit = te.notes && te.notes.includes('[GEEN_RIT]');
        if (!isGeenRit) {
          issues.push('Ingediend zonder trips of SPW (en geen GEEN_RIT)');
        }
      }

      if (issues.length > 0) {
        report.push({
          time_entry_id: te.id,
          employee_id: te.employee_id,
          date: te.date,
          status: te.status,
          start_time: te.start_time,
          end_time: te.end_time,
          trip_count: trips.length,
          spw_count: spw.length,
          issues,
        });
      }
    }

    // 3. Detect global orphan drafts
    const [orphanTrips, orphanSpw] = await Promise.all([
      svc.entities.Trip.filter({ status: 'Gepland', date: { $gte: sinceDate } }),
      svc.entities.StandplaatsWerk.filter({ status: 'Concept', date: { $gte: sinceDate } }),
    ]);

    // Check which orphans are truly orphaned (linked TE is not Concept)
    const trueOrphanTrips = [];
    for (const ot of orphanTrips) {
      if (!ot.time_entry_id) { trueOrphanTrips.push(ot); continue; }
      const linkedTE = entries.find(e => e.id === ot.time_entry_id);
      if (!linkedTE || linkedTE.status !== 'Concept') {
        trueOrphanTrips.push(ot);
      }
    }

    const trueOrphanSpw = [];
    for (const os of orphanSpw) {
      if (!os.time_entry_id) { trueOrphanSpw.push(os); continue; }
      const linkedTE = entries.find(e => e.id === os.time_entry_id);
      if (!linkedTE || linkedTE.status !== 'Concept') {
        trueOrphanSpw.push(os);
      }
    }

    const result = {
      status: report.length === 0 && trueOrphanTrips.length === 0 && trueOrphanSpw.length === 0 ? 'OK' : 'ISSUES_FOUND',
      since_date: sinceDate,
      total_entries_checked: entries.length,
      inconsistent_entries: report,
      inconsistent_count: report.length,
      orphan_trips: trueOrphanTrips.map(t => ({
        id: t.id, time_entry_id: t.time_entry_id, employee_id: t.employee_id,
        date: t.date, route_name: t.route_name, status: t.status,
      })),
      orphan_spw: trueOrphanSpw.map(s => ({
        id: s.id, time_entry_id: s.time_entry_id, employee_id: s.employee_id,
        date: s.date, status: s.status,
      })),
      orphan_trip_count: trueOrphanTrips.length,
      orphan_spw_count: trueOrphanSpw.length,
    };

    console.log(`[AUDIT] Result: ${result.status} — ${report.length} inconsistent entries, ${trueOrphanTrips.length} orphan trips, ${trueOrphanSpw.length} orphan SPW`);

    return Response.json(result);
  } catch (error) {
    console.error('[AUDIT] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});