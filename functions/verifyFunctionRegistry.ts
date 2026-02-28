// verifyFunctionRegistry v1 — manifest-based registry integrity check, never 500
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CRITICAL FUNCTION MANIFEST
 * Single source of truth for all functions that MUST be deployed.
 * Update this list whenever a new critical function is added or removed.
 * Last updated: 2026-02-28
 */
const CRITICAL_FUNCTION_MANIFEST = [
  // === Core Mobile Entry Pipeline ===
  'submitTimeEntry',
  'upsertDraftTimeEntry',
  'recalculateAfterTimeEntrySubmit',

  // === Time Entry Lifecycle ===
  'approveTimeEntry',
  'rejectTimeEntry',
  'resubmitTimeEntry',
  'deleteTimeEntryCascade',
  'adminCreateTimeEntry',
  'adminUpdateTimeEntry',

  // === Recalculation ===
  'recalculate',
  'recalculateWeeklySummaries',
  'recalculateMonthlyCustomerSummary',
  'recalcBreaks',

  // === Contracts & Documents ===
  'generateContract',
  'downloadContractPdf',
  'sendContractForSigning',
  'listContractsLight',

  // === Payroll ===
  'buildDailyPayrollReportData',
  'sendDailyPayrollReportToAzure',
  'generateDailyPayrollReport',

  // === Infrastructure ===
  'systemHealthCheck',
  'auditService',
  'mailService',
  'encryptionService',
  'createBackup',
  'secureDownload',

  // === Import / Export ===
  'parseExcelImport',
  'exportTimeAndTrips',
  'sendEmployeeEmail',

  // === Monitoring ===
  'monitorStuckMobileSubmissions',
  'archiveOldPostNLImports',
  'onTripOrSpwChange',
  'verifyDeployment',
  'hourlyVerification',
  'verifyFunctionRegistry',
];

// Dependency map: if parent is deployed, children MUST also be deployed
const DEPENDENCY_MAP = {
  'submitTimeEntry': ['recalculateAfterTimeEntrySubmit'],
  'approveTimeEntry': ['recalculateWeeklySummaries'],
  'recalculate': ['recalculateWeeklySummaries', 'recalculateMonthlyCustomerSummary'],
  'generateContract': ['downloadContractPdf', 'sendContractForSigning'],
  'buildDailyPayrollReportData': ['sendDailyPayrollReportToAzure'],
};

function classifyResult(fnName, settled) {
  if (settled.status === 'fulfilled') {
    return { name: fnName, deployed: true, http_status: settled.value?.status || 200 };
  }

  const err = settled.reason;
  const msg = err?.message || String(err);
  const httpStatus = err?.response?.status || err?.status || null;
  const msgLower = msg.toLowerCase();

  const isNotDeployed =
    httpStatus === 404 ||
    msgLower.includes('not found') ||
    msgLower.includes('not deployed') ||
    msgLower.includes('does not exist') ||
    msgLower.includes('function not found');

  if (isNotDeployed) {
    return { name: fnName, deployed: false, http_status: httpStatus, error: msg };
  }

  // 400/401/403/422 = function exists but rejected the test call
  if ([400, 401, 403, 422].includes(httpStatus)) {
    return { name: fnName, deployed: true, http_status: httpStatus };
  }

  // 429/502/503 = overload but still exists
  if ([429, 502, 503].includes(httpStatus)) {
    return { name: fnName, deployed: true, http_status: httpStatus, warning: `Overload (${httpStatus})` };
  }

  return { name: fnName, deployed: true, http_status: httpStatus };
}

