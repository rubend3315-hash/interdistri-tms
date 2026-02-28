// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM / ADMIN                                  ║
// ║ Called by: recalculateWeeklySummaries trigger, admin manual     ║
// ║ Auth: User session (admin)                                     ║
// ║ Purpose: Aggregate WeeklyCustomerSummary + SpottaInvoice       ║
// ║          into MonthlyCustomerSummary for a given year + month  ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get all ISO weeks that overlap with a given calendar month.
 * A week belongs to a month if its Monday falls in that month.
 */
function getWeeksForMonth(year, month) {
  const weeks = [];
  // Start from day 1 of the month, find the Monday of that week
  const firstDay = new Date(year, month - 1, 1);
  
  // Walk through every Monday that could overlap this month
  // Start from the Monday on or before the 1st
  const startMonday = new Date(firstDay);
  const dow = startMonday.getDay() || 7; // Mon=1..Sun=7
  startMonday.setDate(startMonday.getDate() - dow + 1);
  
  // If this Monday is before the month, skip to next Monday
  if (startMonday.getMonth() !== month - 1 || startMonday.getFullYear() !== year) {
    // Only include if at least part of the week is in the month
    // We use Monday-belongs-to-month rule, so skip if Monday not in month
    startMonday.setDate(startMonday.getDate() + 7);
  }
  
  const d = new Date(startMonday);
  while (d.getMonth() === month - 1 && d.getFullYear() === year) {
    // Calculate ISO week number for this Monday
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1;
    const jan4dow = jan4.getDay() || 7;
    const weekNum = Math.ceil((dayOfYear + (new Date(d.getFullYear(), 0, 1).getDay() || 7) - 1) / 7);
    
    // More reliable ISO week calc
    const thursday = new Date(d);
    thursday.setDate(thursday.getDate() + 3); // Thursday of same week
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const isoWeek = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
    const isoYear = thursday.getFullYear();
    
    weeks.push({ week: isoWeek, year: isoYear });
    d.setDate(d.getDate() + 7);
  }
  
  return weeks;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { year, month } = await req.json();
    if (!year || !month || month < 1 || month > 12) {
      return Response.json({ error: 'Valid year and month (1-12) are required' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    console.log(`[recalcMonthly] Recalculating year=${year} month=${month}`);

    // Check lock
    const existingSummaries = await svc.entities.MonthlyCustomerSummary.filter({ year, month });
    const isLocked = existingSummaries.some(s => s.locked === true);
    if (isLocked) {
      console.log(`[recalcMonthly] Month ${month}/${year} is locked — skipping`);
      return Response.json({ success: true, skipped: true, reason: 'locked' });
    }

    // Get all weeks that belong to this month
    const weeksInMonth = getWeeksForMonth(year, month);
    console.log(`[recalcMonthly] Weeks in month: ${JSON.stringify(weeksInMonth)}`);

    // Fetch weekly summaries for all relevant weeks
    let allWeeklySummaries = [];
    for (const w of weeksInMonth) {
      const weekData = await svc.entities.WeeklyCustomerSummary.filter({ year: w.year, week_number: w.week });
      allWeeklySummaries = allWeeklySummaries.concat(weekData);
    }
    console.log(`[recalcMonthly] Found ${allWeeklySummaries.length} weekly summaries across ${weeksInMonth.length} weeks`);

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

    // Fetch invoice data for this month
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const monthStart = `${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

    let invoices = [];
    try {
      invoices = await svc.entities.SpottaInvoice.filter({
        invoice_date: { $gte: monthStart, $lte: monthEnd }
      });
    } catch (e) {
      console.warn('[recalcMonthly] Invoice fetch failed:', e?.message);
    }

    // Aggregate invoiced revenue per customer
    const invoiceByCustomer = {};
    for (const inv of invoices) {
      const cid = inv.customer_id;
      if (!cid) continue;
      if (!invoiceByCustomer[cid]) {
        invoiceByCustomer[cid] = { invoiced_revenue: 0, invoice_count: 0 };
      }
      invoiceByCustomer[cid].invoiced_revenue += inv.total_net || 0;
      invoiceByCustomer[cid].invoice_count += 1;
    }

    // Merge invoice data into customer map (also add customers that only have invoices)
    for (const [cid, invData] of Object.entries(invoiceByCustomer)) {
      if (!customerMap[cid]) {
        // Lookup name from invoices
        const inv = invoices.find(i => i.customer_id === cid);
        customerMap[cid] = {
          customer_name: inv?.customer_name || 'Onbekend',
          total_hours: 0, total_km: 0,
          hour_revenue: 0, km_revenue: 0, other_revenue: 0,
        };
      }
    }

    // Upsert MonthlyCustomerSummary
    const existingMap = {};
    existingSummaries.forEach(s => { existingMap[s.customer_id] = s; });

    const now = new Date().toISOString();
    let created = 0, updated = 0, deleted = 0;

    // Delete summaries for customers no longer in data
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

      // Skip empty rows
      if (data.total_hours === 0 && data.total_km === 0 && calcRev === 0 && invData.invoiced_revenue === 0) continue;

      const payload = {
        customer_id: custId,
        customer_name: data.customer_name,
        year,
        month,
        total_hours: Math.round(data.total_hours * 100) / 100,
        total_km: Math.round(data.total_km * 100) / 100,
        calculated_revenue: Math.round(calcRev * 100) / 100,
        hour_revenue: Math.round(data.hour_revenue * 100) / 100,
        km_revenue: Math.round(data.km_revenue * 100) / 100,
        other_revenue: Math.round(data.other_revenue * 100) / 100,
        invoiced_revenue: Math.round(invData.invoiced_revenue * 100) / 100,
        invoice_count: invData.invoice_count,
        difference_amount: Math.round(diff * 100) / 100,
        difference_percentage: Math.round(diffPct * 100) / 100,
        locked: false,
        last_calculated: now,
      };

      const existing = existingMap[custId];
      if (existing) {
        await svc.entities.MonthlyCustomerSummary.update(existing.id, payload);
        updated++;
      } else {
        await svc.entities.MonthlyCustomerSummary.create(payload);
        created++;
      }
    }

    console.log(`[recalcMonthly] Done. ${created} created, ${updated} updated, ${deleted} deleted.`);

    return Response.json({
      success: true,
      year,
      month,
      weeks_aggregated: weeksInMonth.length,
      invoices_found: invoices.length,
      summaries: { created, updated, deleted },
    });
  } catch (error) {
    console.error('[recalculateMonthlyCustomerSummary]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});