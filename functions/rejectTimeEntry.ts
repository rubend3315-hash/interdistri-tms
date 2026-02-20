import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { time_entry_id, rejection_reason } = await req.json();
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

    // Status-transitie validatie: alleen Ingediend → Afgekeurd
    if (entry.status !== 'Ingediend') {
      return Response.json({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Kan niet afkeuren: huidige status is "${entry.status}", verwacht "Ingediend"`,
        current_status: entry.status,
        attempted_status: 'Afgekeurd'
      }, { status: 409 });
    }

    await svc.entities.TimeEntry.update(time_entry_id, {
      status: 'Afgekeurd',
      rejection_reason: rejection_reason || '',
      approved_by: user.email,
      approved_date: new Date().toISOString(),
    });

    return Response.json({ success: true, time_entry_id, new_status: 'Afgekeurd' });
  } catch (error) {
    console.error('[rejectTimeEntry]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});