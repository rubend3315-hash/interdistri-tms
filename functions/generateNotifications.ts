import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const notifications = [];

    // Get all admin users for notifications
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUserIds = allUsers
      .filter(u => u.role === 'admin')
      .map(u => u.id);

    // 1. Check for active drivers without contractregels
    const employees = await base44.asServiceRole.entities.Employee.list();
    const todayStr = new Date().toISOString().split('T')[0];
    const activeDriversWithoutContractregels = employees.filter(emp => {
      if (emp.status !== 'Actief') return false;
      if (emp.department !== 'Transport') return false;
      
      // Check if employee has a valid contractregel
      const hasValidContractregel = emp.contractregels && emp.contractregels.length > 0 && 
        emp.contractregels.some(cr => {
          return cr.status === 'Actief' && 
                 cr.startdatum <= todayStr &&
                 (!cr.einddatum || cr.einddatum >= todayStr);
        });
      
      return !hasValidContractregel;
    });

    if (activeDriversWithoutContractregels.length > 0) {
      // Check if this notification already exists
      const existingNotifications = await base44.asServiceRole.entities.Notification.filter({
        type: 'driver_no_contract',
        is_read: false
      });

      // Only create if no unread notification of this type exists
      const hasGroupNotification = existingNotifications.some(n => !n.target_entity_id);
      if (!hasGroupNotification) {
        notifications.push({
          title: '⚠️ Actieve chauffeurs zonder contractregels',
          description: `${activeDriversWithoutContractregels.length} actieve chauffeur(s) hebben geen geldige contractregel: ${activeDriversWithoutContractregels.map(e => `${e.first_name} ${e.last_name}`).join(', ')}. Voeg contractregels toe bij de medewerker.`,
          type: 'driver_no_contract',
          target_page: 'Employees',
          user_ids: adminUserIds,
          priority: 'high',
          is_read: false
        });
      }
    }

    // 2. Check for vehicles with APK expiring soon (within 30 days)
    const vehicles = await base44.asServiceRole.entities.Vehicle.list();
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const vehiclesWithExpiringAPK = vehicles.filter(v => {
      if (!v.apk_expiry) return false;
      const apkDate = new Date(v.apk_expiry);
      return apkDate >= today && apkDate <= thirtyDaysFromNow && v.status !== 'Uit dienst';
    });

    for (const vehicle of vehiclesWithExpiringAPK) {
      // Check if notification for this vehicle already exists
      const existingNotifications = await base44.asServiceRole.entities.Notification.filter({
        type: 'vehicle_apk_expiry',
        target_entity_id: vehicle.id,
        is_read: false
      });

      if (existingNotifications.length === 0) {
        const daysUntilExpiry = Math.ceil((new Date(vehicle.apk_expiry) - today) / (24 * 60 * 60 * 1000));
        notifications.push({
          title: '⚠️ APK keuring verloopt binnenkort',
          description: `Voertuig ${vehicle.license_plate} (${vehicle.brand} ${vehicle.model}) - APK verloopt over ${daysUntilExpiry} dagen op ${vehicle.apk_expiry}`,
          type: 'vehicle_apk_expiry',
          target_entity_id: vehicle.id,
          target_page: 'Vehicles',
          user_ids: adminUserIds,
          priority: daysUntilExpiry <= 7 ? 'urgent' : 'high',
          is_read: false
        });
      }
    }

    // Create all notifications
    if (notifications.length > 0) {
      for (const notification of notifications) {
        await base44.asServiceRole.entities.Notification.create(notification);
      }
    }

    return Response.json({
      success: true,
      generated: notifications.length,
      message: `${notifications.length} notificatie(s) gegenereerd`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});