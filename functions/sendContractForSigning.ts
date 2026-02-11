import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Fetch contract, employee, and users in parallel
    const [contract, allUsers] = await Promise.all([
      base44.asServiceRole.entities.Contract.get(contract_id),
      base44.asServiceRole.entities.User.list()
    ]);

    if (!contract) {
      return Response.json({ error: 'Contract niet gevonden' }, { status: 404 });
    }

    const employee = await base44.asServiceRole.entities.Employee.get(contract.employee_id);
    if (!employee || !employee.email) {
      return Response.json({ error: 'Medewerker niet gevonden of heeft geen e-mailadres' }, { status: 400 });
    }

    const employeeName = `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}`;
    let employeeUser = allUsers.find(u => u.email === employee.email);

    if (!employeeUser) {
      if (auto_invite) {
        try {
          await base44.users.inviteUser(employee.email, "user");
        } catch (inviteError) {
          if (!inviteError.message?.includes('already')) {
            return Response.json({ error: `Kon niet uitnodigen: ${inviteError.message}` }, { status: 500 });
          }
        }
        // Don't re-fetch users, just continue - email will work via service role
      } else {
        return Response.json({ 
          error: `${employeeName} (${employee.email}) is geen geregistreerde app-gebruiker. De e-mail kan alleen worden verstuurd naar gebruikers die in de app zijn uitgenodigd.`,
          error_type: 'not_app_user',
          employee_name: employeeName,
          employee_email: employee.email
        }, { status: 400 });
      }
    }

    const emailBody = `
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
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Startdatum:</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 14px;">${contract.start_date ? new Date(contract.start_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td></tr>
              ${contract.end_date ? `<tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Einddatum:</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 14px;">${new Date(contract.end_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>` : ''}
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;">Functie:</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 14px;">${contract.function_title || '-'}</td></tr>
            </table>
          </div>
          <p style="color: #475569; line-height: 1.6;">Je kunt het contract bekijken en digitaal ondertekenen via de <strong>Interdistri TMS app</strong>. Open de app op je telefoon en ga naar <strong>"Mijn Contracten"</strong> in het menu.</p>
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

    // Do contract update + both emails all in parallel
    await Promise.all([
      base44.asServiceRole.entities.Contract.update(contract_id, {
        status: 'TerOndertekening',
        reminder_sent_dates: [...(contract.reminder_sent_dates || []), new Date().toISOString().split('T')[0]]
      }),
      base44.asServiceRole.integrations.Core.SendEmail({
        to: employee.email,
        subject: `Arbeidsovereenkomst ter ondertekening - ${contract.contract_number}`,
        from_name: 'Interdistri HR',
        body: emailBody
      }),
      base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `[Kopie] Arbeidsovereenkomst verzonden naar ${employeeName} - ${contract.contract_number}`,
        from_name: 'Interdistri HR',
        body: `<p>Contract ${contract.contract_number} is verzonden naar ${employeeName} (${employee.email}).</p>`
      })
    ]);

    // Fire-and-forget notification
    if (employeeUser) {
      base44.asServiceRole.entities.Notification.create({
        title: 'Contract ter ondertekening',
        description: `Je arbeidscontract ${contract.contract_number} staat klaar ter ondertekening.`,
        type: 'general',
        target_page: 'Contracts',
        user_ids: [employeeUser.id],
        priority: 'high'
      }).catch(() => {});
    }

    return Response.json({ success: true, message: `Contract is verzonden naar ${employeeName} (${employee.email})` });

  } catch (error) {
    console.error('Send contract error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});