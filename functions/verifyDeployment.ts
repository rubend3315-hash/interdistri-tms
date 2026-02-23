// verifyDeployment — pings all known backend functions to verify deployment status
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ALL_FUNCTIONS = [
  'submitTimeEntry',
  'upsertDraftTimeEntry',
  'approveTimeEntry',
  'rejectTimeEntry',
  'resubmitTimeEntry',
  'deleteTimeEntryCascade',
  'systemHealthCheck',
  'systemHealthMonitor',
  'auditService',
  'mailService',
  'encryptionService',
  'tenantService',
  'autoInviteEmployee',
  'createBackup',
  'exportCriticalData',
  'exportToSupabase',
  'sendWelcomeEmail',
  'sendStamkaartEmail',
  'sendEmployeeEmail',
  'sendContractForSigning',
  'sendTimeEntryRejectionEmail',
  'generateContract',
  'secureDownload',
  'shareIdDocument',
  'recalculate',
  'guardAuditLog',
  'guardTenantDelete',
  'guardTenantId',
  'hrmAutomation',
  'generateNotifications',
  'checkExpiringDocuments',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = [];

    for (const fnName of ALL_FUNCTIONS) {
      try {
        const res = await base44.functions.invoke(fnName, { _ping: true });
        // Any non-404 response means the function is deployed
        results.push({
          function: fnName,
          status: 'OK',
          httpStatus: res.status || 200,
          message: ''
        });
      } catch (err) {
        const msg = err?.message || String(err);
        const is404 = msg.includes('404') || msg.includes('not found') || msg.includes('does not exist');
        results.push({
          function: fnName,
          status: is404 ? 'NOT_DEPLOYED' : 'OK',
          httpStatus: is404 ? 404 : (err?.status || 'error'),
          message: is404 ? 'Function not deployed' : ''
        });
      }
    }

    const totalOk = results.filter(r => r.status === 'OK').length;
    const totalFailed = results.filter(r => r.status !== 'OK').length;

    return Response.json({
      version: '2026-02-23-stable',
      timestamp: new Date().toISOString(),
      summary: {
        total: ALL_FUNCTIONS.length,
        ok: totalOk,
        failed: totalFailed,
        allHealthy: totalFailed === 0
      },
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});