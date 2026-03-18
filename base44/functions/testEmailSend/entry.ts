import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const FORCED_CC = 'ruben@interdistri.nl';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { to } = await req.json();
    const toEmail = to || user.email;

    const ccAddr = toEmail.toLowerCase() !== FORCED_CC.toLowerCase() ? FORCED_CC : '';
    const subject = 'Testmail Interdistri TMS — E-mail verificatie';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Interdistri TMS</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0;">Test e-mail</p>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 16px; color: #1e293b;">Dit is een testmail.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="color: #166534; font-weight: 600; margin: 0;">✓ E-mail verzending werkt correct</p>
            <p style="color: #15803d; font-size: 14px; margin: 8px 0 0;">
              <strong>Aan:</strong> ${toEmail}<br/>
              <strong>CC:</strong> ${ccAddr || '(geen)'}<br/>
              <strong>Tijdstip:</strong> ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}
            </p>
          </div>
          <p style="color: #475569; font-size: 14px;">Als u deze mail ontvangt, werkt de Gmail integratie inclusief vaste CC correct.</p>
        </div>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Van Dooren Transport Zeeland B.V. (Interdistri)</p>
        </div>
      </div>
    `;

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    const rawHeaders = [
      `To: ${toEmail}`,
      ...(ccAddr ? [`Cc: ${ccAddr}`] : []),
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
    ];

    const rawEmail = rawHeaders.join("\r\n") + "\r\n\r\n" + htmlBody;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(rawEmail);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    const base64 = btoa(binary)
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

    const sentAt = new Date().toISOString();

    if (!response.ok) {
      const errorData = await response.text();
      await base44.asServiceRole.entities.EmailLog.create({
        to: toEmail,
        cc: ccAddr,
        subject,
        status: 'failed',
        source_function: 'testEmailSend',
        error_message: errorData,
        sent_at: sentAt,
      });
      return Response.json({
        success: false,
        to: toEmail,
        cc: ccAddr,
        error: errorData,
        timestamp: sentAt,
      }, { status: response.status });
    }

    const result = await response.json();
    await base44.asServiceRole.entities.EmailLog.create({
      to: toEmail,
      cc: ccAddr,
      subject,
      status: 'success',
      source_function: 'testEmailSend',
      sent_at: sentAt,
    });

    return Response.json({
      success: true,
      to: toEmail,
      cc: ccAddr,
      messageId: result.id,
      timestamp: sentAt,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});