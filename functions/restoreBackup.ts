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

    // Body can contain backup_id OR inline backup_data
    let backupData;
    if (body.backup_data) {
      backupData = body.backup_data;
    } else {
      // Try to fetch from file URL if provided
      if (body.file_url) {
        const resp = await fetch(body.file_url);
        backupData = await resp.json();
      } else {
        return Response.json({ error: 'Provide backup_data or file_url' }, { status: 400 });
      }
    }
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