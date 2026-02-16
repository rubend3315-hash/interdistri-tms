import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { backup_id, entity_name, offset, batch_size } = body;

    if (!backup_id || !entity_name) {
      return Response.json({ error: 'backup_id and entity_name required' }, { status: 400 });
    }

    const batchSz = batch_size || 25;
    const startOffset = offset || 0;

    // Use the raw API to fetch just the backup record
    const appId = Deno.env.get("BASE44_APP_ID");
    
    // Use the SDK to fetch the backup
    const backup = await base44.entities.Backup.get(backup_id);
    
    if (!backup || !backup.json_data) {
      return Response.json({ error: 'No backup data found' }, { status: 404 });
    }

    // Parse the json_data to get the entity records
    const backupData = JSON.parse(backup.json_data);
    const records = backupData.entities?.[entity_name];

    if (!records || !Array.isArray(records)) {
      // Return list of available entities
      const available = {};
      for (const [name, recs] of Object.entries(backupData.entities || {})) {
        available[name] = Array.isArray(recs) ? recs.length : 0;
      }
      return Response.json({ error: `Entity ${entity_name} not found`, available });
    }

    // Get the batch to process
    const batch = records.slice(startOffset, startOffset + batchSz);
    
    if (batch.length === 0) {
      return Response.json({ 
        done: true, 
        entity_name,
        total_records: records.length,
        processed_up_to: startOffset
      });
    }

    // Clean records - remove system fields
    const cleanedBatch = batch.map(record => {
      const { id, created_date, updated_date, created_by, created_by_id, is_sample, entity_name: en, app_id, ...data } = record;
      return data;
    });

    // Insert this batch
    await base44.asServiceRole.entities[entity_name].bulkCreate(cleanedBatch);

    return Response.json({
      done: (startOffset + batchSz) >= records.length,
      entity_name,
      total_records: records.length,
      batch_inserted: cleanedBatch.length,
      next_offset: startOffset + batchSz,
      processed_up_to: startOffset + batch.length
    });
  } catch (error) {
    console.error('Restore error:', error);
    return Response.json({ error: error.message, stack: error.stack?.substring(0, 500) }, { status: 500 });
  }
});