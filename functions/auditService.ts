import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Sensitive fields to strip from metadata
const SENSITIVE_FIELDS = ['bsn', 'bank_account', 'iban', 'sofi', 'id_document_number'];

function sanitizeMetadata(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) continue;
    clean[key] = value;
  }
  // Enforce 2KB limit
  const str = JSON.stringify(clean);
  if (str.length > 2048) {
    return { _truncated: true, _size: str.length };
  }
  return clean;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const {
      entity_type,
      entity_id,
      action_type,
      category,
      description,
      performed_by_email,
      performed_by_name,
      performed_by_role,
      target_name,
      old_value,
      new_value,
      metadata,
    } = await req.json();

    if (!action_type || !category || !description) {
      return Response.json({ error: 'Missing required: action_type, category, description' }, { status: 400 });
    }

    // Extract IP from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    const entry = await base44.asServiceRole.entities.AuditLog.create({
      entity_type: entity_type || null,
      entity_id: entity_id || null,
      action_type,
      category,
      description,
      performed_by_email: performed_by_email || 'system',
      performed_by_name: performed_by_name || null,
      performed_by_role: performed_by_role || null,
      target_entity: entity_type || null,
      target_id: entity_id || null,
      target_name: target_name || null,
      old_value: old_value || null,
      new_value: new_value || null,
      metadata: sanitizeMetadata(metadata),
      ip_address: ip,
    });

    return Response.json({ success: true, auditLogId: entry.id });
  } catch (error) {
    // Audit logging should never break the caller — log and return success
    console.error('auditService error:', error);
    return Response.json({ success: false, error: error.message }, { status: 200 });
  }
});