import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Schema v2.2 — Azure-ready JSON data layer for daily payroll report.
 * All TimeEntry, Trip and StandplaatsWerk fields are explicitly mapped.
 * No presentation text — raw numeric/ISO values only.
 *
 * v2.2: Added startDateTimeISO / endDateTimeISO (full ISO 8601 with
 *       Europe/Amsterdam offset). Over-midnight entries use end_date.
 */

/**
 * Build a full ISO 8601 datetime string from a date (YYYY-MM-DD) and time (HH:mm or HH:mm:ss).
 * Uses Europe/Amsterdam timezone offset.
 * Returns null if date or time is missing/invalid.
 */
function buildISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  // Ensure time has seconds
  const timeParts = timeStr.split(':');
  const hh = timeParts[0] || '00';
  const mm = timeParts[1] || '00';
  const ss = timeParts[2] || '00';
  const isoBase = `${dateStr}T${hh}:${mm}:${ss}`;

  // Determine Europe/Amsterdam offset for this specific date+time
  // Create a Date in UTC, then compare with the locale string to find offset
  const utcDate = new Date(`${dateStr}T${hh}:${mm}:${ss}Z`);
  if (isNaN(utcDate.getTime())) return null;

  // Get the Amsterdam time for this UTC instant
  const amsFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const amsParts = Object.fromEntries(
    amsFmt.formatToParts(utcDate).filter(p => p.type !== 'literal').map(p => [p.type, p.value])
  );
  const amsDate = new Date(`${amsParts.year}-${amsParts.month}-${amsParts.day}T${amsParts.hour}:${amsParts.minute}:${amsParts.second}Z`);
  const offsetMs = amsDate.getTime() - utcDate.getTime();
  const offsetMin = offsetMs / 60000;
  const sign = offsetMin >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMin);
  const offHH = String(Math.floor(absMin / 60)).padStart(2, '0');
  const offMM = String(absMin % 60).padStart(2, '0');

  return `${isoBase}${sign}${offHH}:${offMM}`;
}

function mapTimeEntry(te) {
  // Build full ISO 8601 datetimes
  const startDate = te.date || null;
  const endDate = te.end_date || te.date || null; // over-midnight uses end_date
  const startDateTimeISO = buildISO(startDate, te.start_time);
  const endDateTimeISO = buildISO(endDate, te.end_time);

  return {
    id: te.id,
    employee_id: te.employee_id,
    date: te.date || null,
    end_date: te.end_date || null,
    startDateTimeISO,
    endDateTimeISO,
    week_number: te.week_number ?? null,
    year: te.year ?? null,
    start_time: te.start_time || null,
    end_time: te.end_time || null,
    break_minutes: te.break_minutes ?? 0,
    total_hours: te.total_hours ?? 0,
    overtime_hours: te.overtime_hours ?? 0,
    night_hours: te.night_hours ?? 0,
    weekend_hours: te.weekend_hours ?? 0,
    holiday_hours: te.holiday_hours ?? 0,
    shift_type: te.shift_type || null,
    project_id: te.project_id || null,
    customer_id: te.customer_id || null,
    departure_location: te.departure_location || null,
    return_location: te.return_location || null,
    departure_time: te.departure_time || null,
    expected_return_time: te.expected_return_time || null,
    subsistence_allowance: te.subsistence_allowance ?? 0,
    advanced_costs: te.advanced_costs ?? 0,
    meals: te.meals ?? 0,
    wkr: te.wkr ?? 0,
    travel_allowance_multiplier: te.travel_allowance_multiplier ?? 0,
    notes: te.notes || null,
    status: te.status || null,
    signature_url: te.signature_url || null,
    submission_id: te.submission_id || null,
    approved_by: te.approved_by || null,
    approved_date: te.approved_date || null,
    rejection_reason: te.rejection_reason || null,
    edit_history: te.edit_history || [],
    created_date: te.created_date || null,
    updated_date: te.updated_date || null,
    created_by: te.created_by || null,
  };
}

