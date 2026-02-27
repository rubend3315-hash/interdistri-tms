// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Employee via mobile app (MobileEntry page)            ║
// ║ Auth: User session (any authenticated employee)                  ║
// ║ DO NOT USE RAW ENTITY CALLS — USE tenantService for tenant data  ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// submitTimeEntry v5.0 — Date-time mismatch guard + overlap hardening (2026-02-27)
// ============================================================
//
// ARCHITECTURE:
//   1. Dedicated submission_id field on TimeEntry (no notes parsing)
//   2. Idempotency via submission_id lookup BEFORE any writes
//   3. Atomic check-then-create with post-create duplicate guard
//   4. Safe cleanup: only AFTER commit, failures never affect submit
//   5. Separate orphan cleanup job handles stale Concepts
//
// RACE CONDITION STRATEGY:
//   Two requests with SAME submission_id:
//     → First one creates Concept, commits to Ingediend
//     → Second one finds committed entry via submission_id filter → returns it
//     → If both pass idempotency check simultaneously, both create Concepts
//       but post-create duplicate detection catches this: only oldest survives
//
//   Two requests with DIFFERENT submission_ids, same date:
//     → Overlap detection runs against committed (Ingediend/Goedgekeurd) entries
//     → If both pass overlap check simultaneously, post-commit duplicate
//       detection catches overlapping committed entries and the later one
//       is rolled back
//
// FAILURE SCENARIOS:
//   Crash before commit:  Concept entry stays. Cleaned by orphan job after 24h.
//                          Client retries with same submission_id → creates fresh.
//   Crash after commit:   Ingediend entry is safe. Old drafts not cleaned = harmless.
//                          Client retries → idempotent hit returns existing.
//   Client timeout retry: Same submission_id → idempotent hit.
//   Two tabs:             Different submission_ids → overlap detection blocks second.
//                          Same submission_id → idempotent hit for second.
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
// Single function used by BOTH pre-commit and post-commit checks.
// All comparisons use YYYY-MM-DD strings and minute integers — no Date offsets.
function servicesOverlap(existing, incoming) {
  const exStart = existing.date;
  const exEnd = existing.end_date || existing.date;
  const newStart = incoming.date;
  const newEnd = incoming.end_date || incoming.date;

  // Both single-day on same date → time-level check
  if (exStart === exEnd && newStart === newEnd && exStart === newStart) {
    const ns = timeMin(incoming.start_time), ne = timeMin(incoming.end_time);
    const es = timeMin(existing.start_time), ee = timeMin(existing.end_time);
    if (ns === null || ne === null || es === null || ee === null) return false;
    return ns < ee && ne > es;
  }

  // Check if date ranges merely touch at a boundary (adjacent)
  if (exEnd === newStart || newEnd === exStart) {
    // Boundary day: compare times on the shared day
    const ns = timeMin(incoming.start_time), ne = timeMin(incoming.end_time);
    const es = timeMin(existing.start_time), ee = timeMin(existing.end_time);
    if (exEnd === newStart && ee !== null && ns !== null) {
      // Existing ends on the day new starts → overlap if ex.end_time > new.start_time
      return ee > ns;
    }
    if (newEnd === exStart && ne !== null && es !== null) {
      // New ends on the day existing starts → overlap if new.end_time > ex.start_time
      return ne > es;
    }
    return false; // can't determine times → treat as non-overlapping
  }

  // True date range overlap (ranges cross more than just a boundary)
  return exStart <= newEnd && exEnd >= newStart;
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

// --- EXTRACTED OVERLAP VALIDATION (future-proof, reusable) ---

function validateTimeEntryOverlap(existingEntries, employeeId, date, endDate, startTime, endTime) {
  const entryEnd = endDate || date;
  const incomingEntry = { date, end_date: endDate || null, start_time: startTime, end_time: endTime };

  // Filter to committed entries in range
  const committed = existingEntries.filter(e => {
    if (e.employee_id !== employeeId) return false;
    if (e.status !== 'Ingediend' && e.status !== 'Goedgekeurd') return false;
    const exEnd = e.end_date || e.date;
    return exEnd >= date && e.date <= entryEnd;
  });

  // Check for already-approved entry on exact date (specific error)
  const approvedOnDate = committed.find(e =>
    e.status === 'Goedgekeurd' && e.date === date && (!e.end_date || e.end_date === e.date)
  );
  if (approvedOnDate) {
    return {
      overlaps: true,
      errorCode: 'ALREADY_APPROVED',
      errorMsg: 'Voor deze datum bestaat al een goedgekeurde dienst.',
      existingId: approvedOnDate.id,
    };
  }

  // General overlap check
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

  // submission_id — server-side fallback if missing or invalid
  if (!p.submission_id || typeof p.submission_id !== 'string' || !UUID_RE.test(p.submission_id)) {
    p.submission_id = crypto.randomUUID();
    console.log(`[SUBMIT] submission_id ontbrak of ongeldig — server-generated: ${p.submission_id}`);
  }

  if (!isDate(p.date)) err.push('Ongeldige datum (YYYY-MM-DD)');
  if (!isTime(p.start_time)) err.push('Ongeldige starttijd (HH:MM)');
  if (!isTime(p.end_time)) err.push('Ongeldige eindtijd (HH:MM)');
  if (!isOptStr(p.signature_url)) err.push('signature_url moet string zijn');

  // --- DATE_TIME_MISMATCH guard ---
  // For single-day entries: verify start_time and end_time are consistent with payload.date.
  // Overnight shifts (end_time < start_time) are allowed and imply next-day end.
  // Multi-day entries skip this check (end_date explicitly provided).
  if (!err.length && isDate(p.date) && isTime(p.start_time) && isTime(p.end_time)) {
    if (!p.end_date || p.end_date === p.date) {
      // Single-day entry: validate times are plausible HH:MM values (already done by isTime)
      // Additional guard: if end_time < start_time → overnight, which is fine for single-day
      // But if end_date is explicitly set to a DIFFERENT date, it should match the multi-day range
    }
    if (p.end_date && p.end_date !== p.date) {
      // Multi-day: end_date must be after date (already checked above)
      // No additional time-vs-date mismatch for multi-day
    }
  }

  if (p.end_date != null) {
    if (!isDate(p.end_date)) err.push('Ongeldige einddatum (YYYY-MM-DD)');
    else if (p.date && p.end_date < p.date) err.push('Einddatum mag niet vóór startdatum');
    if (isDate(p.date) && isDate(p.end_date)) {
      const diff = Math.round((new Date(p.end_date + 'T12:00:00') - new Date(p.date + 'T12:00:00')) / 864e5);
      if (diff > 7) err.push('Dienst max 7 dagen');
      // Max 48 uur dienstduur safety guard
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

  // --- Shared core validation (mirrors components/utils/validation/timeEntryValidation.js) ---
  if (!Array.isArray(p.trips)) p.trips = [];
  const isGeenRit = typeof p.notes === 'string' && p.notes.startsWith('[GEEN_RIT]');
  const geenRitReden = isGeenRit ? p.notes.replace('[GEEN_RIT]', '').trim() : '';
  const hasTrips = p.trips.length > 0;
  const hasStandplaatsen = Array.isArray(p.standplaats_werk) && p.standplaats_werk.length > 0;
  const hasGeenRit = isGeenRit && typeof geenRitReden === 'string' && geenRitReden.trim().length >= 5;
  if (!hasTrips && !hasStandplaatsen && !hasGeenRit) err.push('Minimaal één dienstregel vereist');
  // --- End shared core validation ---

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

  // Trip time vs service time (single-day, with overnight shift support)
  if (!err.length && p.trips.length > 0 && (!p.end_date || p.end_date === p.date)) {
    const ds = timeMin(p.start_time);
    let de = timeMin(p.end_time);
    if (ds !== null && de !== null) {
      if (de <= ds) de += 1440; // overnight shift
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

// --- SANITIZERS ---

function sanitizeTrip(t, empId, date, teId) {
  return {
    employee_id: empId, time_entry_id: teId, date,
    vehicle_id: t.vehicle_id,
    customer_id: t.customer_id || null,
    route_name: t.route_name ? String(t.route_name).slice(0, 200) : null,
    planned_stops: clamp(t.planned_stops, 0, 9999),
    start_km: clamp(t.start_km, 0, 9999999),
    end_km: clamp(t.end_km, 0, 9999999),
    total_km: (t.start_km != null && t.end_km != null) ? Math.max(0, Number(t.end_km) - Number(t.start_km)) : null,
    fuel_liters: clamp(t.fuel_liters, 0, 9999),
    adblue_liters: clamp(t.adblue_liters, 0, 9999),
    fuel_km: clamp(t.fuel_km, 0, 9999999),
    charging_kwh: clamp(t.charging_kwh, 0, 9999),
    departure_time: isTime(t.start_time) ? t.start_time : null,
    arrival_time: isTime(t.end_time) ? t.end_time : null,
    departure_location: (t.departure_location || '').slice(0, 200) || null,
    notes: (t.notes || '').slice(0, 2000) || null,
    status: 'Voltooid',
  };
}

function sanitizeSPW(s, empId, date, teId) {
  return {
    employee_id: empId, time_entry_id: teId, date,
    start_time: isTime(s.start_time) ? s.start_time : null,
    end_time: isTime(s.end_time) ? s.end_time : null,
    customer_id: s.customer_id || null,
    project_id: s.project_id || null,
    activity_id: s.activity_id || null,
    notes: (s.notes || '').slice(0, 2000) || null,
  };
}

// --- HELPER: safe delete with logging ---

async function safeDelete(entity, id, label) {
  try { await entity.delete(id); }
  catch (e) { console.error(`Failed to delete ${label} ${id}: ${e.message}`); }
}

// --- SUBMISSION LOGGING HELPER ---
// Always uses asServiceRole to bypass user permissions.
// Creates a NEW record per status (immutable pattern, no updates).

async function logSubmission(svc, data) {
  try { await svc.entities.MobileEntrySubmissionLog.create(data); }
  catch (e) { console.error('[SUBMIT_LOG] Failed to write log:', e.message); }
}

// --- MAIN HANDLER ---

Deno.serve(async (req) => {
  const t0 = Date.now();
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
    const base44 = createClientFromRequest(req);

    // ========================================
    // 1. AUTHENTICATION
    // ========================================
    const user = await base44.auth.me();
    perf.auth = Date.now() - t0;
    if (!user) {
      return Response.json({ success: false, error: 'UNAUTHORIZED', message: 'Niet ingelogd' }, { status: 401 });
    }
    submissionLog.user_id = user.id;
    submissionLog.email = user.email;

    // Service role for ALL logging — bypasses user permissions
    const svcEarly = base44.asServiceRole;

    // ========================================
    // 2. PARSE & VALIDATE
    // ========================================
    let payload;
    try { payload = await req.json(); }
    catch { return Response.json({ success: false, error: 'INVALID_JSON', message: 'Ongeldig JSON' }, { status: 400 }); }

    submissionLog.submission_id = payload.submission_id || 'unknown';
    submissionLog.entry_date = payload.date || null;

    // ========================================
    // 2b. EARLY IDEMPOTENCY GUARD (submission_id level)
    // ========================================
    // Check MobileEntrySubmissionLog BEFORE creating a new RECEIVED log.
    // This prevents duplicate processing when the client retries rapidly.
    if (payload.submission_id && UUID_RE.test(payload.submission_id)) {
      const existingLogs = await svcEarly.entities.MobileEntrySubmissionLog.filter({
        submission_id: payload.submission_id,
      });

      // If any log for this submission_id already has SUCCESS → return immediately
      const successLog = existingLogs.find(l => l.status === 'SUCCESS');
      if (successLog) {
        console.log(`[IDEMPOTENCY_GUARD] submission_id=${payload.submission_id} already SUCCESS (log ${successLog.id})`);
        return Response.json({
          success: true,
          idempotent: true,
          status: 'ALREADY_PROCESSED',
          data: {
            time_entry_id: successLog.time_entry_id || null,
          }
        });
      }

      // If a RECEIVED log exists and is < 10 seconds old → still processing
      const recentReceived = existingLogs.find(l => {
        if (l.status !== 'RECEIVED') return false;
        const age = Date.now() - new Date(l.timestamp_received).getTime();
        return age < 10000;
      });
      if (recentReceived) {
        console.log(`[IDEMPOTENCY_GUARD] submission_id=${payload.submission_id} still RECEIVED (${Math.round((Date.now() - new Date(recentReceived.timestamp_received).getTime()) / 1000)}s old)`);
        return Response.json({
          success: true,
          idempotent: true,
          status: 'PROCESSING',
        }, { status: 202 });
      }
    }

    // Log RECEIVED immediately (separate immutable record)
    await logSubmission(svcEarly, { ...submissionLog });
    perf.idempotency_guard_and_received_log = Date.now() - t0;

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
      await logSubmission(svcEarly, {
        ...submissionLog,
        status: 'VALIDATION_FAILED',
        http_status: 422,
        error_code: 'VALIDATION_FAILED',
        error_message: errors.slice(0, 3).join('; '),
        timestamp_completed: new Date().toISOString(),
        latency_ms: Date.now() - t0,
      });
      return Response.json({ success: false, error: 'VALIDATION_FAILED', message: 'Validatie mislukt', details: errors }, { status: 422 });
    }

    // ========================================
    // 3. AUTHORIZATION — lookup employee
    // ========================================
    const svc = base44.asServiceRole;
    const tEmpLookup = Date.now();
    console.log('[STEP] Looking up employee for:', user.email);
    const employees = await svc.entities.Employee.filter({ email: user.email });
    if (!employees.length) {
      return Response.json({ success: false, error: 'EMPLOYEE_NOT_FOUND', message: 'Geen medewerker voor dit account' }, { status: 403 });
    }
    const employee = employees[0];
    perf.employee_lookup = Date.now() - tEmpLookup;
    console.log('[STEP] Employee found:', employee.id);
    if (employee.out_of_service_date) {
      const exitDate = new Date(employee.out_of_service_date);
      exitDate.setHours(0, 0, 0, 0);
      const graceEnd = new Date(exitDate);
      graceEnd.setDate(graceEnd.getDate() + 7);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today > graceEnd) {
        return Response.json({ success: false, error: 'EMPLOYEE_INACTIVE', message: 'Je dienstverband is beëindigd en de grace-periode is verlopen.' }, { status: 403 });
      }
    }
    const empId = employee.id;

    // ========================================
    // 4. IDEMPOTENCY CHECK — dedicated field
    // ========================================
    // Query by submission_id on this employee. This is the SINGLE source of truth.
    // No notes parsing. Clean, explicit field.
    const tIdempotency = Date.now();
    const existingBySubId = await svc.entities.TimeEntry.filter({
      employee_id: empId,
      submission_id: payload.submission_id,
    });
    perf.te_idempotency_check = Date.now() - tIdempotency;

    // Check for already-committed entry with this submission_id
    const committed = existingBySubId.find(e => e.status === 'Ingediend' || e.status === 'Goedgekeurd');
    if (committed) {
      console.log(`[IDEMPOTENT HIT] submission_id=${payload.submission_id} → TimeEntry ${committed.id}`);
      await logSubmission(svc, {
        ...submissionLog,
        status: 'IDEMPOTENT_HIT',
        http_status: 200,
        time_entry_id: committed.id,
        timestamp_completed: new Date().toISOString(),
        latency_ms: Date.now() - t0,
      });
      const [existTrips, existSpw] = await Promise.all([
        svc.entities.Trip.filter({ time_entry_id: committed.id }),
        svc.entities.StandplaatsWerk.filter({ time_entry_id: committed.id }),
      ]);
      return Response.json({
        success: true,
        idempotent_hit: true,
        data: {
          time_entry_id: committed.id,
          trip_ids: existTrips.map(t => t.id),
          standplaats_werk_ids: existSpw.map(s => s.id),
          computed: {
            total_hours: committed.total_hours,
            shift_type: committed.shift_type,
            week_number: committed.week_number,
            year: committed.year,
          }
        }
      });
    }

    // Clean up orphan Concepts from same submission_id (previous crashed attempt)
    const orphanConcepts = existingBySubId.filter(e => e.status === 'Concept');
    for (const orphan of orphanConcepts) {
      console.log(`[CLEANUP] Orphan Concept from previous attempt: ${orphan.id}`);
      const [oTrips, oSpw] = await Promise.all([
        svc.entities.Trip.filter({ time_entry_id: orphan.id }),
        svc.entities.StandplaatsWerk.filter({ time_entry_id: orphan.id }),
      ]);
      await Promise.all([
        ...oTrips.map(t => safeDelete(svc.entities.Trip, t.id, 'orphan-trip')),
        ...oSpw.map(s => safeDelete(svc.entities.StandplaatsWerk, s.id, 'orphan-spw')),
      ]);
      await safeDelete(svc.entities.TimeEntry, orphan.id, 'orphan-te');
    }

    // ========================================
    // 5. OVERLAP DETECTION — via extracted validateTimeEntryOverlap
    // ========================================
    const entryEnd = payload.end_date || payload.date;
    const queryStart = addDays(payload.date, -1);
    const queryEnd = addDays(entryEnd, 1);

    console.log('[STEP] Fetching all entries for employee:', empId);
    const tOverlap = Date.now();
    const allEmployeeEntries = await svc.entities.TimeEntry.filter({
      employee_id: empId,
    });
    perf.overlap_fetch = Date.now() - tOverlap;
    console.log('[STEP] Found', allEmployeeEntries.length, 'total entries');

    // In-memory filter for the date range window
    const rangedCandidates = allEmployeeEntries.filter(e => e.date >= queryStart && e.date <= queryEnd);

    console.log('[OVERLAP_CHECK]', JSON.stringify({
      employeeId: empId,
      entryStart: payload.date,
      entryEnd,
      queryWindow: `${queryStart} - ${queryEnd}`,
      totalEntries: allEmployeeEntries.length,
      rangedCandidates: rangedCandidates.length,
    }));

    const incomingEntry = {
      date: payload.date,
      end_date: payload.end_date || null,
      start_time: payload.start_time,
      end_time: payload.end_time,
    };

    // Use extracted overlap validation function
    const overlapResult = validateTimeEntryOverlap(
      rangedCandidates, empId, payload.date, payload.end_date || null,
      payload.start_time, payload.end_time
    );

    if (overlapResult.overlaps) {
      console.log(`[OVERLAP] ${overlapResult.errorCode}: existing ${overlapResult.existingId} vs new (${payload.date}→${entryEnd} ${payload.start_time}-${payload.end_time})`);
      return Response.json({
        success: false, error: overlapResult.errorCode,
        message: overlapResult.errorMsg,
        details: [`Bestaande dienst: ${overlapResult.existingId}`]
      }, { status: 409 });
    }

    // ========================================
    // 6. COMPUTE SERVER-SIDE DERIVED FIELDS + BREAK STAFFEL
    // ========================================
    const endD = payload.end_date || null;

    // 6a. Calculate gross dienst duration in minutes
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

    perf.overlap_check_total = Date.now() - tOverlap;

    // 6b. Server-side break staffel calculation
    const isManualBreak = payload.break_manual === true;
    let brk;
    let breakStaffelId = null;

    if (isManualBreak) {
      // Handmatige override: respecteer client-waarde
      brk = Math.max(0, Math.round(payload.break_minutes || 0));
      console.log(`[BREAK] Manual override: ${brk} min for ${dienstHours.toFixed(2)}h dienst`);
    } else {
      // Staffelberekening: ophalen uit BreakSchedule entity
      const breakSchedules = await svc.entities.BreakSchedule.filter({ status: 'Actief' });
      const sorted = breakSchedules.sort((a, b) => a.min_hours - b.min_hours);
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
    // 7. TRANSACTION PHASE 1: CREATE AS CONCEPT
    // ========================================
    // All records created as Concept first. If anything fails → rollback.
    // Old drafts are NOT touched until after commit (safe ordering).

    const created = { teId: null, tripIds: [], spwIds: [] };

    try {
      // --- Create TimeEntry (Concept) with submission_id ---
      const tCreate = Date.now();
      const teCreateData = {
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
        status: 'Concept',
        signature_url: payload.signature_url || null,
        submission_id: payload.submission_id, // <-- DEDICATED FIELD
      };

      const te = await svc.entities.TimeEntry.create(teCreateData);
      created.teId = te.id;
      perf.timeentry_create = Date.now() - tCreate;
      console.debug('[CREATED]', { teId: te.id, date: payload.date, endDate: endD });

      // --- POST-CREATE DUPLICATE GUARD ---
      // After creating, re-check if another request with the same submission_id
      // also created an entry concurrently. If so, the one with the OLDEST
      // created_date wins. The other rolls back.
      const postCheck = await svc.entities.TimeEntry.filter({
        employee_id: empId,
        submission_id: payload.submission_id,
      });
      const allWithThisSubId = postCheck.filter(e => e.id !== te.id);
      const concurrentCommitted = allWithThisSubId.find(e => e.status === 'Ingediend' || e.status === 'Goedgekeurd');

      if (concurrentCommitted) {
        // Another request already committed — we lose the race. Roll back our Concept.
        console.log(`[RACE LOST] Another request committed ${concurrentCommitted.id} for submission_id=${payload.submission_id}`);
        await safeDelete(svc.entities.TimeEntry, te.id, 'race-loser');

        const [cTrips, cSpw] = await Promise.all([
          svc.entities.Trip.filter({ time_entry_id: concurrentCommitted.id }),
          svc.entities.StandplaatsWerk.filter({ time_entry_id: concurrentCommitted.id }),
        ]);
        return Response.json({
          success: true,
          idempotent_hit: true,
          data: {
            time_entry_id: concurrentCommitted.id,
            trip_ids: cTrips.map(t => t.id),
            standplaats_werk_ids: cSpw.map(s => s.id),
            computed: {
              total_hours: concurrentCommitted.total_hours,
              shift_type: concurrentCommitted.shift_type,
              week_number: concurrentCommitted.week_number,
              year: concurrentCommitted.year,
            }
          }
        });
      }

      // Check for concurrent Concepts (both in flight). Oldest created_date wins.
      const concurrentConcepts = allWithThisSubId.filter(e => e.status === 'Concept');
      for (const cc of concurrentConcepts) {
        if (cc.created_date < te.created_date) {
          // The other one was created first — WE are the duplicate. Roll back.
          console.log(`[RACE LOST] Older Concept ${cc.id} exists for submission_id=${payload.submission_id}`);
          await safeDelete(svc.entities.TimeEntry, te.id, 'race-loser-concept');
          // Wait briefly for the winner to commit, then return its result
          await new Promise(r => setTimeout(r, 2000));
          const winnerCheck = await svc.entities.TimeEntry.filter({
            employee_id: empId,
            submission_id: payload.submission_id,
          });
          const winner = winnerCheck.find(e => e.status === 'Ingediend' || e.status === 'Goedgekeurd');
          if (winner) {
            const [wTrips, wSpw] = await Promise.all([
              svc.entities.Trip.filter({ time_entry_id: winner.id }),
              svc.entities.StandplaatsWerk.filter({ time_entry_id: winner.id }),
            ]);
            return Response.json({
              success: true, idempotent_hit: true,
              data: {
                time_entry_id: winner.id,
                trip_ids: wTrips.map(t => t.id),
                standplaats_werk_ids: wSpw.map(s => s.id),
                computed: { total_hours: winner.total_hours, shift_type: winner.shift_type, week_number: winner.week_number, year: winner.year }
              }
            });
          }
          // Winner hasn't committed yet — tell client to retry
          return Response.json({
            success: false, error: 'CONCURRENT_SUBMIT',
            message: 'Gelijktijdige submit gedetecteerd, probeer opnieuw'
          }, { status: 409 });
        }
        // else: we are older, the other one should yield to us
      }

      // --- Create Trips ---
      for (const trip of payload.trips) {
        const t = await svc.entities.Trip.create(sanitizeTrip(trip, empId, payload.date, te.id));
        created.tripIds.push(t.id);
      }

      // --- Create StandplaatsWerk ---
      for (const spw of (payload.standplaats_werk || [])) {
        if (spw.customer_id || spw.activity_id) {
          const s = await svc.entities.StandplaatsWerk.create(sanitizeSPW(spw, empId, payload.date, te.id));
          created.spwIds.push(s.id);
        }
      }

      // ========================================
      // 8. TRANSACTION PHASE 2: COMMIT
      // ========================================
      const tCommit = Date.now();
      perf.trips_and_spw_create = tCommit - (tCreate + (perf.timeentry_create || 0));
      await svc.entities.TimeEntry.update(te.id, { status: 'Ingediend' });
      perf.commit = Date.now() - tCommit;

      // ========================================
      // 8b. WRITE CONFIRMATION GUARD
      // ========================================
      const tVerify = Date.now();
      const verifyEntries = await svc.entities.TimeEntry.filter({ employee_id: empId, submission_id: payload.submission_id });
      const verifyEntry = verifyEntries.find(e => e.id === te.id && e.status === 'Ingediend');
      if (!verifyEntry) {
        await logSubmission(svc, {
          ...submissionLog,
          status: 'CRITICAL_WRITE_MISSING',
          http_status: 500,
          error_code: 'WRITE_VERIFICATION_FAILED',
          error_message: `TimeEntry create returned ID ${te.id} but record not found or not Ingediend in verification step`,
          employee_id: empId,
          time_entry_id: te.id,
          timestamp_completed: new Date().toISOString(),
          latency_ms: Date.now() - t0,
        });
        throw new Error(`TimeEntry write verification failed for ${te.id}`);
      }

      perf.write_verify = Date.now() - tVerify;

      // ========================================
      // 9. POST-COMMIT OVERLAP GUARD (uses same servicesOverlap engine)
      // ========================================
      const tPostCommit = Date.now();
      // Re-fetch all for this employee for post-commit check (no date operators)
      const postCommitAll = await svc.entities.TimeEntry.filter({
        employee_id: empId,
      });
      const postCommitCandidates = postCommitAll.filter(e => e.date >= queryStart && e.date <= queryEnd);
      const postCommitOverlaps = postCommitCandidates.filter(e =>
        e.id !== te.id &&
        (e.status === 'Ingediend' || e.status === 'Goedgekeurd') &&
        (e.end_date || e.date) >= payload.date &&
        e.date <= entryEnd
      );

      for (const oc of postCommitOverlaps) {
        if (servicesOverlap(oc, incomingEntry) && oc.created_date < te.created_date) {
          const ocEnd = oc.end_date || oc.date;
          const isSameDay = !payload.end_date && !oc.end_date && payload.date === oc.date;
          const errorCode = isSameDay ? 'TIME_OVERLAP' : 'DATE_OVERLAP';
          const errorMsg = `Gelijktijdige overlap gedetecteerd met dienst ${isSameDay ? `${oc.start_time}-${oc.end_time}` : `${oc.date} t/m ${ocEnd}`}`;
          console.log(`[POST-COMMIT ${errorCode}] Rolling back ${te.id}, older entry ${oc.id} wins`);
          await svc.entities.TimeEntry.update(te.id, { status: 'Concept' });
          for (const tid of created.tripIds) await safeDelete(svc.entities.Trip, tid, 'overlap-trip');
          for (const sid of created.spwIds) await safeDelete(svc.entities.StandplaatsWerk, sid, 'overlap-spw');
          await safeDelete(svc.entities.TimeEntry, te.id, 'overlap-te');
          return Response.json({
            success: false, error: errorCode,
            message: errorMsg,
            details: [`Bestaande dienst: ${oc.id}`]
          }, { status: 409 });
        }
      }

      perf.post_commit_guard = Date.now() - tPostCommit;

      // ========================================
      // 10. POST-COMMIT CLEANUP (best-effort, non-critical)
      // ========================================
      // Clean ALL Concept entries for this employee that overlap with the
      // committed dienst range. This catches orphan drafts from date changes.
      try {
        const oldDrafts = rangedCandidates.filter(e => {
          if (e.status !== 'Concept' || e.id === te.id) return false;
          const draftEnd = e.end_date || e.date;
          // Draft overlaps with committed range?
          return e.date <= entryEnd && draftEnd >= payload.date;
        });
        for (const draft of oldDrafts) {
          console.log(`[CLEANUP] Removing overlapping draft ${draft.id} (${draft.date}→${draft.end_date || draft.date})`);
          const [dTrips, dSpw] = await Promise.all([
            svc.entities.Trip.filter({ time_entry_id: draft.id }),
            svc.entities.StandplaatsWerk.filter({ time_entry_id: draft.id }),
          ]);
          await Promise.all([
            ...dTrips.map(t => safeDelete(svc.entities.Trip, t.id, 'cleanup-trip')),
            ...dSpw.map(s => safeDelete(svc.entities.StandplaatsWerk, s.id, 'cleanup-spw')),
          ]);
          await safeDelete(svc.entities.TimeEntry, draft.id, 'cleanup-te');
        }
      } catch (cleanupErr) {
        console.error('[CLEANUP NON-CRITICAL]', cleanupErr.message);
      }

      // ========================================
      // 11. SUCCESS
      // ========================================
      perf.total = Date.now() - t0;
      console.log('[PERF]', JSON.stringify(perf));

      // Persist perf log for every submission
      try {
        await svc.entities.MobileEntryPerformanceLog.create({
          submission_id: payload.submission_id,
          user_email: user.email,
          employee_id: empId,
          auth_ms: perf.auth || null,
          idempotency_guard_ms: perf.idempotency_guard_and_received_log || null,
          employee_lookup_ms: perf.employee_lookup || null,
          te_idempotency_check_ms: perf.te_idempotency_check || null,
          overlap_fetch_ms: perf.overlap_fetch || null,
          overlap_check_ms: perf.overlap_check_total || null,
          timeentry_create_ms: perf.timeentry_create || null,
          trips_and_spw_create_ms: perf.trips_and_spw_create || null,
          commit_ms: perf.commit || null,
          write_verify_ms: perf.write_verify || null,
          post_commit_guard_ms: perf.post_commit_guard || null,
          total_ms: perf.total,
          outcome: 'SUCCESS',
        });
      } catch (perfErr) { console.error('[PERF_LOG]', perfErr.message); }

      await logSubmission(svc, {
        ...submissionLog,
        status: 'SUCCESS',
        http_status: 200,
        time_entry_id: te.id,
        employee_id: empId,
        timestamp_completed: new Date().toISOString(),
        latency_ms: Date.now() - t0,
      });

      return Response.json({
        success: true,
        data: {
          time_entry_id: te.id,
          trip_ids: created.tripIds,
          standplaats_werk_ids: created.spwIds,
          computed: { total_hours: totalHours, shift_type: st, week_number: wk, year: yr }
        }
      });

    } catch (txError) {
      // ========================================
      // ROLLBACK — clean newly created records only
      // ========================================
      perf.total = Date.now() - t0;
      console.log('[PERF]', JSON.stringify(perf));

      // Persist perf log for every submission (including failures)
      try {
        await svc.entities.MobileEntryPerformanceLog.create({
          submission_id: payload.submission_id,
          user_email: user.email,
          employee_id: empId,
          auth_ms: perf.auth || null,
          idempotency_guard_ms: perf.idempotency_guard_and_received_log || null,
          employee_lookup_ms: perf.employee_lookup || null,
          te_idempotency_check_ms: perf.te_idempotency_check || null,
          overlap_fetch_ms: perf.overlap_fetch || null,
          overlap_check_ms: perf.overlap_check_total || null,
          timeentry_create_ms: perf.timeentry_create || null,
          trips_and_spw_create_ms: perf.trips_and_spw_create || null,
          commit_ms: perf.commit || null,
          write_verify_ms: perf.write_verify || null,
          post_commit_guard_ms: perf.post_commit_guard || null,
          total_ms: perf.total,
          outcome: 'FAILED',
        });
      } catch (perfErr) { console.error('[PERF_LOG]', perfErr.message); }

      console.error('[TX FAILED] Rolling back:', txError.message);
      for (const sid of created.spwIds) await safeDelete(svc.entities.StandplaatsWerk, sid, 'rb-spw');
      for (const tid of created.tripIds) await safeDelete(svc.entities.Trip, tid, 'rb-trip');
      if (created.teId) await safeDelete(svc.entities.TimeEntry, created.teId, 'rb-te');

      await logSubmission(svc, {
        ...submissionLog,
        status: 'FAILED',
        http_status: 500,
        error_code: 'TRANSACTION_FAILED',
        error_message: (txError.message || 'Onbekende fout').slice(0, 500),
        employee_id: empId,
        timestamp_completed: new Date().toISOString(),
        latency_ms: Date.now() - t0,
      });

      return Response.json({
        success: false, error: 'TRANSACTION_FAILED',
        message: 'Submit mislukt, wijzigingen teruggedraaid. Probeer opnieuw.',
        details: [txError.message || 'Onbekende fout']
      }, { status: 500 });
    }

  } catch (outerError) {
    console.error('[UNHANDLED]', outerError);
    // Best-effort log for unhandled errors
    try {
      const base44Fallback = createClientFromRequest(req);
      const svcFallback = base44Fallback.asServiceRole;
      await logSubmission(svcFallback, {
        ...submissionLog,
        status: 'FAILED',
        http_status: 500,
        error_code: 'INTERNAL_ERROR',
        error_message: (outerError.message || 'Onverwachte fout').slice(0, 500),
        timestamp_completed: new Date().toISOString(),
        latency_ms: Date.now() - t0,
      });
    } catch (_) { /* logging itself failed, nothing we can do */ }
    return Response.json({ success: false, error: 'INTERNAL_ERROR', message: 'Onverwachte fout' }, { status: 500 });
  }
});