// scheduledSync v2 — scheduled automation, service-role auth, timeout-safe
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Fetch all active integrations that have credentials configured
    const allIntegrations = await svc.entities.Integration.filter({ is_active: true });

    const now = new Date();
    const toSync = [];

    for (const integration of allIntegrations) {
      if (!integration.api_key || !integration.api_url) continue;

      const intervalMs = (integration.sync_interval_minutes || 60) * 60 * 1000;

      if (!integration.last_sync) {
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

    // Call syncIntegration for each due integration, with a 15s timeout per call
    const results = [];
    for (const integration of toSync) {
      try {
        const syncPromise = svc.functions.invoke('syncIntegration', {
          integration_id: integration.id,
          mode: 'scheduled',
        });

        // 15s timeout to prevent TIME_LIMIT on the parent function
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Sync timeout (15s)')), 15000)
        );

        const res = await Promise.race([syncPromise, timeoutPromise]);
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