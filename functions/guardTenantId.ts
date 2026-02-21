import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Cross-tenant guard automation.
 * Triggered on update events for tenant-aware entities.
 * Reverts tenant_id changes (prevents moving records between tenants).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!event || !data || !old_data) {
      return Response.json({ success: true, action: 'no_data' });
    }

    // Only care about tenant_id changes
    if (!old_data.tenant_id || old_data.tenant_id === data.tenant_id) {
      return Response.json({ success: true, action: 'no_change' });
    }

    // Skip if this is a migration or guard action
    if (data.metadata?._tenant_migration || data.metadata?._guard_action) {
      return Response.json({ success: true, action: 'skipped_system_action' });
    }

    const entityName = event.entity_name;
    const entityId = event.entity_id;

    console.warn(`[TENANT-GUARD] ${entityName} ${entityId}: tenant_id changed from ${old_data.tenant_id} to ${data.tenant_id} — REVERTING`);

    // Revert tenant_id
    await base44.asServiceRole.entities[entityName].update(entityId, {
      tenant_id: old_data.tenant_id,
    });

    // Log cross-tenant modification attempt
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: entityName,
      entity_id: entityId,
      action_type: 'cross_tenant_access_attempt',
      category: 'Systeem',
      description: `Tenant wijziging geblokkeerd op ${entityName} ${entityId}: ${old_data.tenant_id} → ${data.tenant_id}`,
      performed_by_email: data.created_by || 'unknown',
      performed_by_role: 'unknown',
      target_entity: entityName,
      target_id: entityId,
      tenant_id: old_data.tenant_id,
      correlation_id: crypto.randomUUID(),
      metadata: {
        _guard_action: true,
        old_tenant_id: old_data.tenant_id,
        attempted_tenant_id: data.tenant_id,
      },
    });

    return Response.json({ success: true, action: 'reverted', entity: entityName, id: entityId });
  } catch (error) {
    console.error('guardTenantId error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});