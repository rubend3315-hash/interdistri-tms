import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Guardian function: blocks all update and delete operations on AuditLog.
 * Triggered by entity automation on AuditLog update/delete events.
 * On update: reverts the record to its previous state.
 * On delete: re-creates the record (best-effort).
 * Also logs tamper attempts as new AuditLog entries.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!event) {
      return Response.json({ error: 'No event' }, { status: 400 });
    }

    // Skip if this event was triggered by the guard itself (prevent infinite loop)
    if (data?.metadata?._guard_action || old_data?.metadata?._guard_action) {
      return Response.json({ success: true, action: 'skipped_guard_action' });
    }

    const correlationId = crypto.randomUUID();

    if (event.type === 'update' && old_data) {
      // Compute what changed
      const changes = {};
      for (const key of Object.keys(data || {})) {
        if (['updated_date'].includes(key)) continue;
        if (JSON.stringify(data[key]) !== JSON.stringify(old_data[key])) {
          changes[key] = { from: old_data[key], to: data[key] };
        }
      }

      // Revert to original data
      const { id, created_date, updated_date, created_by, ...revertData } = old_data;
      await base44.asServiceRole.entities.AuditLog.update(event.entity_id, revertData);

      // Log tamper attempt
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'AuditLog',
        entity_id: event.entity_id,
        action_type: 'tamper_attempt_update',
        category: 'Systeem',
        description: `Update poging op immutable AuditLog ${event.entity_id} geblokkeerd en teruggedraaid`,
        performed_by_email: data?.created_by || 'unknown',
        performed_by_role: 'unknown',
        target_entity: 'AuditLog',
        target_id: event.entity_id,
        correlation_id: correlationId,
        metadata: { _guard_action: true, attempted_changes: changes },
      });

      console.warn(`[GUARD] AuditLog ${event.entity_id} update REVERTED — tamper logged`);
    }

    if (event.type === 'delete' && old_data) {
      // Re-create the deleted record (best-effort, new ID)
      const { id, created_date, updated_date, created_by, ...recreateData } = old_data;
      await base44.asServiceRole.entities.AuditLog.create({
        ...recreateData,
        metadata: {
          ...(recreateData.metadata || {}),
          _guard_action: true,
          _restored: true,
          _original_id: event.entity_id,
          _deleted_at: new Date().toISOString(),
        },
      });

      // Log tamper attempt
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'AuditLog',
        entity_id: event.entity_id,
        action_type: 'tamper_attempt_delete',
        category: 'Systeem',
        description: `Delete poging op immutable AuditLog ${event.entity_id} geblokkeerd en hersteld`,
        performed_by_email: old_data?.created_by || 'unknown',
        performed_by_role: 'unknown',
        target_entity: 'AuditLog',
        target_id: event.entity_id,
        target_name: old_data?.description || null,
        correlation_id: correlationId,
        metadata: {
          _guard_action: true,
          deleted_entry: {
            action_type: old_data.action_type,
            category: old_data.category,
            entity_type: old_data.entity_type,
            entity_id: old_data.entity_id,
          },
        },
      });

      console.warn(`[GUARD] AuditLog ${event.entity_id} delete RESTORED — tamper logged`);
    }

    return Response.json({ success: true, action: 'guarded', event_type: event.type, correlation_id: correlationId });
  } catch (error) {
    console.error('guardAuditLog error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});