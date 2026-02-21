// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM_LEVEL (DATA PROTECTION)                   ║
// ║ Called by: Scheduled automation (weekly) + Admin via frontend    ║
// ║ Auth: User session (admin only)                                  ║
// ║ Exports critical entities as JSON to file storage.               ║
// ║ Uses asServiceRole for data reads + file upload.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CRITICAL_ENTITIES = ['Tenant', 'Employee', 'Contract', 'EmailLog', 'AuditLog'];
const delay = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const exportId = `critical-export-${timestamp}`;
    const results = {};
    let totalRecords = 0;

    // Export each critical entity
    for (const entityName of CRITICAL_ENTITIES) {
      try {
        await delay(300);
        const records = await base44.asServiceRole.entities[entityName].list('', 10000);
        results[entityName] = {
          count: records?.length || 0,
          status: 'success',
        };
        totalRecords += records?.length || 0;

        if (records && records.length > 0) {
          // Upload as JSON file
          const jsonStr = JSON.stringify(records, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const file = new File([blob], `${exportId}_${entityName}.json`, { type: 'application/json' });
          const upload = await base44.asServiceRole.integrations.Core.UploadFile({ file });
          results[entityName].file_url = upload.file_url;

          // Also create CSV for spreadsheet-compatible export
          if (records.length > 0) {
            const headers = Object.keys(records[0]).filter(k => typeof records[0][k] !== 'object');
            const csvRows = [headers.join(';')];
            for (const rec of records) {
              const row = headers.map(h => {
                const val = rec[h];
                if (val === null || val === undefined) return '';
                const str = String(val).replace(/"/g, '""');
                return `"${str}"`;
              });
              csvRows.push(row.join(';'));
            }
            const csvStr = csvRows.join('\n');
            const csvBlob = new Blob([csvStr], { type: 'text/csv' });
            const csvFile = new File([csvBlob], `${exportId}_${entityName}.csv`, { type: 'text/csv' });
            const csvUpload = await base44.asServiceRole.integrations.Core.UploadFile({ file: csvFile });
            results[entityName].csv_url = csvUpload.file_url;
          }
        }
      } catch (err) {
        console.error(`Export ${entityName} failed:`, err.message);
        results[entityName] = { count: 0, status: 'error', error: err.message };
      }
    }

    // Store export metadata as a Backup record
    await base44.asServiceRole.entities.Backup.create({
      backup_date: now.toISOString(),
      backup_group_id: exportId,
      entity_name: '_critical_export',
      record_count: CRITICAL_ENTITIES.length,
      backup_size: 0,
      entity_count: totalRecords,
      status: 'Completed',
      backup_type: 'Manual',
      environment: 'production',
      json_data: JSON.stringify({
        export_type: 'critical_entities',
        entities: results,
        timestamp: now.toISOString(),
        exported_by: user.email,
      }),
    });

    // Audit log
    try {
      await base44.functions.invoke('auditService', {
        action_type: 'export',
        category: 'Data',
        description: `Kritieke data export: ${totalRecords} records uit ${CRITICAL_ENTITIES.join(', ')}`,
        performed_by_email: user.email,
        performed_by_name: user.full_name,
        performed_by_role: user.role,
        metadata: { export_id: exportId, total_records: totalRecords, entities: Object.keys(results) },
      });
    } catch (_) {}

    return Response.json({
      success: true,
      export_id: exportId,
      total_records: totalRecords,
      entities: results,
    });
  } catch (error) {
    console.error('exportCriticalData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});