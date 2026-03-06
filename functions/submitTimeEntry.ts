// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Employee via mobile app (MobileEntry page)            ║
// ║ Auth: User session (any authenticated employee)                  ║
// ║ DO NOT USE RAW ENTITY CALLS — USE tenantService for tenant data  ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ============================================================
// submitTimeEntry v6.0.0 — Refactored critical path (2026-03-06)
// ============================================================
//
// CHANGES FROM v5.2.1:
//   - REMOVED MobileSubmissionIndex from entire flow (no reads/writes)
//   - Idempotency now via UNIQUE constraint on TimeEntry.submission_id
//   - TimeEntry created directly as "Ingediend" (no Concept→Ingediend two-step)
//   - BreakSchedule cached in-memory (5 min TTL) to avoid repeated DB calls
//   - Employee lookup + overlap fetch parallelized where possible
//   - Logging (MobileEntrySubmissionLog + MobileEntryPerformanceLog) fully preserved
//   - recalculateAfterTimeEntrySubmit fire-and-forget unchanged
//
// ARCHITECTURE:
//   1. Dedicated submission_id field on TimeEntry with UNIQUE constraint
//   2. Idempotency via submission_id lookup — if exists with Ingediend/Goedgekeurd, return it
//   3. Create TimeEntry directly as "Ingediend" — UNIQUE constraint prevents duplicates
//   4. If create fails with duplicate key error → idempotent hit (another request won)
//   5. Separate orphan cleanup job handles any edge cases
//
// RACE CONDITION STRATEGY:
//   Two requests with SAME submission_id:
//     → First one passes idempotency check, creates Ingediend entry
//     → Second one either: (a) finds it in idempotency check, or
//       (b) gets UNIQUE constraint violation on create → treats as idempotent hit
//
//   Two requests with DIFFERENT submission_ids, same date:
//     → Overlap detection runs against committed entries
//     → Second request blocked by overlap check
//
// FAILURE SCENARIOS:
//   Crash before create:  No record exists. Client retries → fresh attempt.
//   Crash after create:   Ingediend entry is safe. Client retries → idempotent hit.
//   Client timeout retry: Same submission_id → idempotent hit.
// ============================================================

// --- VALIDATION HELPERS ---

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isTime(t) { return typeof t === 'string' && TIME_RE.test(t); }
function isDate(d) { return typeof d === 'string' && DATE_RE.test(d) && !isNaN(new Date(d + 'T12:00:00').getTime()); }
function isOptStr(v) { return v === undefined || v === null || typeof v === 'string'; }
function isOptNum(v) { return v === undefined || v === null || (typeof v === 'number' && isFinite(v)); }
function clamp(v, lo, hi) { if (v == null) return null; const n = Number(v); return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null; }
function timeMin(t) { if (!isTime(t)) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; }

// --- DATE HELPERS (pure string arithmetic, no timezone) ---
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// --- UNIFIED OVERLAP ENGINE ---

function effectiveEndDate(service) {
  if (service.end_date) return service.end_date;
  const s = timeMin(service.start_time), e = timeMin(service.end_time);
  if (s !== null && e !== null && e <= s) return addDays(service.date, 1);
  return service.date;
}

function servicesOverlap(existing, incoming) {
  const exStart = existing.date;
  const exEnd = effectiveEndDate(existing);
  const newStart = incoming.date;
  const newEnd = effectiveEndDate(incoming);

  if (exEnd < newStart || newEnd < exStart) return false;

  if (exStart === exEnd && newStart === newEnd && exStart === newStart) {
    const ns = timeMin(incoming.start_time), ne = timeMin(incoming.end_time);
    const es = timeMin(existing.start_time), ee = timeMin(existing.end_time);
    if (ns === null || ne === null || es === null || ee === null) return false;
    return ns < ee && ne > es;
  }

  if (exStart < newEnd && exEnd > newStart) {
    return true;
  }

  const ns = timeMin(incoming.start_time), ne = timeMin(incoming.end_time);
  const es = timeMin(existing.start_time), ee = timeMin(existing.end_time);
  if (exEnd === newStart && ee !== null && ns !== null) {
    return ee > ns;
  }
  if (newEnd === exStart && ne !== null && es !== null) {
    return ne > es;
  }
  return false;
}

