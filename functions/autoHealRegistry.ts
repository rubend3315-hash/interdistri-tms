// autoHealRegistry v2 — detect drift, attempt warm-ping heal, verify, notify
// Now runs the manifest check INLINE instead of delegating to verifyFunctionRegistry,
// avoiding cross-function auth issues in service-role context.
// Never returns HTTP 500. Rate-limited to max 1 heal attempt per hour.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Rate limit key stored in AuditLog metadata
const RATE_LIMIT_MINUTES = 60;

/**
 * CRITICAL FUNCTION MANIFEST — duplicated from verifyFunctionRegistry.
 * Must be kept in sync. This is the source of truth for autoHeal.
 */
const CRITICAL_FUNCTION_MANIFEST = [
  'submitTimeEntry', 'upsertDraftTimeEntry', 'recalculateAfterTimeEntrySubmit',
  'approveTimeEntry', 'rejectTimeEntry', 'resubmitTimeEntry',
  'deleteTimeEntryCascade', 'adminCreateTimeEntry', 'adminUpdateTimeEntry',
  'recalculate', 'recalculateWeeklySummaries', 'recalculateMonthlyCustomerSummary', 'recalcBreaks',
  'generateContract', 'downloadContractPdf', 'sendContractForSigning', 'listContractsLight',
  'buildDailyPayrollReportData', 'sendDailyPayrollReportToAzure', 'generateDailyPayrollReport',
  'systemHealthCheck', 'auditService', 'mailService', 'encryptionService', 'createBackup', 'secureDownload',
  'parseExcelImport', 'exportTimeAndTrips', 'sendEmployeeEmail',
  'monitorStuckMobileSubmissions', 'archiveOldPostNLImports', 'onTripOrSpwChange',
  'verifyDeployment', 'hourlyVerification', 'verifyFunctionRegistry',
];

function classifyPing(fnName, settled) {
  if (settled.status === 'fulfilled') return { name: fnName, deployed: true };
  const err = settled.reason;
  const msg = err?.message || String(err);
  const httpStatus = err?.response?.status || err?.status || null;
  const msgLower = msg.toLowerCase();
  const isNotDeployed = httpStatus === 404 || msgLower.includes('not found') || msgLower.includes('not deployed') || msgLower.includes('does not exist') || msgLower.includes('function not found');
  if (isNotDeployed) return { name: fnName, deployed: false, error: msg };
  return { name: fnName, deployed: true };
}

/**
 * Inline registry check — pings all manifest functions via service role
 * and returns { status, manifest_count, deployed_count, missing_count, missing_functions }
 */
