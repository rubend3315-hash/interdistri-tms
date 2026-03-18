import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contract_id } = await req.json();
    if (!contract_id) {
      return Response.json({ error: 'contract_id is verplicht' }, { status: 400 });
    }

    const contract = await base44.asServiceRole.entities.Contract.get(contract_id);
    if (!contract) {
      return Response.json({ error: 'Contract niet gevonden' }, { status: 404 });
    }

    // Non-admin: verify ownership
    if (user.role !== 'admin') {
      const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
      if (employees.length === 0 || employees[0].id !== contract.employee_id) {
        return Response.json({ error: 'Geen toegang' }, { status: 403 });
      }
    }

    // Get employee name
    let employeeName = 'Onbekend';
    if (contract.employee_id) {
      const emp = await base44.asServiceRole.entities.Employee.get(contract.employee_id);
      if (emp) {
        employeeName = `${emp.first_name} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name}`;
      }
    }

    // Clean contract content: remove existing signature blocks from HTML
    let cleanContent = contract.contract_content || '';
    // Remove "Voor akkoord" sections that might be in the HTML
    cleanContent = cleanContent.replace(/<p[^>]*>\s*<strong>\s*Voor akkoord werkgever[\s\S]*$/i, '');
    cleanContent = cleanContent.replace(/<div[^>]*>[\s\S]*?Voor akkoord[\s\S]*$/i, '');

    return Response.json({
      contract_number: contract.contract_number,
      contract_type: contract.contract_type,
      start_date: contract.start_date,
      end_date: contract.end_date,
      hours_per_week: contract.hours_per_week,
      status: contract.status,
      contract_content_clean: cleanContent,
      employee_signature_url: contract.employee_signature_url || null,
      employee_signed_date: contract.employee_signed_date || null,
      manager_signature_url: contract.manager_signature_url || null,
      manager_signed_date: contract.manager_signed_date || null,
      manager_signed_by: contract.manager_signed_by || null,
      employeeName,
    });
  } catch (error) {
    console.error('getContractForPdf error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});