Deno.serve(async (req) => {
  // ABSOLUTE RULE: never return non-200
  try {
    const base44 = createClientFromRequest(req);

    // Auth: allow admin users AND service-role calls (from autoHealRegistry/hourly automation)
    // When called via svc.functions.invoke() from another function, the incoming request
    // carries the caller's token. We try multiple auth strategies in sequence.
    let isAuthorized = false;
    let authMethod = 'none';

    // Strategy 1: Check if the caller is an admin user
    try {
      const user = await base44.auth.me();
      if (user && user.role === 'admin') {
        isAuthorized = true;
        authMethod = 'admin_user';
      }
    } catch (_) {}

    // Strategy 2: Check if service-role operations work (service-to-service calls)
    if (!isAuthorized) {
      try {
        const testResult = await base44.asServiceRole.entities.AuditLog.list('-created_date', 1);
        if (Array.isArray(testResult)) {
          isAuthorized = true;
          authMethod = 'service_role_entity';
        }
      } catch (_) {}
    }

    // Strategy 3: Check for internal ping header (set by autoHealRegistry)
    if (!isAuthorized) {
      const internalKey = req.headers.get('x-internal-registry-check');
      if (internalKey === 'auto-heal-v1') {
        isAuthorized = true;
        authMethod = 'internal_header';
      }
    }

    if (!isAuthorized) {
      return Response.json({
        status: 'ERROR', auth_error: 'Forbidden: Admin or service role required',
        manifest_count: CRITICAL_FUNCTION_MANIFEST.length,
        missing_functions: [], deployed_count: 0,
        auth_method: authMethod,
        timestamp: new Date().toISOString(), version: 'registry-v1',
      }, { status: 200 });
    }

    // Ping all manifest functions in parallel (use service role for reliability)
    const svc = base44.asServiceRole;
    const promises = CRITICAL_FUNCTION_MANIFEST.map(fn =>
      svc.functions.invoke(fn, { _ping: true })
    );
    const settled = await Promise.allSettled(promises);

    const results = [];
    for (let i = 0; i < CRITICAL_FUNCTION_MANIFEST.length; i++) {
      results.push(classifyResult(CRITICAL_FUNCTION_MANIFEST[i], settled[i]));
    }

    const deployed = results.filter(r => r.deployed === true);
    const missing = results.filter(r => r.deployed === false);
    const warnings = results.filter(r => r.warning);

    // Check dependency integrity
    const brokenDeps = [];
    for (const [parent, children] of Object.entries(DEPENDENCY_MAP)) {
      const parentResult = results.find(r => r.name === parent);
      if (!parentResult || parentResult.deployed === false) continue; // parent not deployed — skip
      for (const child of children) {
        const childResult = results.find(r => r.name === child);
        if (!childResult || childResult.deployed === false) {
          brokenDeps.push({ parent, child, status: 'MISSING' });
        }
      }
    }

    const integrityOk = missing.length === 0 && brokenDeps.length === 0;
    const status = integrityOk ? 'GREEN' : 'RED';

    // If RED: create notification + audit log (fire-and-forget)
    if (!integrityOk) {
      const missingNames = missing.map(m => m.name);
      const depNames = brokenDeps.map(d => `${d.parent}→${d.child}`);

      // Fire-and-forget notification
      svc.entities.Notification.create({
        title: `Registry Integrity Alert: ${missing.length} functie(s) ontbreken`,
        description: `Ontbrekend: ${missingNames.join(', ')}${brokenDeps.length > 0 ? `. Broken deps: ${depNames.join(', ')}` : ''}`,
        type: 'general',
        priority: 'urgent',
      }).catch(() => {});

      // Fire-and-forget audit log
      svc.entities.AuditLog.create({
        action_type: 'create',
        category: 'Systeem',
        description: `Registry Integrity FAILED: ${missing.length} missing, ${brokenDeps.length} broken deps. Missing: ${missingNames.join(', ')}`,
        performed_by_email: 'system@interdistri.nl',
        performed_by_name: 'Registry Integrity Check',
        performed_by_role: 'system',
        metadata: { missing: missingNames, broken_deps: brokenDeps },
      }).catch(() => {});
    }

    return Response.json({
      status,
      manifest_count: CRITICAL_FUNCTION_MANIFEST.length,
      deployed_count: deployed.length,
      missing_count: missing.length,
      missing_functions: missing.map(m => ({ name: m.name, error: m.error || null })),
      broken_dependencies: brokenDeps,
      warnings: warnings.map(w => ({ name: w.name, warning: w.warning })),
      dependency_map: DEPENDENCY_MAP,
      results,
      timestamp: new Date().toISOString(),
      version: 'registry-v1',
    }, { status: 200 });

  } catch (outerError) {
    return Response.json({
      status: 'ERROR',
      manifest_count: CRITICAL_FUNCTION_MANIFEST.length,
      missing_functions: [],
      deployed_count: 0,
      error: outerError?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      version: 'registry-v1',
    }, { status: 200 });
  }
});