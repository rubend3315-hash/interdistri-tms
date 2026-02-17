import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
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

    // Haal alle backup-delen op voor deze groep
    const allParts = await base44.asServiceRole.entities.Backup.filter(
      { backup_group_id: backup_group_id }
    );

    if (!allParts || allParts.length === 0) {
      return Response.json({ error: 'Backup niet gevonden' }, { status: 404 });
    }

    // Check environment
    const metadata = allParts.find(p => p.entity_name === '_metadata');
    if (metadata?.environment && metadata.environment !== 'production') {
      return Response.json({ 
        error: `GEBLOKKEERD: Backup uit "${metadata.environment}" omgeving.`
      }, { status: 403 });
    }

    // Filter op specifieke entity als opgegeven, anders alles
    const partsToRestore = allParts.filter(p => {
      if (p.entity_name === '_metadata') return false;
      if (p.entity_name === 'User') return false; // Users nooit automatisch herstellen
      if (entity_name) {
        // Match entity_name of entity_name__partXofY
        const baseName = p.entity_name.split('__')[0];
        return baseName === entity_name;
      }
      return true;
    });

    const restoreResult = {
      timestamp: new Date().toISOString(),
      restored_by: user.email,
      backup_group_id,
      restored_entities: {},
      skipped: [],
      errors: []
    };

    // Groepeer parts per entity (voor chunked entities)
    const entityParts = {};
    for (const part of partsToRestore) {
      const baseName = part.entity_name.split('__')[0];
      if (!entityParts[baseName]) entityParts[baseName] = [];
      entityParts[baseName].push(part);
    }

    for (const [entName, parts] of Object.entries(entityParts)) {
      try {
        // Combineer alle records uit alle parts
        let allRecords = [];
        for (const part of parts) {
          const records = JSON.parse(part.json_data);
          allRecords = allRecords.concat(records);
        }

        if (allRecords.length === 0) continue;

        // Verwijder bestaande data eerst
        const existing = await base44.asServiceRole.entities[entName].list('', 10000);
        if (existing && existing.length > 0) {
          for (const record of existing) {
            try {
              await base44.asServiceRole.entities[entName].delete(record.id);
            } catch (delErr) {
              // skip delete errors
            }
          }
        }

        // Herstel in batches van 50
        const cleanedRecords = allRecords.map(record => {
          const { id, created_date, updated_date, created_by, created_by_id, entity_name: en, app_id, is_sample, is_deleted, deleted_date, environment, ...data } = record;
          return data;
        });

        const batchSize = 50;
        for (let i = 0; i < cleanedRecords.length; i += batchSize) {
          const batch = cleanedRecords.slice(i, i + batchSize);
          await base44.asServiceRole.entities[entName].bulkCreate(batch);
        }

        restoreResult.restored_entities[entName] = allRecords.length;
      } catch (err) {
        restoreResult.errors.push({ entity: entName, error: err.message });
      }
    }

    // Meld overgeslagen User entity
    const userParts = allParts.filter(p => p.entity_name === 'User');
    if (userParts.length > 0) {
      restoreResult.skipped.push({
        entity: 'User',
        reason: 'User-accounts moeten handmatig uitgenodigd worden',
        count: userParts.reduce((sum, p) => sum + (p.record_count || 0), 0)
      });
    }

    return Response.json(restoreResult);
  } catch (error) {
    console.error('Restore error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});