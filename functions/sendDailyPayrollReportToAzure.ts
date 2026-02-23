import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && !['ADMIN', 'HR_ADMIN'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: alleen admin en hr_admin' }, { status: 403 });
    }

    const { date } = await req.json();
    if (!date) return Response.json({ error: 'date is verplicht (YYYY-MM-DD)' }, { status: 400 });

    // Build report data (use asServiceRole to avoid 403 on function-to-function)
    const reportResponse = await base44.asServiceRole.functions.invoke('buildDailyPayrollReportData', { date });
    const reportData = reportResponse.data;

    if (!reportData?.success) {
      return Response.json({
        success: false,
        error: 'REPORT_BUILD_FAILED',
        details: reportData?.error || reportData?.details || 'Onbekende fout bij ophalen rapportdata',
      }, { status: 500 });
    }

    // Check Azure configuration
    const azureEndpoint = Deno.env.get('AZURE_PAYROLL_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_PAYROLL_API_KEY');

    if (!azureEndpoint || !azureApiKey) {
      return Response.json({
        success: false,
        error: 'AZURE_NOT_CONFIGURED',
        dryRun: true,
        message: 'Azure endpoint en/of API key zijn niet geconfigureerd. Stel AZURE_PAYROLL_ENDPOINT en AZURE_PAYROLL_API_KEY in als environment variables.',
        reportDate: date,
        employeeCount: reportData.employeeCount,
        totals: reportData.totals,
      });
    }

    // POST to Azure with retry (max 3 attempts)
    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(azureEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': azureApiKey,
          },
          body: JSON.stringify(reportData),
        });

        if (response.ok) {
          const responseBody = await response.text();
          return Response.json({
            success: true,
            azureStatusCode: response.status,
            azureResponse: responseBody,
            reportDate: date,
            employeeCount: reportData.employeeCount,
            attempt,
          });
        }

        lastError = `HTTP ${response.status}: ${await response.text()}`;
      } catch (err) {
        lastError = err.message;
      }

      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }

    return Response.json({
      success: false,
      error: 'AZURE_PUSH_FAILED',
      details: lastError,
      attempts: MAX_RETRIES,
      reportDate: date,
    }, { status: 502 });
  } catch (error) {
    console.error('sendDailyPayrollReportToAzure error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});