function shiftType(start, end) {
  if (!isTime(start)) return 'Dag';
  const h = +start.split(':')[0];
  if (h >= 21 || h < 5) return 'Nachtdienst';
  if (h >= 16) {
    if (isTime(end)) { const eh = +end.split(':')[0]; if (eh >= 21 || eh < 5) return 'Nachtdienst'; }
    return 'Avond';
  }
  return 'Dag';
}

function calcHours(start, end, brk, d1, d2) {
  const s = timeMin(start), e = timeMin(end);
  if (s === null || e === null) return 0;
  let mins = e - s;
  if (d2 && d1 && d2 > d1) {
    const diff = Math.round((new Date(d2 + 'T12:00:00') - new Date(d1 + 'T12:00:00')) / 864e5);
    mins += diff * 1440;
  } else if (mins < 0) mins += 1440;
  return Math.round(Math.max(0, mins - Math.max(0, brk || 0)) / 60 * 100) / 100;
}

function isoWeek(d) {
  const dt = new Date(d + 'T12:00:00');
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  return Math.ceil((((dt - new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))) / 864e5) + 1) / 7);
}

function isoYear(d) {
  const dt = new Date(d + 'T12:00:00');
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  return dt.getUTCFullYear();
}

// --- EXTRACTED OVERLAP VALIDATION ---

function validateTimeEntryOverlap(existingEntries, employeeId, date, endDate, startTime, endTime) {
  const incomingEntry = { date, end_date: endDate || null, start_time: startTime, end_time: endTime };
  const newEffEnd = effectiveEndDate(incomingEntry);

  const committed = existingEntries.filter(e => {
    if (e.employee_id !== employeeId) return false;
    if (e.status !== 'Ingediend' && e.status !== 'Goedgekeurd') return false;
    const exEffEnd = effectiveEndDate(e);
    return exEffEnd >= date && e.date <= newEffEnd;
  });

  const approvedOnDate = committed.find(e =>
    e.status === 'Goedgekeurd' && e.date === date && (!e.end_date || e.end_date === e.date)
    && servicesOverlap(e, incomingEntry)
  );
  if (approvedOnDate) {
    return {
      overlaps: true,
      errorCode: 'ALREADY_APPROVED',
      errorMsg: 'Voor deze datum bestaat al een goedgekeurde dienst die overlapt.',
      existingId: approvedOnDate.id,
    };
  }

  for (const ex of committed) {
    if (servicesOverlap(ex, incomingEntry)) {
      const exEnd = ex.end_date || ex.date;
      const isSameDay = !endDate && !ex.end_date && date === ex.date;
      return {
        overlaps: true,
        errorCode: isSameDay ? 'TIME_OVERLAP' : 'DATE_OVERLAP',
        errorMsg: isSameDay
          ? `Overlapt met dienst ${ex.start_time}-${ex.end_time} op ${ex.date}`
          : `Overlapt met dienst ${ex.date} t/m ${exEnd}`,
        existingId: ex.id,
      };
    }
  }

  return { overlaps: false };
}

// --- INPUT VALIDATION ---

