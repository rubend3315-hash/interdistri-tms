import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { backup_id, entity_name, offset, batch_size, list_only } = body;

    if (!backup_id) {
      return Response.json({ error: 'backup_id required' }, { status: 400 });
    }

    // Use filter to find the backup - filter returns data differently than get
    const backups = await base44.asServiceRole.entities.Backup.filter({ id: backup_id });
    
    if (!backups || backups.length === 0) {
      return Response.json({ error: 'Backup not found via filter' }, { status: 404 });
    }

    const backup = backups[0];
    const jsonStr = backup.json_data;

    if (!jsonStr) {
      return Response.json({ 
        error: 'No json_data field', 
        keys: Object.keys(backup),
        preview: JSON.stringify(backup).substring(0, 300)
      }, { status: 400 });
    }

    const backupData = JSON.parse(jsonStr);

    // List mode
    if (list_only || !entity_name) {
      const summary = {};
      for (const [name, recs] of Object.entries(backupData.entities || {})) {
        summary[name] = Array.isArray(recs) ? recs.length : 0;
      }
      return Response.json({ summary, timestamp: backupData.timestamp });
    }

    const records = backupData.entities?.[entity_name];
    if (!records || !Array.isArray(records) || records.length === 0) {
      const available = {};
      for (const [name, recs] of Object.entries(backupData.entities || {})) {
        available[name] = Array.isArray(recs) ? recs.length : 0;
      }
      return Response.json({ error: `No records for ${entity_name}`, available });
    }

    const batchSz = batch_size || 25;
    const startOffset = offset || 0;
    const batch = records.slice(startOffset, startOffset + batchSz);

    if (batch.length === 0) {
      return Response.json({ done: true, total: records.length });
    }

    // Clean system fields
    const cleaned = batch.map(r => {
      const { id, created_date, updated_date, created_by, created_by_id, is_sample, entity_name: en, app_id, ...data } = r;
      return data;
    });

    await base44.asServiceRole.entities[entity_name].bulkCreate(cleaned);

    return Response.json({
      done: (startOffset + batchSz) >= records.length,
      entity_name,
      total: records.length,
      inserted: cleaned.length,
      next_offset: startOffset + batchSz
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});