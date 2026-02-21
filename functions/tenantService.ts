// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM_LEVEL (INFRASTRUCTURE)                    ║
// ║ Called by: Frontend (via tenantAware wrappers) + backend funcs   ║
// ║ Auth: User session required for tenant resolution                ║
// ║ Uses asServiceRole — required for cross-tenant checks.           ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * tenantService — Central tenant context resolver + tenant-aware CRUD wrappers.
 *
 * Actions:
 *   getCurrentTenant  — resolve tenant_id from user (or override for SuperAdmin)
 *   list              — filtered by tenant_id
 *   get               — with cross-tenant check
 *   create            — force tenant_id
 *   update            — with cross-tenant check
 *   delete            — with cross-tenant check
 */

const TENANT_ENTITIES = ['Employee', 'Contract', 'Vehicle', 'Customer', 'EmailLog', 'AuditLog', 'User'];

async function resolveTenantId(base44, body) {
  const user = await base44.auth.me();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // SuperAdmin can override tenant
  if (user.role === 'superadmin' && body.tenant_override) {
    return { tenant_id: body.tenant_override, user, is_override: true };
  }

  if (!user.tenant_id) {
    throw new Error('Tenant context missing: user has no tenant_id');
  }

  return { tenant_id: user.tenant_id, user, is_override: false };
}

async function logCrossTenantAttempt(base44, user, action, entityName, entityId, recordTenantId, userTenantId) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: entityName,
      entity_id: entityId,
      action_type: 'cross_tenant_access_attempt',
      category: 'Systeem',
      description: `Cross-tenant ${action} poging: ${entityName} ${entityId} (tenant ${recordTenantId}) door user in tenant ${userTenantId}`,
      performed_by_email: user.email || 'unknown',
      performed_by_name: user.full_name || null,
      performed_by_role: user.role || 'unknown',
      target_entity: entityName,
      target_id: entityId,
      tenant_id: userTenantId,
      correlation_id: crypto.randomUUID(),
      metadata: {
        _guard_action: true,
        attempted_action: action,
        record_tenant_id: recordTenantId,
        user_tenant_id: userTenantId,
      },
    });
  } catch (e) {
    console.error('Failed to log cross-tenant attempt:', e.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // ── getCurrentTenant ──
    if (action === 'getCurrentTenant') {
      const { tenant_id, user, is_override } = await resolveTenantId(base44, body);
      return Response.json({ success: true, tenant_id, user_email: user.email, is_override });
    }

    // All CRUD actions require tenant context
    const { tenant_id, user, is_override } = await resolveTenantId(base44, body);
    const { entity_name, filters, sort, limit, entity_id, data } = body;

    if (!entity_name) {
      return Response.json({ error: 'entity_name required' }, { status: 400 });
    }

    const isTenantEntity = TENANT_ENTITIES.includes(entity_name);

    // ── LIST ──
    if (action === 'list') {
      let queryFilters = filters || {};
      if (isTenantEntity) {
        queryFilters = { ...queryFilters, tenant_id };
      }
      const records = await base44.asServiceRole.entities[entity_name].filter(
        queryFilters,
        sort || '-created_date',
        limit || 200
      );
      return Response.json({ success: true, data: records, tenant_id });
    }

    // ── GET ──
    if (action === 'get') {
      if (!entity_id) {
        return Response.json({ error: 'entity_id required' }, { status: 400 });
      }
      const records = await base44.asServiceRole.entities[entity_name].filter({ id: entity_id });
      if (records.length === 0) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }
      const record = records[0];
      if (isTenantEntity && record.tenant_id && record.tenant_id !== tenant_id && !is_override) {
        await logCrossTenantAttempt(base44, user, 'get', entity_name, entity_id, record.tenant_id, tenant_id);
        return Response.json({ error: 'Cross-tenant access denied' }, { status: 403 });
      }
      return Response.json({ success: true, data: record, tenant_id });
    }

    // ── CREATE ──
    if (action === 'create') {
      if (!data) {
        return Response.json({ error: 'data required' }, { status: 400 });
      }
      const createData = isTenantEntity ? { ...data, tenant_id } : data;
      const record = await base44.asServiceRole.entities[entity_name].create(createData);
      return Response.json({ success: true, data: record, tenant_id });
    }

    // ── UPDATE ──
    if (action === 'update') {
      if (!entity_id || !data) {
        return Response.json({ error: 'entity_id and data required' }, { status: 400 });
      }
      // Cross-tenant check
      if (isTenantEntity) {
        const existing = await base44.asServiceRole.entities[entity_name].filter({ id: entity_id });
        if (existing.length === 0) {
          return Response.json({ error: 'Not found' }, { status: 404 });
        }
        if (existing[0].tenant_id && existing[0].tenant_id !== tenant_id && !is_override) {
          await logCrossTenantAttempt(base44, user, 'update', entity_name, entity_id, existing[0].tenant_id, tenant_id);
          return Response.json({ error: 'Cross-tenant access denied' }, { status: 403 });
        }
        // Prevent changing tenant_id (unless SuperAdmin override)
        if (data.tenant_id && data.tenant_id !== tenant_id && !is_override) {
          await logCrossTenantAttempt(base44, user, 'tenant_change', entity_name, entity_id, data.tenant_id, tenant_id);
          return Response.json({ error: 'Cross-tenant modification denied' }, { status: 403 });
        }
      }
      const updated = await base44.asServiceRole.entities[entity_name].update(entity_id, data);
      return Response.json({ success: true, data: updated, tenant_id });
    }

    // ── DELETE ──
    if (action === 'delete') {
      if (!entity_id) {
        return Response.json({ error: 'entity_id required' }, { status: 400 });
      }
      if (isTenantEntity) {
        const existing = await base44.asServiceRole.entities[entity_name].filter({ id: entity_id });
        if (existing.length === 0) {
          return Response.json({ error: 'Not found' }, { status: 404 });
        }
        if (existing[0].tenant_id && existing[0].tenant_id !== tenant_id && !is_override) {
          await logCrossTenantAttempt(base44, user, 'delete', entity_name, entity_id, existing[0].tenant_id, tenant_id);
          return Response.json({ error: 'Cross-tenant access denied' }, { status: 403 });
        }
      }
      await base44.asServiceRole.entities[entity_name].delete(entity_id);
      return Response.json({ success: true, deleted: entity_id, tenant_id });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message.includes('Tenant context missing')) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    console.error('tenantService error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});