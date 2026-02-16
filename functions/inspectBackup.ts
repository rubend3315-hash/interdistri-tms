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

    // Try fetching backup using the base44 internal fetch  
    const appId = Deno.env.get("BASE44_APP_ID");
    
    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    
    // Use the SDK to get the backup
    const allBackups = await base44.asServiceRole.entities.Backup.list();
    
    // Log what we get
    console.log("Type:", typeof allBackups);
    console.log("Is array:", Array.isArray(allBackups));
    
    if (Array.isArray(allBackups)) {
      console.log("Length:", allBackups.length);
      if (allBackups.length > 0) {
        console.log("First backup id:", allBackups[0].id);
        console.log("First backup keys:", Object.keys(allBackups[0]));
      }
    }

    // Try to find backup
    let targetBackup = null;
    if (Array.isArray(allBackups)) {
      targetBackup = allBackups.find(b => b.id === backup_id);
    }

    if (!targetBackup) {
      return Response.json({ 
        error: 'Backup not found',
        type: typeof allBackups,
        isArray: Array.isArray(allBackups),
        length: allBackups?.length,
        sample: Array.isArray(allBackups) && allBackups.length > 0 ? { id: allBackups[0].id, keys: Object.keys(allBackups[0]) } : null
      });
    }

    // Parse backup data
    const backupData = JSON.parse(targetBackup.json_data);
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

    return Response.json({ summary });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});