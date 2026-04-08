import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { encode as base64urlEncode } from 'npm:base64url@3.0.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body, cc } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Build RFC 2822 MIME message
    const boundary = "boundary_" + Date.now();
    const mimeLines = [
      `From: me`,
      `To: ${to}`,
    ];
    if (cc) {
      mimeLines.push(`Cc: ${cc}`);
    }
    mimeLines.push(
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      btoa(unescape(encodeURIComponent(body)))
    );

    const rawMessage = mimeLines.join("\r\n");
    // Gmail API requires base64url encoding of the raw message
    const encodedMessage = btoa(rawMessage)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gmail API error:', errorData);
      return Response.json({ error: 'Failed to send email', details: errorData }, { status: 500 });
    }

    const result = await response.json();
    return Response.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error('sendReminderEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});