async function runRegistryCheck(svc) {
  const promises = CRITICAL_FUNCTION_MANIFEST.map(fn =>
    svc.functions.invoke(fn, { _ping: true })
  );
  const settled = await Promise.allSettled(promises);
  const results = CRITICAL_FUNCTION_MANIFEST.map((fn, i) => classifyPing(fn, settled[i]));
  const deployed = results.filter(r => r.deployed);
  const missing = results.filter(r => !r.deployed);
  return {
    status: missing.length === 0 ? 'GREEN' : 'RED',
    manifest_count: CRITICAL_FUNCTION_MANIFEST.length,
    deployed_count: deployed.length,
    missing_count: missing.length,
    missing_functions: missing,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const now = new Date();

    // ============================================================
    // Step 0: Rate limit guard — check last heal attempt in AuditLog
    // ============================================================
    let rateLimited = false;
    try {
      const recentHeals = await svc.entities.AuditLog.filter(
        { target_id: 'auto-heal-registry' },
        '-created_date',
        1
      );
      if (recentHeals.length > 0) {
        const lastHeal = new Date(recentHeals[0].created_date);
        const minutesSince = (now - lastHeal) / (1000 * 60);
        if (minutesSince < RATE_LIMIT_MINUTES) {
          rateLimited = true;
        }
      }
    } catch (_) {
      // If AuditLog query fails, proceed anyway (don't block healing)
    }

    // ============================================================
    // Step 1: Run registry check INLINE (avoids cross-function auth issues)
    // ============================================================
    let initialCheck = null;
    try {
      initialCheck = await runRegistryCheck(svc);
    } catch (err) {
      return Response.json({
        action: 'CHECK_FAILED',
        error: err?.message || 'Registry check failed',
        timestamp: now.toISOString(),
      }, { status: 200 });
    }

    const initialMissing = initialCheck?.missing_functions || [];
    const manifestCount = initialCheck?.manifest_count || 0;
    const deployedCount = initialCheck?.deployed_count || 0;

    // ============================================================
    // Step 2: If everything is GREEN, just log and return (no heal needed)
    // ============================================================
    if (initialCheck?.status === 'GREEN' || initialMissing.length === 0) {
      // Fire-and-forget audit log for successful check — use different target_id to not affect rate limit
      svc.entities.AuditLog.create({
        action_type: 'create',
        category: 'Systeem',
        description: `Auto-heal registry: ALL OK (${deployedCount}/${manifestCount})`,
        performed_by_email: 'system@interdistri.nl',
        performed_by_name: 'Auto-Heal Registry',
        performed_by_role: 'system',
        target_entity: 'System',
        target_id: 'auto-heal-check',
        metadata: { status: 'GREEN', manifest_count: manifestCount, deployed_count: deployedCount },
      }).catch(() => {});

      return Response.json({
        action: 'NO_DRIFT',
        status: 'GREEN',
        manifest_count: manifestCount,
        deployed_count: deployedCount,
        missing_count: 0,
        heal_attempted: false,
        timestamp: now.toISOString(),
      }, { status: 200 });
    }

    // ============================================================
    // Step 3: Drift detected! Check rate limit before healing
    // ============================================================
    const missingNames = initialMissing.map(f => f.name || f);

    if (rateLimited) {
      // Log drift but skip heal due to rate limit
      svc.entities.AuditLog.create({
        action_type: 'create',
        category: 'Systeem',
        description: `Auto-heal RATE LIMITED: ${missingNames.length} missing (${missingNames.join(', ')}). Skipped heal — last attempt <${RATE_LIMIT_MINUTES}min ago.`,
        performed_by_email: 'system@interdistri.nl',
        performed_by_name: 'Auto-Heal Registry',
        performed_by_role: 'system',
        target_entity: 'System',
        target_id: 'auto-heal-rate-limited',
        metadata: { missing: missingNames, rate_limited: true },
      }).catch(() => {});

      svc.entities.Notification.create({
        title: `Registry drift: ${missingNames.length} functie(s) ontbreken (rate limited)`,
        description: `Ontbrekend: ${missingNames.join(', ')}. Heal overgeslagen (max 1x per uur). Handmatige actie vereist.`,
        type: 'general',
        priority: 'urgent',
        target_page: 'DeploymentStatus',
      }).catch(() => {});

      return Response.json({
        action: 'DRIFT_DETECTED_RATE_LIMITED',
        status: 'RED',
        manifest_count: manifestCount,
        deployed_count: deployedCount,
        missing_count: missingNames.length,
        missing_functions: missingNames,
        heal_attempted: false,
        rate_limited: true,
        timestamp: now.toISOString(),
      }, { status: 200 });
    }

    // ============================================================
    // Step 4: Attempt heal — warm-ping all missing functions
    // ============================================================
    // Log the heal attempt (also serves as rate-limit marker)
    await svc.entities.AuditLog.create({
      action_type: 'create',
      category: 'Systeem',
      description: `Auto-heal ATTEMPT: ${missingNames.length} missing (${missingNames.join(', ')}). Starting warm-ping heal...`,
      performed_by_email: 'system@interdistri.nl',
      performed_by_name: 'Auto-Heal Registry',
      performed_by_role: 'system',
      target_entity: 'System',
      target_id: 'auto-heal-registry',
      metadata: { missing: missingNames, phase: 'HEAL_START' },
    });

    // Warm-ping each missing function 3 times with delays
    for (let attempt = 0; attempt < 3; attempt++) {
      const pingPromises = missingNames.map(fn =>
        svc.functions.invoke(fn, { _warmup: true }).catch(() => null)
      );
      await Promise.allSettled(pingPromises);
      // Wait 3 seconds between attempts
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Wait 5 more seconds for functions to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000));

    // ============================================================
    // Step 5: Re-verify after heal attempt
    // ============================================================
    let postHealCheck = null;
    try {
      const res = await svc.functions.invoke('verifyFunctionRegistry', {});
      const payload = res?.data ?? res;
      if (typeof payload === 'string') {
        try { postHealCheck = JSON.parse(payload); } catch (_) { postHealCheck = payload; }
      } else {
        postHealCheck = payload;
      }
    } catch (_) {
      postHealCheck = { status: 'ERROR', missing_functions: initialMissing };
    }

    const postMissing = (postHealCheck?.missing_functions || []).map(f => f.name || f);
    const healed = missingNames.filter(fn => !postMissing.includes(fn));
    const stillMissing = postMissing;
    const healSuccess = stillMissing.length === 0;

    // ============================================================
    // Step 6: Log result + notify
    // ============================================================
    const resultDescription = healSuccess
      ? `Auto-heal SUCCESS: All ${manifestCount} functions restored. Healed: ${healed.join(', ')}`
      : `Auto-heal PARTIAL/FAILED: ${healed.length} healed (${healed.join(', ') || 'none'}), ${stillMissing.length} still missing (${stillMissing.join(', ')})`;

    svc.entities.AuditLog.create({
      action_type: 'create',
      category: 'Systeem',
      description: resultDescription,
      performed_by_email: 'system@interdistri.nl',
      performed_by_name: 'Auto-Heal Registry',
      performed_by_role: 'system',
      target_entity: 'System',
      target_id: 'auto-heal-registry',
      metadata: {
        phase: 'HEAL_RESULT',
        heal_success: healSuccess,
        healed_functions: healed,
        still_missing: stillMissing,
        manifest_count: manifestCount,
        deployed_after: postHealCheck?.deployed_count || 0,
      },
    }).catch(() => {});

    if (healSuccess) {
      svc.entities.Notification.create({
        title: `Auto-heal SUCCESS: ${healed.length} functie(s) hersteld`,
        description: `Drift gedetecteerd en automatisch hersteld. Hersteld: ${healed.join(', ')}. Alle ${manifestCount} functies zijn nu operationeel.`,
        type: 'general',
        priority: 'medium',
        target_page: 'DeploymentStatus',
      }).catch(() => {});
    } else {
      svc.entities.Notification.create({
        title: `Auto-heal FAILED: ${stillMissing.length} functie(s) nog steeds niet beschikbaar`,
        description: `Hersteld: ${healed.join(', ') || 'geen'}. Nog steeds ontbrekend: ${stillMissing.join(', ')}. Handmatige actie vereist via Full Publish Protocol.`,
        type: 'general',
        priority: 'urgent',
        target_page: 'DeploymentStatus',
      }).catch(() => {});
    }

    return Response.json({
      action: healSuccess ? 'HEAL_SUCCESS' : 'HEAL_PARTIAL_FAILED',
      status: healSuccess ? 'GREEN' : 'RED',
      manifest_count: manifestCount,
      deployed_count: postHealCheck?.deployed_count || 0,
      missing_before: missingNames,
      healed_functions: healed,
      still_missing: stillMissing,
      heal_attempted: true,
      rate_limited: false,
      timestamp: now.toISOString(),
    }, { status: 200 });

  } catch (outerError) {
    return Response.json({
      action: 'SYSTEM_ERROR',
      error: outerError?.message || 'Unknown error',
      heal_attempted: false,
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  }
});