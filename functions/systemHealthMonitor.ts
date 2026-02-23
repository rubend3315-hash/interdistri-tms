import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Invoke systemHealthCheck
    let healthData;
    let isRed = false;

    try {
      const res = await base44.functions.invoke('systemHealthCheck');
      healthData = res.data;

      isRed = !healthData ||
        healthData.success === false ||
        healthData.error ||
        healthData.base44_connection === false ||
        healthData.supabase_connection === false;
    } catch (err) {
      isRed = true;
      healthData = { error: err.message, success: false };
    }

    if (!isRed) {
      return Response.json({
        alert_sent: false,
        status: 'GREEN',
        message: 'All systems operational — no alert needed',
        timestamp: new Date().toISOString()
      });
    }

    // Check last alert to prevent spam — look for recent AuditLog entry
    let shouldSend = true;
    try {
      const recentAlerts = await base44.asServiceRole.entities.AuditLog.filter(
        { action_type: 'export', category: 'Systeem', description: 'System health alert email sent' },
        '-created_date',
        1
      );
      if (recentAlerts.length > 0) {
        const lastSent = new Date(recentAlerts[0].created_date);
        const minutesSince = (Date.now() - lastSent.getTime()) / 60000;
        // Don't send again if alert was sent within last 30 minutes
        if (minutesSince < 30) {
          shouldSend = false;
        }
      }
    } catch (e) {
      // If we can't check, send anyway to be safe
    }

    if (!shouldSend) {
      return Response.json({
        alert_sent: false,
        status: 'RED',
        message: 'Alert suppressed — already sent within last 30 minutes',
        timestamp: new Date().toISOString()
      });
    }

    // Send alert email
    const emailBody = `
<h2 style="color: #dc2626;">⚠️ CRITICAL: Backend Failure Detected</h2>
<p><strong>Timestamp:</strong> ${healthData.timestamp || new Date().toISOString()}</p>
<hr/>
<table style="border-collapse:collapse; font-family:monospace; font-size:14px;">
  <tr><td style="padding:4px 12px;"><strong>base44_connection</strong></td><td>${healthData.base44_connection ?? 'N/A'}</td></tr>
  <tr><td style="padding:4px 12px;"><strong>supabase_connection</strong></td><td>${healthData.supabase_connection ?? 'N/A'}</td></tr>
  <tr><td style="padding:4px 12px;"><strong>SUPABASE_URL</strong></td><td>${healthData.environment?.SUPABASE_URL ?? 'N/A'}</td></tr>
  <tr><td style="padding:4px 12px;"><strong>SUPABASE_SERVICE_ROLE_KEY</strong></td><td>${healthData.environment?.SUPABASE_SERVICE_ROLE_KEY ?? 'N/A'}</td></tr>
</table>
<hr/>
<h3>Errors:</h3>
<pre style="background:#f1f5f9; padding:12px; border-radius:8px; font-size:12px;">${JSON.stringify(healthData.errors || healthData.error || 'none', null, 2)}</pre>
<hr/>
<h3>Full Response:</h3>
<pre style="background:#f8fafc; padding:12px; border-radius:8px; font-size:11px;">${JSON.stringify(healthData, null, 2)}</pre>
<p style="color:#64748b; font-size:12px;">This alert is sent by systemHealthMonitor. Suppressed for 30 min after each send.</p>
`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: 'CRITICAL: Backend Failure Detected',
      body: emailBody
    });

    // Log alert to prevent spam
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        action_type: 'export',
        category: 'Systeem',
        description: 'System health alert email sent',
        performed_by_email: 'system@monitor',
        performed_by_name: 'System Monitor',
        performed_by_role: 'system',
        metadata: { status: 'RED', base44: healthData.base44_connection, supabase: healthData.supabase_connection }
      });
    } catch (e) {
      // Non-critical
    }

    return Response.json({
      alert_sent: true,
      status: 'RED',
      message: 'Alert email sent to ' + user.email,
      health_data: healthData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});