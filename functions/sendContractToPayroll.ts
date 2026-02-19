import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { contract_id } = await req.json();
    if (!contract_id) {
      return Response.json({ error: 'Missing contract_id' }, { status: 400 });
    }

    // Fetch payroll settings
    const payrollSettings = await base44.asServiceRole.entities.PayrollSettings.list();
    if (!payrollSettings.length || !payrollSettings[0].payroll_email) {
      return Response.json({ error: 'Geen loonadministratie e-mailadres ingesteld. Ga naar HRM-instellingen > Loonadministratie.' }, { status: 400 });
    }

    const settings = payrollSettings[0];
    const toEmail = settings.payroll_email;
    const ccEmail = settings.payroll_cc_email || '';

    // Fetch contract
    const contract = await base44.asServiceRole.entities.Contract.get(contract_id);
    if (!contract) {
      return Response.json({ error: 'Contract niet gevonden' }, { status: 404 });
    }

    // Fetch employee
    const employee = await base44.asServiceRole.entities.Employee.get(contract.employee_id);
    if (!employee) {
      return Response.json({ error: 'Medewerker niet gevonden' }, { status: 404 });
    }

    const employeeName = `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}`;

    const subject = `Contract ${contract.contract_number} - ${employeeName} - ${contract.contract_type}`;

    // Build email body with contract content
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Interdistri Transport</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0;">Contract verzonden naar loonadministratie</p>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 16px; color: #1e293b;">Geachte loonadministratie,</p>
          <p style="color: #475569; line-height: 1.6;">
            Hierbij ontvangt u het ondertekende contract van <strong>${employeeName}</strong>.
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; width: 200px;">Contractnummer</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${contract.contract_number || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Medewerker</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${employeeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">BSN</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${employee.bsn || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Geboortedatum</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${employee.date_of_birth || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Type contract</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${contract.contract_type}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Startdatum</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${contract.start_date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Einddatum</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${contract.end_date || 'Onbepaald'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Uren per week</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${contract.hours_per_week || 0}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Loonschaal</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${contract.salary_scale || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Functie</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${contract.function_title || employee.function || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Afdeling</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${contract.department || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Medewerker getekend</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${contract.employee_signed_date ? new Date(contract.employee_signed_date).toLocaleDateString('nl-NL') : '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Management getekend</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${contract.manager_signed_date ? new Date(contract.manager_signed_date).toLocaleDateString('nl-NL') + (contract.manager_signed_by ? ' (' + contract.manager_signed_by + ')' : '') : '—'}</td>
            </tr>
          </table>

          ${contract.contract_content ? `
            <h3 style="color: #1e293b; margin-top: 24px;">Volledige contracttekst:</h3>
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-top: 8px; background: #fafafa;">
              ${contract.contract_content}
            </div>
          ` : ''}

          ${contract.employee_signature_url ? `
            <div style="margin-top: 24px;">
              <p style="font-weight: 600; color: #1e293b;">Handtekening medewerker:</p>
              <img src="${contract.employee_signature_url}" style="max-width: 300px; border: 1px solid #e2e8f0; border-radius: 4px;" />
            </div>
          ` : ''}

          ${contract.manager_signature_url ? `
            <div style="margin-top: 16px;">
              <p style="font-weight: 600; color: #1e293b;">Handtekening management:</p>
              <img src="${contract.manager_signature_url}" style="max-width: 300px; border: 1px solid #e2e8f0; border-radius: 4px;" />
            </div>
          ` : ''}

          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
            Verzonden door: ${user.full_name} op ${new Date().toLocaleDateString('nl-NL')}
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Van Dooren Transport Zeeland B.V. (Interdistri) — Fleerbosseweg 19, 4421 RR Kapelle</p>
        </div>
      </div>
    `;

    // Send via Gmail
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    const boundary = 'boundary_' + Date.now();
    const ccLine = ccEmail ? `Cc: ${ccEmail}` : '';
    const rawEmail = [
      `To: ${toEmail}`,
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
      return Response.json({ error: `Gmail verzending mislukt: ${errBody}` }, { status: res.status });
    }

    return Response.json({ 
      success: true, 
      message: `Contract ${contract.contract_number} verzonden naar ${toEmail}${ccEmail ? ' (cc: ' + ccEmail + ')' : ''}` 
    });

  } catch (error) {
    console.error('sendContractToPayroll error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});