import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contract_id, signer_role } = await req.json();

    if (!contract_id || !signer_role) {
      return Response.json({ error: 'Missing contract_id or signer_role' }, { status: 400 });
    }

    const contract = await base44.asServiceRole.entities.Contract.get(contract_id);
    if (!contract) {
      return Response.json({ error: 'Contract not found' }, { status: 404 });
    }

    const employee = await base44.asServiceRole.entities.Employee.get(contract.employee_id);
    if (!employee) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    const gmailToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    const employeeName = `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}`;
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.role === 'admin');
    const employeeUser = allUsers.find(u => u.email === employee.email);
    const appBaseUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';

    if (signer_role === 'employee') {
      const placeholders = {
        naam: employeeName,
        contractnummer: contract.contract_number || '—',
        admin_naam: '',
      };

      // Check for custom template
      let emailSubject, emailBody;
      const templates = await base44.asServiceRole.entities.EmailTemplate.filter({
        template_key: 'contract_ondertekend_door_medewerker',
        is_active: true,
      });

      for (const admin of adminUsers) {
        if (!admin.email) continue;
        placeholders.admin_naam = admin.full_name || 'Admin';

        if (templates.length > 0) {
          emailSubject = replacePlaceholders(templates[0].subject, placeholders);
          emailBody = replacePlaceholders(templates[0].body, placeholders);
        } else {
          emailSubject = `Contract ondertekend door ${employeeName} — uw handtekening nodig - ${contract.contract_number}`;
          emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Interdistri Transport</h1>
                <p style="color: #bfdbfe; margin: 8px 0 0;">Contract ondertekend door medewerker</p>
              </div>
              <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
                <p style="font-size: 16px; color: #1e293b;">Beste ${admin.full_name},</p>
                <p style="color: #475569; line-height: 1.6;">
                  <strong>${employeeName}</strong> heeft contract <strong>${contract.contract_number}</strong> ondertekend.
                </p>
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="color: #92400e; font-weight: 600; margin: 0;">Actie vereist: Uw handtekening</p>
                  <p style="color: #a16207; font-size: 14px; margin: 4px 0 0;">De medewerker heeft getekend. Het contract wacht nog op uw handtekening om geactiveerd te worden.</p>
                </div>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${appBaseUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Contract bekijken &amp; ondertekenen</a>
                </div>
              </div>
              <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">Van Dooren Transport Zeeland B.V. (Interdistri) — Fleerbosseweg 19, 4421 RR Kapelle</p>
              </div>
            </div>
          `;
        }
        const sentAt = new Date().toISOString();
        try {
          const gmailResult = await sendGmail(gmailToken, admin.email, emailSubject, emailBody);
          await base44.asServiceRole.entities.EmailLog.create({
            to: admin.email, cc: CC_ADDRESS, subject: emailSubject, status: 'success', source_function: 'notifyContractSigned', sent_at: sentAt, message_id: gmailResult?.id || null,
          });
        } catch (sendErr) {
          await base44.asServiceRole.entities.EmailLog.create({
            to: admin.email, cc: CC_ADDRESS, subject: emailSubject, status: 'failed', source_function: 'notifyContractSigned', error_message: sendErr.message, sent_at: sentAt,
          });
        }
      }

      const adminUserIds = adminUsers.map(u => u.id);
      await base44.asServiceRole.entities.Notification.create({
        title: `Contract ondertekend door ${employeeName} — uw handtekening nodig`,
        description: `Contract ${contract.contract_number} is door ${employeeName} ondertekend. Uw handtekening is nog nodig.`,
        type: 'general',
        target_page: 'Contracts',
        user_ids: adminUserIds,
        priority: 'high'
      });

    } else if (signer_role === 'manager') {
      if (employee.email) {
        const placeholders = {
          naam: employeeName,
          contractnummer: contract.contract_number || '—',
        };

        let emailSubject, emailBody;
        const templates = await base44.asServiceRole.entities.EmailTemplate.filter({
          template_key: 'contract_geactiveerd',
          is_active: true,
        });

        if (templates.length > 0) {
          emailSubject = replacePlaceholders(templates[0].subject, placeholders);
          emailBody = replacePlaceholders(templates[0].body, placeholders);
        } else {
          emailSubject = `Contract volledig ondertekend en geactiveerd - ${contract.contract_number}`;
          emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Interdistri Transport</h1>
                <p style="color: #d1fae5; margin: 8px 0 0;">Contract geactiveerd ✓</p>
              </div>
              <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
                <p style="font-size: 16px; color: #1e293b;">Beste ${employeeName},</p>
                <p style="color: #475569; line-height: 1.6;">Goed nieuws! Je arbeidscontract <strong>${contract.contract_number}</strong> is nu door beide partijen ondertekend en is geactiveerd.</p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="color: #166534; font-weight: 600; margin: 0;">✓ Contract is actief</p>
                  <p style="color: #15803d; font-size: 14px; margin: 4px 0 0;">Je kunt je contract terugvinden in het Interdistri portaal.</p>
                </div>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${appBaseUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Contract bekijken</a>
                </div>
              </div>
              <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">Van Dooren Transport Zeeland B.V. (Interdistri) — Fleerbosseweg 19, 4421 RR Kapelle</p>
              </div>
            </div>
          `;
        }
        const sentAt2 = new Date().toISOString();
        try {
          const gmailResult2 = await sendGmail(gmailToken, employee.email, emailSubject, emailBody);
          await base44.asServiceRole.entities.EmailLog.create({
            to: employee.email, cc: CC_ADDRESS, subject: emailSubject, status: 'success', source_function: 'notifyContractSigned', sent_at: sentAt2, message_id: gmailResult2?.id || null,
          });
        } catch (sendErr) {
          await base44.asServiceRole.entities.EmailLog.create({
            to: employee.email, cc: CC_ADDRESS, subject: emailSubject, status: 'failed', source_function: 'notifyContractSigned', error_message: sendErr.message, sent_at: sentAt2,
          });
        }
      }

      if (employeeUser) {
        await base44.asServiceRole.entities.Notification.create({
          title: 'Contract geactiveerd',
          description: `Je contract ${contract.contract_number} is door beide partijen ondertekend en is nu actief.`,
          type: 'general',
          target_page: 'Contracts',
          user_ids: [employeeUser.id],
          priority: 'high'
        });
      }
    }

    return Response.json({ success: true, message: 'Notificaties verzonden via Gmail' });

  } catch (error) {
    console.error('Notify contract signed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});