function mapTrip(trip, customerMap) {
  return {
    id: trip.id,
    employee_id: trip.employee_id,
    time_entry_id: trip.time_entry_id || null,
    date: trip.date || null,
    vehicle_id: trip.vehicle_id || null,
    customer_id: trip.customer_id || null,
    customer_name: customerMap[trip.customer_id] || null,
    project_id: trip.project_id || null,
    route_name: trip.route_name || null,
    planned_stops: trip.planned_stops ?? null,
    completed_stops: trip.completed_stops ?? null,
    start_km: trip.start_km ?? null,
    end_km: trip.end_km ?? null,
    total_km: trip.total_km ?? null,
    fuel_liters: trip.fuel_liters ?? null,
    adblue_liters: trip.adblue_liters ?? null,
    fuel_km: trip.fuel_km ?? null,
    charging_kwh: trip.charging_kwh ?? null,
    fuel_cost: trip.fuel_cost ?? null,
    cargo_description: trip.cargo_description || null,
    cargo_weight: trip.cargo_weight ?? null,
    departure_time: trip.departure_time || null,
    arrival_time: trip.arrival_time || null,
    departure_location: trip.departure_location || null,
    notes: trip.notes || null,
    status: trip.status || null,
    created_date: trip.created_date || null,
    updated_date: trip.updated_date || null,
    created_by: trip.created_by || null,
  };
}

function mapStandplaatsWerk(sw) {
  return {
    id: sw.id,
    time_entry_id: sw.time_entry_id || null,
    employee_id: sw.employee_id || null,
    date: sw.date || null,
    start_time: sw.start_time || null,
    end_time: sw.end_time || null,
    customer_id: sw.customer_id || null,
    project_id: sw.project_id || null,
    activity_id: sw.activity_id || null,
    notes: sw.notes || null,
    created_date: sw.created_date || null,
    updated_date: sw.updated_date || null,
    created_by: sw.created_by || null,
  };
}

/**
 * Known mapped TimeEntry fields — must match mapTimeEntry keys exactly.
 * Built-in fields (id, created_date, updated_date, created_by) are always
 * present and handled, so they are included here as well.
 * When a NEW field is added to the TimeEntry entity schema, it will NOT
 * appear in this set → the drift check will catch it and fail loudly.
 */
const KNOWN_TIMEENTRY_FIELDS = new Set([
  'employee_id', 'date', 'end_date', 'week_number', 'year',
  'start_time', 'end_time', 'break_minutes', 'total_hours',
  'overtime_hours', 'night_hours', 'weekend_hours', 'holiday_hours',
  'shift_type', 'project_id', 'customer_id',
  'departure_location', 'return_location', 'departure_time', 'expected_return_time',
  'subsistence_allowance', 'advanced_costs', 'meals', 'wkr', 'travel_allowance_multiplier',
  'notes', 'status', 'signature_url', 'submission_id',
  'approved_by', 'approved_date', 'rejection_reason', 'edit_history',
  // Built-in / platform-internal fields always present on every entity record
  'id', 'created_date', 'updated_date', 'created_by',
  'created_by_id', 'is_sample',
]);

/**
 * Compare actual TimeEntry record keys against the known mapped fields.
 * Fetches the most recent record and checks for unmapped keys.
 * Returns an array of unknown field names, or empty if all fields are covered.
 */
async function checkTimeEntrySchemaAlignment(base44) {
  const recent = await base44.asServiceRole.entities.TimeEntry.list('-created_date', 1);
  if (recent.length === 0) return []; // no data yet — nothing to check
  const recordKeys = Object.keys(recent[0]);
  const unknownFields = recordKeys.filter(f => !KNOWN_TIMEENTRY_FIELDS.has(f));
  return unknownFields;
}

