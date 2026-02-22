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

    const body = await req.json();
    const { backup_group_id, entity_name, confirmation_code } = body;

    if (!backup_group_id) {
      return Response.json({ error: 'backup_group_id is verplicht' }, { status: 400 });
    }

    if (!confirmation_code || confirmation_code !== 'HERSTEL-BEVESTIGD') {
      return Response.json({ 
        error: 'Typ exact: HERSTEL-BEVESTIGD om te bevestigen',
        requires_confirmation: true
      }, { status: 400 });
    }

    // Haal metadata op
    const metadataRecords = await base44.asServiceRole.entities.Backup.filter(
      { backup_group_id: backup_group_id, entity_name: '_metadata' }
    );

    if (!metadataRecords || metadataRecords.length === 0) {
      return Response.json({ error: 'Backup niet gevonden' }, { status: 404 });
    }

    const metadata = metadataRecords[0];

    // Check environment
    if (metadata.environment && metadata.environment !== 'production') {
      return Response.json({ 
        error: `GEBLOKKEERD: Backup uit "${metadata.environment}" omgeving.`
      }, { status: 403 });
    }

    // Parse metadata to get file URL
    const metaData = JSON.parse(metadata.json_data);
    
    if (!metaData.file_url) {
      return Response.json({ error: 'Backup bestand niet gevonden (oud formaat?)' }, { status: 400 });
    }

    // Download backup file
    const fileResponse = await fetch(metaData.file_url);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Kon backup bestand niet downloaden' }, { status: 500 });
    }
    const backupContent = await fileResponse.json();

    if (!backupContent.data) {
      return Response.json({ error: 'Ongeldig backup bestand' }, { status: 400 });
    }

    const restoreResult = {
      timestamp: new Date().toISOString(),
      restored_by: user.email,
      backup_group_id,
      restored_entities: {},
      skipped: [],
      errors: []
    };

    // Determine which entities to restore
    const entitiesToRestore = entity_name 
      ? { [entity_name]: backupContent.data[entity_name] }
      : backupContent.data;

    for (const [entName, records] of Object.entries(entitiesToRestore)) {
      // Skip User entity
      if (entName === 'User') {
        restoreResult.skipped.push({
          entity: 'User',
          reason: 'User-accounts moeten handmatig uitgenodigd worden',
          count: records?.length || 0
        });
        continue;
      }

      if (!records || records.length === 0) continue;

      try {
        // Delete existing data
        await delay(250);
        const existing = await base44.asServiceRole.entities[entName].list('', 10000);
        if (existing && existing.length > 0) {
          for (const record of existing) {
            try {
              await delay(50);
              await base44.asServiceRole.entities[entName].delete(record.id);
            } catch (delErr) {
              // skip
            }
          }
        }

        // Clean records and restore in batches
        const cleanedRecords = records.map(record => {
          const { id, created_date, updated_date, created_by, created_by_id, entity_name: en, app_id, is_sample, is_deleted, deleted_date, environment, ...data } = record;
          return data;
        });

        const batchSize = 50;
        for (let i = 0; i < cleanedRecords.length; i += batchSize) {
          await delay(250);
          const batch = cleanedRecords.slice(i, i + batchSize);
          await base44.asServiceRole.entities[entName].bulkCreate(batch);
        }

        restoreResult.restored_entities[entName] = records.length;
      } catch (err) {
        restoreResult.errors.push({ entity: entName, error: err.message });
      }
    }

    return Response.json(restoreResult);
  } catch (error) {
    console.error('Restore error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});