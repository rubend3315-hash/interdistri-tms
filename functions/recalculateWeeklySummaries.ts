// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM / ADMIN                                  ║
// ║ Called by: approveTimeEntry trigger, admin manual, automation   ║
// ║ Auth: User session (admin) or service role                     ║
// ║ Purpose: Recalculate WeeklyCustomerSummary + WeeklyEmployee    ║
// ║          Summary for a given year + week_number                ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function timeToMin(t) {
  if (!t || typeof t !== 'string') return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

function durationMin(start, end) {
  const s = timeToMin(start), e = timeToMin(end);
  if (s === null || e === null) return 0;
  let d = e - s;
  if (d <= 0) d += 1440;
  return Math.max(0, d);
}

function getArticlePrice(article, refDate) {
  if (!article?.price_rules?.length) return 0;
  const valid = article.price_rules
    .filter(r => new Date(r.start_date) <= refDate && (!r.end_date || new Date(r.end_date) >= refDate))
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  return valid.length > 0 ? valid[0].price : 0;
}

// Calculate ISO week start date for a given year + week
function weekStartDate(year, week) {
  // Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Monday = 1
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1); // Monday of week 1
  monday.setDate(monday.getDate() + (week - 1) * 7);
  return monday;
}

function weekEndDate(year, week) {
  const start = weekStartDate(year, week);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { year, week_number } = await req.json();
    if (!year || !week_number) {
      return Response.json({ error: 'year and week_number are required' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const ws = weekStartDate(year, week_number);
    const we = weekEndDate(year, week_number);
    const wsStr = fmtDate(ws);
    const weStr = fmtDate(we);
    const refDate = ws;

    console.log(`[recalcWeekly] Recalculating year=${year} week=${week_number} (${wsStr} to ${weStr})`);

    // Check if locked (loonperiode definitief) — skip if locked
    const existingCustSummaries = await svc.entities.WeeklyCustomerSummary.filter({ year, week_number });
    const isLocked = existingCustSummaries.some(s => s.locked === true);
    if (isLocked) {
      console.log(`[recalcWeekly] Week ${week_number}/${year} is locked — skipping recalculation`);
      return Response.json({ success: true, skipped: true, reason: 'locked' });
    }

    // Fetch all required data
    const [timeEntries, trips, spws, customers, projects, articles] = await Promise.all([
      svc.entities.TimeEntry.filter({ week_number, year }),
      svc.entities.Trip.filter({ date: { $gte: wsStr, $lte: weStr } }),
      svc.entities.StandplaatsWerk.filter({ date: { $gte: wsStr, $lte: weStr } }),
      svc.entities.Customer.filter({ status: 'Actief' }),
      svc.entities.Project.filter({ status: 'Actief' }),
      svc.entities.Article.filter({ status: 'Actief' }),
    ]);

    const approved = timeEntries.filter(te => te.status === 'Goedgekeurd');
    console.log(`[recalcWeekly] Data: ${timeEntries.length} TE (${approved.length} approved), ${trips.length} trips, ${spws.length} SPW`);

    // Build lookup maps
    const custNameMap = {};
    customers.forEach(c => { custNameMap[c.id] = c.company_name; });
    const projCustMap = {};
    projects.forEach(p => { if (p.customer_id) projCustMap[p.id] = p.customer_id; });

    // Article rate map per customer
    const rateMap = {};
    customers.forEach(c => {
      const custArticles = articles.filter(a => a.customer_id === c.id);
      const hourArt = custArticles.find(a => {
        const d = (a.description || '').toLowerCase();
        return d.includes('uur') || d.includes('hour');
      });
      const kmArt = custArticles.find(a => {
        const d = (a.description || '').toLowerCase();
        return d.includes('km') || d.includes('kilometer');
      });
      rateMap[c.id] = {
        hourRate: hourArt ? getArticlePrice(hourArt, refDate) : 0,
        kmRate: kmArt ? getArticlePrice(kmArt, refDate) : 0,
      };
    });

    // ─── CUSTOMER SUMMARY ───
    const tripsByTE = {};
    trips.forEach(t => { const k = t.time_entry_id; if (k) { (tripsByTE[k] = tripsByTE[k] || []).push(t); } });
    const spwsByTE = {};
    spws.forEach(s => { const k = s.time_entry_id; if (k) { (spwsByTE[k] = spwsByTE[k] || []).push(s); } });

    const customerMap = {}; // customerId → { hours, km, hourRevenue, kmRevenue, otherRevenue, tripCount, teCount }

    // Km per customer from all trips
    const kmByCustomer = {};
    const tripCountByCustomer = {};
    trips.forEach(t => {
      const custId = t.customer_id || projCustMap[t.project_id];
      if (!custId || !custNameMap[custId]) return;
      const km = t.total_km || (t.end_km && t.start_km ? t.end_km - t.start_km : 0);
      if (km > 0) kmByCustomer[custId] = (kmByCustomer[custId] || 0) + km;
      tripCountByCustomer[custId] = (tripCountByCustomer[custId] || 0) + 1;
    });

    // Hours allocation from approved TimeEntries via trips + spw
    for (const te of approved) {
      const totalServiceMinutes = te.total_hours ? te.total_hours * 60 : 0;
      if (totalServiceMinutes <= 0) continue;

      const teTrips = tripsByTE[te.id] || [];
      const teSpws = spwsByTE[te.id] || [];
      const custMinutes = {};

      teTrips.forEach(t => {
        const custId = t.customer_id || projCustMap[t.project_id];
        if (!custId || !custNameMap[custId]) return;
        custMinutes[custId] = (custMinutes[custId] || 0) + durationMin(t.departure_time || t.start_time, t.arrival_time || t.end_time);
      });

      teSpws.forEach(s => {
        const custId = s.customer_id || projCustMap[s.project_id];
        if (!custId || !custNameMap[custId]) return;
        custMinutes[custId] = (custMinutes[custId] || 0) + durationMin(s.start_time, s.end_time);
      });

      const custIds = Object.keys(custMinutes);
      if (custIds.length === 0) continue;

      const totalSpecificMinutes = Object.values(custMinutes).reduce((s, v) => s + v, 0);

      for (const cid of custIds) {
        const allocatedHours = custIds.length === 1
          ? totalServiceMinutes / 60
          : (totalSpecificMinutes > 0 ? (custMinutes[cid] / totalSpecificMinutes) * totalServiceMinutes : 0) / 60;

        if (!customerMap[cid]) {
          customerMap[cid] = { hours: 0, km: 0, hourRevenue: 0, kmRevenue: 0, otherRevenue: 0, tripCount: 0, teCount: 0 };
        }
        customerMap[cid].hours += allocatedHours;
        customerMap[cid].teCount += 1;
      }
    }

    // Merge km + trip counts
    for (const cid of Object.keys(kmByCustomer)) {
      if (!customerMap[cid]) {
        customerMap[cid] = { hours: 0, km: 0, hourRevenue: 0, kmRevenue: 0, otherRevenue: 0, tripCount: 0, teCount: 0 };
      }
      customerMap[cid].km = kmByCustomer[cid];
    }
    for (const cid of Object.keys(tripCountByCustomer)) {
      if (!customerMap[cid]) {
        customerMap[cid] = { hours: 0, km: 0, hourRevenue: 0, kmRevenue: 0, otherRevenue: 0, tripCount: 0, teCount: 0 };
      }
      customerMap[cid].tripCount = tripCountByCustomer[cid];
    }

    // Calculate revenue
    for (const cid of Object.keys(customerMap)) {
      const rates = rateMap[cid] || { hourRate: 0, kmRate: 0 };
      customerMap[cid].hourRevenue = customerMap[cid].hours * rates.hourRate;
      customerMap[cid].kmRevenue = customerMap[cid].km * rates.kmRate;
    }

    // PostNL import revenue (other_revenue)
    const postNLCustomer = customers.find(c => c.company_name?.toLowerCase().includes('postnl'));
    if (postNLCustomer) {
      // Try to find PostNL imports for this week
      let imports = [];
      try {
        imports = await svc.entities.PostNLImportResult.filter({ import_datum: { $gte: wsStr, $lte: weStr } });
        // If no results, try datum field with DD-MM-YYYY format filtering won't work,
        // so try with created_date range
        if (imports.length === 0) {
          const allRecent = await svc.entities.PostNLImportResult.list('-created_date', 200);
          imports = allRecent.filter(r => {
            const d = r.datum || r.data?.Datum;
            if (!d) return false;
            // Handle DD-MM-YYYY format
            if (d.includes('-') && d.length === 10) {
              const parts = d.split('-');
              let isoDate;
              if (parts[0].length === 4) {
                isoDate = d; // Already YYYY-MM-DD
              } else {
                isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY → YYYY-MM-DD
              }
              return isoDate >= wsStr && isoDate <= weStr;
            }
            return false;
          });
        }
      } catch (e) {
        console.warn('[recalcWeekly] PostNL import fetch failed:', e?.message);
      }

      if (imports.length > 0) {
        const custArticles = articles.filter(a => a.customer_id === postNLCustomer.id);
        const stopArticle = custArticles.find(a => a.description?.toLowerCase().includes('stop'));
        const stukArticle = custArticles.find(a => a.description?.toLowerCase().includes('stuk') || a.description?.toLowerCase().includes('pakket'));
        const stopPrice = getArticlePrice(stopArticle, refDate);
        const stukPrice = getArticlePrice(stukArticle, refDate);

        let otherRev = 0;
        imports.forEach(r => {
          const data = r.data || {};
          const stops = Number(data['Aantal tijdens route - stops']) || 0;
          const stuks = Number(data['Geleverde stops']) || Number(data['Aantal stuks afgehaald/ gecollecteerd']) || 0;
          otherRev += stops * stopPrice + stuks * stukPrice;
        });

        if (!customerMap[postNLCustomer.id]) {
          customerMap[postNLCustomer.id] = { hours: 0, km: 0, hourRevenue: 0, kmRevenue: 0, otherRevenue: 0, tripCount: 0, teCount: 0 };
        }
        customerMap[postNLCustomer.id].otherRevenue = otherRev;
      }
    }

    // ─── EMPLOYEE SUMMARY ───
    const employeeMap = {}; // employeeId → aggregated data
    const employees = await svc.entities.Employee.filter({ status: 'Actief' });
    const empNameMap = {};
    employees.forEach(e => { empNameMap[e.id] = `${e.first_name} ${e.prefix ? e.prefix + ' ' : ''}${e.last_name}`; });

    // Aggregate from approved TimeEntries
    for (const te of approved) {
      const eid = te.employee_id;
      if (!eid) continue;
      if (!employeeMap[eid]) {
        employeeMap[eid] = { totalHours: 0, overtimeHours: 0, nightHours: 0, weekendHours: 0, holidayHours: 0, totalKm: 0, tripCount: 0 };
      }
      employeeMap[eid].totalHours += te.total_hours || 0;
      employeeMap[eid].overtimeHours += te.overtime_hours || 0;
      employeeMap[eid].nightHours += te.night_hours || 0;
      employeeMap[eid].weekendHours += te.weekend_hours || 0;
      employeeMap[eid].holidayHours += te.holiday_hours || 0;
    }

    // Km + trip count from trips
    trips.forEach(t => {
      const eid = t.employee_id;
      if (!eid) return;
      if (!employeeMap[eid]) {
        employeeMap[eid] = { totalHours: 0, overtimeHours: 0, nightHours: 0, weekendHours: 0, holidayHours: 0, totalKm: 0, tripCount: 0 };
      }
      const km = t.total_km || (t.end_km && t.start_km ? t.end_km - t.start_km : 0);
      employeeMap[eid].totalKm += km > 0 ? km : 0;
      employeeMap[eid].tripCount += 1;
    });

    // ─── UPSERT CUSTOMER SUMMARIES ───
    const existingCustMap = {};
    existingCustSummaries.forEach(s => { existingCustMap[s.customer_id] = s; });

    const now = new Date().toISOString();
    let custCreated = 0, custUpdated = 0, custDeleted = 0;

    // Delete summaries for customers no longer in this week's data
    for (const existing of existingCustSummaries) {
      if (!customerMap[existing.customer_id]) {
        await svc.entities.WeeklyCustomerSummary.delete(existing.id);
        custDeleted++;
      }
    }

    // Create or update
    for (const [custId, data] of Object.entries(customerMap)) {
      if (data.hours === 0 && data.km === 0 && data.hourRevenue === 0 && data.kmRevenue === 0 && data.otherRevenue === 0) continue;

      const payload = {
        customer_id: custId,
        customer_name: custNameMap[custId] || 'Onbekend',
        year,
        week_number,
        total_hours: Math.round(data.hours * 100) / 100,
        total_km: Math.round(data.km * 100) / 100,
        hour_revenue: Math.round(data.hourRevenue * 100) / 100,
        km_revenue: Math.round(data.kmRevenue * 100) / 100,
        other_revenue: Math.round(data.otherRevenue * 100) / 100,
        calculated_revenue: Math.round((data.hourRevenue + data.kmRevenue + data.otherRevenue) * 100) / 100,
        trip_count: data.tripCount,
        timeentry_count: data.teCount,
        locked: false,
        last_calculated: now,
      };

      const existing = existingCustMap[custId];
      if (existing) {
        await svc.entities.WeeklyCustomerSummary.update(existing.id, payload);
        custUpdated++;
      } else {
        await svc.entities.WeeklyCustomerSummary.create(payload);
        custCreated++;
      }
    }

    // ─── UPSERT EMPLOYEE SUMMARIES ───
    const existingEmpSummaries = await svc.entities.WeeklyEmployeeSummary.filter({ year, week_number });
    const existingEmpMap = {};
    existingEmpSummaries.forEach(s => { existingEmpMap[s.employee_id] = s; });

    let empCreated = 0, empUpdated = 0, empDeleted = 0;

    // Delete summaries for employees no longer in data
    for (const existing of existingEmpSummaries) {
      if (!employeeMap[existing.employee_id]) {
        await svc.entities.WeeklyEmployeeSummary.delete(existing.id);
        empDeleted++;
      }
    }

    for (const [empId, data] of Object.entries(employeeMap)) {
      if (data.totalHours === 0 && data.totalKm === 0) continue;

      const payload = {
        employee_id: empId,
        employee_name: empNameMap[empId] || 'Onbekend',
        year,
        week_number,
        total_hours: Math.round(data.totalHours * 100) / 100,
        overtime_hours: Math.round(data.overtimeHours * 100) / 100,
        night_hours: Math.round(data.nightHours * 100) / 100,
        weekend_hours: Math.round(data.weekendHours * 100) / 100,
        holiday_hours: Math.round(data.holidayHours * 100) / 100,
        total_km: Math.round(data.totalKm * 100) / 100,
        trip_count: data.tripCount,
        locked: false,
        last_calculated: now,
      };

      const existing = existingEmpMap[empId];
      if (existing) {
        await svc.entities.WeeklyEmployeeSummary.update(existing.id, payload);
        empUpdated++;
      } else {
        await svc.entities.WeeklyEmployeeSummary.create(payload);
        empCreated++;
      }
    }

    console.log(`[recalcWeekly] Done. Customer: ${custCreated} created, ${custUpdated} updated, ${custDeleted} deleted. Employee: ${empCreated} created, ${empUpdated} updated, ${empDeleted} deleted.`);

    // Trigger monthly summary recalculation (fire-and-forget)
    // Determine which month this week's Monday falls in
    try {
      const weekMonday = weekStartDate(year, week_number);
      const monthOfWeek = weekMonday.getMonth() + 1;
      const yearOfMonth = weekMonday.getFullYear();
      console.log(`[recalcWeekly] Triggering monthly recalc for ${yearOfMonth}-${monthOfWeek}`);
      base44.functions.invoke('recalculateMonthlyCustomerSummary', { year: yearOfMonth, month: monthOfWeek }).catch(e => {
        console.warn('[recalcWeekly] Monthly recalc trigger failed (non-blocking):', e?.message);
      });
    } catch (triggerErr) {
      console.warn('[recalcWeekly] Monthly trigger error (non-blocking):', triggerErr?.message);
    }

    return Response.json({
      success: true,
      year,
      week_number,
      customer_summaries: { created: custCreated, updated: custUpdated, deleted: custDeleted },
      employee_summaries: { created: empCreated, updated: empUpdated, deleted: empDeleted },
    });
  } catch (error) {
    console.error('[recalculateWeeklySummaries]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});