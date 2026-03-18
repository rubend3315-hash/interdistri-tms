// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: ENTITY AUTOMATION HOOK                          ║
// ║ Called by: Trip.update / StandplaatsWerk.update automation      ║
// ║ Auth: Service role (automation)                                ║
// ║ Purpose: Trigger weekly recalc when a Trip or SPW changes      ║
// ║          and linked TimeEntry is "Goedgekeurd"                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (!event || !data) {
      return Response.json({ skipped: true, reason: 'no event/data' });
    }

    const svc = base44.asServiceRole;
    const entityName = event.entity_name;
    const timeEntryId = data.time_entry_id;

    if (!timeEntryId) {
      console.log(`[onTripOrSpwChange] ${entityName} ${event.entity_id} has no time_entry_id — skipping`);
      return Response.json({ skipped: true, reason: 'no time_entry_id' });
    }

    // Check if linked TimeEntry is approved
    let te;
    try {
      const entries = await svc.entities.TimeEntry.filter({ id: timeEntryId });
      te = entries[0];
    } catch (e) {
      console.warn(`[onTripOrSpwChange] TimeEntry lookup failed:`, e?.message);
      return Response.json({ skipped: true, reason: 'te_lookup_failed' });
    }

    if (!te || te.status !== 'Goedgekeurd') {
      console.log(`[onTripOrSpwChange] TE ${timeEntryId} status=${te?.status} — skipping recalc`);
      return Response.json({ skipped: true, reason: 'te_not_approved' });
    }

    const year = te.year;
    const week_number = te.week_number;

    if (!year || !week_number) {
      console.log(`[onTripOrSpwChange] TE ${timeEntryId} missing year/week — skipping`);
      return Response.json({ skipped: true, reason: 'te_no_week' });
    }

    console.log(`[onTripOrSpwChange] ${entityName} changed → TE ${timeEntryId} approved → triggering recalc year=${year} week=${week_number}`);

    // Fire recalculation (fire-and-forget style, but we await for the result)
    try {
      await svc.functions.invoke('recalculateWeeklySummaries', { year, week_number });
      console.log(`[onTripOrSpwChange] Recalc triggered successfully`);
    } catch (recalcErr) {
      console.error(`[onTripOrSpwChange] Recalc failed:`, recalcErr?.message);
    }

    return Response.json({ success: true, year, week_number });
  } catch (error) {
    console.error('[onTripOrSpwChange]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});