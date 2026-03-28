// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: ADMIN-ONLY                                      ║
// ║ Herberekent pauze (break_minutes) voor niet-goedgekeurde       ║
// ║ TimeEntries op basis van de actuele BreakSchedule staffel.      ║
// ║ Alleen entries met break_manual=false worden aangepast.         ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { statuses = ['Concept', 'Ingediend'], dry_run = false } = payload;

    const svc = base44.asServiceRole;

    // Paginated fetch helper — SDK bug workaround
    async function paginatedFilter(entity, query, sortField) {
      const all = [];
      let skip = 0;
      const PAGE = 20;
      while (true) {
        const page = await entity.filter(query, sortField || '-created_date', PAGE, skip);
        if (!Array.isArray(page) || page.length === 0) break;
        all.push(...page);
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      return all;
    }

    // Fetch break schedules + all time entries in parallel
    const [breakSchedules, allEntries] = await Promise.all([
      paginatedFilter(svc.entities.BreakSchedule, {}),
      paginatedFilter(svc.entities.TimeEntry, {}),
    ]);

    const activeSchedules = breakSchedules
      .filter(s => s.status === 'Actief')
      .sort((a, b) => a.min_hours - b.min_hours);

    console.log(`[recalcBreaks] Active schedules: ${activeSchedules.length}`);
    console.log(`[recalcBreaks] Target statuses: ${statuses.join(', ')}`);

    // Filter: target statuses + break_manual !== true
    const candidates = allEntries.filter(e => {
      if (!statuses.includes(e.status)) return false;
      if (e.break_manual === true) return false;
      if (!e.start_time || !e.end_time) return false;
      return true;
    });

    console.log(`[recalcBreaks] Candidates: ${candidates.length} (of ${allEntries.length} total)`);

    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    const details = [];

    for (const entry of candidates) {
      try {
        // Calculate gross dienst minutes
        const [sH, sM] = entry.start_time.split(':').map(Number);
        const [eH, eM] = entry.end_time.split(':').map(Number);
        if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) {
          unchanged++;
          continue;
        }

        let dienstMin = (eH * 60 + eM) - (sH * 60 + sM);
        // Multi-day support
        if (entry.end_date && entry.date && entry.end_date > entry.date) {
          const d1 = new Date(entry.date + 'T12:00:00');
          const d2 = new Date(entry.end_date + 'T12:00:00');
          dienstMin += Math.round((d2 - d1) / 86400000) * 1440;
        } else if (dienstMin < 0) {
          dienstMin += 1440;
        }

        const dienstHours = dienstMin / 60;

        // Find matching staffel
        const match = activeSchedules.find(s =>
          dienstHours >= s.min_hours && (s.max_hours == null || dienstHours < s.max_hours)
        );
        const newBreak = match ? match.break_minutes : 0;
        const newStaffelId = match ? match.id : null;

        const oldBreak = entry.break_minutes ?? 0;

        if (oldBreak === newBreak && entry.break_staffel_id === newStaffelId && entry.calculated_dienst_minutes === dienstMin) {
          unchanged++;
          continue;
        }

        // Recalculate total_hours with new break
        const netMinutes = Math.max(0, dienstMin - newBreak);
        const newTotalHours = Math.round(netMinutes / 60 * 100) / 100;

        if (!dry_run) {
          await svc.entities.TimeEntry.update(entry.id, {
            break_minutes: newBreak,
            break_staffel_id: newStaffelId,
            calculated_dienst_minutes: dienstMin,
            total_hours: newTotalHours,
          });
        }

        updated++;
        details.push({
          id: entry.id,
          employee_id: entry.employee_id,
          date: entry.date,
          status: entry.status,
          dienst_hours: Math.round(dienstHours * 100) / 100,
          old_break: oldBreak,
          new_break: newBreak,
          old_total: entry.total_hours,
          new_total: newTotalHours,
        });
      } catch (err) {
        console.error(`[recalcBreaks] Error entry ${entry.id}: ${err.message}`);
        errors++;
      }
    }

    const skippedManual = allEntries.filter(e => statuses.includes(e.status) && e.break_manual === true).length;

    console.log(`[recalcBreaks] Done: ${updated} updated, ${unchanged} unchanged, ${errors} errors, ${skippedManual} manual skipped`);

    return Response.json({
      success: true,
      dry_run,
      summary: {
        total_candidates: candidates.length,
        updated,
        unchanged,
        errors,
        skipped_manual: skippedManual,
      },
      details: details.slice(0, 100), // Limit response size
      message: dry_run
        ? `[DRY RUN] ${updated} diensten zouden worden aangepast, ${unchanged} ongewijzigd`
        : `${updated} diensten herberekend, ${unchanged} ongewijzigd${errors > 0 ? `, ${errors} fouten` : ''}`,
    });
  } catch (error) {
    console.error('[recalcBreaks] Fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});