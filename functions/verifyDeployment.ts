// verifyDeployment — pings all known backend functions to verify deployment status
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Keep list small to avoid CPU time limit on Deno Deploy
const ALL_FUNCTIONS = [
  'submitTimeEntry',
  'approveTimeEntry',
  'systemHealthCheck',
  'auditService',
  'mailService',
  'encryptionService',
  'createBackup',
  'generateContract',
  'recalculate',
  'buildDailyPayrollReportData',
  'sendDailyPayrollReportToAzure',
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

    // Run checks in parallel (batches of 3) to stay within CPU limits
    const BATCH_SIZE = 3;
    for (let i = 0; i < ALL_FUNCTIONS.length; i += BATCH_SIZE) {
      const batch = ALL_FUNCTIONS.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (fnName) => {
          try {
            const res = await base44.functions.invoke(fnName, { _ping: true });
            return { name: fnName, status: 'OK', errorMessage: null, httpStatus: res?.status || 200 };
          } catch (err) {
            const msg = err?.message || String(err);
            const httpCode = err?.status || null;
            const is404 = msg.includes('404') || msg.includes('not found') || msg.includes('does not exist');
            const isAuthError = [400, 401, 403, 422].includes(httpCode) || /40[0-3]|422/.test(msg);
            let status = 'ERROR';
            if (is404) status = 'NOT_DEPLOYED';
            else if (isAuthError) status = 'OK';
            return { name: fnName, status, errorMessage: status === 'OK' ? null : msg, httpStatus: httpCode };
          }
        })
      );
      for (const r of results) {
        checkedFunctions.push(r.status === 'fulfilled' ? r.value : { name: 'unknown', status: 'ERROR', errorMessage: 'Promise rejected', httpStatus: null });
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