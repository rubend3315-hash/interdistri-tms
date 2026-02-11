import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { event, data, old_data } = await req.json();

    // Only process Contract updates where status changed to 'Actief'
    if (!event || event.entity_name !== 'Contract' || event.type !== 'update') {
      return Response.json({ skipped: true, reason: 'Not a contract update' });
    }

    if (!data || data.status !== 'Actief' || old_data?.status === 'Actief') {
      return Response.json({ skipped: true, reason: 'Status did not change to Actief' });
    }

    const contract = data;
    const contractId = event.entity_id;

    // Fetch employee
    const employee = await base44.asServiceRole.entities.Employee.get(contract.employee_id);
    if (!employee) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employeeName = `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}`;

    // 1. Create CompletedContract report entry
    await base44.asServiceRole.entities.CompletedContract.create({
      contract_id: contractId,
      contract_number: contract.contract_number || '',
      employee_name: employeeName,
      employee_id: contract.employee_id,
      contract_type: contract.contract_type || '',
      start_date: contract.start_date || '',
      end_date: contract.end_date || '',
      function_title: contract.function_title || '',
      department: contract.department || '',
      employee_signed_date: contract.employee_signed_date || '',
      manager_signed_date: contract.manager_signed_date || '',
      manager_signed_by: contract.manager_signed_by || '',
      activated_date: new Date().toISOString()
    });

    // 2. Send confirmation emails in parallel
    const emailPromises = [];

    // Email to employee
    if (employee.email) {
      emailPromises.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          to: employee.email,
          subject: `Bevestiging: Contract ${contract.contract_number} is volledig ondertekend en actief`,
          from_name: 'Interdistri HR',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Interdistri Transport</h1>
                <p style="color: #d1fae5; margin: 8px 0 0;">Contract Bevestiging ✓</p>
              </div>
              <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
                <p style="font-size: 16px; color: #1e293b;">Beste ${employeeName},</p>
                <p style="color: #475569; line-height: 1.6;">
                  Je arbeidscontract is volledig ondertekend door beide partijen en is nu actief. Hieronder een samenvatting:
                </p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 4px 0; color: #15803d; font-size: 14px;">Contract:</td><td style="padding: 4px 0; font-weight: 600; color: #166534;">${contract.contract_number}</td></tr>
                    <tr><td style="padding: 4px 0; color: #15803d; font-size: 14px;">Type:</td><td style="padding: 4px 0; font-weight: 600; color: #166534;">${contract.contract_type}</td></tr>
                    <tr><td style="padding: 4px 0; color: #15803d; font-size: 14px;">Startdatum:</td><td style="padding: 4px 0; font-weight: 600; color: #166534;">${contract.start_date ? new Date(contract.start_date).toLocaleDateString('nl-NL') : '-'}</td></tr>
                    ${contract.end_date ? `<tr><td style="padding: 4px 0; color: #15803d; font-size: 14px;">Einddatum:</td><td style="padding: 4px 0; font-weight: 600; color: #166534;">${new Date(contract.end_date).toLocaleDateString('nl-NL')}</td></tr>` : ''}
                    <tr><td style="padding: 4px 0; color: #15803d; font-size: 14px;">Ondertekend door medewerker:</td><td style="padding: 4px 0; font-weight: 600; color: #166534;">${contract.employee_signed_date ? new Date(contract.employee_signed_date).toLocaleDateString('nl-NL') : '-'}</td></tr>
                    <tr><td style="padding: 4px 0; color: #15803d; font-size: 14px;">Ondertekend door management:</td><td style="padding: 4px 0; font-weight: 600; color: #166534;">${contract.manager_signed_date ? new Date(contract.manager_signed_date).toLocaleDateString('nl-NL') : '-'}</td></tr>
                  </table>
                </div>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">Bewaar deze e-mail als bevestiging.</p>
              </div>
              <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">Van Dooren Transport Zeeland B.V. (Interdistri)</p>
              </div>
            </div>
          `
        }).catch(e => console.error('Employee confirmation email failed:', e))
      );
    }

    // Email to all admins
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.role === 'admin');

    for (const admin of adminUsers) {
      if (admin.email) {
        emailPromises.push(
          base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: `Contract ${contract.contract_number} volledig ondertekend - ${employeeName}`,
            from_name: 'Interdistri HR',
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 22px;">Contract Afgerond ✓</h1>
                </div>
                <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
                  <p style="font-size: 16px; color: #1e293b;">Beste ${admin.full_name},</p>
                  <p style="color: #475569;">Contract <strong>${contract.contract_number}</strong> van <strong>${employeeName}</strong> is volledig ondertekend en actief.</p>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 12px 0; font-size: 14px;">
                    <p style="margin: 4px 0;"><strong>Type:</strong> ${contract.contract_type}</p>
                    <p style="margin: 4px 0;"><strong>Medewerker getekend:</strong> ${contract.employee_signed_date ? new Date(contract.employee_signed_date).toLocaleDateString('nl-NL') : '-'}</p>
                    <p style="margin: 4px 0;"><strong>Management getekend:</strong> ${contract.manager_signed_date ? new Date(contract.manager_signed_date).toLocaleDateString('nl-NL') : '-'} (${contract.manager_signed_by || ''})</p>
                  </div>
                  <p style="color: #94a3b8; font-size: 13px;">Dit contract is automatisch gearchiveerd in het rapportageoverzicht.</p>
                </div>
              </div>
            `
          }).catch(e => console.error('Admin confirmation email failed:', e))
        );
      }
    }

    await Promise.all(emailPromises);

    return Response.json({ success: true, message: `Contract ${contract.contract_number} geactiveerd en gerapporteerd` });

  } catch (error) {
    console.error('onContractActivated error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});