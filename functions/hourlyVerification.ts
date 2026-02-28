// hourlyVerification — Scheduled function to verify deployment health
// On failure: creates Notification for admin + AuditLog entry
// Called by automation every hour
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Invoke verifyDeployment (always returns 200)
    let verifyResult;
    try {
      const res = await svc.functions.invoke('verifyDeployment', { _automated: true });
      verifyResult = res?.data || res;
    } catch (e) {
      verifyResult = { success: false, outer_error: e?.message || 'invoke failed' };
    }

    const summary = verifyResult?.summary || {};
    const notDeployed = summary.not_deployed || 0;
    const depFailures = summary.dependency_failures || 0;
    const hasIssues = notDeployed > 0 || depFailures > 0 || !verifyResult?.success;

    // Always log to AuditLog
    await svc.entities.AuditLog.create({
      action_type: 'create',
      category: 'Systeem',
      description: hasIssues
        ? `Hourly verification FAILED: ${notDeployed} not deployed, ${depFailures} dependency failures`
        : `Hourly verification OK: ${summary.deployed || 0}/${summary.checked || 0} deployed, all dependencies OK`,
      performed_by_email: 'system',
      performed_by_role: 'system',
      target_entity: 'System',
      target_id: 'hourly-verification',
      metadata: {
        deployed: summary.deployed || 0,
        not_deployed: notDeployed,
        dependency_failures: depFailures,
        errors: summary.errors || 0,
        timestamp: new Date().toISOString(),
      },
    });

    // On failure: create Notification for admin
    if (hasIssues) {
      const failedFns = (verifyResult?.functions || [])
        .filter(f => f.deployed === false)
        .map(f => f.name);
      const failedDeps = (verifyResult?.dependency_checks || [])
        .filter(d => d.deployed === false)
        .map(d => `${d.child} (dep of ${d.parent})`);

      const details = [
        ...failedFns.map(n => `⛔ ${n}`),
        ...failedDeps.map(n => `🔗 ${n}`),
      ].join(', ') || 'Onbekend';

      await svc.entities.Notification.create({
        title: `Deployment verificatie gefaald: ${notDeployed + depFailures} problemen`,
        description: `Niet-gedeployed: ${details}. Controleer de Deployment Status pagina.`,
        type: 'general',
        priority: 'urgent',
        target_page: 'DeploymentStatus',
        is_read: false,
      });
    }

    return Response.json({
      success: true,
      has_issues: hasIssues,
      summary,
      timestamp: new Date().toISOString(),
    });

  } catch (outerError) {
    console.error('[hourlyVerification] Unhandled:', outerError);
    // Best-effort audit log
    try {
      const base44 = createClientFromRequest(req);
      const svc = base44.asServiceRole;
      await svc.entities.AuditLog.create({
        action_type: 'create',
        category: 'Systeem',
        description: `Hourly verification CRASHED: ${(outerError.message || '').slice(0, 300)}`,
        performed_by_email: 'system',
        performed_by_role: 'system',
        target_entity: 'System',
        target_id: 'hourly-verification',
      });
    } catch (_) {}
    return Response.json({ success: false, error: outerError.message }, { status: 200 });
  }
});