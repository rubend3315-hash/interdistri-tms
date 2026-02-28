// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: ADMIN ONLY - NOODHERSTEL                        ║
// ║ Purpose: Force rebuild all MonthlyCustomerSummaries            ║
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

    console.log(`[rebuildMonthly] Rebuilding from ${start_year} to ${end_year}`);

    const results = [];
    let totalMonths = 0;
    let totalErrors = 0;

    for (let year = start_year; year <= end_year; year++) {
      for (let month = 1; month <= 12; month++) {
        // Skip future months
        const now = new Date();
        if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)) {
          continue;
        }

        try {
          const res = await base44.functions.invoke('recalculateMonthlyCustomerSummary', {
            year, month, force_unlock: true,
          });
          totalMonths++;
          if (res.data?.skipped) {
            results.push({ year, month, status: 'skipped', reason: res.data.reason });
          } else {
            results.push({ year, month, status: 'ok' });
          }
        } catch (err) {
          totalErrors++;
          results.push({ year, month, status: 'error', message: err?.message });
          console.error(`[rebuildMonthly] Error year=${year} month=${month}:`, err?.message);
        }
      }
    }

    // Audit log
    try {
      const svc = base44.asServiceRole;
      await svc.entities.AuditLog.create({
        action_type: 'update',
        category: 'Systeem',
        description: `Monthly rebuild ${start_year}-${end_year}: ${totalMonths} maanden verwerkt, ${totalErrors} fouten`,
        performed_by_email: user.email,
        performed_by_name: user.full_name || user.email,
        performed_by_role: user.role,
        metadata: { start_year, end_year, total_months: totalMonths, errors: totalErrors },
      });
    } catch (auditErr) {
      console.warn('[rebuildMonthly] Audit log failed:', auditErr?.message);
    }

    console.log(`[rebuildMonthly] Done. ${totalMonths} months, ${totalErrors} errors.`);

    return Response.json({
      success: totalErrors === 0,
      start_year, end_year,
      total_months: totalMonths,
      total_errors: totalErrors,
      details: results.filter(r => r.status !== 'ok'),
    });
  } catch (error) {
    console.error('[rebuildMonthlySummaries]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});