// Scheduled wrapper for syncTripsFromNaiton
// Runs daily at 19:00 — syncs GPS trips for yesterday and today
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Calculate date range: yesterday + today
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const fmt = (d) => d.toISOString().split('T')[0];

    const date_from = fmt(yesterday);
    const date_to = fmt(today);

    console.log(`[SCHEDULED GPS SYNC] Syncing ${date_from} → ${date_to}`);

    const result = await base44.asServiceRole.functions.invoke('syncTripsFromNaiton', {
      date_from,
      date_to,
    });

    console.log(`[SCHEDULED GPS SYNC] Result:`, JSON.stringify(result?.data || result));

    return Response.json({
      success: true,
      date_from,
      date_to,
      sync_result: result?.data || result,
    });
  } catch (error) {
    console.error('[SCHEDULED GPS SYNC] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});