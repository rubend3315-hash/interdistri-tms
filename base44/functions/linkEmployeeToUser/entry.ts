import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const svc = base44.asServiceRole;

  const body = await req.json();
  const { event, data } = body;

  if (!data || !event || event.type !== 'create') {
    return Response.json({ skipped: true, reason: 'Not a create event' });
  }

  const user = data;

  // Only process EMPLOYEE users
  if (user.business_role !== 'EMPLOYEE') {
    console.log(`[USER_EMPLOYEE_LINK] Skipped: business_role=${user.business_role || 'none'} for ${user.email}`);
    return Response.json({ skipped: true, reason: 'Not an EMPLOYEE user' });
  }

  // Don't overwrite existing link
  if (user.employee_id) {
    console.log(`[USER_EMPLOYEE_LINK] Already linked: ${user.email} → ${user.employee_id}`);
    return Response.json({ skipped: true, reason: 'Already linked' });
  }

  const employees = await svc.entities.Employee.filter({ email: user.email });

  if (employees.length === 0) {
    console.warn(`[USER_EMPLOYEE_LINK] No employee found for user ${user.email}`);
    return Response.json({ linked: false, reason: 'No employee match' });
  }

  if (employees.length > 1) {
    console.warn(`[USER_EMPLOYEE_LINK] Multiple employees found for user ${user.email}`);
    return Response.json({ linked: false, reason: 'Multiple employee matches' });
  }

  const employee = employees[0];
  await svc.entities.User.update(user.id, { employee_id: employee.id });
  console.log(`[USER_EMPLOYEE_LINK] Linked ${user.email} → ${employee.id} (${employee.first_name} ${employee.last_name})`);

  return Response.json({ linked: true, employee_id: employee.id });
});