/** Validate the final report object before returning */
function validateReport(report) {
  const errors = [];
  const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

  if (!report.schemaVersion) errors.push('schemaVersion ontbreekt');
  if (!report.reportDate) errors.push('reportDate ontbreekt');
  if (!report.period?.startDate) errors.push('period.startDate ontbreekt');
  if (!report.period?.endDate) errors.push('period.endDate ontbreekt');
  if (!Array.isArray(report.employees)) errors.push('employees is geen array');

  // Top-level totals numeric check
  for (const key of ['totalHours', 'overtimeHours', 'nightHours', 'weekendHours', 'holidayHours', 'subsistenceAllowance', 'advancedCosts', 'meals', 'wkr', 'totalTripKilometers', 'totalStandplaatsHours']) {
    if (typeof report.totals?.[key] !== 'number') {
      errors.push(`totals.${key} is niet numeriek`);
    }
  }

  // generatedAt ISO check
  if (report.generatedAt && !ISO_DATE_REGEX.test(report.generatedAt)) {
    errors.push('generatedAt is geen geldig ISO-formaat');
  }

  // Per-employee validation
  if (Array.isArray(report.employees)) {
    for (let i = 0; i < report.employees.length; i++) {
      const emp = report.employees[i];
      const prefix = `employees[${i}]`;
      for (const key of ['totalHours', 'overtimeHours', 'nightHours', 'weekendHours', 'holidayHours', 'subsistenceAllowance', 'advancedCosts', 'meals', 'wkr', 'totalTripKilometers', 'totalStandplaatsHours']) {
        if (typeof emp.totals?.[key] !== 'number') {
          errors.push(`${prefix}.totals.${key} is niet numeriek`);
        }
      }
    }
  }

  return errors;
}

const EXPECTED_SCHEMA_VERSION = "2.2";

