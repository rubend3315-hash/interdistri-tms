// listContractsLight v3 - redeployed
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to fetch all contracts
    const contracts = await base44.asServiceRole.entities.Contract.list('-created_date');

    // Strip heavy fields to keep response small
    const lightContracts = contracts.map(c => {
      const { contract_content, cao_rules_applied, notes, ...rest } = c;
      return rest;
    });

    // For non-admin users, also fetch their employee record to filter contracts
    if (user.role !== 'admin') {
      const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
      if (employees.length > 0) {
        const employeeId = employees[0].id;
        const filtered = lightContracts.filter(c => c.employee_id === employeeId);
        return Response.json({ 
          contracts: filtered,
          currentEmployeeId: employeeId
        });
      }
      return Response.json({ contracts: [], currentEmployeeId: null });
    }

    return Response.json({ contracts: lightContracts });
  } catch (error) {
    console.error('listContractsLight error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});