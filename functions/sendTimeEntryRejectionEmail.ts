import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only proceed if status changed to "Afgekeurd"
    if (data?.status !== 'Afgekeurd') {
      return Response.json({ message: 'Not a rejection, skipping email' });
    }

    const timeEntryId = event.entity_id;

    // Fetch TimeEntry details
    const timeEntry = await base44.asServiceRole.entities.TimeEntry.get(timeEntryId);
    if (!timeEntry) {
      return Response.json({ error: 'TimeEntry not found' }, { status: 404 });
    }

    // Fetch Employee details
    const employee = await base44.asServiceRole.entities.Employee.get(timeEntry.employee_id);
    if (!employee || !employee.email) {
      return Response.json({ error: 'Employee email not found' }, { status: 404 });
    }

    // Fetch admin who rejected (if available)
    let adminName = 'Management';
    if (timeEntry.approved_by) {
      try {
        const adminUsers = await base44.asServiceRole.entities.User.filter({ email: timeEntry.approved_by });
        if (adminUsers && adminUsers.length > 0) {
          adminName = adminUsers[0].full_name || 'Management';
        }
      } catch (error) {
        console.log('Could not fetch admin user:', error);
      }
    }

    // Format date as DD-MM-YYYY
    const dateParts = timeEntry.date.split('-');
    const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

    const employeeName = `${employee.first_name}${employee.prefix ? ' ' + employee.prefix : ''} ${employee.last_name}`;

    // Build the correct app link
    const appBaseUrl = 'https://tms.interdistri.nl';
    const editLink = `${appBaseUrl}/EditTimeEntry?id=${timeEntryId}`;

    // Check for custom template
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({
      template_key: 'dienst_afgekeurd',
      is_active: true,
    });

    if (templates.length > 0) {
      const template = templates[0];
      const placeholders = {
        naam: employeeName,
        datum: formattedDate,
        starttijd: timeEntry.start_time || '-',
        eindtijd: timeEntry.end_time || '-',
        pauze: `${timeEntry.break_minutes || 0} minuten`,
        totaal_uren: `${timeEntry.total_hours || 0} uur`,
        reden: timeEntry.rejection_reason || 'Geen reden opgegeven',
        link: editLink,
      };
      let customSubject = template.subject;
      let customBody = template.body;
      for (const [key, value] of Object.entries(placeholders)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        customSubject = customSubject.replace(regex, value || '—');
        customBody = customBody.replace(regex, value || '—');
      }

      const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");
      const rawHeaders = [
        `To: ${employee.email}`,
        `Cc: info@interdistri.nl, ruben@interdistri.nl`,
        `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(customSubject)))}?=`,
        `Content-Type: text/html; charset=UTF-8`,
      ];
      const rawMessage = rawHeaders.join('\r\n') + '\r\n\r\n' + customBody;
      const encoded = btoa(unescape(encodeURIComponent(rawMessage)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: encoded }),
      });

      const sentAtCustom = new Date().toISOString();
      if (!response.ok) {
        const errorData = await response.text();
        await base44.asServiceRole.entities.EmailLog.create({
          to: employee.email, cc: 'info@interdistri.nl, ruben@interdistri.nl', subject: customSubject, status: 'failed', source_function: 'sendTimeEntryRejectionEmail', error_message: errorData, sent_at: sentAtCustom,
        });
        return Response.json({ error: 'Failed to send email via Gmail', details: errorData }, { status: 500 });
      }
      const customGmailResult = await response.json();
      await base44.asServiceRole.entities.EmailLog.create({
        to: employee.email, cc: 'info@interdistri.nl, ruben@interdistri.nl', subject: customSubject, status: 'success', source_function: 'sendTimeEntryRejectionEmail', sent_at: sentAtCustom, message_id: customGmailResult?.id || null,
      });
      return Response.json({ success: true, message: `Custom rejection email sent to ${employee.email}` });
    }

    // Default template below
    const subject = `Je ingediende dienst (${formattedDate}) is afgekeurd`;

    const htmlBody = `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Interdistri TMS</h1>
                  <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Tijdregistratie systeem</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Alert banner -->
        <tr>
          <td style="background-color:#fef2f2;padding:16px 32px;border-bottom:1px solid #fecaca;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;vertical-align:top;">
                  <div style="width:32px;height:32px;background-color:#dc2626;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-size:16px;">!</div>
                </td>
                <td>
                  <p style="margin:0;color:#991b1b;font-size:15px;font-weight:600;">Dienst afgekeurd</p>
                  <p style="margin:4px 0 0;color:#b91c1c;font-size:13px;">Er is actie van u nodig</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;color:#1e293b;font-size:15px;line-height:1.6;">
              Beste ${employeeName},
            </p>
            <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
              Een door u ingediende tijdregistratie is afgekeurd. Wij verzoeken u de tijdregistratie aan te passen en opnieuw in te dienen.
            </p>

            <!-- Rejection reason -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background-color:#fef2f2;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;padding:14px 16px;">
                  <p style="margin:0 0 4px;color:#991b1b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Reden van afkeuring</p>
                  <p style="margin:0;color:#7f1d1d;font-size:14px;line-height:1.5;">${timeEntry.rejection_reason || 'Geen reden opgegeven'}</p>
                </td>
              </tr>
            </table>

            <!-- Details card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                  <p style="margin:0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Details afgekeurde dienst</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;width:140px;">Medewerker</td>
                      <td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">${employeeName}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;">Datum</td>
                      <td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;">Starttijd</td>
                      <td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">${timeEntry.start_time || '-'}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;">Eindtijd</td>
                      <td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">${timeEntry.end_time || '-'}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;">Pauze</td>
                      <td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">${timeEntry.break_minutes || 0} minuten</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;">Totaal uren</td>
                      <td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">${timeEntry.total_hours || 0} uur</td>
                    </tr>
                    ${timeEntry.notes ? `<tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top;">Opmerkingen</td>
                      <td style="padding:6px 0;color:#1e293b;font-size:13px;">${timeEntry.notes}</td>
                    </tr>` : ''}
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${editLink}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                    Dienst aanpassen
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              Of kopieer deze link: <a href="${editLink}" style="color:#2563eb;text-decoration:underline;word-break:break-all;">${editLink}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 32px;">
            <p style="margin:0 0 4px;color:#1e293b;font-size:14px;font-weight:600;">Met vriendelijke groet,</p>
            <p style="margin:0 0 16px;color:#475569;font-size:13px;">${adminName} — Interdistri</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;padding-top:16px;">
              <tr>
                <td>
                  <p style="margin:0;color:#64748b;font-size:12px;line-height:1.8;">
                    Interdistri · Fleertsosweg 19 · 4421 RR Kapelle<br>
                    Tel: 088-4006400 · <a href="https://www.interdistri.nl" style="color:#2563eb;text-decoration:none;">www.interdistri.nl</a><br>
                    <a href="mailto:info@interdistri.nl" style="color:#2563eb;text-decoration:none;">info@interdistri.nl</a> · 
                    <a href="mailto:planning@interdistri.nl" style="color:#2563eb;text-decoration:none;">planning@interdistri.nl</a> · 
                    <a href="mailto:administratie@interdistri.nl" style="color:#2563eb;text-decoration:none;">administratie@interdistri.nl</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Send via Gmail connector
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    const rawHeaders = [
      `To: ${employee.email}`,
      `Cc: info@interdistri.nl, ruben@interdistri.nl`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `Content-Type: text/html; charset=UTF-8`,
    ];

    const rawMessage = rawHeaders.join('\r\n') + '\r\n\r\n' + htmlBody;

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

    const sentAtDefault = new Date().toISOString();
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gmail send failed:', errorData);
      await base44.asServiceRole.entities.EmailLog.create({
        to: employee.email, cc: 'info@interdistri.nl, ruben@interdistri.nl', subject, status: 'failed', source_function: 'sendTimeEntryRejectionEmail', error_message: errorData, sent_at: sentAtDefault,
      });
      return Response.json({ error: 'Failed to send email via Gmail', details: errorData }, { status: 500 });
    }

    const defaultGmailResult = await response.json();
    await base44.asServiceRole.entities.EmailLog.create({
      to: employee.email, cc: 'info@interdistri.nl, ruben@interdistri.nl', subject, status: 'success', source_function: 'sendTimeEntryRejectionEmail', sent_at: sentAtDefault, message_id: defaultGmailResult?.id || null,
    });

    return Response.json({ 
      success: true, 
      message: `Rejection email sent via Gmail to ${employee.email}` 
    });

  } catch (error) {
    console.error('Error in sendTimeEntryRejectionEmail:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});