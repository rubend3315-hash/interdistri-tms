// redeploy: 2026-02-23T full_function_redeploy_protocol_v1
// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM_LEVEL                                     ║
// ║ Called by: Entity automation (TimeEntry update → Afgekeurd)      ║
// ║ Auth: None (automation-triggered, no user session)               ║
// ║ Tenant: Must receive tenant_id via entity data                   ║
// ║ Uses asServiceRole — required for system-level automation.       ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (data?.status !== 'Afgekeurd') {
      return Response.json({ message: 'Not a rejection, skipping email' });
    }

    const timeEntryId = event.entity_id;
    const timeEntry = await base44.asServiceRole.entities.TimeEntry.get(timeEntryId);
    if (!timeEntry) return Response.json({ error: 'TimeEntry not found' }, { status: 404 });

    const employee = await base44.asServiceRole.entities.Employee.get(timeEntry.employee_id);
    if (!employee || !employee.email) return Response.json({ error: 'Employee email not found' }, { status: 404 });

    let adminName = 'Management';
    if (timeEntry.approved_by) {
      try {
        const adminUsers = await base44.asServiceRole.entities.User.filter({ email: timeEntry.approved_by });
        if (adminUsers?.length > 0) adminName = adminUsers[0].full_name || 'Management';
      } catch (_) {}
    }

    const dateParts = timeEntry.date.split('-');
    const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    const employeeName = `${employee.first_name}${employee.prefix ? ' ' + employee.prefix : ''} ${employee.last_name}`;
    const appBaseUrl = 'https://tms.interdistri.nl';
    const editLink = `${appBaseUrl}/EditTimeEntry?id=${timeEntryId}`;

    // Check for custom template
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({
      template_key: 'dienst_afgekeurd',
      is_active: true,
    });

    let emailSubject, emailBody;

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
      emailSubject = template.subject;
      emailBody = template.body;
      for (const [key, value] of Object.entries(placeholders)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        emailSubject = emailSubject.replace(regex, value || '—');
        emailBody = emailBody.replace(regex, value || '—');
      }
    } else {
      emailSubject = `Je ingediende dienst (${formattedDate}) is afgekeurd`;
      emailBody = `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Interdistri TMS</h1>
          <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Tijdregistratie systeem</p>
        </td></tr>
        <tr><td style="background-color:#fef2f2;padding:16px 32px;border-bottom:1px solid #fecaca;">
          <p style="margin:0;color:#991b1b;font-size:15px;font-weight:600;">Dienst afgekeurd</p>
          <p style="margin:4px 0 0;color:#b91c1c;font-size:13px;">Er is actie van u nodig</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px;color:#1e293b;font-size:15px;line-height:1.6;">Beste ${employeeName},</p>
          <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">Een door u ingediende tijdregistratie is afgekeurd. Wij verzoeken u de tijdregistratie aan te passen en opnieuw in te dienen.</p>
          <table width="100%" style="margin-bottom:24px;"><tr><td style="background-color:#fef2f2;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;padding:14px 16px;">
            <p style="margin:0 0 4px;color:#991b1b;font-size:12px;font-weight:600;text-transform:uppercase;">Reden van afkeuring</p>
            <p style="margin:0;color:#7f1d1d;font-size:14px;line-height:1.5;">${timeEntry.rejection_reason || 'Geen reden opgegeven'}</p>
          </td></tr></table>
          <table width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
              <p style="margin:0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Details afgekeurde dienst</p>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <table width="100%">
                <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:140px;">Datum</td><td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">${formattedDate}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Starttijd</td><td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">${timeEntry.start_time || '-'}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Eindtijd</td><td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">${timeEntry.end_time || '-'}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Pauze</td><td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">${timeEntry.break_minutes || 0} minuten</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Totaal uren</td><td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">${timeEntry.total_hours || 0} uur</td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" style="margin-bottom:24px;"><tr><td align="center">
            <a href="${editLink}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Dienst aanpassen</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 32px;">
          <p style="margin:0 0 4px;color:#1e293b;font-size:14px;font-weight:600;">Met vriendelijke groet,</p>
          <p style="margin:0;color:#475569;font-size:13px;">${adminName} — Interdistri</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    }

    // Send via mailService
    const result = await base44.functions.invoke('mailService', {
      to: employee.email,
      cc: 'info@interdistri.nl',
      subject: emailSubject,
      html: emailBody,
      source_function: 'sendTimeEntryRejectionEmail',
      skip_auth: true,
    });

    return Response.json({
      success: result.data?.success || false,
      message: `Rejection email sent via mailService to ${employee.email}`,
    });

  } catch (error) {
    console.error('Error in sendTimeEntryRejectionEmail:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});