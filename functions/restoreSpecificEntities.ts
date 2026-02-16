import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { entity_name, records } = body;

    if (!entity_name || !records || !Array.isArray(records) || records.length === 0) {
      return Response.json({ error: 'entity_name and records[] required' }, { status: 400 });
    }

    // Clean records - remove system fields
    const cleanedRecords = records.map(record => {
      const { id, created_date, updated_date, created_by, created_by_id, is_sample, entity_name: en, app_id, ...data } = record;
      return data;
    });

    // Bulk create in batches of 50
    const batchSize = 50;
    let totalCreated = 0;
    const errors = [];

    for (let i = 0; i < cleanedRecords.length; i += batchSize) {
      try {
        const batch = cleanedRecords.slice(i, i + batchSize);
        await base44.asServiceRole.entities[entity_name].bulkCreate(batch);
        totalCreated += batch.length;
      } catch (err) {
        errors.push({ batch_start: i, error: err.message });
      }
    }

    return Response.json({ 
      entity_name, 
      total_created: totalCreated, 
      total_records: records.length,
      errors 
    });
  } catch (error) {
    console.error('Restore error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});