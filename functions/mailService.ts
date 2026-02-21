// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM_LEVEL (INFRASTRUCTURE)                    ║
// ║ Called by: Other backend functions (not directly from frontend)  ║
// ║ Auth: Caller-dependent (skip_auth for automations)               ║
// ║ Tenant: Receives tenant_id from caller, passes to EmailLog      ║
// ║ Uses asServiceRole — required for Gmail API + EmailLog writes.   ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const FORCED_CC = 'ruben@interdistri.nl';
const MAX_RETRIES = 3;
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

function buildCcList(to, extraCc) {
  const ccSet = new Set();
  ccSet.add(FORCED_CC);
  if (extraCc) {
    (typeof extraCc === 'string' ? extraCc.split(',') : extraCc)
      .map(e => e.trim()).filter(Boolean).forEach(e => ccSet.add(e));
  }
  ccSet.delete(to.toLowerCase());
  return Array.from(ccSet).join(', ');
}

function base64UrlEncode(str) {
  const encoded = btoa(unescape(encodeURIComponent(str)));
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function replacePlaceholders(text, placeholders) {
  if (!text || !placeholders) return text;
  let result = text;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '—');
  }
  return result;
}

async function resolveTemplate(base44, templateKey, placeholders) {
  if (!templateKey) return null;
  const templates = await base44.asServiceRole.entities.EmailTemplate.filter({
    template_key: templateKey,
    is_active: true,
  });
  if (templates.length === 0) return null;
  const t = templates[0];
  return {
    subject: replacePlaceholders(t.subject, placeholders),
    body: replacePlaceholders(t.body, placeholders),
  };
}

async function sendViaGmail(accessToken, to, cc, subject, htmlBody, replyTo) {
  const rawHeaders = [
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
  ];
  const rawMessage = rawHeaders.join('\r\n') + '\r\n\r\n' + htmlBody;
  const encoded = base64UrlEncode(rawMessage);

  const res = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail API error (${res.status}): ${errText}`);
  }
  return await res.json();
}

async function sendWithRetry(accessToken, to, cc, subject, htmlBody, replyTo, maxRetries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendViaGmail(accessToken, to, cc, subject, htmlBody, replyTo);
      return { success: true, messageId: result.id, attempts: attempt + 1 };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  return { success: false, error: lastError.message, attempts: maxRetries + 1 };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const {
      to,
      cc,
      subject,
      html,
      source_function: sourceFunction,
      template_key: templateKey,
      placeholders,
      reply_to: replyTo,
      skip_auth,       // for automation calls (e.g. sendTimeEntryRejectionEmail)
      resent_by,       // admin email if resend
      original_log_id, // link to original log
      idempotency_key: explicitKey, // caller can provide explicit key
      entity_id: entityId,          // for auto-generating idempotency key
      correlation_id: incomingCorrelationId, // flow tracing
      tenant_id: incomingTenantId,  // tenant isolation
    } = body;

    // Generate correlation_id if not provided
    const correlationId = incomingCorrelationId || crypto.randomUUID();

    // Auth check - skip for automation-triggered calls
    if (!skip_auth) {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!to || !subject) {
      return Response.json({ error: 'Missing required: to, subject' }, { status: 400 });
    }

    // Resolve template if provided
    let finalSubject = subject;
    let finalBody = html || '';
    if (templateKey) {
      const tpl = await resolveTemplate(base44, templateKey, placeholders);
      if (tpl) {
        finalSubject = tpl.subject;
        finalBody = tpl.body;
      }
    }
    // Apply placeholders to non-template content too
    if (placeholders && !templateKey) {
      finalSubject = replacePlaceholders(finalSubject, placeholders);
      finalBody = replacePlaceholders(finalBody, placeholders);
    }

    const finalCc = buildCcList(to, cc);

    // Idempotency check: generate key from source+recipient+entityId+template
    const idempotencyKey = explicitKey || [
      sourceFunction || 'mailService',
      to.toLowerCase().trim(),
      entityId || '',
      templateKey || '',
    ].join('|');

    // Check for existing successful send with same key
    const existingLogs = await base44.asServiceRole.entities.EmailLog.filter({
      idempotency_key: idempotencyKey,
      status: 'success',
    });
    if (existingLogs.length > 0) {
      return Response.json({
        success: true,
        skipped: true,
        reason: 'Duplicate blocked by idempotency key',
        existingLogId: existingLogs[0].id,
        messageId: existingLogs[0].message_id,
      });
    }

    // Create pending log
    const logEntry = await base44.asServiceRole.entities.EmailLog.create({
      to,
      cc: finalCc,
      subject: finalSubject,
      status: 'sending',
      source_function: sourceFunction || 'mailService',
      sent_at: new Date().toISOString(),
      retry_count: 0,
      idempotency_key: idempotencyKey,
      correlation_id: correlationId,
      ...(resent_by ? { resent_by } : {}),
      ...(original_log_id ? { original_log_id } : {}),
      ...(incomingTenantId ? { tenant_id: incomingTenantId } : {}),
    });

    // Get Gmail token and send
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    const result = await sendWithRetry(accessToken, to, finalCc, finalSubject, finalBody, replyTo);

    if (result.success) {
      await base44.asServiceRole.entities.EmailLog.update(logEntry.id, {
        status: 'success',
        message_id: result.messageId || null,
        retry_count: result.attempts - 1,
      });
      // Audit log
      try {
        await base44.functions.invoke('auditService', {
          entity_type: 'EmailLog',
          entity_id: logEntry.id,
          action_type: resent_by ? 'resend' : 'send',
          category: 'Communicatie',
          description: `E-mail verzonden naar ${to}: "${finalSubject}"`,
          performed_by_email: resent_by || sourceFunction || 'system',
          performed_by_role: resent_by ? 'admin' : 'system',
          correlation_id: correlationId,
          tenant_id: incomingTenantId || null,
          metadata: { source_function: sourceFunction, to, message_id: result.messageId, attempts: result.attempts },
        });
      } catch (_) {}
      return Response.json({
        success: true,
        messageId: result.messageId,
        logId: logEntry.id,
        attempts: result.attempts,
        correlation_id: correlationId,
      });
    } else {
      await base44.asServiceRole.entities.EmailLog.update(logEntry.id, {
        status: 'failed',
        error_message: result.error,
        retry_count: result.attempts - 1,
      });
      // Audit log for failure
      try {
        await base44.functions.invoke('auditService', {
          entity_type: 'EmailLog',
          entity_id: logEntry.id,
          action_type: 'send',
          category: 'Communicatie',
          description: `E-mail verzending mislukt naar ${to}: "${finalSubject}"`,
          performed_by_email: sourceFunction || 'system',
          performed_by_role: 'system',
          correlation_id: correlationId,
          tenant_id: incomingTenantId || null,
          metadata: { source_function: sourceFunction, to, error: result.error, attempts: result.attempts },
        });
      } catch (_) {}
      return Response.json({
        success: false,
        error: result.error,
        logId: logEntry.id,
        attempts: result.attempts,
        correlation_id: correlationId,
      }, { status: 502 });
    }
  } catch (error) {
    console.error('mailService error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});