import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { backup_id, entities_to_restore, debug } = body;

    if (!backup_id) {
      return Response.json({ error: 'backup_id required' }, { status: 400 });
    }

    // Try multiple methods to fetch the backup
    let backup = null;
    let method = '';

    // Method 1: .get()
    try {
      backup = await base44.asServiceRole.entities.Backup.get(backup_id);
      method = 'get';
    } catch (e) {
      console.log('get() failed:', e.message);
    }

    // Method 2: entities SDK .get() without service role
    if (!backup || !backup.json_data) {
      try {
        backup = await base44.entities.Backup.get(backup_id);
        method = 'get_user';
      } catch (e) {
        console.log('get_user() failed:', e.message);
      }
    }

    if (debug) {
      return Response.json({ 
        backup_found: !!backup,
        method,
        has_json_data: !!backup?.json_data,
        backup_keys: backup ? Object.keys(backup) : null,
        backup_type: typeof backup,
        backup_preview: backup ? JSON.stringify(backup).substring(0, 500) : null
      });
    }

    if (!backup || !backup.json_data) {
      return Response.json({ 
        error: 'Backup not found or has no json_data',
        method,
        has_backup: !!backup,
        keys: backup ? Object.keys(backup) : null
      }, { status: 404 });
    }

    const backupData = JSON.parse(backup.json_data);
    const restoreResult = {
      timestamp: new Date().toISOString(),
      restored_entities: {},
      skipped_entities: [],
      errors: []
    };

    const entitiesToProcess = entities_to_restore 
      ? Object.entries(backupData.entities).filter(([name]) => entities_to_restore.includes(name))
      : Object.entries(backupData.entities);

    for (const [entityName, records] of entitiesToProcess) {
      try {
        if (!records || records.length === 0) {
          restoreResult.skipped_entities.push(entityName);
          continue;
        }

        const cleanedRecords = records.map(record => {
          const { id, created_date, updated_date, created_by, created_by_id, is_sample, entity_name: en, app_id, ...data } = record;
          return data;
        });

        const batchSize = 50;
        let totalCreated = 0;
        for (let i = 0; i < cleanedRecords.length; i += batchSize) {
          const batch = cleanedRecords.slice(i, i + batchSize);
          await base44.asServiceRole.entities[entityName].bulkCreate(batch);
          totalCreated += batch.length;
        }
        restoreResult.restored_entities[entityName] = totalCreated;
      } catch (err) {
        restoreResult.errors.push({
          entity: entityName,
          error: err.message,
          count: records?.length || 0
        });
      }
    }

    return Response.json(restoreResult);
  } catch (error) {
    console.error('Restore error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});