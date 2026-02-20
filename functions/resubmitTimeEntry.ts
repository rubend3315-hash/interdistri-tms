import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { time_entry_id, updated_data } = await req.json();
    if (!time_entry_id) {
      return Response.json({ error: 'MISSING_ID', message: 'time_entry_id is vereist' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    let entry;
    try {
      entry = await svc.entities.TimeEntry.get(time_entry_id);
    } catch {
      return Response.json({ error: 'NOT_FOUND', message: 'TimeEntry niet gevonden' }, { status: 404 });
    }

    // Status-transitie validatie: alleen Afgekeurd → Ingediend
    if (entry.status !== 'Afgekeurd') {
      return Response.json({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Kan niet herindienden: huidige status is "${entry.status}", verwacht "Afgekeurd"`,
        current_status: entry.status,
        attempted_status: 'Ingediend'
      }, { status: 409 });
    }

    // Ownership check: non-admin users can only resubmit their own entries
    if (user.role !== 'admin') {
      const employees = await svc.entities.Employee.filter({ email: user.email });
      if (!employees.length || employees[0].id !== entry.employee_id) {
        return Response.json({ error: 'Forbidden: not your entry' }, { status: 403 });
      }
    }

    // Build update payload
    const updatePayload = {
      status: 'Ingediend',
      rejection_reason: null,
    };

    // Merge allowed updated fields if provided
    if (updated_data && typeof updated_data === 'object') {
      const allowedFields = ['start_time', 'end_time', 'break_minutes', 'total_hours', 'notes', 'signature_url', 'edit_history'];
      for (const key of allowedFields) {
        if (updated_data[key] !== undefined) {
          updatePayload[key] = updated_data[key];
        }
      }
    }

    await svc.entities.TimeEntry.update(time_entry_id, updatePayload);

    return Response.json({ success: true, time_entry_id, new_status: 'Ingediend' });
  } catch (error) {
    console.error('[resubmitTimeEntry]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});