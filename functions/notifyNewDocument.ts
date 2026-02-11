import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper: send email via Gmail API
async function sendGmail(accessToken, to, subject, htmlBody) {
  const boundary = 'boundary_' + Date.now();
  const rawEmail = [
    `To: ${to}`,
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

    const { event, data } = await req.json();

    // Only handle document creation
    if (!event || event.type !== 'create' || !data) {
      return Response.json({ skipped: true, reason: 'Not a create event' });
    }

    const document = data;

    // Only notify if document is linked to an employee
    if (!document.linked_employee_id) {
      return Response.json({ skipped: true, reason: 'No linked employee' });
    }

    const employee = await base44.asServiceRole.entities.Employee.get(document.linked_employee_id);
    if (!employee || !employee.email) {
      return Response.json({ skipped: true, reason: 'Employee not found or no email' });
    }

    const employeeName = `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}`;

    // Get Gmail access token
    const gmailToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    const subject = `Nieuw HR-document beschikbaar: ${document.name}`;
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Interdistri Transport</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0;">Nieuw document beschikbaar</p>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 16px; color: #1e293b;">Beste ${employeeName},</p>
          <p style="color: #475569; line-height: 1.6;">
            Er is een nieuw HR-document voor je beschikbaar gesteld in het Interdistri portaal.
          </p>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <table style="width: 100%; font-size: 14px; color: #1e293b;">
              <tr>
                <td style="padding: 4px 0; color: #64748b; width: 120px;">Document:</td>
                <td style="padding: 4px 0; font-weight: 600;">${document.name}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Type:</td>
                <td style="padding: 4px 0;">${document.document_type || '-'}</td>
              </tr>
              ${document.expiry_date ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Vervaldatum:</td>
                <td style="padding: 4px 0;">${document.expiry_date}</td>
              </tr>
              ` : ''}
              ${document.notes ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Opmerking:</td>
                <td style="padding: 4px 0;">${document.notes}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Je kunt dit document bekijken via het Interdistri portaal.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Van Dooren Transport Zeeland B.V. (Interdistri) — Fleerbosseweg 19, 4421 RR Kapelle
          </p>
        </div>
      </div>
    `;

    await sendGmail(gmailToken, employee.email, subject, body);

    // Also create in-app notification
    const allUsers = await base44.asServiceRole.entities.User.list();
    const employeeUser = allUsers.find(u => u.email === employee.email);
    if (employeeUser) {
      await base44.asServiceRole.entities.Notification.create({
        title: `Nieuw document: ${document.name}`,
        description: `Er is een nieuw ${document.document_type || ''} document voor je beschikbaar: ${document.name}`,
        type: 'general',
        target_page: 'Documents',
        user_ids: [employeeUser.id],
        priority: 'medium'
      });
    }

    console.log(`Gmail notification sent to ${employee.email} for document: ${document.name}`);
    return Response.json({ success: true, message: `Notificatie verzonden naar ${employee.email}` });

  } catch (error) {
    console.error('Notify new document error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});