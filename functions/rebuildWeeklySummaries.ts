// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: ADMIN ONLY - NOODHERSTEL                        ║
// ║ Purpose: Force rebuild all WeeklyCustomer/EmployeeSummaries    ║
// ║          for a range of years, ignoring locks.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { start_year, end_year } = await req.json();
    if (!start_year || !end_year || end_year < start_year) {
      return Response.json({ error: 'Valid start_year and end_year required' }, { status: 400 });
    }

    console.log(`[rebuildWeekly] Rebuilding from ${start_year} to ${end_year}`);

    const results = [];
    let totalWeeks = 0;
    let totalErrors = 0;

    for (let year = start_year; year <= end_year; year++) {
      // ISO weeks: most years have 52, some have 53
      const dec28 = new Date(year, 11, 28);
      const jan4 = new Date(year, 0, 4);
      const jan4dow = jan4.getDay() || 7;
      const thursday = new Date(dec28);
      thursday.setDate(thursday.getDate() + (4 - (thursday.getDay() || 7)));
      const yearStart = new Date(thursday.getFullYear(), 0, 1);
      const maxWeek = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);

      console.log(`[rebuildWeekly] Year ${year}: ${maxWeek} weeks`);

      for (let week = 1; week <= maxWeek; week++) {
        try {
          const res = await base44.functions.invoke('recalculateWeeklySummaries', {
            year, week_number: week, force_unlock: true,
          });
          totalWeeks++;
          if (res.data?.skipped) {
            results.push({ year, week, status: 'skipped', reason: res.data.reason });
          } else {
            results.push({ year, week, status: 'ok' });
          }
        } catch (err) {
          totalErrors++;
          results.push({ year, week, status: 'error', message: err?.message });
          console.error(`[rebuildWeekly] Error year=${year} week=${week}:`, err?.message);
        }
      }
    }

    // Audit log
    try {
      const svc = base44.asServiceRole;
      await svc.entities.AuditLog.create({
        action_type: 'update',
        category: 'Systeem',
        description: `Weekly rebuild ${start_year}-${end_year}: ${totalWeeks} weken verwerkt, ${totalErrors} fouten`,
        performed_by_email: user.email,
        performed_by_name: user.full_name || user.email,
        performed_by_role: user.role,
        metadata: { start_year, end_year, total_weeks: totalWeeks, errors: totalErrors },
      });
    } catch (auditErr) {
      console.warn('[rebuildWeekly] Audit log failed:', auditErr?.message);
    }

    console.log(`[rebuildWeekly] Done. ${totalWeeks} weeks, ${totalErrors} errors.`);

    return Response.json({
      success: totalErrors === 0,
      start_year, end_year,
      total_weeks: totalWeeks,
      total_errors: totalErrors,
      details: results.filter(r => r.status !== 'ok'), // only non-ok for brevity
    });
  } catch (error) {
    console.error('[rebuildWeeklySummaries]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});