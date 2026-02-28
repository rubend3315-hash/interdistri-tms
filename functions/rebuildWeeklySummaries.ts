// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: ADMIN ONLY - NOODHERSTEL                        ║
// ║ Purpose: Force rebuild all WeeklyCustomer/EmployeeSummaries    ║
// ║          V4: Fetch reference data ONCE, reuse per week         ║
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
  let d = e - s; if (d <= 0) d += 1440;
  return Math.max(0, d);
}
function getArticlePrice(article, refDate) {
  if (!article?.price_rules?.length) return 0;
  const valid = article.price_rules
    .filter(r => new Date(r.start_date) <= refDate && (!r.end_date || new Date(r.end_date) >= refDate))
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  return valid.length > 0 ? valid[0].price : 0;
}
function weekStartDate(year, week) {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
  return monday;
}
function weekEndDate(year, week) {
  const s = weekStartDate(year, week); s.setDate(s.getDate() + 6); return s;
}
function fmtDate(d) { return d.toISOString().split('T')[0]; }
function r2(n) { return Math.round(n * 100) / 100; }
function getMaxWeek(year) {
  const dec28 = new Date(year, 11, 28);
  const thu = new Date(dec28); thu.setDate(thu.getDate() + (4 - (thu.getDay() || 7)));
  const ys = new Date(thu.getFullYear(), 0, 1);
  return Math.ceil(((thu - ys) / 86400000 + 1) / 7);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function recalcWeek(svc, year, week_number, ref) {
  const ws = weekStartDate(year, week_number);
  const we = weekEndDate(year, week_number);
  const wsStr = fmtDate(ws);
  const weStr = fmtDate(we);
  const refDate = ws;
  const now = new Date().toISOString();

  const { customers, custNameMap, projCustMap, articles, empNameMap } = ref;

  // Only per-week data: TE, Trips, SPW — 3 calls
  const [timeEntries, trips, spws] = await Promise.all([
    svc.entities.TimeEntry.filter({ week_number, year }),
    svc.entities.Trip.filter({ date: { $gte: wsStr, $lte: weStr } }),
    svc.entities.StandplaatsWerk.filter({ date: { $gte: wsStr, $lte: weStr } }),
  ]);

  const approved = (Array.isArray(timeEntries) ? timeEntries : []).filter(te => te.status === 'Goedgekeurd');
  const safeTrips = Array.isArray(trips) ? trips : [];
  const safeSpws = Array.isArray(spws) ? spws : [];

  // Rate snapshot
  const rateMap = {};
  customers.forEach(c => {
    const ca = articles.filter(a => a.customer_id === c.id);
    const hA = ca.find(a => (a.description || '').toLowerCase().match(/uur|hour/));
    const kA = ca.find(a => (a.description || '').toLowerCase().match(/km|kilometer/));
    const sA = ca.find(a => (a.description || '').toLowerCase().includes('stop'));
    const pA = ca.find(a => (a.description || '').toLowerCase().match(/stuk|pakket/));
    rateMap[c.id] = {
      hourRate: hA ? getArticlePrice(hA, refDate) : 0,
      kmRate: kA ? getArticlePrice(kA, refDate) : 0,
      stopRate: sA ? getArticlePrice(sA, refDate) : 0,
      stukRate: pA ? getArticlePrice(pA, refDate) : 0,
    };
  });

  const tripsByTE = {};
  safeTrips.forEach(t => { if (t.time_entry_id) (tripsByTE[t.time_entry_id] = tripsByTE[t.time_entry_id] || []).push(t); });
  const spwsByTE = {};
  safeSpws.forEach(s => { if (s.time_entry_id) (spwsByTE[s.time_entry_id] = spwsByTE[s.time_entry_id] || []).push(s); });

  const customerMap = {};
  const kmByCustomer = {};
  const tripCountByCustomer = {};

  safeTrips.forEach(t => {
    const cid = t.customer_id || projCustMap[t.project_id];
    if (!cid || !custNameMap[cid]) return;
    const km = t.total_km || (t.end_km && t.start_km ? t.end_km - t.start_km : 0);
    if (km > 0) kmByCustomer[cid] = (kmByCustomer[cid] || 0) + km;
    tripCountByCustomer[cid] = (tripCountByCustomer[cid] || 0) + 1;
  });

  for (const te of approved) {
    const mins = te.total_hours ? te.total_hours * 60 : 0;
    if (mins <= 0) continue;
    const teT = tripsByTE[te.id] || [];
    const teS = spwsByTE[te.id] || [];
    const cm = {};
    teT.forEach(t => { const c = t.customer_id || projCustMap[t.project_id]; if (c && custNameMap[c]) cm[c] = (cm[c] || 0) + durationMin(t.departure_time || t.start_time, t.arrival_time || t.end_time); });
    teS.forEach(s => { const c = s.customer_id || projCustMap[s.project_id]; if (c && custNameMap[c]) cm[c] = (cm[c] || 0) + durationMin(s.start_time, s.end_time); });
    const cids = Object.keys(cm);
    if (cids.length === 0) continue;
    const totalSpec = Object.values(cm).reduce((a, b) => a + b, 0);
    for (const cid of cids) {
      const h = cids.length === 1 ? mins / 60 : (totalSpec > 0 ? (cm[cid] / totalSpec) * mins : 0) / 60;
      if (!customerMap[cid]) customerMap[cid] = { hours: 0, km: 0, hourRevenue: 0, kmRevenue: 0, otherRevenue: 0, tripCount: 0, teCount: 0 };
      customerMap[cid].hours += h;
      customerMap[cid].teCount += 1;
    }
  }

  for (const cid of Object.keys(kmByCustomer)) {
    if (!customerMap[cid]) customerMap[cid] = { hours: 0, km: 0, hourRevenue: 0, kmRevenue: 0, otherRevenue: 0, tripCount: 0, teCount: 0 };
    customerMap[cid].km = kmByCustomer[cid];
  }
  for (const cid of Object.keys(tripCountByCustomer)) {
    if (!customerMap[cid]) customerMap[cid] = { hours: 0, km: 0, hourRevenue: 0, kmRevenue: 0, otherRevenue: 0, tripCount: 0, teCount: 0 };
    customerMap[cid].tripCount = tripCountByCustomer[cid];
  }
  for (const cid of Object.keys(customerMap)) {
    const rates = rateMap[cid] || { hourRate: 0, kmRate: 0 };
    customerMap[cid].hourRevenue = customerMap[cid].hours * rates.hourRate;
    customerMap[cid].kmRevenue = customerMap[cid].km * rates.kmRate;
  }

  // PostNL
  const postNLCustomer = customers.find(c => c.company_name?.toLowerCase().includes('postnl'));
  let otherRateSnapshot = {};
  if (postNLCustomer) {
    const rates = rateMap[postNLCustomer.id] || {};
    otherRateSnapshot = { stop_price: rates.stopRate || 0, stuk_price: rates.stukRate || 0 };
    let imports = [];
    try {
      const ir = await svc.entities.PostNLImportResult.filter({ import_datum: { $gte: wsStr, $lte: weStr } });
      imports = Array.isArray(ir) ? ir : [];
    } catch (e) { /* ignore */ }
    if (imports.length > 0) {
      let otherRev = 0;
      imports.forEach(r => {
        const d = r.data || {};
        const stops = Number(d['Aantal tijdens route - stops']) || 0;
        const stuks = Number(d['Geleverde stops']) || Number(d['Aantal stuks afgehaald/ gecollecteerd']) || 0;
        otherRev += stops * otherRateSnapshot.stop_price + stuks * otherRateSnapshot.stuk_price;
      });
      if (!customerMap[postNLCustomer.id]) customerMap[postNLCustomer.id] = { hours: 0, km: 0, hourRevenue: 0, kmRevenue: 0, otherRevenue: 0, tripCount: 0, teCount: 0 };
      customerMap[postNLCustomer.id].otherRevenue = otherRev;
    }
  }

  // Employee summary
  const employeeMap = {};
  for (const te of approved) {
    const eid = te.employee_id;
    if (!eid) continue;
    if (!employeeMap[eid]) employeeMap[eid] = { totalHours: 0, overtimeHours: 0, nightHours: 0, weekendHours: 0, holidayHours: 0, totalKm: 0, tripCount: 0 };
    employeeMap[eid].totalHours += te.total_hours || 0;
    employeeMap[eid].overtimeHours += te.overtime_hours || 0;
    employeeMap[eid].nightHours += te.night_hours || 0;
    employeeMap[eid].weekendHours += te.weekend_hours || 0;
    employeeMap[eid].holidayHours += te.holiday_hours || 0;
  }
  safeTrips.forEach(t => {
    const eid = t.employee_id; if (!eid) return;
    if (!employeeMap[eid]) employeeMap[eid] = { totalHours: 0, overtimeHours: 0, nightHours: 0, weekendHours: 0, holidayHours: 0, totalKm: 0, tripCount: 0 };
    const km = t.total_km || (t.end_km && t.start_km ? t.end_km - t.start_km : 0);
    employeeMap[eid].totalKm += km > 0 ? km : 0;
    employeeMap[eid].tripCount += 1;
  });

  // Upsert customer summaries — 1 fetch + sequential writes
  const existingCS = await svc.entities.WeeklyCustomerSummary.filter({ year, week_number });
  const existCustMap = {};
  (Array.isArray(existingCS) ? existingCS : []).forEach(s => { existCustMap[s.customer_id] = s; });
  let cC = 0, cU = 0, cD = 0;

  for (const ex of (Array.isArray(existingCS) ? existingCS : [])) {
    if (!customerMap[ex.customer_id]) { await svc.entities.WeeklyCustomerSummary.delete(ex.id); cD++; }
  }
  for (const [cid, data] of Object.entries(customerMap)) {
    if (data.hours === 0 && data.km === 0 && data.hourRevenue === 0 && data.kmRevenue === 0 && data.otherRevenue === 0) continue;
    const rates = rateMap[cid] || { hourRate: 0, kmRate: 0 };
    const cor = (cid === postNLCustomer?.id) ? otherRateSnapshot : {};
    const payload = {
      customer_id: cid, customer_name: custNameMap[cid] || 'Onbekend', year, week_number,
      total_hours: r2(data.hours), total_km: r2(data.km),
      hour_revenue: r2(data.hourRevenue), km_revenue: r2(data.kmRevenue), other_revenue: r2(data.otherRevenue),
      calculated_revenue: r2(data.hourRevenue + data.kmRevenue + data.otherRevenue),
      hour_rate_used: rates.hourRate, km_rate_used: rates.kmRate,
      other_rate_used: Object.keys(cor).length > 0 ? cor : null,
      trip_count: data.tripCount, timeentry_count: data.teCount,
      locked: false, aggregation_status: 'OK', last_aggregation_at: now, last_calculated: now,
    };
    const ex = existCustMap[cid];
    if (ex) { await svc.entities.WeeklyCustomerSummary.update(ex.id, payload); cU++; }
    else { await svc.entities.WeeklyCustomerSummary.create(payload); cC++; }
  }

  // Upsert employee summaries — 1 fetch + sequential writes
  const existingES = await svc.entities.WeeklyEmployeeSummary.filter({ year, week_number });
  const existEmpMap = {};
  (Array.isArray(existingES) ? existingES : []).forEach(s => { existEmpMap[s.employee_id] = s; });
  let eC = 0, eU = 0, eD = 0;

  for (const ex of (Array.isArray(existingES) ? existingES : [])) {
    if (!employeeMap[ex.employee_id]) { await svc.entities.WeeklyEmployeeSummary.delete(ex.id); eD++; }
  }
  for (const [eid, data] of Object.entries(employeeMap)) {
    if (data.totalHours === 0 && data.totalKm === 0) continue;
    const payload = {
      employee_id: eid, employee_name: empNameMap[eid] || 'Onbekend', year, week_number,
      total_hours: r2(data.totalHours), overtime_hours: r2(data.overtimeHours),
      night_hours: r2(data.nightHours), weekend_hours: r2(data.weekendHours),
      holiday_hours: r2(data.holidayHours), total_km: r2(data.totalKm),
      trip_count: data.tripCount, locked: false, last_calculated: now,
    };
    const ex = existEmpMap[eid];
    if (ex) { await svc.entities.WeeklyEmployeeSummary.update(ex.id, payload); eU++; }
    else { await svc.entities.WeeklyEmployeeSummary.create(payload); eC++; }
  }

  return { custCreated: cC, custUpdated: cU, custDeleted: cD, empCreated: eC, empUpdated: eU, empDeleted: eD };
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

    const svc = base44.asServiceRole;
    console.log(`[rebuildWeekly] V4: Fetching reference data once...`);

    // Fetch reference data ONCE for entire run
    const [customers, projects, articles, employees] = await Promise.all([
      svc.entities.Customer.filter({ status: 'Actief' }),
      svc.entities.Project.filter({ status: 'Actief' }),
      svc.entities.Article.filter({ status: 'Actief' }),
      svc.entities.Employee.filter({ status: 'Actief' }),
    ]);
    const custNameMap = {};
    (Array.isArray(customers) ? customers : []).forEach(c => { custNameMap[c.id] = c.company_name; });
    const projCustMap = {};
    (Array.isArray(projects) ? projects : []).forEach(p => { if (p.customer_id) projCustMap[p.id] = p.customer_id; });
    const empNameMap = {};
    (Array.isArray(employees) ? employees : []).forEach(e => { empNameMap[e.id] = `${e.first_name} ${e.prefix ? e.prefix + ' ' : ''}${e.last_name}`; });

    const ref = { customers: Array.isArray(customers) ? customers : [], custNameMap, projCustMap, articles: Array.isArray(articles) ? articles : [], empNameMap };
    console.log(`[rebuildWeekly] Ref data: ${ref.customers.length} customers, ${(Array.isArray(projects) ? projects : []).length} projects, ${ref.articles.length} articles, ${Object.keys(empNameMap).length} employees`);
    console.log(`[rebuildWeekly] Rebuilding from ${start_year} to ${end_year}`);

    const results = [];
    let totalWeeks = 0, totalErrors = 0;

    for (let year = start_year; year <= end_year; year++) {
      const maxWeek = getMaxWeek(year);
      console.log(`[rebuildWeekly] Year ${year}: ${maxWeek} weeks`);

      for (let week = 1; week <= maxWeek; week++) {
        try {
          const res = await recalcWeek(svc, year, week, ref);
          totalWeeks++;
          results.push({ year, week, status: 'ok', ...res });
          if (totalWeeks % 10 === 0) console.log(`[rebuildWeekly] Progress: ${totalWeeks} weeks done`);
        } catch (err) {
          totalErrors++;
          const isRateLimit = err?.message?.includes('Rate limit');
          results.push({ year, week, status: 'error', message: err?.message });
          console.error(`[rebuildWeekly] Error year=${year} week=${week}: ${err?.message}`);
          // On rate limit, wait extra long
          if (isRateLimit) {
            console.log(`[rebuildWeekly] Rate limit hit at week ${week}, waiting 10s...`);
            await sleep(10000);
          }
        }
        // Standard pause between weeks
        await sleep(2000);
      }
    }

    try {
      await svc.entities.AuditLog.create({
        action_type: 'update', category: 'Systeem',
        description: `Weekly rebuild V4 ${start_year}-${end_year}: ${totalWeeks} weken verwerkt, ${totalErrors} fouten`,
        performed_by_email: user.email, performed_by_name: user.full_name || user.email,
        performed_by_role: user.role,
        metadata: { start_year, end_year, total_weeks: totalWeeks, errors: totalErrors },
      });
    } catch (auditErr) { console.warn('[rebuildWeekly] Audit log failed:', auditErr?.message); }

    console.log(`[rebuildWeekly] Done. ${totalWeeks} weeks, ${totalErrors} errors.`);

    return Response.json({
      success: totalErrors === 0,
      start_year, end_year,
      total_weeks: totalWeeks,
      total_errors: totalErrors,
      details: results.filter(r => r.status !== 'ok'),
    });
  } catch (error) {
    console.error('[rebuildWeeklySummaries]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});