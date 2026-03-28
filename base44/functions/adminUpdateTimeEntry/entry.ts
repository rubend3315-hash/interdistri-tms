// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: ADMIN_ONLY                                       ║
// ║ Called by: Admin via TimeTracking page                           ║
// ║ Auth: Admin only                                                 ║
// ║ Purpose: Update TimeEntry WITH overlap validation (excl self)    ║
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

  // ALREADY_APPROVED check: only block if there's an actual time overlap
  const approvedOnDate = committed.find(e =>
    e.status === 'Goedgekeurd' && e.date === date && (!e.end_date || e.end_date === e.date)
    && servicesOverlap(e, incomingEntry)
  );
  if (approvedOnDate && (!excludeId || approvedOnDate.id !== excludeId)) {
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

// --- MAIN HANDLER ---

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { time_entry_id, data } = await req.json();

    if (!time_entry_id) {
      return Response.json({ success: false, error: 'MISSING_ID', message: 'time_entry_id is vereist' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // Fetch current entry
    let entry;
    try {
      entry = await svc.entities.TimeEntry.get(time_entry_id);
    } catch {
      return Response.json({ success: false, error: 'NOT_FOUND', message: 'TimeEntry niet gevonden' }, { status: 404 });
    }

    // Merge: use new values if provided, else keep existing
    const finalDate = data.date || entry.date;
    const finalEndDate = data.end_date !== undefined ? data.end_date : (entry.end_date || null);
    const finalStartTime = data.start_time !== undefined ? data.start_time : entry.start_time;
    const finalEndTime = data.end_time !== undefined ? data.end_time : entry.end_time;
    const finalEmployeeId = data.employee_id || entry.employee_id;

    // Only run overlap check if there are actual times (skip for verlof/atv/ziek)
    if (finalStartTime && finalEndTime) {
      const effectiveEnd = finalEndDate || finalDate;
      const queryStart = addDays(finalDate, -1);
      const queryEnd = addDays(effectiveEnd, 1);

      // Paginated fetch to work around SDK bug (>~40 records = corrupted response)
      const allEntries = [];
      let _skip = 0;
      const _PAGE = 20;
      while (true) {
        const page = await svc.entities.TimeEntry.filter({ employee_id: finalEmployeeId }, '-date', _PAGE, _skip);
        if (!Array.isArray(page) || page.length === 0) break;
        allEntries.push(...page);
        if (page.length < _PAGE) break;
        _skip += _PAGE;
      }
      const rangedCandidates = allEntries.filter(e => e.date >= queryStart && e.date <= queryEnd);

      const overlapResult = validateTimeEntryOverlap(
        rangedCandidates, finalEmployeeId, finalDate, finalEndDate,
        finalStartTime, finalEndTime, time_entry_id // exclude self
      );

      if (overlapResult.overlaps) {
        console.log(`[ADMIN_UPDATE] Overlap blocked: ${overlapResult.errorCode} for ${finalEmployeeId} on ${finalDate}`);
        return Response.json({
          success: false,
          error: overlapResult.errorCode,
          message: overlapResult.errorMsg,
          details: [`Bestaande dienst: ${overlapResult.existingId}`]
        }, { status: 409 });
      }
    }

    // Build update payload
    const updatePayload = { ...data };

    // If target status is Goedgekeurd, set approval fields
    if (data.status === 'Goedgekeurd') {
      updatePayload.approved_by = user.email;
      updatePayload.approved_date = new Date().toISOString();

      // If currently not Ingediend, first transition to Ingediend
      if (entry.status !== 'Ingediend' && entry.status !== 'Goedgekeurd') {
        await svc.entities.TimeEntry.update(time_entry_id, { status: 'Ingediend' });
      }
    }

    await svc.entities.TimeEntry.update(time_entry_id, updatePayload);

    return Response.json({ success: true, time_entry_id });
  } catch (error) {
    console.error('[adminUpdateTimeEntry]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});