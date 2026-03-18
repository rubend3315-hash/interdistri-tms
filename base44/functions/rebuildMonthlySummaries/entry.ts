// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: ADMIN ONLY - NOODHERSTEL                        ║
// ║ Purpose: Force rebuild all MonthlyCustomerSummaries            ║
// ║          for a range of years, ignoring locks.                 ║
// ║ V3: Direct inline recalc — no child function invoke            ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function getWeeksForMonth(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const startMonday = new Date(firstDay);
  const dow = startMonday.getDay() || 7;
  startMonday.setDate(startMonday.getDate() - dow + 1);
  if (startMonday.getMonth() !== month - 1 || startMonday.getFullYear() !== year) {
    startMonday.setDate(startMonday.getDate() + 7);
  }
  const d = new Date(startMonday);
  while (d.getMonth() === month - 1 && d.getFullYear() === year) {
    const thursday = new Date(d);
    thursday.setDate(thursday.getDate() + 3);
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const isoWeek = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
    const isoYear = thursday.getFullYear();
    weeks.push({ week: isoWeek, year: isoYear });
    d.setDate(d.getDate() + 7);
  }
  return weeks;
}

function r2(n) { return Math.round(n * 100) / 100; }

async function recalcMonth(svc, year, month) {
  const now = new Date().toISOString();
  const weeksInMonth = getWeeksForMonth(year, month);

  // Fetch weekly summaries
  let allWeeklySummaries = [];
  for (const w of weeksInMonth) {
    const weekData = await svc.entities.WeeklyCustomerSummary.filter({ year: w.year, week_number: w.week });
    allWeeklySummaries = allWeeklySummaries.concat(weekData);
  }

  // Aggregate per customer
  const customerMap = {};
  for (const ws of allWeeklySummaries) {
    const cid = ws.customer_id;
    if (!customerMap[cid]) {
      customerMap[cid] = {
        customer_name: ws.customer_name,
        total_hours: 0, total_km: 0,
        hour_revenue: 0, km_revenue: 0, other_revenue: 0,
      };
    }
    customerMap[cid].total_hours += ws.total_hours || 0;
    customerMap[cid].total_km += ws.total_km || 0;
    customerMap[cid].hour_revenue += ws.hour_revenue || 0;
    customerMap[cid].km_revenue += ws.km_revenue || 0;
    customerMap[cid].other_revenue += ws.other_revenue || 0;
  }

  // Fetch invoice data
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthStart = `${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

  let invoices = [];
  try {
    invoices = await svc.entities.SpottaInvoice.filter({
      invoice_date: { $gte: monthStart, $lte: monthEnd }
    });
  } catch (e) { /* ignore */ }

  const invoiceByCustomer = {};
  for (const inv of invoices) {
    const cid = inv.customer_id;
    if (!cid) continue;
    if (!invoiceByCustomer[cid]) invoiceByCustomer[cid] = { invoiced_revenue: 0, invoice_count: 0 };
    invoiceByCustomer[cid].invoiced_revenue += inv.total_net || 0;
    invoiceByCustomer[cid].invoice_count += 1;
  }

  for (const [cid, invData] of Object.entries(invoiceByCustomer)) {
    if (!customerMap[cid]) {
      const inv = invoices.find(i => i.customer_id === cid);
      customerMap[cid] = {
        customer_name: inv?.customer_name || 'Onbekend',
        total_hours: 0, total_km: 0,
        hour_revenue: 0, km_revenue: 0, other_revenue: 0,
      };
    }
  }

  // Upsert
  const existingSummaries = await svc.entities.MonthlyCustomerSummary.filter({ year, month });
  const existingMap = {};
  existingSummaries.forEach(s => { existingMap[s.customer_id] = s; });

  let created = 0, updated = 0, deleted = 0;

  for (const existing of existingSummaries) {
    if (!customerMap[existing.customer_id] && !invoiceByCustomer[existing.customer_id]) {
      await svc.entities.MonthlyCustomerSummary.delete(existing.id);
      deleted++;
    }
  }

  for (const [custId, data] of Object.entries(customerMap)) {
    const calcRev = data.hour_revenue + data.km_revenue + data.other_revenue;
    const invData = invoiceByCustomer[custId] || { invoiced_revenue: 0, invoice_count: 0 };
    const diff = calcRev - invData.invoiced_revenue;
    const diffPct = invData.invoiced_revenue > 0
      ? ((calcRev - invData.invoiced_revenue) / invData.invoiced_revenue) * 100
      : (calcRev > 0 ? 100 : 0);

    if (data.total_hours === 0 && data.total_km === 0 && calcRev === 0 && invData.invoiced_revenue === 0) continue;

    const payload = {
      customer_id: custId, customer_name: data.customer_name,
      year, month,
      total_hours: r2(data.total_hours), total_km: r2(data.total_km),
      calculated_revenue: r2(calcRev),
      hour_revenue: r2(data.hour_revenue), km_revenue: r2(data.km_revenue),
      other_revenue: r2(data.other_revenue),
      invoiced_revenue: r2(invData.invoiced_revenue), invoice_count: invData.invoice_count,
      difference_amount: r2(diff), difference_percentage: r2(diffPct),
      locked: false, aggregation_status: 'OK',
      last_aggregation_at: now, last_calculated: now,
    };

    const existing = existingMap[custId];
    if (existing) { await svc.entities.MonthlyCustomerSummary.update(existing.id, payload); updated++; }
    else { await svc.entities.MonthlyCustomerSummary.create(payload); created++; }
  }

  return { created, updated, deleted, weeksAggregated: weeksInMonth.length };
}

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
    const svc = base44.asServiceRole;
    const results = [];
    let totalMonths = 0;
    let totalErrors = 0;

    for (let year = start_year; year <= end_year; year++) {
      for (let month = 1; month <= 12; month++) {
        const now = new Date();
        if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)) continue;

        try {
          const res = await recalcMonth(svc, year, month);
          totalMonths++;
          results.push({ year, month, status: 'ok', ...res });
        } catch (err) {
          totalErrors++;
          results.push({ year, month, status: 'error', message: err?.message });
          console.error(`[rebuildMonthly] Error year=${year} month=${month}:`, err?.message);
        }
      }
    }

    // Audit log
    try {
      await svc.entities.AuditLog.create({
        action_type: 'update', category: 'Systeem',
        description: `Monthly rebuild ${start_year}-${end_year}: ${totalMonths} maanden verwerkt, ${totalErrors} fouten`,
        performed_by_email: user.email, performed_by_name: user.full_name || user.email,
        performed_by_role: user.role,
        metadata: { start_year, end_year, total_months: totalMonths, errors: totalErrors },
      });
    } catch (auditErr) { console.warn('[rebuildMonthly] Audit log failed:', auditErr?.message); }

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