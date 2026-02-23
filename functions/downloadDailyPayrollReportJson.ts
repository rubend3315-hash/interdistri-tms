import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Downloads the daily payroll report as base64-encoded JSON.
 * Fetches data directly (same pattern as generateDailyPayrollReport)
 * to avoid function-to-function auth issues.
 */

function mapTimeEntry(te) {
  return {
    id: te.id, employee_id: te.employee_id, date: te.date || null,
    end_date: te.end_date || null, week_number: te.week_number ?? null,
    year: te.year ?? null, start_time: te.start_time || null,
    end_time: te.end_time || null, break_minutes: te.break_minutes ?? 0,
    total_hours: te.total_hours ?? 0, overtime_hours: te.overtime_hours ?? 0,
    night_hours: te.night_hours ?? 0, weekend_hours: te.weekend_hours ?? 0,
    holiday_hours: te.holiday_hours ?? 0, shift_type: te.shift_type || null,
    project_id: te.project_id || null, customer_id: te.customer_id || null,
    departure_location: te.departure_location || null,
    return_location: te.return_location || null,
    departure_time: te.departure_time || null,
    expected_return_time: te.expected_return_time || null,
    subsistence_allowance: te.subsistence_allowance ?? 0,
    advanced_costs: te.advanced_costs ?? 0, meals: te.meals ?? 0,
    wkr: te.wkr ?? 0, travel_allowance_multiplier: te.travel_allowance_multiplier ?? 0,
    notes: te.notes || null, status: te.status || null,
    signature_url: te.signature_url || null,
    submission_id: te.submission_id || null,
    approved_by: te.approved_by || null, approved_date: te.approved_date || null,
    rejection_reason: te.rejection_reason || null,
    edit_history: te.edit_history || [],
    created_date: te.created_date || null, updated_date: te.updated_date || null,
    created_by: te.created_by || null,
  };
}

function mapTrip(trip, customerMap) {
  return {
    id: trip.id, employee_id: trip.employee_id,
    time_entry_id: trip.time_entry_id || null, date: trip.date || null,
    vehicle_id: trip.vehicle_id || null, customer_id: trip.customer_id || null,
    customer_name: customerMap[trip.customer_id] || null,
    project_id: trip.project_id || null, route_name: trip.route_name || null,
    planned_stops: trip.planned_stops ?? null,
    completed_stops: trip.completed_stops ?? null,
    start_km: trip.start_km ?? null, end_km: trip.end_km ?? null,
    total_km: trip.total_km ?? null, fuel_liters: trip.fuel_liters ?? null,
    adblue_liters: trip.adblue_liters ?? null, fuel_km: trip.fuel_km ?? null,
    charging_kwh: trip.charging_kwh ?? null, fuel_cost: trip.fuel_cost ?? null,
    cargo_description: trip.cargo_description || null,
    cargo_weight: trip.cargo_weight ?? null,
    departure_time: trip.departure_time || null,
    arrival_time: trip.arrival_time || null,
    departure_location: trip.departure_location || null,
    notes: trip.notes || null, status: trip.status || null,
    created_date: trip.created_date || null, updated_date: trip.updated_date || null,
    created_by: trip.created_by || null,
  };
}

function mapStandplaatsWerk(sw) {
  return {
    id: sw.id, time_entry_id: sw.time_entry_id || null,
    employee_id: sw.employee_id || null, date: sw.date || null,
    start_time: sw.start_time || null, end_time: sw.end_time || null,
    customer_id: sw.customer_id || null, project_id: sw.project_id || null,
    activity_id: sw.activity_id || null, notes: sw.notes || null,
    created_date: sw.created_date || null, updated_date: sw.updated_date || null,
    created_by: sw.created_by || null,
  };
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

    const mappedTE = empTE.map(te => mapTimeEntry(te));
    const mappedTrips = empTrips.map(t => mapTrip(t, customerMap));
    const mappedSW = empSW.map(sw => mapStandplaatsWerk(sw));

    const empTotalHours = mappedTE.reduce((s, te) => s + (te.total_hours || 0), 0);
    const empTotalOvertimeHours = mappedTE.reduce((s, te) => s + (te.overtime_hours || 0), 0);
    const empTotalNightHours = mappedTE.reduce((s, te) => s + (te.night_hours || 0), 0);
    const empTotalWeekendHours = mappedTE.reduce((s, te) => s + (te.weekend_hours || 0), 0);
    const empTotalHolidayHours = mappedTE.reduce((s, te) => s + (te.holiday_hours || 0), 0);
    const empTotalSubsistenceAllowance = mappedTE.reduce((s, te) => s + (te.subsistence_allowance || 0), 0);
    const empTotalAdvancedCosts = mappedTE.reduce((s, te) => s + (te.advanced_costs || 0), 0);
    const empTotalMeals = mappedTE.reduce((s, te) => s + (te.meals || 0), 0);
    const empTotalWkr = mappedTE.reduce((s, te) => s + (te.wkr || 0), 0);
    const empTotalTripKm = mappedTrips.reduce((s, tr) => s + (tr.total_km || 0), 0);
    const empTotalSWHours = mappedSW.reduce((s, sw) => s + calcHoursFromTimes(sw.start_time, sw.end_time), 0);

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
      timeEntries: mappedTE, trips: mappedTrips, standplaatsWerk: mappedSW,
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

    const jsonString = JSON.stringify(reportData, null, 2);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonString);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const fileBase64 = btoa(binary);

    return Response.json({
      success: true,
      fileName: `DailyPayrollReport_${date}.json`,
      fileBase64,
    });
  } catch (error) {
    console.error('downloadDailyPayrollReportJson error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});