import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!event || event.type !== 'update' || !data || !old_data) {
      return Response.json({ success: true, action: 'skipped' });
    }

    const oldRole = old_data.business_role || null;
    const newRole = data.business_role || null;

    if (oldRole === newRole) {
      return Response.json({ success: true, action: 'no_role_change' });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: event.entity_id,
      action_type: 'role_change',
      category: 'Permissies',
      description: `Business role gewijzigd van "${oldRole || '(geen)'}" naar "${newRole || '(geen)'}" voor ${data.email || 'onbekend'}`,
      performed_by_email: data.updated_by || data.created_by || 'system',
      performed_by_role: 'admin',
      target_entity: 'User',
      target_id: event.entity_id,
      target_name: data.email || data.full_name || null,
      old_value: oldRole || '',
      new_value: newRole || '',
      metadata: {
        old_role: oldRole,
        new_role: newRole,
        user_email: data.email,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`[onUserRoleChange] Logged role change for ${data.email}: ${oldRole} → ${newRole}`);

    return Response.json({ success: true, action: 'role_change_logged' });
  } catch (error) {
    console.error('onUserRoleChange error:', error);
    return Response.json({ success: false, error: error.message }, { status: 200 });
  }
});