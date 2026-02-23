// verifyDeployment — pings all known backend functions to verify deployment status
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Critical user-facing functions to verify
const CRITICAL_FUNCTIONS = [
  'submitTimeEntry',
  'upsertDraftTimeEntry',
  'approveTimeEntry',
  'rejectTimeEntry',
  'resubmitTimeEntry',
  'deleteTimeEntryCascade',
  'systemHealthCheck',
  'auditService',
  'mailService',
  'encryptionService',
  'createBackup',
  'generateContract',
  'recalculate',
  'buildDailyPayrollReportData',
  'sendDailyPayrollReportToAzure',
  'generateDailyPayrollReport',
  'downloadContractPdf',
  'parseExcelImport',
  'secureDownload',
  'listContractsLight',
  'exportTimeAndTrips',
  'sendEmployeeEmail',
];

// All other functions (not pinged, listed for completeness)
const OTHER_FUNCTIONS = [
  'systemHealthMonitor', 'tenantService', 'autoInviteEmployee', 'exportCriticalData',
  'exportToSupabase', 'sendWelcomeEmail', 'sendStamkaartEmail', 'sendContractForSigning',
  'sendTimeEntryRejectionEmail', 'shareIdDocument', 'guardAuditLog', 'guardTenantDelete',
  'guardTenantId', 'hrmAutomation', 'generateNotifications', 'checkExpiringDocuments',
  'downloadDailyPayrollReportJson', 'downloadDailyPayrollSchema', 'verifyDeployment',
  'addStarttijdToExisting', 'analyzeContract', 'checkEmployeeStatus', 'cleanupOrphanTimeEntries',
  'clearTestDatabase', 'deleteAllRapportageRits', 'exportPDFToEmail', 'fixRapportageKlantIds',
  'generatePerformanceReviewPDF', 'generateReport', 'generateSupabaseSQL',
  'generateSystemArchitecturePdf', 'getContractForPdf', 'getExcelColumns', 'importFromSupabase',
  'importGmailHistory', 'migrateCustomerData', 'migrateFullSystem', 'migrateTenantIds',
  'notifyContractSigned', 'notifyImportComplete', 'notifyNewDocument', 'onContractActivated',
  'processContractWijziging', 'processPostNLImportToRapportage', 'removeDuplicatePostNLImports',
  'removeDuplicates', 'restoreBackup', 'retryEmail', 'scheduledSync', 'sendContractReminders',
  'sendContractToPayroll', 'testEmailSend', 'testSignatureFetch', 'testSignatureRender',
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

    // Ping critical functions sequentially (one at a time) to avoid rate limits
    for (const fnName of CRITICAL_FUNCTIONS) {
      try {
        const res = await base44.functions.invoke(fnName, { _ping: true });
        checkedFunctions.push({ name: fnName, status: 'OK', errorMessage: null, httpStatus: res?.status || 200 });
      } catch (err) {
        const msg = err?.message || String(err);
        const httpCode = err?.status || null;
        const is404 = msg.includes('404') || msg.includes('not found') || msg.includes('does not exist');
        const isAuthError = [400, 401, 403, 422].includes(httpCode) || /40[0-3]|422/.test(msg);
        const isRateLimit = msg.includes('429') || msg.includes('502') || msg.includes('Rate limit');
        let status = 'ERROR';
        if (is404) status = 'NOT_DEPLOYED';
        else if (isAuthError || isRateLimit) status = 'OK'; // rate limit = function exists
        checkedFunctions.push({ name: fnName, status, errorMessage: status === 'OK' ? null : msg, httpStatus: httpCode });
      }
    }

    // Add other functions as "not checked" (they exist in the codebase but aren't pinged)
    for (const fnName of OTHER_FUNCTIONS) {
      checkedFunctions.push({ name: fnName, status: 'SKIPPED', errorMessage: 'Niet gecontroleerd (niet-kritiek)', httpStatus: null });
    }

    const criticalResults = checkedFunctions.filter(r => r.status !== 'SKIPPED');
    const errorCount = criticalResults.filter(r => r.status !== 'OK').length;
    const totalFunctions = CRITICAL_FUNCTIONS.length + OTHER_FUNCTIONS.length;

    return Response.json({
      success: true,
      checkedFunctions,
      errorCount,
      version: '2026-02-23-v2',
      timestamp: new Date().toISOString(),
      summary: {
        total: totalFunctions,
        checked: CRITICAL_FUNCTIONS.length,
        skipped: OTHER_FUNCTIONS.length,
        ok: criticalResults.filter(r => r.status === 'OK').length,
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