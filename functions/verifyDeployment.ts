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
  // verifyDeployment moet ALTIJD 200 retourneren — nooit throwen
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (authErr) {
      return Response.json({
        success: true,
        checkedFunctions: [{
          name: '_auth',
          status: 'ERROR',
          errorMessage: authErr?.message || 'Auth failed',
          httpStatus: null,
        }],
        errorCount: 1,
        version: '2026-02-23-hardened',
        timestamp: new Date().toISOString(),
      }, { status: 200 });
    }

    if (!user || user.role !== 'admin') {
      return Response.json({
        success: true,
        checkedFunctions: [],
        errorCount: 0,
        message: 'Forbidden: Admin access required',
        version: '2026-02-23-hardened',
        timestamp: new Date().toISOString(),
      }, { status: 200 });
    }

    const checkedFunctions = [];

    for (const fnName of ALL_FUNCTIONS) {
      try {
        const res = await base44.functions.invoke(fnName, { _ping: true });
        checkedFunctions.push({
          name: fnName,
          status: 'OK',
          errorMessage: null,
          httpStatus: res?.status || 200,
        });
      } catch (err) {
        const msg = err?.message || String(err);
        const is404 = msg.includes('404') || msg.includes('not found') || msg.includes('does not exist');
        checkedFunctions.push({
          name: fnName,
          status: is404 ? 'NOT_DEPLOYED' : 'ERROR',
          errorMessage: msg,
          httpStatus: err?.status || null,
        });
      }
    }

    const errorCount = checkedFunctions.filter(r => r.status !== 'OK').length;

    return Response.json({
      success: true,
      checkedFunctions,
      errorCount,
      version: '2026-02-23-hardened',
      timestamp: new Date().toISOString(),
      summary: {
        total: ALL_FUNCTIONS.length,
        ok: ALL_FUNCTIONS.length - errorCount,
        failed: errorCount,
        allHealthy: errorCount === 0,
      },
    }, { status: 200 });
  } catch (outerError) {
    // Absolute safety net — nooit 500/502
    return Response.json({
      success: true,
      checkedFunctions: [{
        name: '_verifyDeployment',
        status: 'ERROR',
        errorMessage: outerError?.message || 'Unknown error',
        httpStatus: null,
      }],
      errorCount: 1,
      version: '2026-02-23-hardened',
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  }
});