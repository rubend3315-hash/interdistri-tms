import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { backup_id, entity_name } = body;

    // The backup json_data is stored as a string field. 
    // The SDK returns it as a raw string because it's too large.
    // We need to use the raw API to fetch the backup by ID.
    
    const appId = Deno.env.get("BASE44_APP_ID");
    const authHeader = req.headers.get('authorization');
    
    // Fetch the backup record directly via REST API
    const response = await fetch(`https://app.base44.com/api/entities/Backup/${backup_id}`, {
      headers: {
        'Authorization': authHeader,
        'x-app-id': appId
      }
    });
    
    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch backup', status: response.status }, { status: 400 });
    }
    
    const backup = await response.json();
    
    if (!backup || !backup.json_data) {
      return Response.json({ error: 'No json_data', keys: backup ? Object.keys(backup) : null }, { status: 400 });
    }
    
    const backupData = JSON.parse(backup.json_data);
    const entityNames = Object.keys(backupData.entities);
    
    const summary = {};
    for (const name of entityNames) {
      summary[name] = backupData.entities[name]?.length || 0;
    }

    // If specific entity requested, return its data
    if (entity_name && backupData.entities[entity_name]) {
      return Response.json({
        entity: entity_name,
        count: backupData.entities[entity_name].length,
        records: backupData.entities[entity_name]
      });
    }

    return Response.json({ summary, total_entities: entityNames.length });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});