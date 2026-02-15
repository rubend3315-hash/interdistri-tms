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

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    const results = [];

    for (const toEmail of to_emails) {
      const rawHeaders = [
        `To: ${toEmail}`,
        `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
        `Content-Type: text/html; charset=UTF-8`,
      ];

      if (reply_to) {
        rawHeaders.push(`Reply-To: ${reply_to}`);
      }

      const rawMessage = rawHeaders.join('\r\n') + '\r\n\r\n' + body;

      // Base64url encode the raw message
      const encoded = btoa(unescape(encodeURIComponent(rawMessage)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encoded }),
      });

      if (response.ok) {
        results.push({ email: toEmail, status: 'sent' });
      } else {
        const errorData = await response.text();
        console.error(`Failed to send to ${toEmail}:`, errorData);
        results.push({ email: toEmail, status: 'failed', error: errorData });
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return Response.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      results
    });

  } catch (error) {
    console.error('sendEmployeeEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});