function validate(p) {
  const err = [];
  if (!p) return ['Payload is vereist'];

  if (!p.submission_id || typeof p.submission_id !== 'string' || !UUID_RE.test(p.submission_id)) {
    p.submission_id = crypto.randomUUID();
    console.log(`[SUBMIT] submission_id ontbrak of ongeldig — server-generated: ${p.submission_id}`);
  }

  if (!isDate(p.date)) err.push('Ongeldige datum (YYYY-MM-DD)');
  if (!isTime(p.start_time)) err.push('Ongeldige starttijd (HH:MM)');
  if (!isTime(p.end_time)) err.push('Ongeldige eindtijd (HH:MM)');
  if (!isOptStr(p.signature_url)) err.push('signature_url moet string zijn');

  if (!err.length && isDate(p.date)) {
    const payloadDate = new Date(p.date + 'T12:00:00Z');
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const diffDays = Math.round((payloadDate - todayUTC) / 864e5);
    if (diffDays > 1) {
      err.push('DATE_TIME_MISMATCH: Datum ligt in de toekomst.');
      p._dateTimeMismatch = true;
    } else if (diffDays < -60) {
      err.push('DATE_TIME_MISMATCH: Datum ligt meer dan 60 dagen in het verleden.');
      p._dateTimeMismatch = true;
    }
  }

  if (p.end_date != null) {
    if (!isDate(p.end_date)) err.push('Ongeldige einddatum (YYYY-MM-DD)');
    else if (p.date && p.end_date < p.date) err.push('Einddatum mag niet vóór startdatum');
    if (isDate(p.date) && isDate(p.end_date)) {
      const diff = Math.round((new Date(p.end_date + 'T12:00:00') - new Date(p.date + 'T12:00:00')) / 864e5);
      if (diff > 7) err.push('Dienst max 7 dagen');
      if (isTime(p.start_time) && isTime(p.end_time)) {
        const sM = timeMin(p.start_time), eM = timeMin(p.end_time);
        let totalMin = eM - sM + diff * 1440;
        if (totalMin < 0) totalMin += 1440;
        if (totalMin > 48 * 60) err.push('Dienstduur overschrijdt maximale toegestane lengte (48 uur)');
      }
    }
  }

  if (p.break_minutes != null && (typeof p.break_minutes !== 'number' || p.break_minutes < 0 || p.break_minutes > 480))
    err.push('Pauze: 0-480 minuten');

  if (!Array.isArray(p.trips)) p.trips = [];
  const isGeenRit = typeof p.notes === 'string' && p.notes.startsWith('[GEEN_RIT]');
  const geenRitReden = isGeenRit ? p.notes.replace('[GEEN_RIT]', '').trim() : '';
  const hasTrips = p.trips.length > 0;
  const hasStandplaatsen = Array.isArray(p.standplaats_werk) && p.standplaats_werk.length > 0;
  const hasGeenRit = isGeenRit && typeof geenRitReden === 'string' && geenRitReden.trim().length >= 5;
  if (!hasTrips && !hasStandplaatsen && !hasGeenRit) err.push('Minimaal één dienstregel vereist');

  if (p.trips.length > 20) err.push('Max 20 ritten');
  if (p.trips.length > 0) p.trips.forEach((t, i) => {
    const px = `Rit ${i + 1}`;
    if (!isTime(t.start_time)) err.push(`${px}: ongeldige starttijd`);
    if (!isTime(t.end_time)) err.push(`${px}: ongeldige eindtijd`);
    if (!t.vehicle_id || typeof t.vehicle_id !== 'string') err.push(`${px}: voertuig verplicht`);
    if (!isOptStr(t.customer_id)) err.push(`${px}: ongeldige klant`);
    if (!isOptStr(t.route_name)) err.push(`${px}: ongeldige route`);
    if (!isOptStr(t.departure_location)) err.push(`${px}: ongeldige vertreklocatie`);
    if (!isOptStr(t.notes)) err.push(`${px}: ongeldige opmerkingen`);
    if (!isOptNum(t.start_km)) err.push(`${px}: ongeldige begin km`);
    if (!isOptNum(t.end_km)) err.push(`${px}: ongeldige eind km`);
    if (t.start_km != null && t.end_km != null && t.end_km < t.start_km) err.push(`${px}: eind km < begin km`);
    if (!isOptNum(t.fuel_liters)) err.push(`${px}: ongeldige brandstof`);
    if (!isOptNum(t.adblue_liters)) err.push(`${px}: ongeldige AdBlue`);
    if (!isOptNum(t.fuel_km)) err.push(`${px}: ongeldige km tanken`);
    if (!isOptNum(t.charging_kwh)) err.push(`${px}: ongeldige kWh`);
    if (!isOptNum(t.planned_stops)) err.push(`${px}: ongeldige stops`);
  });

  if (p.standplaats_werk != null) {
    if (!Array.isArray(p.standplaats_werk)) err.push('standplaats_werk moet array zijn');
    else if (p.standplaats_werk.length > 20) err.push('Max 20 standplaatswerk');
    else p.standplaats_werk.forEach((s, i) => {
      const px = `SPW ${i + 1}`;
      if (s.start_time && !isTime(s.start_time)) err.push(`${px}: ongeldige starttijd`);
      if (s.end_time && !isTime(s.end_time)) err.push(`${px}: ongeldige eindtijd`);
      if (!isOptStr(s.customer_id)) err.push(`${px}: ongeldige klant`);
      if (!isOptStr(s.project_id)) err.push(`${px}: ongeldig project`);
      if (!isOptStr(s.activity_id)) err.push(`${px}: ongeldige activiteit`);
      if (!isOptStr(s.notes)) err.push(`${px}: ongeldige opmerkingen`);
    });
  }

  if (!isOptStr(p.notes)) err.push('Opmerkingen moet string zijn');
  if (typeof p.notes === 'string' && p.notes.length > 2000) err.push('Opmerkingen max 2000 tekens');

  if (!err.length && p.trips.length > 0 && (!p.end_date || p.end_date === p.date)) {
    const ds = timeMin(p.start_time);
    let de = timeMin(p.end_time);
    if (ds !== null && de !== null) {
      if (de <= ds) de += 1440;
      p.trips.forEach((t, i) => {
        let ts = timeMin(t.start_time), te = timeMin(t.end_time);
        if (ts !== null && ts < ds) ts += 1440;
        if (te !== null && te < ds) te += 1440;
        if (ts !== null && ts < ds) err.push(`Rit ${i + 1}: start vóór dienst`);
        if (te !== null && te > de) err.push(`Rit ${i + 1}: eind na dienst`);
      });
    }
  }

  return err;
}

