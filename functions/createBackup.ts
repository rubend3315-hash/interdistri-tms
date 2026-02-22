import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // RBAC: Governance → ADMIN only
    if (user.role !== 'admin' && !['ADMIN'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: insufficient business role' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const backupGroupId = `backup_${Date.now()}`;

    const entityNames = [
      'User', 'Employee', 'Vehicle', 'Customer', 'Project', 'TimeEntry', 'Trip',
      'Schedule', 'CaoRule', 'SalaryTable', 'Holiday', 'ShiftTime',
      'VehicleInspection', 'Expense', 'Message', 'SupervisorMessage',
      'NiwoPermit', 'Urensoort', 'Uurcode', 'Article', 'Route', 'TIModelRoute',
      'CustomerImport', 'Role', 'Notification', 'Document', 'Contract',
      'CompletedContract', 'ContractWijziging', 'BreakSchedule',
      'PerformanceReview', 'PerformanceNote', 'EmployeeKPI', 'KPIDoel',
      'LoonperiodeStatus', 'BedrijfsreglementArtikel', 'CharterCompany',
      'VehicleMaintenance', 'LeaseContract', 'EmailTemplate',
      'OnboardingProcess', 'DriverAvailability', 'RapportageRit',
      'PostNLImportResult', 'SpottaInvoice', 'SpottaInvoiceLine'
    ];

    const backupData = {};
    const entityStats = {};
    let totalRecords = 0;

    // Collect all data
    for (const entityName of entityNames) {
      try {
        await delay(250);
        const data = await base44.asServiceRole.entities[entityName].list('', 10000);
        if (!data || data.length === 0) {
          entityStats[entityName] = 0;
          continue;
        }
        backupData[entityName] = data;
        entityStats[entityName] = data.length;
        totalRecords += data.length;
      } catch (err) {
        console.log(`Skipped entity: ${entityName} - ${err.message}`);
        entityStats[entityName] = `Error: ${err.message}`;
      }
    }

    // Create JSON blob and upload as file
    const fullBackup = {
      version: '4.0',
      timestamp: now,
      backup_group_id: backupGroupId,
      environment: 'production',
      entity_stats: entityStats,
      total_records: totalRecords,
      data: backupData
    };

    const jsonString = JSON.stringify(fullBackup);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const file = new File([blob], `backup-${backupGroupId}.json`, { type: 'application/json' });

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const fileUrl = uploadResult.file_url;

    // Store only metadata + file URL in Backup entity
    await base44.asServiceRole.entities.Backup.create({
      backup_date: now,
      backup_group_id: backupGroupId,
      entity_name: '_metadata',
      record_count: 0,
      backup_size: jsonString.length,
      entity_count: totalRecords,
      status: 'Completed',
      backup_type: 'Full',
      environment: 'production',
      json_data: JSON.stringify({
        file_url: fileUrl,
        entities: entityStats,
        timestamp: now,
        version: '4.0'
      })
    });

    return Response.json({
      success: true,
      backup_group_id: backupGroupId,
      file_url: fileUrl,
      timestamp: now,
      total_records: totalRecords,
      total_size_mb: Math.round(jsonString.length / 1024 / 1024 * 100) / 100,
      entity_results: entityStats
    });
  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});