/** Parse HH:MM times into decimal hours difference */
function calcHoursFromTimes(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60; // overnight
  return diff / 60;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {
      // Service role call — no user context
    }

    if (user && user.role !== 'admin' && !['ADMIN', 'HR_ADMIN'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: alleen admin en hr_admin' }, { status: 403 });
    }

    const { date } = await req.json();
    if (!date) return Response.json({ error: 'date is verplicht (YYYY-MM-DD)' }, { status: 400 });

    // Schema drift check — fail early if TimeEntry has unmapped fields
    const unknownFields = await checkTimeEntrySchemaAlignment(base44);
    if (unknownFields.length > 0) {
      return Response.json({
        success: false,
        error: 'TIMEENTRY_SCHEMA_OUTDATED',
        message: `TimeEntry entity bevat velden die niet in de mapping staan: ${unknownFields.join(', ')}. Werk mapTimeEntry en KNOWN_TIMEENTRY_FIELDS bij.`,
        unmappedFields: unknownFields,
      }, { status: 422 });
    }

    const [employees, allTimeEntries, trips, standplaatsWerk, customers] = await Promise.all([
      base44.asServiceRole.entities.Employee.filter({ status: 'Actief' }),
      base44.asServiceRole.entities.TimeEntry.filter({ date }),
      base44.asServiceRole.entities.Trip.filter({ date }),
      base44.asServiceRole.entities.StandplaatsWerk.filter({ date }),
      base44.asServiceRole.entities.Customer.filter({}),
    ]);

    // Only include approved time entries
    const timeEntries = allTimeEntries.filter(te => te.status === 'Goedgekeurd');

    const customerMap = {};
    for (const c of customers) customerMap[c.id] = c.company_name || '';

    employees.sort((a, b) => {
      const numA = a.employee_number || '';
      const numB = b.employee_number || '';
      return numA.localeCompare(numB, 'nl', { numeric: true });
    });

    let grandTotalHours = 0;
    let grandTotalTripKm = 0;
    let grandTotalStandplaatsHours = 0;
    let grandTotalOvertimeHours = 0;
    let grandTotalNightHours = 0;
    let grandTotalWeekendHours = 0;
    let grandTotalHolidayHours = 0;
    let grandTotalSubsistenceAllowance = 0;
    let grandTotalAdvancedCosts = 0;
    let grandTotalMeals = 0;
    let grandTotalWkr = 0;

    const employeesWithData = [];

    for (const emp of employees) {
      const empTimeEntries = timeEntries.filter(t => t.employee_id === emp.id);
      const empTrips = trips.filter(t => t.employee_id === emp.id);
      const empStandplaats = standplaatsWerk.filter(s => s.employee_id === emp.id);

      if (empTimeEntries.length === 0 && empTrips.length === 0 && empStandplaats.length === 0) continue;

      const mappedTimeEntries = empTimeEntries.map(te => mapTimeEntry(te));
      const mappedTrips = empTrips.map(trip => mapTrip(trip, customerMap));
      const mappedStandplaats = empStandplaats.map(sw => mapStandplaatsWerk(sw));

      // Employee-level totals
      const empTotalHours = mappedTimeEntries.reduce((sum, te) => sum + (te.total_hours || 0), 0);
      const empTotalOvertimeHours = mappedTimeEntries.reduce((sum, te) => sum + (te.overtime_hours || 0), 0);
      const empTotalNightHours = mappedTimeEntries.reduce((sum, te) => sum + (te.night_hours || 0), 0);
      const empTotalWeekendHours = mappedTimeEntries.reduce((sum, te) => sum + (te.weekend_hours || 0), 0);
      const empTotalHolidayHours = mappedTimeEntries.reduce((sum, te) => sum + (te.holiday_hours || 0), 0);
      const empTotalSubsistenceAllowance = mappedTimeEntries.reduce((sum, te) => sum + (te.subsistence_allowance || 0), 0);
      const empTotalAdvancedCosts = mappedTimeEntries.reduce((sum, te) => sum + (te.advanced_costs || 0), 0);
      const empTotalMeals = mappedTimeEntries.reduce((sum, te) => sum + (te.meals || 0), 0);
      const empTotalWkr = mappedTimeEntries.reduce((sum, te) => sum + (te.wkr || 0), 0);
      const empTotalTripKm = mappedTrips.reduce((sum, tr) => sum + (tr.total_km || 0), 0);
      const empTotalStandplaatsHours = mappedStandplaats.reduce((sum, sw) => {
        return sum + calcHoursFromTimes(sw.start_time, sw.end_time);
      }, 0);

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
      grandTotalStandplaatsHours += empTotalStandplaatsHours;

      const empName = [emp.first_name, emp.prefix, emp.last_name].filter(Boolean).join(' ');

      employeesWithData.push({
        employeeNumber: emp.employee_number || null,
        employeeId: emp.id,
        name: empName,
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
          totalStandplaatsHours: Math.round(empTotalStandplaatsHours * 100) / 100,
        },
        timeEntries: mappedTimeEntries,
        trips: mappedTrips,
        standplaatsWerk: mappedStandplaats,
      });
    }

    const report = {
      success: true,
      schemaVersion: EXPECTED_SCHEMA_VERSION,
      reportType: "DAILY_PAYROLL",
      metadata: {
        sourceSystem: "Interdistri TMS",
        generatedBy: "buildDailyPayrollReportData",
        timezone: "Europe/Amsterdam",
      },
      reportDate: date,
      period: {
        startDate: date,
        endDate: date,
      },
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

    // Runtime schema version guard
    if (report.schemaVersion !== EXPECTED_SCHEMA_VERSION) {
      return Response.json({
        success: false,
        error: 'SCHEMA_VERSION_MISMATCH',
        expected: EXPECTED_SCHEMA_VERSION,
        actual: report.schemaVersion,
      }, { status: 422 });
    }

    // Validate before returning
    const validationErrors = validateReport(report);
    if (validationErrors.length > 0) {
      return Response.json({
        success: false,
        error: "INVALID_REPORT_SCHEMA",
        details: validationErrors.join('; '),
      }, { status: 422 });
    }

    return Response.json(report);
  } catch (error) {
    console.error('buildDailyPayrollReportData error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});