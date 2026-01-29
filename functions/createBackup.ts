import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      entities: {}
    };

    // List of all entities to backup
    const entityNames = [
      'Employee', 'Vehicle', 'Customer', 'Project', 'TimeEntry', 'Trip',
      'Schedule', 'CaoRule', 'SalaryTable', 'Holiday', 'ShiftTime',
      'VehicleInspection', 'Expense', 'Message', 'SupervisorMessage',
      'NiwoPermit', 'Urensoort', 'Uurcode', 'Article', 'Route', 'TIModelRoute',
      'CustomerImport', 'Role'
    ];

    // Backup each entity
    for (const entityName of entityNames) {
      try {
        const data = await base44.asServiceRole.entities[entityName].list('', 10000);
        backup.entities[entityName] = data || [];
      } catch (err) {
        // Entity might not exist or have permission issues, continue
        console.log(`Skipped entity: ${entityName}`);
      }
    }

    // Save backup metadata
    const backupRecord = await base44.asServiceRole.entities.Backup.create({
      backup_date: new Date().toISOString(),
      backup_size: JSON.stringify(backup).length,
      entity_count: Object.keys(backup.entities).reduce((sum, key) => sum + (backup.entities[key]?.length || 0), 0),
      status: 'Completed',
      backup_type: 'Full',
      json_data: JSON.stringify(backup)
    });

    return Response.json({
      success: true,
      backup_id: backupRecord.id,
      timestamp: backup.timestamp,
      entity_count: backup.entities
    });
  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});