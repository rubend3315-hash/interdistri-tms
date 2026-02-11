import { base44 } from "@/api/base44Client";

/**
 * Log een actie naar de audit trail.
 * Haalt automatisch de huidige gebruiker op.
 */
export async function logAuditEvent({
  action,
  category,
  description,
  targetEntity = null,
  targetId = null,
  targetName = null,
  oldValue = null,
  newValue = null,
  details = null,
}) {
  try {
    const user = await base44.auth.me();
    await base44.entities.AuditLog.create({
      action,
      category,
      description,
      performed_by_email: user?.email || 'onbekend',
      performed_by_name: user?.full_name || 'Onbekend',
      target_entity: targetEntity,
      target_id: targetId,
      target_name: targetName,
      old_value: oldValue,
      new_value: newValue,
      details,
    });
  } catch (e) {
    console.warn('Audit log kon niet worden aangemaakt:', e);
  }
}