// --- HELPER: safe delete with logging ---

async function safeDelete(entity, id, label) {
  try { await entity.delete(id); }
  catch (e) { console.error(`Failed to delete ${label} ${id}: ${e.message}`); }
}

// --- SUBMISSION LOGGING HELPER ---

async function logSubmission(svc, data) {
  try { await svc.entities.MobileEntrySubmissionLog.create(data); }
  catch (e) { console.error('[SUBMIT_LOG] Failed to write log:', e.message); }
}

// --- BREAK SCHEDULE CACHE ---
// In-memory cache for BreakSchedule data. Survives across warm requests.
// TTL: 5 minutes. On cold start, fetched fresh on first request.

let _breakScheduleCache = null;
let _breakScheduleCacheTime = 0;
const BREAK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getBreakSchedules(svc) {
  const now = Date.now();
  if (_breakScheduleCache && (now - _breakScheduleCacheTime) < BREAK_CACHE_TTL) {
    console.log('[CACHE] BreakSchedule hit');
    return _breakScheduleCache;
  }
  console.log('[CACHE] BreakSchedule miss — fetching');
  const schedules = await svc.entities.BreakSchedule.filter({ status: 'Actief' });
  _breakScheduleCache = schedules;
  _breakScheduleCacheTime = now;
  return schedules;
}

// --- MAIN HANDLER ---

