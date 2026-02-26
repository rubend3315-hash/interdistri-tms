import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Guard function: rejects UPDATE/DELETE on immutable audit entities.
 * Called via entity automation on UserRoleSnapshot, RBACDecisionLog, RBACIntegrityReport.
 * 
 * Policy: These entities are append-only (CREATE only).
 * Any update or delete triggers a tamper alert in AuditLog.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event } = body;

    if (!event) {
      return Response.json({ status: 'ignored', reason: 'no event data' });
    }

    const { type, entity_name, entity_id } = event;

    // Only block update and delete — create is allowed
    if (type === 'create') {
      return Response.json({ status: 'allowed' });
    }

    // Log tamper attempt
    const svc = base44.asServiceRole;

    await svc.entities.AuditLog.create({
      action_type: type === 'update' ? 'tamper_attempt_update' : 'tamper_attempt_delete',
      category: 'Security',
      description: `IMMUTABLE LOG VIOLATION: Attempted ${type} on ${entity_name} (id: ${entity_id}). This entity is append-only.`,
      performed_by_email: 'system',
      performed_by_name: 'Audit Guard',
      performed_by_role: 'system',
      entity_type: entity_name,
      entity_id: entity_id,
      metadata: { event_type: type, entity_name, entity_id, policy: 'append_only' },
    });

    console.log(`[AUDIT_GUARD] Tamper attempt blocked: ${type} on ${entity_name} id=${entity_id}`);

    return Response.json({ 
      status: 'tamper_detected',
      message: `${entity_name} is immutable. ${type} operations are not allowed.`
    });
  } catch (error) {
    console.error('[AUDIT_GUARD] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});