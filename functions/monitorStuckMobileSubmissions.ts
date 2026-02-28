// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM (Scheduled Automation)                    ║
// ║ Called by: Scheduled automation every 5 minutes                 ║
// ║ Auth: Service role (scheduled)                                  ║
// ║                                                                 ║
// ║ v3 — Ultra-lightweight: skip unknowns, batch updates, delays   ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const STUCK_THRESHOLD_MS = 30_000; // 30 seconds

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

Deno.serve(async (req) => {
  const t0 = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

    // ========================================
    // STEP 1: Get RECEIVED logs older than threshold
    // ========================================
    const receivedLogs = await svc.entities.MobileEntrySubmissionLog.filter(
      { status: 'RECEIVED' }, '-created_date', 100
    );

    // Filter: older than threshold AND has a real submission_id
    const oldReceived = receivedLogs.filter(log => {
      const receivedAt = log.timestamp_received || log.created_date;
      if (!receivedAt || receivedAt >= cutoff) return false;
      // Skip "unknown" submission_ids — these are noise from auth failures
      if (!log.submission_id || log.submission_id === 'unknown') return false;
      return true;
    });

    console.log(`[STUCK_MONITOR] ${oldReceived.length} actionable RECEIVED logs (${receivedLogs.length} total, filtered unknown/recent)`);

    if (oldReceived.length === 0) {
      return Response.json({
        success: true, resolved_count: 0, newly_stuck_count: 0,
        message: 'No actionable RECEIVED logs',
        latency_ms: Date.now() - t0,
      });
    }

    // ========================================
    // STEP 2: Check MobileSubmissionIndex for terminal status
    // ========================================
    const uniqueSubIds = [...new Set(oldReceived.map(l => l.submission_id))];
    const terminalIds = new Set();

    // Check 3 at a time with delay
    for (let i = 0; i < uniqueSubIds.length; i += 3) {
      if (i > 0) await sleep(500);
      const batch = uniqueSubIds.slice(i, i + 3);
      const results = await Promise.all(
        batch.map(subId =>
          svc.entities.MobileSubmissionIndex.filter({ submission_id: subId })
            .catch(() => [])
        )
      );
      for (let j = 0; j < batch.length; j++) {
        const hasTerminal = (results[j] || []).some(r =>
          ['SUCCESS', 'FAILED', 'VALIDATION_FAILED', 'SYSTEM_ERROR', 'IDEMPOTENT'].includes(r.status)
        );
        if (hasTerminal) terminalIds.add(batch[j]);
      }
    }

    console.log(`[STUCK_MONITOR] Terminal matches: ${terminalIds.size}/${uniqueSubIds.length}`);

    // ========================================
    // STEP 3: Classify and update (with rate-limit-safe delays)
    // ========================================
    const resolved = [];
    const newlyStuck = [];
    let updateCount = 0;

    for (const log of oldReceived) {
      const isTerminal = terminalIds.has(log.submission_id);

      if (isTerminal) {
        // Has terminal sibling → auto-resolve
        if (log.stuck_detected !== false || log.auto_resolved !== true) {
          if (updateCount > 0 && updateCount % 3 === 0) await sleep(500);
          await svc.entities.MobileEntrySubmissionLog.update(log.id, {
            stuck_detected: false,
            auto_resolved: true,
          });
          updateCount++;
          resolved.push(log.id);
        }
      } else {
        // No terminal sibling → stuck
        if (log.stuck_detected !== true) {
          if (updateCount > 0 && updateCount % 3 === 0) await sleep(500);
          await svc.entities.MobileEntrySubmissionLog.update(log.id, {
            stuck_detected: true,
            auto_resolved: false,
            stuck_detected_at: new Date().toISOString(),
          });
          updateCount++;
          newlyStuck.push(log);
          console.log(`[STUCK_MONITOR] STUCK: ${log.id} (${log.submission_id})`);
        }
      }
    }

    // ========================================
    // STEP 4: Audit + email for newly stuck (max 5)
    // ========================================
    if (newlyStuck.length > 0) {
      // Create audit logs (max 5 to stay within rate limits)
      for (const log of newlyStuck.slice(0, 5)) {
        await sleep(300);
        await svc.entities.AuditLog.create({
          action_type: 'create',
          category: 'Systeem',
          description: `Mobile Entry submission vastgelopen: ${log.submission_id} van ${log.email || 'onbekend'}`,
          performed_by_email: 'system@interdistri.nl',
          performed_by_name: 'Stuck Monitor',
          performed_by_role: 'system',
          target_entity: 'MobileEntrySubmissionLog',
          target_id: log.id,
          metadata: {
            type: 'MOBILE_SUBMISSION_STUCK',
            submission_id: log.submission_id,
            user_email: log.email || null,
            entry_date: log.entry_date || null,
          },
        });
      }

      // Send single summary email
      await sleep(300);
      const rows = newlyStuck.map(log => {
        const age = Math.round((Date.now() - new Date(log.timestamp_received || log.created_date).getTime()) / 1000);
        return `• <b>${log.email || 'Onbekend'}</b> — ${(log.submission_id || '?').slice(0, 8)}… — ${age}s — datum: ${log.entry_date || '?'}`;
      }).join('<br>');

      await svc.integrations.Core.SendEmail({
        to: 'ruben@interdistri.nl',
        subject: `⚠ ${newlyStuck.length} Mobile Entry submission(s) vastgelopen`,
        body: `
          <h2 style="color:#d97706;">⚠ Mobile Entry submission(s) vastgelopen</h2>
          <p><b>${newlyStuck.length}</b> submission(s) staan langer dan 30s op RECEIVED:</p>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin:12px 0;font-size:13px;">${rows}</div>
          <p style="font-size:12px;color:#6b7280;">Tijdstip: ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}</p>
        `,
        from_name: 'Interdistri TMS Monitoring',
      });
    }

    console.log(`[STUCK_MONITOR] Done. Resolved: ${resolved.length}, Stuck: ${newlyStuck.length}, ${Date.now() - t0}ms`);

    return Response.json({
      success: true,
      resolved_count: resolved.length,
      newly_stuck_count: newlyStuck.length,
      latency_ms: Date.now() - t0,
    });

  } catch (error) {
    console.error('[STUCK_MONITOR] Error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});