// verifyDeployment v4 — Promise.allSettled, error-isolated per function, never 500
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
  'recalculateWeeklySummaries',
  'recalculateMonthlyCustomerSummary',
  'archiveOldPostNLImports',
  'adminCreateTimeEntry',
  'adminUpdateTimeEntry',
  'onTripOrSpwChange',
  'recalculateAfterTimeEntrySubmit',
  'monitorStuckMobileSubmissions',
];

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
  'rbacDailySnapshot', 'rbacShadowValidation', 'rebuildMonthlySummaries', 'rebuildWeeklySummaries',
  'recalcBreaks', 'scheduledArchivePostNL', 'calculateMobileEntryLatencyStats',
  'bulkSyncBusinessRole', 'guardAuditLogs',
];

/**
 * Determines if a function is deployed based on the invoke result.
 * deployed=false ONLY when: 404, "not deployed", "not found"
 * 400/401/403/422 = function exists = deployed=true
 */
function classifyResult(fnName, settled) {
  const result = {
    name: fnName,
    deployed: true,
    http_status: null,
    error_message: null,
  };

  if (settled.status === 'fulfilled') {
    const res = settled.value;
    result.http_status = res?.status || 200;
    return result;
  }

  // rejected
  const err = settled.reason;
  const msg = err?.message || String(err);
  const httpStatus = err?.response?.status || err?.status || null;
  result.http_status = httpStatus;
  result.error_message = msg;

  // Check for not-deployed indicators
  const msgLower = msg.toLowerCase();
  const isNotDeployed =
    httpStatus === 404 ||
    msgLower.includes('not found') ||
    msgLower.includes('not deployed') ||
    msgLower.includes('does not exist') ||
    msgLower.includes('function not found');

  if (isNotDeployed) {
    result.deployed = false;
    return result;
  }

  // 400/401/403/422 = function exists, just validation/auth error
  if ([400, 401, 403, 422].includes(httpStatus)) {
    result.deployed = true;
    result.error_message = null; // not an error — function exists
    return result;
  }

  // 429/502/503 = probably exists but overloaded
  if ([429, 502, 503].includes(httpStatus)) {
    result.deployed = true; // assume deployed
    result.error_message = `Rate limit / overload (${httpStatus})`;
    return result;
  }

  // Any other error: function might exist but had an internal error
  // Still mark as deployed=true unless we explicitly got 404
  result.deployed = true;
  return result;
}

Deno.serve(async (req) => {
  // ABSOLUTE RULE: this function NEVER returns non-200
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (authErr) {
      return Response.json({
        success: true,
        functions: [],
        summary: { total: 0, checked: 0, deployed: 0, not_deployed: 0, errors: 0 },
        auth_error: authErr?.message || 'Auth failed',
        version: '2026-02-28-v4',
        timestamp: new Date().toISOString(),
      }, { status: 200 });
    }

    if (!user || user.role !== 'admin') {
      return Response.json({
        success: true,
        functions: [],
        summary: { total: 0, checked: 0, deployed: 0, not_deployed: 0, errors: 0 },
        auth_error: 'Forbidden: Admin access required',
        version: '2026-02-28-v4',
        timestamp: new Date().toISOString(),
      }, { status: 200 });
    }

    // Test all critical functions in parallel with Promise.allSettled
    const promises = CRITICAL_FUNCTIONS.map(fnName =>
      base44.functions.invoke(fnName, { _ping: true })
    );

    const settled = await Promise.allSettled(promises);

    const functions = [];

    // Classify each critical function
    for (let i = 0; i < CRITICAL_FUNCTIONS.length; i++) {
      functions.push(classifyResult(CRITICAL_FUNCTIONS[i], settled[i]));
    }

    // Add other functions as not-checked
    for (const fnName of OTHER_FUNCTIONS) {
      functions.push({
        name: fnName,
        deployed: null, // unknown — not checked
        http_status: null,
        error_message: null,
        skipped: true,
      });
    }

    const criticalResults = functions.filter(f => !f.skipped);
    const deployedCount = criticalResults.filter(f => f.deployed === true).length;
    const notDeployedCount = criticalResults.filter(f => f.deployed === false).length;
    const withErrors = criticalResults.filter(f => f.deployed === true && f.error_message).length;

    return Response.json({
      success: true,
      functions,
      summary: {
        total: CRITICAL_FUNCTIONS.length + OTHER_FUNCTIONS.length,
        checked: CRITICAL_FUNCTIONS.length,
        skipped: OTHER_FUNCTIONS.length,
        deployed: deployedCount,
        not_deployed: notDeployedCount,
        errors: withErrors,
        all_deployed: notDeployedCount === 0,
      },
      version: '2026-02-28-v4',
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (outerError) {
    // Absolute safety net — NEVER 500
    return Response.json({
      success: false,
      functions: [],
      summary: { total: 0, checked: 0, deployed: 0, not_deployed: 0, errors: 1 },
      outer_error: outerError?.message || 'Unknown error in verifyDeployment',
      version: '2026-02-28-v4',
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  }
});