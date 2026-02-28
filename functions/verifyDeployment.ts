// verifyDeployment v6 — batched checks with delay to avoid 429 rate limits
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Dependency map: parent → child functions that must also be deployed
const DEPENDENCY_MAP = {
  'submitTimeEntry': ['recalculateAfterTimeEntrySubmit'],
  'approveTimeEntry': ['recalculateWeeklySummaries'],
  'recalculate': ['recalculateWeeklySummaries', 'recalculateMonthlyCustomerSummary'],
  'generateContract': ['downloadContractPdf', 'sendContractForSigning'],
  'buildDailyPayrollReportData': ['sendDailyPayrollReportToAzure'],
};

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
  'sendContractForSigning',
];

const OTHER_FUNCTIONS = [
  'systemHealthMonitor', 'tenantService', 'autoInviteEmployee', 'exportCriticalData',
  'exportToSupabase', 'sendWelcomeEmail', 'sendStamkaartEmail',
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
  'bulkSyncBusinessRole', 'guardAuditLogs', 'hourlyVerification',
];

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

  const err = settled.reason;
  const msg = err?.message || String(err);
  const httpStatus = err?.response?.status || err?.status || null;
  result.http_status = httpStatus;
  result.error_message = msg;

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

  if ([400, 401, 403, 422].includes(httpStatus)) {
    result.deployed = true;
    result.error_message = null;
    return result;
  }

  if ([429, 502, 503].includes(httpStatus)) {
    result.deployed = true;
    result.error_message = `Rate limit / overload (${httpStatus})`;
    return result;
  }

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
        success: true, functions: [], dependency_checks: [],
        summary: { total: 0, checked: 0, deployed: 0, not_deployed: 0, errors: 0 },
        auth_error: authErr?.message || 'Auth failed',
        version: '2026-02-28-v5', timestamp: new Date().toISOString(),
      }, { status: 200 });
    }

    if (!user || user.role !== 'admin') {
      return Response.json({
        success: true, functions: [], dependency_checks: [],
        summary: { total: 0, checked: 0, deployed: 0, not_deployed: 0, errors: 0 },
        auth_error: 'Forbidden: Admin access required',
        version: '2026-02-28-v5', timestamp: new Date().toISOString(),
      }, { status: 200 });
    }

    // ========================================
    // 1. Test all critical functions in batches to avoid 429
    // ========================================
    const BATCH_SIZE = 4;
    const BATCH_DELAY_MS = 1500;
    const functions = [];

    for (let batchStart = 0; batchStart < CRITICAL_FUNCTIONS.length; batchStart += BATCH_SIZE) {
      if (batchStart > 0) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
      const batch = CRITICAL_FUNCTIONS.slice(batchStart, batchStart + BATCH_SIZE);
      const batchPromises = batch.map(fnName =>
        base44.functions.invoke(fnName, { _ping: true })
      );
      const batchSettled = await Promise.allSettled(batchPromises);
      for (let i = 0; i < batch.length; i++) {
        functions.push(classifyResult(batch[i], batchSettled[i]));
      }
    }

    // ========================================
    // 2. Dependency checks — verify child functions of critical parents
    // ========================================
    const depChecks = [];
    const alreadyChecked = new Set(CRITICAL_FUNCTIONS);
    const extraToCheck = [];

    for (const [parent, children] of Object.entries(DEPENDENCY_MAP)) {
      for (const child of children) {
        if (!alreadyChecked.has(child)) {
          extraToCheck.push({ parent, child });
          alreadyChecked.add(child);
        } else {
          // Already checked as critical — find the result
          const existing = functions.find(f => f.name === child);
          depChecks.push({
            parent,
            child,
            deployed: existing?.deployed ?? null,
            http_status: existing?.http_status ?? null,
            error_message: existing?.error_message ?? null,
          });
        }
      }
    }

    // Check any extra dependency functions not in critical list (with delay)
    if (extraToCheck.length > 0) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      const extraPromises = extraToCheck.map(({ child }) =>
        base44.functions.invoke(child, { _ping: true })
      );
      const extraSettled = await Promise.allSettled(extraPromises);
      for (let i = 0; i < extraToCheck.length; i++) {
        const classified = classifyResult(extraToCheck[i].child, extraSettled[i]);
        depChecks.push({
          parent: extraToCheck[i].parent,
          child: extraToCheck[i].child,
          deployed: classified.deployed,
          http_status: classified.http_status,
          error_message: classified.error_message,
        });
      }
    }

    // ========================================
    // 3. Add other functions as not-checked
    // ========================================
    for (const fnName of OTHER_FUNCTIONS) {
      functions.push({
        name: fnName,
        deployed: null,
        http_status: null,
        error_message: null,
        skipped: true,
      });
    }

    // ========================================
    // 4. Summary
    // ========================================
    const criticalResults = functions.filter(f => !f.skipped);
    const deployedCount = criticalResults.filter(f => f.deployed === true).length;
    const notDeployedCount = criticalResults.filter(f => f.deployed === false).length;
    const withErrors = criticalResults.filter(f => f.deployed === true && f.error_message).length;

    const depFailures = depChecks.filter(d => d.deployed === false);
    const depErrors = depChecks.filter(d => d.error_message);

    return Response.json({
      success: true,
      functions,
      dependency_checks: depChecks,
      dependency_map: DEPENDENCY_MAP,
      summary: {
        total: CRITICAL_FUNCTIONS.length + OTHER_FUNCTIONS.length,
        checked: CRITICAL_FUNCTIONS.length,
        skipped: OTHER_FUNCTIONS.length,
        deployed: deployedCount,
        not_deployed: notDeployedCount,
        errors: withErrors,
        all_deployed: notDeployedCount === 0,
        dependency_failures: depFailures.length,
        dependency_errors: depErrors.length,
        all_dependencies_ok: depFailures.length === 0,
      },
      version: '2026-02-28-v5',
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (outerError) {
    // Absolute safety net — NEVER 500
    return Response.json({
      success: false,
      functions: [], dependency_checks: [],
      summary: { total: 0, checked: 0, deployed: 0, not_deployed: 0, errors: 1 },
      outer_error: outerError?.message || 'Unknown error in verifyDeployment',
      version: '2026-02-28-v5',
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  }
});