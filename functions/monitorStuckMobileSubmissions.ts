// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM (Scheduled Automation)                    ║
// ║ Called by: Scheduled automation every 5 minutes                 ║
// ║ Auth: Service role (scheduled)                                  ║
// ║                                                                 ║
// ║ v2 — Lightweight: single query, no parallel overload            ║
// ║ DESIGN: Idempotent, self-healing monitor.                       ║
// ║ Fetches only RECEIVED logs, then checks MobileSubmissionIndex   ║
// ║ for terminal status per submission_id (much lighter).           ║
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
    // STEP 1: Get RECEIVED logs older than threshold (single query)
    // ========================================
    const receivedLogs = await svc.entities.MobileEntrySubmissionLog.filter(
      { status: 'RECEIVED' }, '-created_date', 100
    );

    const oldReceived = receivedLogs.filter(log => {
      const receivedAt = log.timestamp_received || log.created_date;
      return receivedAt && receivedAt < cutoff;
    });

    console.log(`[STUCK_MONITOR] Found ${oldReceived.length} RECEIVED logs older than 30s (of ${receivedLogs.length} total RECEIVED)`);

    if (oldReceived.length === 0) {
      return Response.json({
        success: true,
        resolved_count: 0,
        newly_stuck_count: 0,
        message: 'No old RECEIVED logs found',
        latency_ms: Date.now() - t0,
      });
    }

    // ========================================
    // STEP 2: Collect unique submission_ids and check index
    // ========================================
    // Use MobileSubmissionIndex for fast terminal status lookup
    const uniqueSubIds = [...new Set(
      oldReceived
        .map(l => l.submission_id)
        .filter(id => id && id !== 'unknown')
    )];

    // Check index in small batches to avoid overload
    const BATCH_SIZE = 5;
    const terminalIds = new Set();

    for (let i = 0; i < uniqueSubIds.length; i += BATCH_SIZE) {
      if (i > 0) await new Promise(r => setTimeout(r, 300));
      const batch = uniqueSubIds.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(subId =>
          svc.entities.MobileSubmissionIndex.filter({ submission_id: subId })
            .catch(() => [])
        )
      );
      for (let j = 0; j < batch.length; j++) {
        const records = batchResults[j];
        if (records.length > 0) {
          const hasTerminal = records.some(r =>
            ['SUCCESS', 'FAILED', 'VALIDATION_FAILED', 'SYSTEM_ERROR', 'IDEMPOTENT'].includes(r.status)
          );
          if (hasTerminal) terminalIds.add(batch[j]);
        }
      }
    }

    console.log(`[STUCK_MONITOR] Terminal index matches: ${terminalIds.size} of ${uniqueSubIds.length} unique submission_ids`);

    // ========================================
    // STEP 3: Evaluate each RECEIVED log
    // ========================================
    const resolved = [];
    const newlyStuck = [];

    for (const log of oldReceived) {
      const hasTerminalSibling = log.submission_id
        && log.submission_id !== 'unknown'
        && terminalIds.has(log.submission_id);

      if (hasTerminalSibling) {
        // Terminal sibling found → NOT stuck, auto-resolve
        if (log.stuck_detected !== false || log.auto_resolved !== true) {
          await svc.entities.MobileEntrySubmissionLog.update(log.id, {
            stuck_detected: false,
            auto_resolved: true,
          });
          resolved.push(log.id);
        }
      } else {
        // No terminal sibling → check if truly stuck
        if (log.stuck_detected !== true) {
          const now = new Date().toISOString();
          await svc.entities.MobileEntrySubmissionLog.update(log.id, {
            stuck_detected: true,
            auto_resolved: false,
            stuck_detected_at: now,
          });
          newlyStuck.push(log);
          console.log(`[STUCK_MONITOR] STUCK: ${log.id} (${log.submission_id})`);

          // AuditLog for newly stuck
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
              entry_date: log.entry_date || null,
              age_seconds: Math.round((Date.now() - new Date(log.timestamp_received || log.created_date).getTime()) / 1000),
            },
          });
        }
      }
    }

    // ========================================
    // STEP 4: Heal previously stuck logs (lightweight)
    // ========================================
    if (terminalIds.size > 0) {
      const previouslyStuck = await svc.entities.MobileEntrySubmissionLog.filter(
        { stuck_detected: true }, '-created_date', 50
      );
      for (const log of previouslyStuck) {
        if (log.auto_resolved === true) continue;
        if (log.submission_id && terminalIds.has(log.submission_id)) {
          await svc.entities.MobileEntrySubmissionLog.update(log.id, {
            stuck_detected: false,
            auto_resolved: true,
          });
          resolved.push(log.id);
          console.log(`[STUCK_MONITOR] HEALED: ${log.id}`);
        }
      }
    }

    // ========================================
    // STEP 5: Email only for NEWLY stuck
    // ========================================
    if (newlyStuck.length > 0) {
      const rows = newlyStuck.map(log => {
        const age = Math.round((Date.now() - new Date(log.timestamp_received || log.created_date).getTime()) / 1000);
        const device = (log.user_agent || '').includes('iPhone') || (log.user_agent || '').includes('iPad')
          ? 'iOS'
          : (log.user_agent || '').includes('Android') ? 'Android' : 'Onbekend';
        return `• <b>${log.email || 'Onbekend'}</b> — ${(log.submission_id || '?').slice(0, 8)}… — ${age}s geleden — ${device} — datum: ${log.entry_date || '?'}`;
      }).join('<br>');

      await svc.integrations.Core.SendEmail({
        to: 'ruben@interdistri.nl',
        subject: `⚠ ${newlyStuck.length} Mobile Entry submission(s) vastgelopen`,
        body: `
          <h2 style="color:#d97706;">⚠ Mobile Entry submission(s) vastgelopen</h2>
          <p>Er ${newlyStuck.length === 1 ? 'is' : 'zijn'} <b>${newlyStuck.length}</b> submission(s) gedetecteerd die langer dan 30 seconden op status RECEIVED staan:</p>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin:12px 0;font-size:13px;">
            ${rows}
          </div>
          <p style="font-size:12px;color:#6b7280;">
            Tijdstip detectie: ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}
          </p>
        `,
        from_name: 'Interdistri TMS Monitoring',
      });
    }

    console.log(`[STUCK_MONITOR] Done. Resolved: ${resolved.length}, Newly stuck: ${newlyStuck.length}, Duration: ${Date.now() - t0}ms`);

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