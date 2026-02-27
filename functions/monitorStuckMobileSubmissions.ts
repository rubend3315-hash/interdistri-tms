// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM (Scheduled Automation)                    ║
// ║ Called by: Scheduled automation every 5 minutes                 ║
// ║ Auth: Admin only                                                ║
// ║                                                                 ║
// ║ DESIGN: Idempotent, self-healing monitor.                       ║
// ║ Every run re-evaluates ALL RECEIVED logs against SUCCESS map.   ║
// ║ Never depends on current stuck_detected value.                  ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const STUCK_THRESHOLD_MS = 30_000; // 30 seconds

Deno.serve(async (req) => {
  const t0 = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

    // ========================================
    // STEP 1: Build SUCCESS submission_id set
    // ========================================
    const successLogs = await svc.entities.MobileEntrySubmissionLog.filter(
      { status: 'SUCCESS' }, '-created_date', 200
    );
    const successIds = new Set(
      successLogs
        .filter(l => l.submission_id && l.submission_id !== 'unknown')
        .map(l => l.submission_id)
    );
    // Also include IDEMPOTENT_HIT as resolved
    const idempotentLogs = await svc.entities.MobileEntrySubmissionLog.filter(
      { status: 'IDEMPOTENT_HIT' }, '-created_date', 200
    );
    for (const l of idempotentLogs) {
      if (l.submission_id && l.submission_id !== 'unknown') successIds.add(l.submission_id);
    }

    console.log(`[STUCK_MONITOR] SUCCESS map built: ${successIds.size} unique submission_ids`);

    // ========================================
    // STEP 2: Get ALL RECEIVED logs older than threshold
    // ========================================
    const receivedLogs = await svc.entities.MobileEntrySubmissionLog.filter(
      { status: 'RECEIVED' }, '-created_date', 200
    );

    const oldReceived = receivedLogs.filter(log => {
      const receivedAt = log.timestamp_received || log.created_date;
      return receivedAt && receivedAt < cutoff;
    });

    console.log(`[STUCK_MONITOR] Found ${oldReceived.length} RECEIVED logs older than threshold`);

    // ========================================
    // STEP 3: Re-evaluate every RECEIVED log
    // ========================================
    const resolved = [];
    const newlyStuck = [];

    for (const log of oldReceived) {
      const hasSuccessSibling = log.submission_id
        && log.submission_id !== 'unknown'
        && successIds.has(log.submission_id);

      if (hasSuccessSibling) {
        // SUCCESS sibling found → NOT stuck, auto-resolve
        if (log.stuck_detected !== false || log.auto_resolved !== true) {
          await svc.entities.MobileEntrySubmissionLog.update(log.id, {
            stuck_detected: false,
            auto_resolved: true,
          });
          resolved.push(log.id);
          console.log(`[STUCK_MONITOR] RESOLVED: ${log.id} (submission_id=${log.submission_id})`);
        }
      } else {
        // No SUCCESS sibling → truly stuck
        if (log.stuck_detected !== true) {
          const now = new Date().toISOString();
          await svc.entities.MobileEntrySubmissionLog.update(log.id, {
            stuck_detected: true,
            auto_resolved: false,
            stuck_detected_at: now,
          });
          newlyStuck.push(log);
          console.log(`[STUCK_MONITOR] STUCK: ${log.id} (submission_id=${log.submission_id})`);

          // Create AuditLog entry for newly stuck
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
        }
        // If already stuck_detected=true, no update needed (idempotent)
      }
    }

    // ========================================
    // STEP 4: Also heal any previously stuck logs that now have SUCCESS siblings
    // (covers logs that weren't in the RECEIVED query because they were already updated)
    // ========================================
    const previouslyStuck = await svc.entities.MobileEntrySubmissionLog.filter(
      { stuck_detected: true }, '-created_date', 200
    );
    for (const log of previouslyStuck) {
      if (log.auto_resolved === true) continue; // already resolved
      const hasSuccessSibling = log.submission_id
        && log.submission_id !== 'unknown'
        && successIds.has(log.submission_id);
      if (hasSuccessSibling) {
        await svc.entities.MobileEntrySubmissionLog.update(log.id, {
          stuck_detected: false,
          auto_resolved: true,
        });
        resolved.push(log.id);
        console.log(`[STUCK_MONITOR] HEALED previously stuck: ${log.id}`);
      }
    }

    // ========================================
    // STEP 5: Send email only for NEWLY stuck (not re-detected)
    // ========================================
    if (newlyStuck.length > 0) {
      const rows = newlyStuck.map(log => {
        const age = Math.round((Date.now() - new Date(log.timestamp_received || log.created_date).getTime()) / 1000);
        const device = (log.user_agent || '').includes('iPhone') || (log.user_agent || '').includes('iPad')
          ? 'iOS'
          : (log.user_agent || '').includes('Android') ? 'Android' : 'Onbekend';
        return `• <b>${log.email || 'Onbekend'}</b> — ${(log.submission_id || '?').slice(0, 8)}… — ${age}s geleden — ${device} — datum: ${log.entry_date || '?'}`;
      }).join('<br>');

      const emailBody = `
        <h2 style="color:#d97706;">⚠ Mobile Entry submission(s) vastgelopen</h2>
        <p>Er ${newlyStuck.length === 1 ? 'is' : 'zijn'} <b>${newlyStuck.length}</b> submission(s) gedetecteerd die langer dan 30 seconden op status RECEIVED staan:</p>
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
        subject: `⚠ ${newlyStuck.length} Mobile Entry submission(s) vastgelopen`,
        body: emailBody,
        from_name: 'Interdistri TMS Monitoring',
      });
    }

    console.log(`[STUCK_MONITOR] Done. Resolved: ${resolved.length}, Newly stuck: ${newlyStuck.length}`);

    return Response.json({
      success: true,
      resolved_count: resolved.length,
      newly_stuck_count: newlyStuck.length,
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