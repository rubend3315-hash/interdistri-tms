// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM (Scheduled Automation)                    ║
// ║ Called by: Scheduled automation every 5 minutes                 ║
// ║ Auth: Admin only                                                ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const STUCK_THRESHOLD_MS = 30_000; // 30 seconds

Deno.serve(async (req) => {
  const t0 = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // ========================================
    // 1. Find RECEIVED submissions older than 30s
    // ========================================
    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

    // Fetch recent RECEIVED logs (last 200 to be safe)
    const receivedLogs = await svc.entities.MobileEntrySubmissionLog.filter({
      status: 'RECEIVED',
    }, '-created_date', 200);

    // Filter: older than threshold, not yet marked as stuck
    const candidateLogs = receivedLogs.filter(log => {
      if (log.stuck_detected === true) return false;
      if (log.timestamp_completed) return false;
      const receivedAt = log.timestamp_received || log.created_date;
      return receivedAt && receivedAt < cutoff;
    });

    // ========================================
    // 1b. Cross-check: exclude RECEIVED logs where a SUCCESS record
    //     already exists for the same submission_id (immutable log pattern)
    // ========================================
    const stuckLogs = [];
    for (const log of candidateLogs) {
      if (log.submission_id) {
        const siblingLogs = await svc.entities.MobileEntrySubmissionLog.filter({
          submission_id: log.submission_id,
        });
        const hasSuccess = siblingLogs.some(s => s.id !== log.id && (s.status === 'SUCCESS' || s.status === 'IDEMPOTENT_HIT'));
        if (hasSuccess) {
          // Not stuck — the submission completed successfully via a sibling record.
          // Auto-close this orphan RECEIVED record.
          console.log(`[STUCK_MONITOR] RECEIVED ${log.id} has SUCCESS sibling for submission_id=${log.submission_id} — auto-closing`);
          await svc.entities.MobileEntrySubmissionLog.update(log.id, {
            status: 'SUCCESS',
            error_code: 'AUTO_CLOSED',
            error_message: 'Automatisch gesloten — SUCCESS sibling gevonden',
            timestamp_completed: new Date().toISOString(),
          });
          continue;
        }
      }
      stuckLogs.push(log);
    }

    if (stuckLogs.length === 0) {
      return Response.json({
        success: true,
        stuck_found: 0,
        latency_ms: Date.now() - t0,
      });
    }

    console.log(`[STUCK_MONITOR] Found ${stuckLogs.length} stuck submission(s)`);

    // ========================================
    // 2. Process each stuck submission
    // ========================================
    const now = new Date().toISOString();
    const processedIds = [];

    for (const log of stuckLogs) {
      // 2a. Mark as stuck (prevents duplicate processing)
      await svc.entities.MobileEntrySubmissionLog.update(log.id, {
        stuck_detected: true,
        stuck_detected_at: now,
      });

      // 2b. Create AuditLog entry
      await svc.entities.AuditLog.create({
        action_type: 'create',
        category: 'Systeem',
        description: `Mobile Entry submission vastgelopen: ${log.submission_id} van ${log.email || 'onbekend'}`,
        performed_by_email: 'system@interdistri.nl',
        performed_by_name: 'Stuck Monitor',
        performed_by_role: 'system',
        target_entity: 'MobileEntrySubmissionLog',
        target_id: log.id,
        target_name: log.submission_id,
        metadata: {
          type: 'MOBILE_SUBMISSION_STUCK',
          severity: 'HIGH',
          submission_id: log.submission_id,
          user_email: log.email || null,
          user_id: log.user_id || null,
          employee_id: log.employee_id || null,
          entry_date: log.entry_date || null,
          timestamp_received: log.timestamp_received,
          user_agent: (log.user_agent || '').slice(0, 200),
          age_seconds: Math.round((Date.now() - new Date(log.timestamp_received || log.created_date).getTime()) / 1000),
        },
      });

      processedIds.push(log.submission_id);
    }

    // ========================================
    // 3. Send single summary email for all stuck submissions
    // ========================================
    const rows = stuckLogs.map(log => {
      const age = Math.round((Date.now() - new Date(log.timestamp_received || log.created_date).getTime()) / 1000);
      const device = (log.user_agent || '').includes('iPhone') || (log.user_agent || '').includes('iPad')
        ? 'iOS'
        : (log.user_agent || '').includes('Android') ? 'Android' : 'Onbekend';
      return `• <b>${log.email || 'Onbekend'}</b> — ${log.submission_id.slice(0, 8)}… — ${age}s geleden — ${device} — datum: ${log.entry_date || '?'}`;
    }).join('<br>');

    const emailBody = `
      <h2 style="color:#d97706;">⚠ Mobile Entry submission(s) vastgelopen</h2>
      <p>Er ${stuckLogs.length === 1 ? 'is' : 'zijn'} <b>${stuckLogs.length}</b> submission(s) gedetecteerd die langer dan 30 seconden op status RECEIVED staan:</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin:12px 0;font-size:13px;">
        ${rows}
      </div>
      <p style="font-size:12px;color:#6b7280;">
        Deze submissions zijn waarschijnlijk vastgelopen door een timeout of serverfout.<br>
        De medewerker(s) moeten opnieuw indienen via de mobiele app.<br><br>
        Tijdstip detectie: ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}
      </p>
    `;

    await svc.integrations.Core.SendEmail({
      to: 'ruben@interdistri.nl',
      subject: `⚠ ${stuckLogs.length} Mobile Entry submission(s) vastgelopen`,
      body: emailBody,
      from_name: 'Interdistri TMS Monitoring',
    });

    console.log(`[STUCK_MONITOR] Processed ${processedIds.length} stuck submissions, email sent`);

    return Response.json({
      success: true,
      stuck_found: stuckLogs.length,
      processed: processedIds,
      latency_ms: Date.now() - t0,
    });

  } catch (error) {
    console.error('[STUCK_MONITOR] Error:', error.message);
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});