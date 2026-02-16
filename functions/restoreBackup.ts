import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { backup_id, entities_to_restore } = body;

    if (!backup_id) {
      return Response.json({ error: 'backup_id required' }, { status: 400 });
    }

    // Direct API fetch of the backup entity by ID using the entities SDK
    // Use a workaround: list all and find by id
    let backup = null;
    let page = 0;
    const pageSize = 50;
    
    while (!backup) {
      const batch = await base44.asServiceRole.entities.Backup.list('-created_date', pageSize, page * pageSize);
      if (!batch || batch.length === 0) break;
      
      for (let i = 0; i < batch.length; i++) {
        if (batch[i].id === backup_id) {
          backup = batch[i];
          break;
        }
      }
      page++;
      if (page > 20) break; // safety limit
    }
    
    if (!backup) {
      return Response.json({ error: 'Backup not found after scanning' }, { status: 404 });
    }

    const jsonData = backup.json_data;
    if (!jsonData) {
      return Response.json({ error: 'No json_data in backup' }, { status: 400 });
    }

    const backupData = JSON.parse(jsonData);
    const restoreResult = {
      timestamp: new Date().toISOString(),
      restored_entities: {},
      skipped_entities: [],
      errors: []
    };

    // If specific entities requested, only restore those
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
          const { id, created_date, updated_date, created_by, created_by_id, is_sample, entity_name, app_id, ...data } = record;
          return data;
        });

        // Bulk create in batches of 50
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