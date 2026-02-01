import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { importId, success, error } = await req.json();

    if (!importId) {
      return Response.json({ error: 'importId is required' }, { status: 400 });
    }

    // Get the import record
    const customerImport = await base44.asServiceRole.entities.CustomerImport.get(importId);
    
    if (!customerImport) {
      return Response.json({ error: 'Import not found' }, { status: 404 });
    }

    // Get all admin users for notifications
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUserIds = allUsers
      .filter(u => u.role === 'admin')
      .map(u => u.id);

    // Create notification
    let notification;
    if (success) {
      notification = {
        title: `✅ Import succesvol: ${customerImport.total_rows || 0} ritten`,
        description: `${customerImport.total_rows || 0} ritten succesvol geïmporteerd voor ${customerImport.import_name || 'import'}`,
        type: 'import_success',
        target_entity_id: importId,
        target_page: 'CustomerDetail',
        user_ids: adminUserIds,
        priority: 'low',
        is_read: false
      };
    } else {
      notification = {
        title: '❌ Import mislukt',
        description: `Import "${customerImport.import_name || 'onbekend'}" is mislukt: ${error || 'Onbekende fout'}`,
        type: 'import_failed',
        target_entity_id: importId,
        target_page: 'CustomerDetail',
        user_ids: adminUserIds,
        priority: 'high',
        is_read: false
      };
    }

    await base44.asServiceRole.entities.Notification.create(notification);

    return Response.json({
      success: true,
      message: 'Notificatie aangemaakt'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});