Deno.serve(async (req) => {
  const t0 = Date.now();

  // CRITICAL: Read body text FIRST (can only read stream once).
  let bodyText = '';
  let parsedBody = null;
  try {
    bodyText = await req.text();
    parsedBody = JSON.parse(bodyText);
  } catch (_) { parsedBody = null; }

  const base44 = createClientFromRequest(req);

  // Early return for internal health-check pings
  if (parsedBody && parsedBody._ping === true) {
    return Response.json({ success: true, pong: true });
  }

  const userAgent = req.headers.get('user-agent') || '';
  const submissionLog = {
    submission_id: '',
    user_id: '',
    email: '',
    timestamp_received: new Date().toISOString(),
    status: 'RECEIVED',
    user_agent: userAgent.slice(0, 500),
  };

  const perf = {};

  try {
    // ========================================
    // 1. AUTHENTICATION
    // ========================================
    const user = await base44.auth.me();
    perf.auth = Date.now() - t0;
    if (!user) {
      try {
        const svcFb = base44.asServiceRole;
        await logSubmission(svcFb, {
          ...submissionLog,
          status: 'VALIDATION_FAILED',
          failure_type: 'VALIDATION',
          http_status: 401,
          error_code: 'UNAUTHORIZED',
          error_message: 'Niet ingelogd',
          timestamp_completed: new Date().toISOString(),
          latency_ms: Date.now() - t0,
        });
      } catch (_) {}
      return Response.json({ success: false, error: 'UNAUTHORIZED', message: 'Niet ingelogd' }, { status: 401 });
    }
    submissionLog.user_id = user.id;
    submissionLog.email = user.email;

    const svc = base44.asServiceRole;

    // ========================================
    // 2. PARSE & VALIDATE
    // ========================================
    let payload = parsedBody;
    if (!payload) {
      await logSubmission(svc, {
        ...submissionLog,
        status: 'VALIDATION_FAILED',
        failure_type: 'VALIDATION',
        http_status: 400,
        error_code: 'INVALID_JSON',
        error_message: 'Ongeldig JSON in request body',
        timestamp_completed: new Date().toISOString(),
        latency_ms: Date.now() - t0,
      });
      return Response.json({ success: false, error: 'INVALID_JSON', message: 'Ongeldig JSON' }, { status: 400 });
    }

    submissionLog.submission_id = payload.submission_id || 'unknown';
    submissionLog.entry_date = payload.date || null;

    // Write RECEIVED log (non-blocking, fire-and-forget)
    logSubmission(svc, { ...submissionLog });

    // DEBUG: Log incoming payload summary
    console.log('[SUBMIT_PAYLOAD]', JSON.stringify({
      date: payload.date,
      end_date: payload.end_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      trips: (payload.trips || []).length,
      spw: (payload.standplaats_werk || []).length,
      submission_id: payload.submission_id,
    }));

    const errors = validate(payload);
    if (errors.length) {
      const isDateMismatch = payload._dateTimeMismatch === true;
      const errorCode = isDateMismatch ? 'DATE_TIME_MISMATCH' : 'VALIDATION_FAILED';
      const errorMessage = isDateMismatch
        ? 'De geselecteerde datum komt niet overeen met de ingevoerde tijden. Vernieuw de pagina en probeer opnieuw.'
        : 'Validatie mislukt';

      await logSubmission(svc, {
        ...submissionLog,
        status: 'VALIDATION_FAILED',
        failure_type: 'VALIDATION',
        http_status: 400,
        error_code: errorCode,
        error_message: `${errors.slice(0, 3).join('; ')} | start_time_raw=${payload.start_time} | end_time_raw=${payload.end_time} | date=${payload.date}`,
        employee_id: payload.employee_id || null,
        timestamp_completed: new Date().toISOString(),
        latency_ms: Date.now() - t0,
      });
      return Response.json({ success: false, error: errorCode, message: errorMessage, details: errors }, { status: isDateMismatch ? 400 : 422 });
    }

    // ========================================
    // 3. EMPLOYEE LOOKUP + IDEMPOTENCY CHECK (PARALLEL)
    // ========================================
    // These two queries are independent — run them simultaneously.
    const tParallel1 = Date.now();
    console.log('[STEP] Parallel: employee lookup + idempotency check for:', user.email);

    const [employees, existingBySubId] = await Promise.all([
      svc.entities.Employee.filter({ email: user.email }),
      // Idempotency: check if submission_id already exists on ANY TimeEntry
      (payload.submission_id && UUID_RE.test(payload.submission_id))
        ? svc.entities.TimeEntry.filter({ submission_id: payload.submission_id })
        : Promise.resolve([]),
    ]);
    perf.employee_and_idempotency = Date.now() - tParallel1;

    if (!employees.length) {
      await logSubmission(svc, {
        ...submissionLog,
        status: 'VALIDATION_FAILED',
        failure_type: 'VALIDATION',
        http_status: 403,
        error_code: 'EMPLOYEE_NOT_FOUND',
        error_message: 'Geen medewerker voor dit account',
        timestamp_completed: new Date().toISOString(),
        latency_ms: Date.now() - t0,
      });
      return Response.json({ success: false, error: 'EMPLOYEE_NOT_FOUND', message: 'Geen medewerker voor dit account' }, { status: 403 });
    }
    const employee = employees[0];
    const empId = employee.id;
    console.log('[STEP] Employee found:', empId);

    // Grace period check
    if (employee.out_of_service_date) {
      const exitDate = new Date(employee.out_of_service_date);
      exitDate.setHours(0, 0, 0, 0);
      const graceEnd = new Date(exitDate);
      graceEnd.setDate(graceEnd.getDate() + 7);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today > graceEnd) {
        await logSubmission(svc, {
          ...submissionLog,
          status: 'VALIDATION_FAILED',
          failure_type: 'VALIDATION',
          http_status: 403,
          error_code: 'EMPLOYEE_INACTIVE',
          error_message: 'Dienstverband beëindigd, grace-periode verlopen',
          employee_id: empId,
          timestamp_completed: new Date().toISOString(),
          latency_ms: Date.now() - t0,
        });
        return Response.json({ success: false, error: 'EMPLOYEE_INACTIVE', message: 'Je dienstverband is beëindigd en de grace-periode is verlopen.' }, { status: 403 });
      }
    }

    // ========================================
    // 4. IDEMPOTENCY — check results from parallel fetch
    // ========================================
    const committedExisting = existingBySubId.find(e =>
      e.employee_id === empId && (e.status === 'Ingediend' || e.status === 'Goedgekeurd')
    );
    if (committedExisting) {
      console.log(`[IDEMPOTENT HIT] submission_id=${payload.submission_id} → TimeEntry ${committedExisting.id}`);
      await logSubmission(svc, {
        ...submissionLog,
        status: 'IDEMPOTENT_HIT',
        failure_type: 'IDEMPOTENT',
        http_status: 200,
        time_entry_id: committedExisting.id,
        employee_id: empId,
        timestamp_completed: new Date().toISOString(),
        latency_ms: Date.now() - t0,
      });
      const [existTrips, existSpw] = await Promise.all([
        svc.entities.Trip.filter({ time_entry_id: committedExisting.id }),
        svc.entities.StandplaatsWerk.filter({ time_entry_id: committedExisting.id }),
      ]);
      return Response.json({
        success: true,
        idempotent_hit: true,
        data: {
          time_entry_id: committedExisting.id,
          trip_ids: existTrips.map(t => t.id),
          standplaats_werk_ids: existSpw.map(s => s.id),
          computed: {
            total_hours: committedExisting.total_hours,
            shift_type: committedExisting.shift_type,
            week_number: committedExisting.week_number,
            year: committedExisting.year,
          }
        }
      });
    }

    // ========================================
    // 5. OVERLAP DETECTION + BREAK STAFFEL (PARALLEL)
    // ========================================
    const entryEnd = payload.end_date || payload.date;
    const queryStart = addDays(payload.date, -1);
    const queryEnd = addDays(entryEnd, 1);
    const isManualBreak = payload.break_manual === true;
    const endD = payload.end_date || null;

    console.log('[STEP] Fetching entries + break schedules for employee:', empId);
    const tOverlap = Date.now();

    const [rangedCandidates, breakSchedulesRaw] = await Promise.all([
      svc.entities.TimeEntry.filter({
        employee_id: empId,
        status: { $in: ['Ingediend', 'Goedgekeurd'] },
        date: { $gte: queryStart, $lte: queryEnd },
      }),
      isManualBreak ? Promise.resolve([]) : getBreakSchedules(svc),
    ]);
    perf.overlap_and_break_fetch = Date.now() - tOverlap;
    console.log('[STEP] Found', rangedCandidates.length, 'entries in range', queryStart, '-', queryEnd);

    console.log('[OVERLAP_CHECK]', JSON.stringify({
      employeeId: empId,
      entryStart: payload.date,
      entryEnd,
      queryWindow: `${queryStart} - ${queryEnd}`,
      totalEntries: rangedCandidates.length,
    }));

    const overlapResult = validateTimeEntryOverlap(
      rangedCandidates, empId, payload.date, payload.end_date || null,
      payload.start_time, payload.end_time
    );

    if (overlapResult.overlaps) {
      console.log(`[OVERLAP] ${overlapResult.errorCode}: existing ${overlapResult.existingId} vs new (${payload.date}→${entryEnd} ${payload.start_time}-${payload.end_time})`);
      await logSubmission(svc, {
        ...submissionLog,
        status: 'VALIDATION_FAILED',
        failure_type: 'BUSINESS',
        http_status: 409,
        error_code: overlapResult.errorCode,
        error_message: overlapResult.errorMsg,
        employee_id: empId,
        timestamp_completed: new Date().toISOString(),
        latency_ms: Date.now() - t0,
      });
      return Response.json({
        success: false, error: overlapResult.errorCode,
        message: overlapResult.errorMsg,
        details: [`Bestaande dienst: ${overlapResult.existingId}`]
      }, { status: 409 });
    }

    // ========================================
    // 6. COMPUTE SERVER-SIDE DERIVED FIELDS
    // ========================================
    const sMin = timeMin(payload.start_time);
    const eMin = timeMin(payload.end_time);
    let dienstMinutes = eMin - sMin;
    if (endD && payload.date && endD > payload.date) {
      const dayDiff = Math.round((new Date(endD + 'T12:00:00') - new Date(payload.date + 'T12:00:00')) / 864e5);
      dienstMinutes += dayDiff * 1440;
    } else if (dienstMinutes < 0) {
      dienstMinutes += 1440;
    }
    const dienstHours = dienstMinutes / 60;

    let brk;
    let breakStaffelId = null;

    if (isManualBreak) {
      brk = Math.max(0, Math.round(payload.break_minutes || 0));
      console.log(`[BREAK] Manual override: ${brk} min for ${dienstHours.toFixed(2)}h dienst`);
    } else {
      const sorted = [...breakSchedulesRaw].sort((a, b) => a.min_hours - b.min_hours);
      const match = sorted.find(s => dienstHours >= s.min_hours && (s.max_hours == null || dienstHours < s.max_hours));
      brk = match ? match.break_minutes : 0;
      breakStaffelId = match ? match.id : null;
      console.log(`[BREAK] Staffel: ${brk} min for ${dienstHours.toFixed(2)}h dienst (rule: ${breakStaffelId || 'none'})`);
    }

    const totalHours = calcHours(payload.start_time, payload.end_time, brk, payload.date, endD);
    const st = shiftType(payload.start_time, payload.end_time);
    const wk = isoWeek(payload.date);
    const yr = isoYear(payload.date);

    // ========================================
    // 7. CREATE TIMEENTRY DIRECTLY AS "Ingediend"
    // ========================================
    // No Concept→Ingediend two-step. UNIQUE constraint on submission_id
    // prevents duplicate creation. If a race condition causes a duplicate key
    // error, we treat it as an idempotent hit.
    const tCreate = Date.now();
    let te;

    try {
      te = await svc.entities.TimeEntry.create({
        employee_id: empId,
        date: payload.date,
        end_date: endD,
        week_number: wk,
        year: yr,
        start_time: payload.start_time,
        end_time: payload.end_time,
        break_minutes: brk,
        break_manual: isManualBreak,
        break_staffel_id: breakStaffelId,
        calculated_dienst_minutes: dienstMinutes,
        total_hours: totalHours,
        shift_type: st,
        notes: (payload.notes || '').slice(0, 2000) || null,
        status: 'Ingediend',
        signature_url: payload.signature_url || null,
        submission_id: payload.submission_id,
      });
    } catch (createErr) {
      // Check if this is a UNIQUE constraint violation (duplicate submission_id)
      const errMsg = (createErr.message || '').toLowerCase();
      if (errMsg.includes('unique') || errMsg.includes('duplicate') || errMsg.includes('already exists')) {
        console.log(`[UNIQUE_GUARD] submission_id=${payload.submission_id} duplicate detected via constraint`);
        // Another request created it — fetch and return as idempotent hit
        const dupeCheck = await svc.entities.TimeEntry.filter({
          submission_id: payload.submission_id,
        });
        const winner = dupeCheck.find(e => e.employee_id === empId && (e.status === 'Ingediend' || e.status === 'Goedgekeurd'));
        if (winner) {
          await logSubmission(svc, {
            ...submissionLog,
            status: 'IDEMPOTENT_HIT',
            failure_type: 'IDEMPOTENT',
            http_status: 200,
            time_entry_id: winner.id,
            employee_id: empId,
            timestamp_completed: new Date().toISOString(),
            latency_ms: Date.now() - t0,
          });
          return Response.json({
            success: true,
            idempotent_hit: true,
            data: {
              time_entry_id: winner.id,
              trip_ids: [],
              standplaats_werk_ids: [],
              computed: {
                total_hours: winner.total_hours,
                shift_type: winner.shift_type,
                week_number: winner.week_number,
                year: winner.year,
              }
            }
          });
        }
      }
      // Not a duplicate — re-throw for outer catch
      throw createErr;
    }

    perf.timeentry_create = Date.now() - tCreate;
    console.debug('[CREATED]', { teId: te.id, date: payload.date, endDate: endD, status: 'Ingediend' });

    // ========================================
    // 8. SUCCESS — return immediately, async recalc follows
    // ========================================
    perf.total = Date.now() - t0;
    console.log('[PERF]', JSON.stringify(perf));

    // Persist perf log + success submission log in parallel (non-blocking)
    const tEnd = Date.now();
    Promise.all([
      svc.entities.MobileEntryPerformanceLog.create({
        submission_id: payload.submission_id,
        user_email: user.email,
        employee_id: empId,
        auth_ms: perf.auth || null,
        idempotency_guard_ms: perf.employee_and_idempotency || null,
        employee_lookup_ms: perf.employee_and_idempotency || null,
        te_idempotency_check_ms: perf.employee_and_idempotency || null,
        overlap_fetch_ms: perf.overlap_and_break_fetch || null,
        overlap_check_ms: perf.overlap_and_break_fetch || null,
        timeentry_create_ms: perf.timeentry_create || null,
        trips_and_spw_create_ms: null,
        commit_ms: null,
        write_verify_ms: null,
        post_commit_guard_ms: null,
        total_ms: perf.total,
        outcome: 'SUCCESS',
      }).catch(e => console.error('[PERF_LOG]', e.message)),
      logSubmission(svc, {
        ...submissionLog,
        status: 'SUCCESS',
        http_status: 200,
        time_entry_id: te.id,
        employee_id: empId,
        timestamp_completed: new Date().toISOString(),
        latency_ms: tEnd - t0,
        latency_overlap_ms: perf.overlap_and_break_fetch || 0,
        latency_write_ms: perf.timeentry_create || 0,
        latency_recalc_ms: 0,
        latency_finalize_ms: 0,
      }),
    ]).catch(() => {}); // fire-and-forget, never block response

    // ========================================
    // 9. FIRE-AND-FORGET: Async recalculation
    // ========================================
    svc.functions.invoke('recalculateAfterTimeEntrySubmit', {
      time_entry_id: te.id,
      employee_id: empId,
      submission_id: payload.submission_id,
      trips: payload.trips || [],
      standplaats_werk: payload.standplaats_werk || [],
      date: payload.date,
      end_date: payload.end_date || null,
      start_time: payload.start_time,
      end_time: payload.end_time,
    }).catch(err => {
      console.error('[ASYNC_RECALC] Fire-and-forget failed:', err.message);
      svc.entities.AuditLog.create({
        action_type: 'update',
        category: 'Systeem',
        description: `Async recalc failed for TE ${te.id}: ${(err.message || '').slice(0, 300)}`,
        performed_by_email: user.email || 'system',
        performed_by_role: 'system',
        target_entity: 'TimeEntry',
        target_id: te.id,
        metadata: { submission_id: payload.submission_id, error: (err.message || '').slice(0, 200) },
      }).catch(() => {});
    });

    return Response.json({
      success: true,
      data: {
        time_entry_id: te.id,
        trip_ids: [],
        standplaats_werk_ids: [],
        computed: { total_hours: totalHours, shift_type: st, week_number: wk, year: yr }
      }
    });

  } catch (outerError) {
    perf.total = Date.now() - t0;
    console.error('[UNHANDLED]', outerError);
    console.log('[PERF]', JSON.stringify(perf));

    try {
      const svcFallback = base44.asServiceRole;
      await Promise.all([
        logSubmission(svcFallback, {
          ...submissionLog,
          status: 'FAILED',
          failure_type: 'SYSTEM',
          http_status: 500,
          error_code: 'INTERNAL_ERROR',
          error_message: (outerError.message || 'Onverwachte fout').slice(0, 500),
          timestamp_completed: new Date().toISOString(),
          latency_ms: Date.now() - t0,
        }),
        svcFallback.entities.MobileEntryPerformanceLog.create({
          submission_id: submissionLog.submission_id,
          user_email: submissionLog.email,
          auth_ms: perf.auth || null,
          total_ms: perf.total,
          outcome: 'FAILED',
        }).catch(() => {}),
      ]);
    } catch (_) {}
    return Response.json({ success: false, error: 'INTERNAL_ERROR', message: 'Onverwachte fout' }, { status: 500 });
  }
});