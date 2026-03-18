// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Admin via frontend (Approvals page)                   ║
// ║ Auth: User session (admin only)                                  ║
// ║ DO NOT USE RAW ENTITY CALLS — USE tenantService for tenant data  ║
// ║ Do not mix user session and service role access.                 ║
// ║ Redeployed: 2026-02-28                                           ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { time_entry_id, edit_data } = await req.json();
    if (!time_entry_id) {
      return Response.json({ error: 'MISSING_ID', message: 'time_entry_id is vereist' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    let entry;
    try {
      entry = await svc.entities.TimeEntry.get(time_entry_id);
    } catch (e) {
      console.error('[approveTimeEntry] Get failed:', e?.message);
      return Response.json({ error: 'NOT_FOUND', message: 'TimeEntry niet gevonden' }, { status: 404 });
    }
    if (!entry) {
      return Response.json({ error: 'NOT_FOUND', message: 'TimeEntry niet gevonden' }, { status: 404 });
    }

    // Employee status check: alleen entries van actieve medewerkers goedkeuren
    if (entry.employee_id) {
      try {
        const emp = await svc.entities.Employee.get(entry.employee_id);
        if (!emp || emp.status !== 'Actief') {
          return Response.json({
            error: 'EMPLOYEE_INACTIVE',
            message: `Medewerker is ${emp?.status?.toLowerCase() || 'onbekend'} — kan niet goedkeuren`
          }, { status: 403 });
        }
      } catch (e) {
        console.error('[approveTimeEntry] Employee lookup failed:', e?.message);
      }
    }

    // Status-transitie validatie: alleen Ingediend → Goedgekeurd
    if (entry.status !== 'Ingediend') {
      return Response.json({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Kan niet goedkeuren: huidige status is "${entry.status}", verwacht "Ingediend"`,
        current_status: entry.status,
        attempted_status: 'Goedgekeurd'
      }, { status: 409 });
    }

    // Build update payload
    const updatePayload = {
      status: 'Goedgekeurd',
      approved_by: user.email,
      approved_date: new Date().toISOString(),
    };

    // If admin also edited data fields (correction), merge them + build edit_history
    if (edit_data && typeof edit_data === 'object') {
      const allowedFields = ['date', 'start_time', 'end_time', 'break_minutes', 'total_hours', 'notes'];
      for (const key of allowedFields) {
        if (edit_data[key] !== undefined) {
          updatePayload[key] = edit_data[key];
        }
      }
      if (edit_data.edit_history) {
        updatePayload.edit_history = edit_data.edit_history;
      }

      // --- Break staffel recalculation if times were edited ---
      const timesEdited = edit_data.start_time !== undefined || edit_data.end_time !== undefined
        || edit_data.date !== undefined;
      const isManualBreak = edit_data.break_manual === true || (edit_data.break_manual === undefined && entry.break_manual === true);
      const finalStartTime = edit_data.start_time || entry.start_time;
      const finalEndTime = edit_data.end_time || entry.end_time;
      const finalDate = edit_data.date || entry.date;
      const finalEndDate = edit_data.end_date !== undefined ? edit_data.end_date : (entry.end_date || null);

      if (timesEdited && !isManualBreak && finalStartTime && finalEndTime) {
        try {
          const breakSchedules = await svc.entities.BreakSchedule.filter({ status: 'Actief' });
          const [sH, sM] = finalStartTime.split(':').map(Number);
          const [eH, eM] = finalEndTime.split(':').map(Number);
          let dienstMin = (eH * 60 + eM) - (sH * 60 + sM);
          if (finalEndDate && finalEndDate !== finalDate) {
            const d1 = new Date(finalDate + 'T12:00:00Z');
            const d2 = new Date(finalEndDate + 'T12:00:00Z');
            dienstMin += Math.round((d2 - d1) / 864e5) * 1440;
          } else if (dienstMin < 0) {
            dienstMin += 1440;
          }
          const dienstHours = dienstMin / 60;
          const sorted = breakSchedules.sort((a, b) => a.min_hours - b.min_hours);
          const match = sorted.find(s => dienstHours >= s.min_hours && (s.max_hours == null || dienstHours < s.max_hours));
          if (match) {
            updatePayload.break_minutes = match.break_minutes;
            updatePayload.break_staffel_id = match.id;
            updatePayload.break_manual = false;
            updatePayload.calculated_dienst_minutes = dienstMin;
            const netMin = Math.max(0, dienstMin - match.break_minutes);
            updatePayload.total_hours = Math.round(netMin / 60 * 100) / 100;
            console.log(`[approveTE] Break recalc: ${dienstHours.toFixed(2)}h → staffel ${match.description} → ${match.break_minutes}min, total=${updatePayload.total_hours}`);
          }
        } catch (e) {
          console.warn('[approveTE] Break recalc failed (non-blocking):', e?.message);
        }
      }
    }

    await svc.entities.TimeEntry.update(time_entry_id, updatePayload);

    // Trigger weekly summary recalculation (fire-and-forget)
    // NEVER awaited, NEVER throws to frontend.
    try {
      const week = entry.week_number;
      const yr = entry.year;
      if (week && yr) {
        console.log(`[approveTimeEntry] Triggering recalcWeeklySummaries for week=${week} year=${yr}`);
        base44.functions.invoke('recalculateWeeklySummaries', { year: yr, week_number: week }).catch(e => {
          console.warn('[approveTimeEntry] recalc trigger failed (non-blocking):', e?.message);
          // Log to AuditLog — best-effort
          svc.entities.AuditLog.create({
            action_type: 'update',
            category: 'Systeem',
            description: `Async recalcWeeklySummaries failed after approve TE ${time_entry_id}: ${(e?.message || '').slice(0, 300)}`,
            performed_by_email: user.email,
            performed_by_role: 'admin',
            target_entity: 'TimeEntry',
            target_id: time_entry_id,
            metadata: { week, year: yr, error: (e?.message || '').slice(0, 200) },
          }).catch(() => {});
        });
      }
    } catch (triggerErr) {
      console.warn('[approveTimeEntry] recalc trigger error (non-blocking):', triggerErr?.message);
    }

    return Response.json({ success: true, time_entry_id, new_status: 'Goedgekeurd' });
  } catch (error) {
    console.error('[approveTimeEntry]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});