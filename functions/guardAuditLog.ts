import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Guardian function: blocks all update and delete operations on AuditLog.
 * Triggered by entity automation on AuditLog update/delete events.
 * On update: reverts the record to its previous state.
 * On delete: re-creates the record (best-effort).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!event) {
      return Response.json({ error: 'No event' }, { status: 400 });
    }

    if (event.type === 'update' && old_data) {
      // Revert to original data
      const { id, created_date, updated_date, created_by, ...revertData } = old_data;
      await base44.asServiceRole.entities.AuditLog.update(event.entity_id, revertData);
      console.warn(`[GUARD] AuditLog ${event.entity_id} update REVERTED — audit logs are immutable`);
    }

    if (event.type === 'delete' && old_data) {
      // Re-create the deleted record (best-effort, new ID)
      const { id, created_date, updated_date, created_by, ...recreateData } = old_data;
      await base44.asServiceRole.entities.AuditLog.create({
        ...recreateData,
        metadata: {
          ...(recreateData.metadata || {}),
          _restored: true,
          _original_id: event.entity_id,
          _deleted_at: new Date().toISOString(),
        },
      });
      console.warn(`[GUARD] AuditLog ${event.entity_id} delete RESTORED — audit logs are immutable`);
    }

    return Response.json({ success: true, action: 'guarded', event_type: event.type });
  } catch (error) {
    console.error('guardAuditLog error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});