import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sends daily payroll report to Azure.
 * Fetches data directly to avoid function-to-function auth issues.
 * Returns AZURE_NOT_CONFIGURED in dry-run mode when env vars missing.
 */

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

  let grandTotalHours = 0, grandTotalTripKm = 0, grandTotalStandplaatsHours = 0;
  const employeesWithData = [];

  for (const emp of employees) {
    const empTE = timeEntries.filter(t => t.employee_id === emp.id);
    const empTrips = trips.filter(t => t.employee_id === emp.id);
    const empSW = standplaatsWerk.filter(s => s.employee_id === emp.id);
    if (empTE.length === 0 && empTrips.length === 0 && empSW.length === 0) continue;

    const empTotalHours = empTE.reduce((s, te) => s + (te.total_hours ?? 0), 0);
    const empTotalTripKm = empTrips.reduce((s, tr) => s + (tr.total_km ?? 0), 0);
    const empTotalSWHours = empSW.reduce((s, sw) => s + calcHoursFromTimes(sw.start_time, sw.end_time), 0);

    grandTotalHours += empTotalHours;
    grandTotalTripKm += empTotalTripKm;
    grandTotalStandplaatsHours += empTotalSWHours;

    employeesWithData.push({
      employeeNumber: emp.employee_number || null,
      employeeId: emp.id,
      name: [emp.first_name, emp.prefix, emp.last_name].filter(Boolean).join(' '),
      department: emp.department || null,
      totals: {
        totalHours: Math.round(empTotalHours * 100) / 100,
        totalTripKilometers: Math.round(empTotalTripKm * 100) / 100,
        totalStandplaatsHours: Math.round(empTotalSWHours * 100) / 100,
      },
      timeEntries: empTE,
      trips: empTrips,
      standplaatsWerk: empSW,
    });
  }

  return {
    success: true,
    schemaVersion: "1.0",
    reportType: "DAILY_PAYROLL",
    metadata: { sourceSystem: "Interdistri TMS", generatedBy: "buildDailyPayrollReportData", timezone: "Europe/Amsterdam" },
    reportDate: date,
    period: { startDate: date, endDate: date },
    generatedAt: new Date().toISOString(),
    employeeCount: employeesWithData.length,
    totals: {
      totalHours: Math.round(grandTotalHours * 100) / 100,
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

    const [employees, timeEntries, trips, standplaatsWerk, customers] = await Promise.all([
      base44.asServiceRole.entities.Employee.filter({ status: 'Actief' }),
      base44.asServiceRole.entities.TimeEntry.filter({ date }),
      base44.asServiceRole.entities.Trip.filter({ date }),
      base44.asServiceRole.entities.StandplaatsWerk.filter({ date }),
      base44.asServiceRole.entities.Customer.filter({}),
    ]);

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