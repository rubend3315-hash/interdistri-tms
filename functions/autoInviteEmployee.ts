import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper: send email via Gmail API
const CC_ADDRESS = 'ruben@interdistri.nl';

async function sendGmail(accessToken, to, subject, htmlBody) {
  const boundary = 'boundary_' + Date.now();
  const ccLine = to.toLowerCase() !== CC_ADDRESS.toLowerCase() ? `Cc: ${CC_ADDRESS}` : '';
  const rawEmail = [
    `To: ${to}`,
    ...(ccLine ? [ccLine] : []),
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(htmlBody))),
    `--${boundary}--`
  ].join('\r\n');

  const encodedMessage = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMessage })
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${errBody}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { event, data } = body;

    // Only process create and update events
    if (!event || !['create', 'update'].includes(event.type)) {
      return Response.json({ status: 'skipped', reason: 'not a create/update event' });
    }

    // Check if employee has an email
    const employeeEmail = data?.email;
    if (!employeeEmail) {
      return Response.json({ status: 'skipped', reason: 'no email on employee' });
    }

    // Check if employee status is active
    if (data.status && data.status !== 'Actief') {
      return Response.json({ status: 'skipped', reason: 'employee not active' });
    }

    // Check if a user with this email already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: employeeEmail });
    if (existingUsers && existingUsers.length > 0) {
      return Response.json({ status: 'skipped', reason: 'user already exists' });
    }

    // Invite the employee as a user with role 'user' (Medewerker)
    await base44.users.inviteUser(employeeEmail, 'user');

    const employeeName = `${data.first_name || ''} ${data.prefix ? data.prefix + ' ' : ''}${data.last_name || ''}`.trim();
    console.log(`Medewerker ${employeeName} (${employeeEmail}) uitgenodigd als gebruiker.`);

    // Send welcome email via Gmail
    const gmailToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    const welcomeBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Interdistri Transport</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0;">Welkom bij Interdistri</p>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 16px; color: #1e293b;">Beste ${employeeName},</p>
          <p style="color: #475569; line-height: 1.6;">
            Welkom! Er is een account voor je aangemaakt in het <strong>Interdistri TMS portaal</strong>.
          </p>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="color: #1e40af; font-weight: 600; margin: 0 0 8px;">Wat kun je doen?</p>
            <ul style="color: #1e40af; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Contracten bekijken en ondertekenen</li>
              <li>Uren registreren via de mobiele app</li>
              <li>Documenten inzien</li>
              <li>Berichten ontvangen van je leidinggevende</li>
            </ul>
          </div>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Je ontvangt een uitnodigingsmail waarmee je zelf een account kunt aanmaken. Gebruik hiervoor je e-mailadres <strong>${employeeEmail}</strong>.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Van Dooren Transport Zeeland B.V. (Interdistri) — Fleerbosseweg 19, 4421 RR Kapelle
          </p>
        </div>
      </div>
    `;

    try {
      await sendGmail(gmailToken, employeeEmail, `Welkom bij Interdistri — Je account is aangemaakt`, welcomeBody);
      console.log(`Welkomst-email verzonden naar ${employeeEmail}`);
    } catch (emailErr) {
      console.error('Failed to send welcome email via Gmail:', emailErr.message);
    }

    return Response.json({ 
      status: 'success', 
      message: `Gebruiker uitgenodigd en welkomst-email verzonden: ${employeeEmail}` 
    });
  } catch (error) {
    console.error('Error in autoInviteEmployee:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});