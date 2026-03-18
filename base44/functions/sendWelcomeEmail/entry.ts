// redeploy: 2026-02-23T full_function_redeploy_protocol_v1
// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Admin via frontend (Onboarding / Employees)           ║
// ║ Auth: User session (admin only)                                  ║
// ║ DO NOT USE RAW ENTITY CALLS — USE tenantService for tenant data  ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // RBAC: ADMIN, HR_MANAGER
    if (user.role !== 'admin' && !['ADMIN', 'HR_MANAGER'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: insufficient business role' }, { status: 403 });
    }

    const { employee_id } = await req.json();
    if (!employee_id) {
      return Response.json({ error: 'Missing employee_id' }, { status: 400 });
    }

    const employee = await base44.asServiceRole.entities.Employee.get(employee_id);
    if (!employee || !employee.email) {
      return Response.json({ error: 'Medewerker niet gevonden of geen e-mailadres' }, { status: 400 });
    }

    const employeeName = `${employee.first_name || ''} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name || ''}`.trim();
    const employeeEmail = employee.email;

    // Check for custom template
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({
      template_key: 'welkomstmail',
      is_active: true,
    });

    let emailSubject = `Welkom bij Interdistri - Je account is aangemaakt`;
    let emailBody;

    if (templates.length > 0) {
      // Use template via mailService placeholders
      // Haal CC-adres op uit PayrollSettings
      let ccAddr = null;
      try {
        const s = await base44.asServiceRole.entities.PayrollSettings.list('-created_date', 1);
        if (s.length > 0 && s[0].admin_email) ccAddr = s[0].admin_email;
      } catch (_) {}

      const result = await base44.functions.invoke('mailService', {
        to: employeeEmail,
        cc: ccAddr || 'ruben@interdistri.nl',
        subject: emailSubject,
        html: '',
        template_key: 'welkomstmail',
        placeholders: { naam: employeeName, email: employeeEmail },
        source_function: 'sendWelcomeEmail',
      });
      return Response.json(result.data);
    }

    // Default template
    emailBody = `
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

    // Haal CC-adres op uit PayrollSettings (HR-instellingen)
    let ccAddress = null;
    try {
      const settings = await base44.asServiceRole.entities.PayrollSettings.list('-created_date', 1);
      if (settings.length > 0 && settings[0].admin_email) {
        ccAddress = settings[0].admin_email;
      }
    } catch (_) {}

    const result = await base44.functions.invoke('mailService', {
      to: employeeEmail,
      cc: ccAddress || 'ruben@interdistri.nl',
      subject: emailSubject,
      html: emailBody,
      source_function: 'sendWelcomeEmail',
    });

    if (result.data?.success) {
      return Response.json({ success: true, message: `Welkomstmail verzonden naar ${employeeName} (${employeeEmail})` });
    }
    return Response.json({ error: result.data?.error || 'Send failed' }, { status: 502 });
  } catch (error) {
    console.error('sendWelcomeEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});