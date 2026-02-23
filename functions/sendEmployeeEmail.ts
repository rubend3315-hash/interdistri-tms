// redeploy: 2026-02-23T full_function_redeploy_protocol_v1
// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Admin via frontend (Messages page)                    ║
// ║ Auth: User session (admin only)                                  ║
// ║ DO NOT USE RAW ENTITY CALLS — USE tenantService for tenant data  ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { to_emails, subject, body, reply_to } = await req.json();

    if (!to_emails || to_emails.length === 0 || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to_emails, subject, body' }, { status: 400 });
    }

    const results = [];

    for (const toEmail of to_emails) {
      const result = await base44.functions.invoke('mailService', {
        to: toEmail,
        subject,
        html: body,
        reply_to,
        source_function: 'sendEmployeeEmail',
      });

      results.push({
        email: toEmail,
        status: result.data?.success ? 'sent' : 'failed',
        messageId: result.data?.messageId,
        error: result.data?.error,
      });
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return Response.json({ success: true, sent: sentCount, failed: failedCount, results });
  } catch (error) {
    console.error('sendEmployeeEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});