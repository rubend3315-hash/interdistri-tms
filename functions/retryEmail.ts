import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { log_id } = await req.json();
    if (!log_id) {
      return Response.json({ error: 'Missing log_id' }, { status: 400 });
    }

    const log = await base44.asServiceRole.entities.EmailLog.get(log_id);
    if (!log) {
      return Response.json({ error: 'EmailLog not found' }, { status: 404 });
    }

    if (log.status === 'success') {
      return Response.json({ error: 'Email was already sent successfully' }, { status: 400 });
    }

    // Mark as retrying
    await base44.asServiceRole.entities.EmailLog.update(log_id, {
      status: 'retrying',
      last_retry_at: new Date().toISOString(),
    });

    // Call mailService to resend
    const result = await base44.functions.invoke('mailService', {
      to: log.to,
      cc: log.cc,
      subject: log.subject,
      html: '<p>Opnieuw verzonden — origineel bericht niet beschikbaar voor retry.</p>',
      source_function: log.source_function,
      resent_by: user.email,
      original_log_id: log_id,
      skip_auth: true,
    });

    // Update original log
    const newRetryCount = (log.retry_count || 0) + 1;
    await base44.asServiceRole.entities.EmailLog.update(log_id, {
      retry_count: newRetryCount,
      last_retry_at: new Date().toISOString(),
      status: result.data?.success ? 'success' : 'failed',
      ...(result.data?.messageId ? { message_id: result.data.messageId } : {}),
      ...(result.data?.error ? { error_message: result.data.error } : {}),
    });

    return Response.json({
      success: result.data?.success || false,
      retry_count: newRetryCount,
      new_log_id: result.data?.logId,
    });
  } catch (error) {
    console.error('retryEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});