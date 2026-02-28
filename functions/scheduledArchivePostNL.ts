// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SCHEDULED AUTOMATION                            ║
// ║ Called by: monthly automation                                  ║
// ║ Auth: Admin session (via automation)                           ║
// ║ Purpose: Calculate cutoff (12 months ago) and call archive fn  ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Calculate cutoff: 12 months ago from today
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
    const cutoffStr = cutoff.toISOString().split('T')[0];

    console.log(`[scheduledArchivePostNL] Invoking archiveOldPostNLImports with cutoff=${cutoffStr}`);

    const result = await base44.functions.invoke('archiveOldPostNLImports', { cutoff_date: cutoffStr });

    console.log(`[scheduledArchivePostNL] Result:`, JSON.stringify(result.data));

    return Response.json({ success: true, cutoff_date: cutoffStr, result: result.data });
  } catch (error) {
    console.error('[scheduledArchivePostNL]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});