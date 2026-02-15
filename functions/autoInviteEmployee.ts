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
    
    let body = {};
    try {
      body = await req.json();
    } catch (_e) {
      // No body provided
    }

    console.log('Body received:', JSON.stringify(body));
    
    // Verify the caller is an authenticated admin
    let user;
    try {
      user = await base44.auth.me();
      console.log('User authenticated:', user?.email, user?.role);
    } catch (authErr) {
      console.error('Auth failed:', authErr.message);
      return Response.json({ error: 'Authentication failed: ' + authErr.message }, { status: 401 });
    }
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    // Support both single employee and bulk mode
    // Single: { employee_id, email, first_name, prefix, last_name }
    // Bulk: { bulk: true } — fetches all active employees and invites those without a user account
    
    if (body.bulk) {
      // Bulk invite: get all active employees and all existing users
      const allEmployees = await base44.asServiceRole.entities.Employee.filter({ status: 'Actief' });
      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
      const existingEmails = new Set(allUsers.map(u => u.email?.toLowerCase()));

      const results = [];
      const gmailToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

      for (const emp of allEmployees) {
        const email = emp.email;
        if (!email) {
          results.push({ name: `${emp.first_name} ${emp.last_name}`, status: 'skipped', reason: 'geen e-mail' });
          continue;
        }
        if (existingEmails.has(email.toLowerCase())) {
          results.push({ name: `${emp.first_name} ${emp.last_name}`, email, status: 'skipped', reason: 'heeft al account' });
          continue;
        }

        // Invite
        await base44.auth.inviteUser(email, 'user');
        existingEmails.add(email.toLowerCase()); // prevent duplicates in same run

        const employeeName = `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim();

        // Send welcome email
        const welcomeBody = buildWelcomeEmail(employeeName, email);
        try {
          await sendGmail(gmailToken, email, `Welkom bij Interdistri — Je account is aangemaakt`, welcomeBody);
          results.push({ name: employeeName, email, status: 'success' });
        } catch (emailErr) {
          results.push({ name: employeeName, email, status: 'invited_no_email', reason: emailErr.message });
        }
      }

      const invited = results.filter(r => r.status === 'success' || r.status === 'invited_no_email').length;
      const skipped = results.filter(r => r.status === 'skipped').length;

      return Response.json({ 
        status: 'success',
        summary: `${invited} uitgenodigd, ${skipped} overgeslagen`,
        results
      });
    }

    // Single invite mode
    const employeeEmail = body.email;
    if (!employeeEmail) {
      return Response.json({ error: 'Geen e-mailadres opgegeven' }, { status: 400 });
    }

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: employeeEmail });
    if (existingUsers && existingUsers.length > 0) {
      return Response.json({ status: 'skipped', reason: 'user already exists' });
    }

    await base44.auth.inviteUser(employeeEmail, 'user');

    const employeeName = `${body.first_name || ''} ${body.prefix ? body.prefix + ' ' : ''}${body.last_name || ''}`.trim();
    console.log(`Medewerker ${employeeName} (${employeeEmail}) uitgenodigd als gebruiker.`);

    const gmailToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    const welcomeBody = buildWelcomeEmail(employeeName, employeeEmail);

    try {
      await sendGmail(gmailToken, employeeEmail, `Welkom bij Interdistri — Je account is aangemaakt`, welcomeBody);
      console.log(`Welkomst-email verzonden naar ${employeeEmail}`);
    } catch (emailErr) {
      console.error('Failed to send welcome email via Gmail:', emailErr.message);
    }

    return Response.json({ 
      status: 'success', 
      message: `Gebruiker uitgenodigd: ${employeeEmail}` 
    });
  } catch (error) {
    console.error('Error in autoInviteEmployee:', error.message);
    if (error.response) {
      console.error('Error data:', JSON.stringify(error.response.data || {}));
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildWelcomeEmail(employeeName, employeeEmail) {
  return `
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
}