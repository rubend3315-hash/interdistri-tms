import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Admin-only check
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const svc = base44.asServiceRole;

  try {
    // 1. Get all users with business_role = EMPLOYEE
    const allUsers = await svc.entities.User.filter({ business_role: 'EMPLOYEE' });
    console.log(`[MIGRATE] Found ${allUsers.length} EMPLOYEE users`);

    let usersProcessed = 0;
    let linksCreated = 0;
    let alreadyLinked = 0;
    const warnings = [];
    const results = [];

    for (const u of allUsers) {
      usersProcessed++;

      // Skip if employee_id already set
      if (u.employee_id) {
        alreadyLinked++;
        results.push({ email: u.email, status: 'already_linked', employee_id: u.employee_id });
        console.log(`[MIGRATE] ${u.email} — already linked to ${u.employee_id}`);
        continue;
      }

      // Look up Employee by email
      const employees = await svc.entities.Employee.filter({ email: u.email });

      if (employees.length === 0) {
        const msg = `No Employee match for user: ${u.email}`;
        warnings.push(msg);
        results.push({ email: u.email, status: 'no_match' });
        console.warn(`[MIGRATION WARNING] ${msg}`);
        continue;
      }

      if (employees.length > 1) {
        const msg = `Multiple Employees found for user: ${u.email} (${employees.length} matches)`;
        warnings.push(msg);
        results.push({ email: u.email, status: 'multiple_matches', count: employees.length });
        console.warn(`[MIGRATION WARNING] ${msg}`);
        continue;
      }

      // Exactly one match — create the link
      const employee = employees[0];
      await svc.entities.User.update(u.id, { employee_id: employee.id });
      linksCreated++;
      results.push({
        email: u.email,
        status: 'linked',
        employee_id: employee.id,
        employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
      });
      console.log(`[MIGRATE] ${u.email} → Employee ${employee.id} (${employee.first_name} ${employee.last_name})`);
    }

    const report = {
      success: true,
      users_processed: usersProcessed,
      links_created: linksCreated,
      already_linked: alreadyLinked,
      warnings_count: warnings.length,
      warnings,
      results,
    };

    console.log('[MIGRATE] Complete:', JSON.stringify({ users_processed: usersProcessed, links_created: linksCreated, already_linked: alreadyLinked, warnings: warnings.length }));

    return Response.json(report);
  } catch (error) {
    console.error('[MIGRATE] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});