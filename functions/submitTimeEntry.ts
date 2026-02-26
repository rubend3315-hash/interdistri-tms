// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Employee via mobile app (MobileEntry page)            ║
// ║ Auth: User session (any authenticated employee)                  ║
// ║ DO NOT USE RAW ENTITY CALLS — USE tenantService for tenant data  ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// submitTimeEntry v3.1 — Enterprise-grade atomic submission (redeployed 2026-02-23)
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

  if (p.end_date != null) {
    if (!isDate(p.end_date)) err.push('Ongeldige einddatum (YYYY-MM-DD)');
    else if (p.date && p.end_date < p.date) err.push('Einddatum mag niet vóór startdatum');
    if (isDate(p.date) && isDate(p.end_date)) {
      const diff = Math.round((new Date(p.end_date + 'T12:00:00') - new Date(p.date + 'T12:00:00')) / 864e5);
      if (diff > 7) err.push('Dienst max 7 dagen');
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

  try {
    const base44 = createClientFromRequest(req);

    // ========================================
    // 1. AUTHENTICATION
    // ========================================
    const user = await base44.auth.me();
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

    // Log RECEIVED immediately (separate immutable record)
    await logSubmission(svcEarly, { ...submissionLog });

    // DEBUG: Log incoming payload customer/project mapping
    console.log(`[SUBMIT_DEBUG] Payload keys: ${Object.keys(payload).join(', ')}`);
    console.log(`[SUBMIT_DEBUG] payload.customer_id: ${JSON.stringify(payload.customer_id)}`);
    console.log(`[SUBMIT_DEBUG] payload.project_id: ${JSON.stringify(payload.project_id)}`);
    console.log(`[SUBMIT_DEBUG] trips count: ${(payload.trips || []).length}`);
    (payload.trips || []).forEach((t, i) => {
      console.log(`[SUBMIT_DEBUG] trip[${i}].customer_id: ${JSON.stringify(t.customer_id)}, trip[${i}].project_id: ${JSON.stringify(t.project_id)}`);
    });
    console.log(`[SUBMIT_DEBUG] standplaats_werk count: ${(payload.standplaats_werk || []).length}`);
    (payload.standplaats_werk || []).forEach((s, i) => {
      console.log(`[SUBMIT_DEBUG] spw[${i}].customer_id: ${JSON.stringify(s.customer_id)}, spw[${i}].project_id: ${JSON.stringify(s.project_id)}`);
    });

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
    const employees = await svc.entities.Employee.filter({ email: user.email });
    if (!employees.length) {
      return Response.json({ success: false, error: 'EMPLOYEE_NOT_FOUND', message: 'Geen medewerker voor dit account' }, { status: 403 });
    }
    const employee = employees[0];
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
    const existingBySubId = await svc.entities.TimeEntry.filter({
      employee_id: empId,
      submission_id: payload.submission_id,
    });

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
    // 5. OVERLAP DETECTION — against committed entries
    // ========================================
    // Full range overlap: A.start <= B.end AND A.end >= B.start
    // We need to find ALL committed entries for this employee where:
    //   existing.date <= newEntryEnd  AND  existing.effectiveEnd >= newEntryStart
    //
    // Since end_date can be null (= single day, so effectiveEnd = date),
    // we query all entries where date <= entryEnd (covers the left side of the overlap formula).
    // The right side (existing end >= new start) is checked in-memory because
    // end_date is nullable and requires coalescing with date.
    //
    // Single query — no N+1, no intermediate dates missed.
    const entryEnd = payload.end_date || payload.date;

    const candidateEntries = await svc.entities.TimeEntry.filter({
      employee_id: empId,
      date: { $lte: entryEnd },
    });

    // Filter to committed entries whose effective end_date >= payload.date
    const committedOverlaps = candidateEntries.filter(e => {
      if (e.status !== 'Ingediend' && e.status !== 'Goedgekeurd') return false;
      const exEnd = e.end_date || e.date;
      return exEnd >= payload.date; // completes the range overlap check
    });

    for (const ex of committedOverlaps) {
      const exEnd = ex.end_date || ex.date;
      // Both are single-day entries on the same date → check time overlap
      if (!payload.end_date && !ex.end_date && payload.date === ex.date) {
        const ns = timeMin(payload.start_time), ne = timeMin(payload.end_time);
        const es = timeMin(ex.start_time), ee = timeMin(ex.end_time);
        if (ns !== null && ne !== null && es !== null && ee !== null && ns < ee && ne > es) {
          return Response.json({
            success: false, error: 'TIME_OVERLAP',
            message: `Overlapt met dienst ${ex.start_time}-${ex.end_time} op ${ex.date}`,
            details: [`Bestaande dienst: ${ex.id}`]
          }, { status: 409 });
        }
      } else {
        // At least one side is multi-day, date ranges overlap → block
        return Response.json({
          success: false, error: 'DATE_OVERLAP',
          message: `Overlapt met dienst ${ex.date} t/m ${exEnd}`,
          details: [`Bestaande dienst: ${ex.id}`]
        }, { status: 409 });
      }
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
      const te = await svc.entities.TimeEntry.create({
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
      });
      created.teId = te.id;

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
      await svc.entities.TimeEntry.update(te.id, { status: 'Ingediend' });

      // ========================================
      // 8b. WRITE CONFIRMATION GUARD
      // ========================================
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

      // ========================================
      // 9. POST-COMMIT OVERLAP GUARD
      // ========================================
      // Re-check for overlapping Ingediend entries AFTER our commit.
      // Uses the same broad range query as pre-commit check.
      const postCommitCandidates = await svc.entities.TimeEntry.filter({
        employee_id: empId,
        date: { $lte: entryEnd },
      });
      const postCommitOverlaps = postCommitCandidates.filter(e =>
        e.id !== te.id &&
        (e.status === 'Ingediend' || e.status === 'Goedgekeurd') &&
        (e.end_date || e.date) >= payload.date
      );

      for (const oc of postCommitOverlaps) {
        const ocEnd = oc.end_date || oc.date;
        let isOverlap = false;
        let errorCode = 'DATE_OVERLAP';
        let errorMsg = `Gelijktijdige overlap gedetecteerd met dienst ${oc.date} t/m ${ocEnd}`;

        if (!payload.end_date && !oc.end_date && payload.date === oc.date) {
          // Both single-day same date → time overlap check
          const ns = timeMin(payload.start_time), ne = timeMin(payload.end_time);
          const es = timeMin(oc.start_time), ee = timeMin(oc.end_time);
          if (ns !== null && ne !== null && es !== null && ee !== null && ns < ee && ne > es) {
            isOverlap = true;
            errorCode = 'TIME_OVERLAP';
            errorMsg = `Gelijktijdige overlap gedetecteerd met dienst ${oc.start_time}-${oc.end_time}`;
          }
        } else {
          // At least one multi-day, date ranges overlap
          isOverlap = true;
        }

        if (isOverlap && oc.created_date < te.created_date) {
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

      // ========================================
      // 10. POST-COMMIT CLEANUP (best-effort, non-critical)
      // ========================================
      // Safe: committed entry exists. Cleanup failures are logged, never fail the response.
      try {
        const oldDrafts = candidateEntries.filter(e => e.status === 'Concept' && e.id !== te.id && e.date === payload.date);
        for (const draft of oldDrafts) {
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