// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Admin via frontend (Approvals page)                   ║
// ║ Auth: User session (admin only)                                  ║
// ║ DO NOT USE RAW ENTITY CALLS — USE tenantService for tenant data  ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    }

    await svc.entities.TimeEntry.update(time_entry_id, updatePayload);

    return Response.json({ success: true, time_entry_id, new_status: 'Goedgekeurd' });
  } catch (error) {
    console.error('[approveTimeEntry]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});