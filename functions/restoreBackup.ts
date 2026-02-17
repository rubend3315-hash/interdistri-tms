import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { backup_id, confirmation_code } = body;

    if (!backup_id) {
      return Response.json({ error: 'backup_id is verplicht' }, { status: 400 });
    }

    // VEILIGHEID: Bevestigingscode vereist
    if (!confirmation_code || confirmation_code !== 'HERSTEL-BEVESTIGD') {
      return Response.json({ 
        error: 'Bevestigingscode ontbreekt of is onjuist. Typ exact: HERSTEL-BEVESTIGD',
        requires_confirmation: true
      }, { status: 400 });
    }

    // Fetch the backup
    const backup = await base44.asServiceRole.entities.Backup.read(backup_id);
    if (!backup) {
      return Response.json({ error: 'Backup niet gevonden' }, { status: 404 });
    }

    const backupData = JSON.parse(backup.json_data);

    // VEILIGHEID: Check of backup van productie is (niet test)
    if (backupData.environment && backupData.environment !== 'production') {
      return Response.json({ 
        error: `GEBLOKKEERD: Deze backup komt uit de "${backupData.environment}" omgeving. Alleen productie-backups kunnen hersteld worden naar productie.`
      }, { status: 403 });
    }

    const restoreResult = {
      timestamp: new Date().toISOString(),
      restored_by: user.email,
      restored_entities: {},
      skipped_entities: [],
      errors: []
    };

    // Restore each entity EXCEPT User (users moeten handmatig uitgenodigd worden)
    for (const [entityName, records] of Object.entries(backupData.entities)) {
      // Skip User entity - user accounts kunnen niet via bulkCreate hersteld worden
      if (entityName === 'User') {
        restoreResult.skipped_entities.push({
          entity: 'User',
          reason: 'User-accounts worden niet automatisch hersteld. Nodig gebruikers opnieuw uit via Gebruikersbeheer.',
          count: records?.length || 0
        });
        continue;
      }

      try {
        if (records && records.length > 0) {
          // Bulk create restored records
          const cleanedRecords = records.map(record => {
            const { id, created_date, updated_date, created_by, created_by_id, entity_name, app_id, is_sample, is_deleted, deleted_date, environment, ...data } = record;
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