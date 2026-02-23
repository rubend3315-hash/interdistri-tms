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

    // Build report data
    const reportResponse = await base44.functions.invoke('buildDailyPayrollReportData', { date });
    const reportData = reportResponse.data;

    if (!reportData?.success) {
      return Response.json({
        success: false,
        error: 'REPORT_BUILD_FAILED',
        details: reportData?.error || reportData?.details || 'Onbekende fout',
      }, { status: 500 });
    }

    // Encode as base64
    const jsonString = JSON.stringify(reportData, null, 2);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonString);

    // Convert to base64 using Deno's standard btoa on chunks
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const fileBase64 = btoa(binary);

    return Response.json({
      success: true,
      fileName: `DailyPayrollReport_${date}.json`,
      fileBase64,
    });
  } catch (error) {
    console.error('downloadDailyPayrollReportJson error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});