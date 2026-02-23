// refactored: 2026-02-23T v2 — direct health check, no internal HTTP invoke
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

/**
 * Inline health check logic — identical to systemHealthCheck.
 * Duplicated here because Base44 functions cannot import from each other.
 */
async function runHealthCheck(base44) {
  const errors = [];
  let base44Connection = false;
  let supabaseConnection = false;

  // A) Base44 SDK connectivity
  try {
    const tenants = await base44.asServiceRole.entities.Tenant.list('', 1);
    base44Connection = Array.isArray(tenants);
  } catch (err) {
    errors.push({ check: 'base44_connection', error: err.message });
  }

  // B) Supabase connectivity
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/employee?select=base44_id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    supabaseConnection = res.ok;
    if (!res.ok) {
      errors.push({ check: 'supabase_connection', error: `HTTP ${res.status}` });
    }
  } catch (err) {
    errors.push({ check: 'supabase_connection', error: err.message });
  }

  const isHealthy = base44Connection && supabaseConnection && errors.length === 0;

  return {
    status: isHealthy ? 'GREEN' : 'RED',
    version: '2026-02-23-stable',
    timestamp: new Date().toISOString(),
    base44_connection: base44Connection,
    supabase_connection: supabaseConnection,
    environment: {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_KEY
    },
    errors
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Run health check directly — no HTTP invoke, no 403 issue
    const healthData = await runHealthCheck(base44);
    const isRed = healthData.status !== 'GREEN';

    if (!isRed) {
      return Response.json({
        alert_sent: false,
        status: 'GREEN',
        version: '2026-02-23-stable',
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
        version: '2026-02-23-stable',
        message: 'Alert suppressed — already sent within last 30 minutes',
        timestamp: new Date().toISOString()
      });
    }

    // Send alert email
    const emailBody = `
<h2 style="color: #dc2626;">⚠️ CRITICAL: Backend Failure Detected</h2>
<p><strong>Timestamp:</strong> ${healthData.timestamp}</p>
<hr/>
<table style="border-collapse:collapse; font-family:monospace; font-size:14px;">
  <tr><td style="padding:4px 12px;"><strong>base44_connection</strong></td><td>${healthData.base44_connection}</td></tr>
  <tr><td style="padding:4px 12px;"><strong>supabase_connection</strong></td><td>${healthData.supabase_connection}</td></tr>
  <tr><td style="padding:4px 12px;"><strong>SUPABASE_URL</strong></td><td>${healthData.environment?.SUPABASE_URL}</td></tr>
  <tr><td style="padding:4px 12px;"><strong>SUPABASE_SERVICE_ROLE_KEY</strong></td><td>${healthData.environment?.SUPABASE_SERVICE_ROLE_KEY}</td></tr>
</table>
<hr/>
<h3>Errors:</h3>
<pre style="background:#f1f5f9; padding:12px; border-radius:8px; font-size:12px;">${JSON.stringify(healthData.errors, null, 2)}</pre>
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
      version: '2026-02-23-stable',
      message: 'Alert email sent to ' + user.email,
      health_data: healthData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});