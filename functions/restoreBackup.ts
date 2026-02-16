import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { backup_id } = body;

    if (!backup_id) {
      return Response.json({ error: 'backup_id required' }, { status: 400 });
    }

    // Fetch the backup - filter returns array-like object
    const backupResults = await base44.asServiceRole.entities.Backup.filter({});
    const backupsArray = Array.from(backupResults);
    const backup = backupsArray.find(b => b.id === backup_id);
    if (!backup) {
      return Response.json({ error: 'Backup not found', count: backupsArray.length }, { status: 404 });
    }

    const dataField = backup.json_data;
    if (!dataField) {
      return Response.json({ 
        error: 'No json_data found', 
        keys: Object.keys(backup)
      }, { status: 400 });
    }
    const backupData = JSON.parse(dataField);
    const restoreResult = {
      timestamp: new Date().toISOString(),
      restored_entities: {},
      errors: []
    };

    // Restore each entity
    for (const [entityName, records] of Object.entries(backupData.entities)) {
      try {
        if (records && records.length > 0) {
          // Bulk create restored records
          const cleanedRecords = records.map(record => {
            const { id, created_date, updated_date, created_by, ...data } = record;
            return data;
          });

          await base44.asServiceRole.entities[entityName].bulkCreate(cleanedRecords);
          restoreResult.restored_entities[entityName] = records.length;
        }
      } catch (err) {
        restoreResult.errors.push({
          entity: entityName,
          error: err.message
        });
      }
    }

    return Response.json(restoreResult);
  } catch (error) {
    console.error('Restore error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});