import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
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

    const results = {};
    let totalRecords = 0;
    let totalSize = 0;

    // Backup each entity as a separate record, with rate limit handling
    for (const entityName of entityNames) {
      try {
        await delay(300); // prevent rate limiting
        const data = await base44.asServiceRole.entities[entityName].list('', 10000);
        if (!data || data.length === 0) {
          results[entityName] = 0;
          continue;
        }

        const jsonData = JSON.stringify(data);
        const size = jsonData.length;

        // Als data te groot is voor één record (>500KB), splits in chunks
        if (size > 500000) {
          const chunkSize = 200; // records per chunk
          const chunks = [];
          for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
          }

          for (let i = 0; i < chunks.length; i++) {
            await delay(300);
            const chunkJson = JSON.stringify(chunks[i]);
            await base44.asServiceRole.entities.Backup.create({
              backup_date: now,
              backup_group_id: backupGroupId,
              entity_name: `${entityName}__part${i + 1}of${chunks.length}`,
              record_count: chunks[i].length,
              backup_size: chunkJson.length,
              status: 'Completed',
              backup_type: 'Full',
              environment: 'production',
              json_data: chunkJson
            });
          }
          results[entityName] = data.length;
          totalRecords += data.length;
          totalSize += size;
        } else {
          await delay(300);
          await base44.asServiceRole.entities.Backup.create({
            backup_date: now,
            backup_group_id: backupGroupId,
            entity_name: entityName,
            record_count: data.length,
            backup_size: size,
            status: 'Completed',
            backup_type: 'Full',
            environment: 'production',
            json_data: jsonData
          });
          results[entityName] = data.length;
          totalRecords += data.length;
          totalSize += size;
        }
      } catch (err) {
        console.log(`Skipped entity: ${entityName} - ${err.message}`);
        results[entityName] = `Error: ${err.message}`;
      }
    }

    // Create metadata record (overzicht)
    await delay(300);
    await base44.asServiceRole.entities.Backup.create({
      backup_date: now,
      backup_group_id: backupGroupId,
      entity_name: '_metadata',
      record_count: 0,
      backup_size: totalSize,
      entity_count: totalRecords,
      status: 'Completed',
      backup_type: 'Full',
      environment: 'production',
      json_data: JSON.stringify({ entities: results, timestamp: now, version: '3.0' })
    });

    return Response.json({
      success: true,
      backup_group_id: backupGroupId,
      timestamp: now,
      total_records: totalRecords,
      total_size: totalSize,
      entity_results: results
    });
  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});