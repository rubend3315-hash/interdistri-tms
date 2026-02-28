// hourlyVerification — Scheduled function to verify critical deployment health
// Checks a focused subset of high-priority functions (fast, <30s)
// On failure: creates Notification for admin + AuditLog entry
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Only check the most critical functions + their dependencies
const CRITICAL_CHECK = [
  'submitTimeEntry',
  'recalculateAfterTimeEntrySubmit',
  'approveTimeEntry',
  'recalculateWeeklySummaries',
  'upsertDraftTimeEntry',
  'rejectTimeEntry',
  'adminCreateTimeEntry',
  'adminUpdateTimeEntry',
  'auditService',
  'systemHealthCheck',
];

function classifyResult(fnName, settled) {
  const result = { name: fnName, deployed: true, error: null };
  if (settled.status === 'fulfilled') return result;
  const err = settled.reason;
  const msg = err?.message || String(err);
  const httpStatus = err?.response?.status || err?.status || null;
  result.error = msg;
  const msgLower = msg.toLowerCase();
  if (httpStatus === 404 || msgLower.includes('not found') || msgLower.includes('not deployed') || msgLower.includes('does not exist')) {
    result.deployed = false;
  } else if ([400, 401, 403, 422].includes(httpStatus)) {
    result.deployed = true;
    result.error = null;
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Check all critical functions in parallel
    const promises = CRITICAL_CHECK.map(fnName =>
      svc.functions.invoke(fnName, { _ping: true })
    );
    const settled = await Promise.allSettled(promises);

    const results = CRITICAL_CHECK.map((fn, i) => classifyResult(fn, settled[i]));
    const notDeployed = results.filter(r => !r.deployed);
    const hasIssues = notDeployed.length > 0;

    // Always log to AuditLog
    await svc.entities.AuditLog.create({
      action_type: 'create',
      category: 'Systeem',
      description: hasIssues
        ? `Hourly verification FAILED: ${notDeployed.map(r => r.name).join(', ')} not deployed`
        : `Hourly verification OK: ${results.length}/${results.length} critical functions deployed`,
      performed_by_email: 'system',
      performed_by_role: 'system',
      target_entity: 'System',
      target_id: 'hourly-verification',
      metadata: {
        checked: results.length,
        deployed: results.filter(r => r.deployed).length,
        not_deployed: notDeployed.length,
        failed_names: notDeployed.map(r => r.name),
        timestamp: new Date().toISOString(),
      },
    });

    // On failure: create Notification for admin
    if (hasIssues) {
      await svc.entities.Notification.create({
        title: `Deployment verificatie: ${notDeployed.length} functie(s) niet gedeployed`,
        description: `Niet beschikbaar: ${notDeployed.map(r => r.name).join(', ')}. Controleer Deployment Status.`,
        type: 'general',
        priority: 'urgent',
        target_page: 'DeploymentStatus',
        is_read: false,
      });
    }

    return Response.json({
      success: true,
      has_issues: hasIssues,
      results,
      not_deployed: notDeployed.map(r => r.name),
      timestamp: new Date().toISOString(),
    });

  } catch (outerError) {
    console.error('[hourlyVerification] Unhandled:', outerError);
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.AuditLog.create({
        action_type: 'create',
        category: 'Systeem',
        description: `Hourly verification CRASHED: ${(outerError.message || '').slice(0, 300)}`,
        performed_by_email: 'system',
        performed_by_role: 'system',
        target_entity: 'System',
        target_id: 'hourly-verification',
      });
    } catch (_) {}
    // Always return 200 — this is a monitoring function
    return Response.json({ success: false, error: outerError.message }, { status: 200 });
  }
});