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

    const body = await req.json().catch(() => ({}));
    const triggerType = body.trigger_type || 'manual';

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // RBAC: Governance → ADMIN only
    if (user.role !== 'admin' && !['ADMIN'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: insufficient business role' }, { status: 403 });
    }

    const now = new Date();
    const retentionUntil = new Date(now);
    retentionUntil.setDate(retentionUntil.getDate() + 90);

    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const exportId = `critical-export-${timestamp}`;
    const results = {};
    let totalRecords = 0;

    const files = [];
    let totalSize = 0;

    // Export each critical entity
    for (const entityName of CRITICAL_ENTITIES) {
      try {
        await delay(300);
        const records = await base44.asServiceRole.entities[entityName].list('', 10000);
        const count = records?.length || 0;
        totalRecords += count;

        if (!records || records.length === 0) {
          results[entityName] = { count: 0, status: 'success' };
          continue;
        }

        // Upload JSON
        const jsonStr = JSON.stringify(records, null, 2);
        const jsonSize = jsonStr.length;
        totalSize += jsonSize;
        const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
        const jsonFileName = `${exportId}_${entityName}.json`;
        const jsonFile = new File([jsonBlob], jsonFileName, { type: 'application/json' });
        const jsonUpload = await base44.asServiceRole.integrations.Core.UploadFile({ file: jsonFile });

        files.push({
          name: jsonFileName,
          entity: entityName,
          format: 'JSON',
          records: count,
          size: jsonSize,
          location: 'Base44 File Storage',
          url: jsonUpload.file_url,
        });

        // Upload CSV
        const headers = Object.keys(records[0]).filter(k => typeof records[0][k] !== 'object');
        const csvRows = [headers.join(';')];
        for (const rec of records) {
          const row = headers.map(h => {
            const val = rec[h];
            if (val === null || val === undefined) return '';
            return `"${String(val).replace(/"/g, '""')}"`;
          });
          csvRows.push(row.join(';'));
        }
        const csvStr = csvRows.join('\n');
        const csvSize = csvStr.length;
        totalSize += csvSize;
        const csvBlob = new Blob([csvStr], { type: 'text/csv' });
        const csvFileName = `${exportId}_${entityName}.csv`;
        const csvFile = new File([csvBlob], csvFileName, { type: 'text/csv' });
        const csvUpload = await base44.asServiceRole.integrations.Core.UploadFile({ file: csvFile });

        files.push({
          name: csvFileName,
          entity: entityName,
          format: 'CSV',
          records: count,
          size: csvSize,
          location: 'Base44 File Storage',
          url: csvUpload.file_url,
        });

        results[entityName] = {
          count,
          status: 'success',
          json_url: jsonUpload.file_url,
          csv_url: csvUpload.file_url,
        };
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
      backup_size: totalSize,
      entity_count: totalRecords,
      status: 'Completed',
      backup_type: 'Manual',
      environment: 'production',
      trigger_type: triggerType,
      retention_until: retentionUntil.toISOString(),
      json_data: JSON.stringify({
        export_type: 'critical_entities',
        entities: results,
        files: files.map(f => ({ name: f.name, entity: f.entity, format: f.format, url: f.url, size: f.size })),
        timestamp: now.toISOString(),
        exported_by: user.email,
        total_size: totalSize,
        trigger_type: triggerType,
        retention_until: retentionUntil.toISOString(),
      }),
    });

    // Audit log
    try {
      await base44.functions.invoke('auditService', {
        action_type: 'export',
        category: 'Data',
        description: `Kritieke data export: ${totalRecords} records, ${files.length} bestanden, ${Math.round(totalSize / 1024)} KB`,
        performed_by_email: user.email,
        performed_by_name: user.full_name,
        performed_by_role: user.role,
        metadata: { export_id: exportId, total_records: totalRecords, total_size: totalSize, file_count: files.length },
      });
    } catch (_) {}

    return Response.json({
      success: true,
      export_id: exportId,
      total_records: totalRecords,
      total_size: totalSize,
      files,
    });
  } catch (error) {
    console.error('exportCriticalData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});