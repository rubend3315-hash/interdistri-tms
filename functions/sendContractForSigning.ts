import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CC_ADDRESS = 'ruben@interdistri.nl';

async function sendGmail(accessToken, to, subject, htmlBody) {
  const boundary = 'boundary_' + Date.now() + Math.random();
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

function replacePlaceholders(text, placeholders) {
  let result = text;
  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '—');
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { contract_id, auto_invite, app_url } = await req.json();
    if (!contract_id) {
      return Response.json({ error: 'Missing contract_id' }, { status: 400 });
    }

    const contract = await base44.asServiceRole.entities.Contract.get(contract_id);
    if (!contract) {
      return Response.json({ error: 'Contract niet gevonden' }, { status: 404 });
    }

    const employee = await base44.asServiceRole.entities.Employee.get(contract.employee_id);
    if (!employee || !employee.email) {
      return Response.json({ error: 'Medewerker niet gevonden of heeft geen e-mailadres' }, { status: 400 });
    }

    const employeeName = `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}`;

    const placeholders = {
      naam: employeeName,
      contractnummer: contract.contract_number || '—',
      contract_type: contract.contract_type || '—',
      startdatum: contract.start_date ? new Date(contract.start_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—',
      einddatum: contract.end_date ? new Date(contract.end_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—',
      functie: contract.function_title || '—',
    };

    // Check for custom template
    let emailSubject, emailBody;
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({
      template_key: 'contract_ter_ondertekening',
      is_active: true,
    });

    if (templates.length > 0) {
      const template = templates[0];
      emailSubject = replacePlaceholders(template.subject, placeholders);
      emailBody = replacePlaceholders(template.body, placeholders);
    } else {
      emailSubject = `Arbeidsovereenkomst ter ondertekening - ${contract.contract_number}`;
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Interdistri Transport</h1>
            <p style="color: #bfdbfe; margin: 8px 0 0;">Arbeidsovereenkomst</p>
          </div>
          <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; color: #1e293b;">Beste ${employeeName},</p>
            <p style="color: #475569; line-height: 1.6;">Er staat een nieuw arbeidscontract klaar ter ondertekening.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Contractnummer:</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 14px;">${contract.contract_number}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Type:</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 14px;">${contract.contract_type}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Startdatum:</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 14px;">${placeholders.startdatum}</td></tr>
                ${contract.end_date ? `<tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Einddatum:</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 14px;">${placeholders.einddatum}</td></tr>` : ''}
                <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Functie:</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 14px;">${contract.function_title || '-'}</td></tr>
              </table>
            </div>
            <p style="color: #475569; line-height: 1.6;">Je kunt het contract bekijken en digitaal ondertekenen via de <strong>Interdistri TMS app</strong>.</p>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="color: #1e40af; font-size: 14px; margin: 0; font-weight: 600;">📱 Stappen:</p>
              <ol style="color: #1e40af; font-size: 13px; margin: 8px 0 0; padding-left: 20px; line-height: 1.8;">
                <li>Open de Interdistri TMS app</li>
                <li>Tik op het menu (☰) rechtsboven</li>
                <li>Kies "Mijn Contracten"</li>
                <li>Lees het contract en onderteken digitaal</li>
              </ol>
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Van Dooren Transport Zeeland B.V. (Interdistri) — Fleerbosseweg 19, 4421 RR Kapelle</p>
          </div>
        </div>
      `;
    }

    const gmailToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    // Update contract status
    await base44.asServiceRole.entities.Contract.update(contract_id, {
      status: 'TerOndertekening',
      reminder_sent_dates: [...(contract.reminder_sent_dates || []), new Date().toISOString().split('T')[0]]
    });

    // Send to employee
    const sentAt = new Date().toISOString();
    try {
      const gmailResult = await sendGmail(gmailToken, employee.email, emailSubject, emailBody);
      await base44.asServiceRole.entities.EmailLog.create({
        to: employee.email, cc: CC_ADDRESS, subject: emailSubject, status: 'success', source_function: 'sendContractForSigning', sent_at: sentAt, message_id: gmailResult?.id || null,
      });
    } catch (emailErr) {
      console.error('Failed to send employee email via Gmail:', emailErr.message);
      await base44.asServiceRole.entities.EmailLog.create({
        to: employee.email, cc: CC_ADDRESS, subject: emailSubject, status: 'failed', source_function: 'sendContractForSigning', error_message: emailErr.message, sent_at: sentAt,
      });
    }

    // Send copy to admin
    const adminSubject = `[Kopie] Arbeidsovereenkomst verzonden naar ${employeeName} - ${contract.contract_number}`;
    try {
      const adminGmailResult = await sendGmail(gmailToken, user.email, adminSubject, `<p>Contract ${contract.contract_number} is verzonden naar ${employeeName} (${employee.email}).</p>`);
      await base44.asServiceRole.entities.EmailLog.create({
        to: user.email, cc: CC_ADDRESS, subject: adminSubject, status: 'success', source_function: 'sendContractForSigning', sent_at: new Date().toISOString(), message_id: adminGmailResult?.id || null,
      });
    } catch (emailErr) {
      console.error('Failed to send admin copy via Gmail:', emailErr.message);
    }

    // Notification
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const employeeUser = allUsers.find(u => u.email === employee.email);
      if (employeeUser) {
        await base44.asServiceRole.entities.Notification.create({
          title: 'Contract ter ondertekening',
          description: `Je arbeidscontract ${contract.contract_number} staat klaar ter ondertekening.`,
          type: 'general',
          target_page: 'Contracts',
          user_ids: [employeeUser.id],
          priority: 'high'
        });
      }
    } catch (_) { /* notification is optional */ }

    return Response.json({ success: true, message: `Contract is verzonden naar ${employeeName} (${employee.email})` });

  } catch (error) {
    console.error('Send contract error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});