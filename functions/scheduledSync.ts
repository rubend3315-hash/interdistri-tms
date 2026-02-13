import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active integrations that have credentials configured
    const allIntegrations = await base44.asServiceRole.entities.Integration.filter({ is_active: true });

    const now = new Date();
    const toSync = [];

    for (const integration of allIntegrations) {
      if (!integration.api_key || !integration.api_url) continue;

      const intervalMs = (integration.sync_interval_minutes || 60) * 60 * 1000;

      if (!integration.last_sync) {
        // Never synced before — sync now
        toSync.push(integration);
      } else {
        const lastSync = new Date(integration.last_sync);
        if (now - lastSync >= intervalMs) {
          toSync.push(integration);
        }
      }
    }

    if (toSync.length === 0) {
      return Response.json({ success: true, message: "Geen integraties om te synchroniseren", synced: 0 });
    }

    // Call the syncIntegration function for each integration that is due
    const results = [];
    for (const integration of toSync) {
      try {
        const res = await base44.functions.invoke('syncIntegration', {
          integration_id: integration.id,
          mode: 'scheduled',
        });
        results.push({ id: integration.id, name: integration.name, result: res.data || res });
      } catch (err) {
        results.push({ id: integration.id, name: integration.name, error: err.message });
      }
    }

    return Response.json({ success: true, synced: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});