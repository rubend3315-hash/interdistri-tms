import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sends daily payroll report to Azure.
 * Schema v2.2 — includes startDateTimeISO / endDateTimeISO.
 * Returns AZURE_NOT_CONFIGURED in dry-run mode when env vars missing.
 */

function buildISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const timeParts = timeStr.split(':');
  const hh = timeParts[0] || '00', mm = timeParts[1] || '00', ss = timeParts[2] || '00';
  const isoBase = `${dateStr}T${hh}:${mm}:${ss}`;
  const utcDate = new Date(`${dateStr}T${hh}:${mm}:${ss}Z`);
  if (isNaN(utcDate.getTime())) return null;
  const amsFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const amsParts = Object.fromEntries(amsFmt.formatToParts(utcDate).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  const amsDate = new Date(`${amsParts.year}-${amsParts.month}-${amsParts.day}T${amsParts.hour}:${amsParts.minute}:${amsParts.second}Z`);
  const offsetMin = (amsDate.getTime() - utcDate.getTime()) / 60000;
  const sign = offsetMin >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMin);
  return `${isoBase}${sign}${String(Math.floor(absMin / 60)).padStart(2, '0')}:${String(absMin % 60).padStart(2, '0')}`;
}

function calcHoursFromTimes(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
}

function buildReport(date, employees, timeEntries, trips, standplaatsWerk, customers) {
  const customerMap = {};
  for (const c of customers) customerMap[c.id] = c.company_name || '';

  employees.sort((a, b) => (a.employee_number || '').localeCompare(b.employee_number || '', 'nl', { numeric: true }));

  let grandTotalHours = 0, grandTotalOvertimeHours = 0, grandTotalNightHours = 0, grandTotalWeekendHours = 0, grandTotalHolidayHours = 0, grandTotalSubsistenceAllowance = 0, grandTotalAdvancedCosts = 0, grandTotalMeals = 0, grandTotalWkr = 0, grandTotalTripKm = 0, grandTotalStandplaatsHours = 0;
  const employeesWithData = [];

  for (const emp of employees) {
    const empTE = timeEntries.filter(t => t.employee_id === emp.id);
    const empTrips = trips.filter(t => t.employee_id === emp.id);
    const empSW = standplaatsWerk.filter(s => s.employee_id === emp.id);
    if (empTE.length === 0 && empTrips.length === 0 && empSW.length === 0) continue;

    const empTotalHours = empTE.reduce((s, te) => s + (te.total_hours ?? 0), 0);
    const empTotalOvertimeHours = empTE.reduce((s, te) => s + (te.overtime_hours ?? 0), 0);
    const empTotalNightHours = empTE.reduce((s, te) => s + (te.night_hours ?? 0), 0);
    const empTotalWeekendHours = empTE.reduce((s, te) => s + (te.weekend_hours ?? 0), 0);
    const empTotalHolidayHours = empTE.reduce((s, te) => s + (te.holiday_hours ?? 0), 0);
    const empTotalSubsistenceAllowance = empTE.reduce((s, te) => s + (te.subsistence_allowance ?? 0), 0);
    const empTotalAdvancedCosts = empTE.reduce((s, te) => s + (te.advanced_costs ?? 0), 0);
    const empTotalMeals = empTE.reduce((s, te) => s + (te.meals ?? 0), 0);
    const empTotalWkr = empTE.reduce((s, te) => s + (te.wkr ?? 0), 0);
    const empTotalTripKm = empTrips.reduce((s, tr) => s + (tr.total_km ?? 0), 0);
    const empTotalSWHours = empSW.reduce((s, sw) => s + calcHoursFromTimes(sw.start_time, sw.end_time), 0);

    grandTotalHours += empTotalHours;
    grandTotalOvertimeHours += empTotalOvertimeHours;
    grandTotalNightHours += empTotalNightHours;
    grandTotalWeekendHours += empTotalWeekendHours;
    grandTotalHolidayHours += empTotalHolidayHours;
    grandTotalSubsistenceAllowance += empTotalSubsistenceAllowance;
    grandTotalAdvancedCosts += empTotalAdvancedCosts;
    grandTotalMeals += empTotalMeals;
    grandTotalWkr += empTotalWkr;
    grandTotalTripKm += empTotalTripKm;
    grandTotalStandplaatsHours += empTotalSWHours;

    // Enrich time entries with ISO datetimes
    const enrichedTE = empTE.map(te => {
      const startDate = te.date || null;
      const endDate = te.end_date || te.date || null;
      return { ...te, startDateTimeISO: buildISO(startDate, te.start_time), endDateTimeISO: buildISO(endDate, te.end_time) };
    });

    employeesWithData.push({
      employeeNumber: emp.employee_number || null,
      employeeId: emp.id,
      name: [emp.first_name, emp.prefix, emp.last_name].filter(Boolean).join(' '),
      department: emp.department || null,
      totals: {
        totalHours: Math.round(empTotalHours * 100) / 100,
        overtimeHours: Math.round(empTotalOvertimeHours * 100) / 100,
        nightHours: Math.round(empTotalNightHours * 100) / 100,
        weekendHours: Math.round(empTotalWeekendHours * 100) / 100,
        holidayHours: Math.round(empTotalHolidayHours * 100) / 100,
        subsistenceAllowance: Math.round(empTotalSubsistenceAllowance * 100) / 100,
        advancedCosts: Math.round(empTotalAdvancedCosts * 100) / 100,
        meals: Math.round(empTotalMeals * 100) / 100,
        wkr: Math.round(empTotalWkr * 100) / 100,
        totalTripKilometers: Math.round(empTotalTripKm * 100) / 100,
        totalStandplaatsHours: Math.round(empTotalSWHours * 100) / 100,
      },
      timeEntries: enrichedTE,
      trips: empTrips,
      standplaatsWerk: empSW,
    });
  }

  return {
    success: true,
    schemaVersion: "2.2",
    reportType: "DAILY_PAYROLL",
    metadata: { sourceSystem: "Interdistri TMS", generatedBy: "buildDailyPayrollReportData", timezone: "Europe/Amsterdam" },
    reportDate: date,
    period: { startDate: date, endDate: date },
    generatedAt: new Date().toISOString(),
    employeeCount: employeesWithData.length,
    totals: {
      totalHours: Math.round(grandTotalHours * 100) / 100,
      overtimeHours: Math.round(grandTotalOvertimeHours * 100) / 100,
      nightHours: Math.round(grandTotalNightHours * 100) / 100,
      weekendHours: Math.round(grandTotalWeekendHours * 100) / 100,
      holidayHours: Math.round(grandTotalHolidayHours * 100) / 100,
      subsistenceAllowance: Math.round(grandTotalSubsistenceAllowance * 100) / 100,
      advancedCosts: Math.round(grandTotalAdvancedCosts * 100) / 100,
      meals: Math.round(grandTotalMeals * 100) / 100,
      wkr: Math.round(grandTotalWkr * 100) / 100,
      totalTripKilometers: Math.round(grandTotalTripKm * 100) / 100,
      totalStandplaatsHours: Math.round(grandTotalStandplaatsHours * 100) / 100,
    },
    employees: employeesWithData,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && !['ADMIN', 'HR_ADMIN'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: alleen admin en hr_admin' }, { status: 403 });
    }

    const { date } = await req.json();
    if (!date) return Response.json({ error: 'date is verplicht (YYYY-MM-DD)' }, { status: 400 });

    const [employees, allTimeEntries, trips, standplaatsWerk, customers] = await Promise.all([
      base44.asServiceRole.entities.Employee.filter({ status: 'Actief' }),
      base44.asServiceRole.entities.TimeEntry.filter({ date }),
      base44.asServiceRole.entities.Trip.filter({ date }),
      base44.asServiceRole.entities.StandplaatsWerk.filter({ date }),
      base44.asServiceRole.entities.Customer.filter({}),
    ]);

    // Only include approved time entries
    const timeEntries = allTimeEntries.filter(te => te.status === 'Goedgekeurd');

    const reportData = buildReport(date, employees, timeEntries, trips, standplaatsWerk, customers);

    // Check Azure configuration
    const azureEndpoint = Deno.env.get('AZURE_PAYROLL_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_PAYROLL_API_KEY');

    if (!azureEndpoint || !azureApiKey) {
      return Response.json({
        success: false,
        error: 'AZURE_NOT_CONFIGURED',
        dryRun: true,
        message: 'Azure endpoint en/of API key zijn niet geconfigureerd. Stel AZURE_PAYROLL_ENDPOINT en AZURE_PAYROLL_API_KEY in als environment variables.',
        reportDate: date,
        employeeCount: reportData.employeeCount,
        totals: reportData.totals,
      });
    }

    // POST to Azure with retry (max 3 attempts)
    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(azureEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': azureApiKey,
          },
          body: JSON.stringify(reportData),
        });

        if (response.ok) {
          const responseBody = await response.text();
          return Response.json({
            success: true,
            azureStatusCode: response.status,
            azureResponse: responseBody,
            reportDate: date,
            employeeCount: reportData.employeeCount,
            attempt,
          });
        }

        lastError = `HTTP ${response.status}: ${await response.text()}`;
      } catch (err) {
        lastError = err.message;
      }

      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }

    return Response.json({
      success: false,
      error: 'AZURE_PUSH_FAILED',
      details: lastError,
      attempts: MAX_RETRIES,
      reportDate: date,
    }, { status: 502 });
  } catch (error) {
    console.error('sendDailyPayrollReportToAzure error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});