// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: ADMIN_ONLY                                       ║
// ║ Called by: Admin via TimeTracking page                           ║
// ║ Auth: Admin only                                                 ║
// ║ Purpose: Create + approve TimeEntry WITH overlap validation      ║
// ║ Uses same overlap engine as submitTimeEntry v5.1                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// --- Shared overlap engine (identical to submitTimeEntry v5.1) ---

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
function isTime(t) { return typeof t === 'string' && TIME_RE.test(t); }
function timeMin(t) { if (!isTime(t)) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; }

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function effectiveEndDate(service) {
  if (service.end_date && service.end_date !== service.date) return service.end_date;
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

  if (exStart < newEnd && exEnd > newStart) return true;

  const ns = timeMin(incoming.start_time), ne = timeMin(incoming.end_time);
  const es = timeMin(existing.start_time), ee = timeMin(existing.end_time);
  if (exEnd === newStart && ee !== null && ns !== null) return ee > ns;
  if (newEnd === exStart && ne !== null && es !== null) return ne > es;
  return false;
}

function validateTimeEntryOverlap(existingEntries, employeeId, date, endDate, startTime, endTime, excludeId) {
  const incomingEntry = { date, end_date: endDate || null, start_time: startTime, end_time: endTime };
  const newEffEnd = effectiveEndDate(incomingEntry);

  const committed = existingEntries.filter(e => {
    if (e.employee_id !== employeeId) return false;
    if (excludeId && e.id === excludeId) return false;
    if (e.status !== 'Ingediend' && e.status !== 'Goedgekeurd') return false;
    const exEffEnd = effectiveEndDate(e);
    return exEffEnd >= date && e.date <= newEffEnd;
  });

  const approvedOnDate = committed.find(e =>
    e.status === 'Goedgekeurd' && e.date === date && (!e.end_date || e.end_date === e.date)
  );
  if (approvedOnDate && (!excludeId || approvedOnDate.id !== excludeId)) {
    return {
      overlaps: true,
      errorCode: 'ALREADY_APPROVED',
      errorMsg: 'Voor deze datum bestaat al een goedgekeurde dienst.',
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

// --- MAIN HANDLER ---

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { entries } = payload;

    // Support single entry or array of entries (for overnight split)
    const entryList = Array.isArray(entries) ? entries : [payload];

    if (entryList.length === 0) {
      return Response.json({ success: false, error: 'NO_ENTRIES', message: 'Geen entries om aan te maken' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const createdIds = [];

    for (const entryData of entryList) {
      const { employee_id, date, end_date, start_time, end_time } = entryData;

      if (!employee_id || !date) {
        return Response.json({ success: false, error: 'VALIDATION_FAILED', message: 'employee_id en date zijn verplicht' }, { status: 422 });
      }

      // Skip overlap check for non-worked entries (no start/end time)
      if (start_time && end_time) {
        // Fetch all entries for this employee in relevant date range
        const effectiveEnd = end_date || date;
        const queryStart = addDays(date, -1);
        const queryEnd = addDays(effectiveEnd, 1);

        const allEntries = await svc.entities.TimeEntry.filter({ employee_id });
        const rangedCandidates = allEntries.filter(e => e.date >= queryStart && e.date <= queryEnd);

        const overlapResult = validateTimeEntryOverlap(
          rangedCandidates, employee_id, date, end_date || null,
          start_time, end_time, null
        );

        if (overlapResult.overlaps) {
          console.log(`[ADMIN_CREATE] Overlap blocked: ${overlapResult.errorCode} for ${employee_id} on ${date}`);
          return Response.json({
            success: false,
            error: overlapResult.errorCode,
            message: overlapResult.errorMsg,
            details: [`Bestaande dienst: ${overlapResult.existingId}`]
          }, { status: 409 });
        }
      }

      // Create the entry as Ingediend
      const createData = { ...entryData, status: 'Ingediend' };
      delete createData.entries; // remove wrapper if present
      const created = await svc.entities.TimeEntry.create(createData);
      createdIds.push(created.id);

      // Approve immediately
      await svc.entities.TimeEntry.update(created.id, {
        status: 'Goedgekeurd',
        approved_by: user.email,
        approved_date: new Date().toISOString(),
      });
    }

    return Response.json({ success: true, ids: createdIds });
  } catch (error) {
    console.error('[adminCreateTimeEntry]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});