import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all users and employees using service role
    const [users, employees] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date'),
      base44.asServiceRole.entities.Employee.list('last_name'),
    ]);

    // Build employee email lookup (case-insensitive)
    const employeeByEmail = new Map();
    for (const emp of employees) {
      if (emp.email) {
        employeeByEmail.set(emp.email.toLowerCase(), emp);
      }
    }

    // Resolve effective business role per user
    const mismatches = [];
    let matchCount = 0;
    let totalUsers = users.length;

    for (const u of users) {
      const storedRole = u.business_role || null;
      const emailLower = u.email?.toLowerCase();
      const linkedEmployee = emailLower ? employeeByEmail.get(emailLower) : null;

      // Resolve effective role
      let effectiveRole;
      if (storedRole) {
        effectiveRole = storedRole;
      } else if (linkedEmployee) {
        effectiveRole = 'EMPLOYEE';
      } else {
        effectiveRole = null;
      }

      // Compare
      if (storedRole !== effectiveRole) {
        mismatches.push({
          type: 'RBAC_SHADOW_MISMATCH',
          user_id: u.id,
          email: u.email,
          full_name: u.full_name,
          stored_business_role: storedRole,
          resolved_effective_role: effectiveRole,
          employee_found: !!linkedEmployee,
          employee_status: linkedEmployee?.status || null,
          employee_id: linkedEmployee?.id || null,
        });
      } else {
        matchCount++;
      }
    }

    // Log mismatches to console for monitoring
    if (mismatches.length > 0) {
      console.log(`[RBAC_SHADOW] ${mismatches.length} mismatches found out of ${totalUsers} users:`);
      for (const m of mismatches) {
        console.log(`[RBAC_SHADOW_MISMATCH] ${m.email}: stored="${m.stored_business_role}" → effective="${m.resolved_effective_role}" (employee_found=${m.employee_found}, employee_status=${m.employee_status})`);
      }
    } else {
      console.log(`[RBAC_SHADOW] All ${totalUsers} users match. No mismatches.`);
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      total_users: totalUsers,
      matches: matchCount,
      mismatches_count: mismatches.length,
      mismatches,
      summary: {
        null_to_employee: mismatches.filter(m => m.stored_business_role === null && m.resolved_effective_role === 'EMPLOYEE').length,
        admin_mismatches: mismatches.filter(m => m.stored_business_role === 'SUPER_ADMIN' || m.resolved_effective_role === 'SUPER_ADMIN').length,
        unexpected: mismatches.filter(m => m.stored_business_role !== null && m.resolved_effective_role !== 'EMPLOYEE').length,
      }
    });
  } catch (error) {
    console.error('[RBAC_SHADOW] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});