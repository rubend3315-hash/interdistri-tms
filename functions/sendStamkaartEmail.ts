import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { to, cc, subject, body, template_key, placeholders } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    // Check for a custom template
    let finalSubject = subject;
    let finalBody = body;

    if (template_key) {
      const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ 
        template_key, 
        is_active: true 
      });
      if (templates.length > 0) {
        const template = templates[0];
        finalSubject = template.subject;
        finalBody = template.body;

        // Replace placeholders
        if (placeholders) {
          for (const [key, value] of Object.entries(placeholders)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            finalSubject = finalSubject.replace(regex, value || '—');
            finalBody = finalBody.replace(regex, value || '—');
          }
        }
      }
    }

    // Get Gmail access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    // Build the email
    const headers = [
      `To: ${to}`,
      `Subject: ${finalSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
    ];
    
    if (cc) {
      headers.splice(1, 0, `Cc: ${cc}`);
    }

    const rawEmail = headers.join("\r\n") + "\r\n\r\n" + finalBody;

    // Base64url encode
    const encoder = new TextEncoder();
    const data = encoder.encode(rawEmail);
    const base64 = btoa(String.fromCharCode(...data))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64 }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return Response.json({ error: `Gmail API error: ${errorData}` }, { status: response.status });
    }

    const result = await response.json();
    return Response.json({ success: true, messageId: result.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});