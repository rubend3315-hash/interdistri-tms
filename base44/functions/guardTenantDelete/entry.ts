// redeploy: 2026-02-23T full_function_redeploy_protocol_v1
// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM_LEVEL (GUARD)                             ║
// ║ Called by: Entity automation (Tenant delete)                     ║
// ║ Auth: None (automation-triggered, no user session)               ║
// ║ Uses asServiceRole — required for recreating deleted tenant.     ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (!event || event.type !== 'delete' || event.entity_name !== 'Tenant') {
      return Response.json({ skipped: true, reason: 'Not a Tenant delete event' });
    }

    if (!data) {
      return Response.json({ skipped: true, reason: 'No data in delete event' });
    }

    const tenantId = event.entity_id;

    // Recreate the tenant to revert the delete
    const recreated = await base44.asServiceRole.entities.Tenant.create({
      name: data.name || 'Herstelde Tenant',
      slug: data.slug || `recovered-${Date.now()}`,
      status: data.status || 'active',
      settings: data.settings || {},
    });

    console.log(`[guardTenantDelete] Tenant delete blocked. Original ID: ${tenantId}, recreated as: ${recreated.id}`);

    // If the recreated ID differs from the original, update all child records
    // pointing to the old tenant_id to the new one
    if (recreated.id !== tenantId) {
      const childEntities = ['Employee', 'Contract', 'Vehicle', 'Customer', 'EmailLog'];
      for (const entityName of childEntities) {
        try {
          const children = await base44.asServiceRole.entities[entityName].filter({ tenant_id: tenantId });
          for (const child of children) {
            await base44.asServiceRole.entities[entityName].update(child.id, { tenant_id: recreated.id });
          }
          if (children.length > 0) {
            console.log(`[guardTenantDelete] Migrated ${children.length} ${entityName} records to new tenant ${recreated.id}`);
          }
        } catch (e) {
          console.error(`[guardTenantDelete] Failed to migrate ${entityName}:`, e.message);
        }
      }
    }

    // Log the blocked delete attempt
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'Tenant',
        entity_id: tenantId,
        action_type: 'tamper_attempt_delete',
        category: 'Systeem',
        description: `Tenant delete geblokkeerd: "${data.name}" (${data.slug}). Tenant is hersteld als ${recreated.id}.`,
        performed_by_email: 'system',
        performed_by_role: 'system',
        target_entity: 'Tenant',
        target_id: tenantId,
        target_name: data.name || data.slug,
        tenant_id: recreated.id,
        metadata: {
          _guard_action: true,
          original_tenant_id: tenantId,
          recreated_tenant_id: recreated.id,
          tenant_name: data.name,
          tenant_slug: data.slug,
        },
      });
    } catch (e) {
      console.error('[guardTenantDelete] AuditLog creation failed:', e.message);
    }

    return Response.json({
      success: true,
      action: 'delete_blocked',
      message: `Tenant "${data.name}" kan niet permanent verwijderd worden. Gebruik archiveren.`,
      original_tenant_id: tenantId,
      recreated_tenant_id: recreated.id,
    });

  } catch (error) {
    console.error('[guardTenantDelete] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});