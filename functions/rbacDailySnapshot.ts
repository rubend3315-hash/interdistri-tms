import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const svc = base44.asServiceRole;

    // Fetch all users and employees
    const [users, employees] = await Promise.all([
      svc.entities.User.list('-created_date'),
      svc.entities.Employee.list('last_name'),
    ]);

    // Build employee email lookup
    const employeeByEmail = new Map();
    for (const emp of employees) {
      if (emp.email) {
        employeeByEmail.set(emp.email.toLowerCase(), emp);
      }
    }

    const now = new Date().toISOString();
    const snapshots = [];
    const violations = [];

    for (const u of users) {
      const emailLower = u.email?.toLowerCase();
      const linkedEmp = emailLower ? employeeByEmail.get(emailLower) : null;

      // Resolve effective role (same logic as frontend)
      let effectiveRole = null;
      if (u.business_role) {
        effectiveRole = u.business_role;
      } else if (linkedEmp) {
        effectiveRole = 'EMPLOYEE';
      }

      // Create snapshot
      snapshots.push({
        user_id: u.id,
        email: u.email,
        system_role: u.role,
        business_role: u.business_role || null,
        employee_id: linkedEmp?.id || null,
        effective_role: effectiveRole,
        snapshot_timestamp: now,
        source: 'daily_monitor',
      });

      // --- Invariant checks ---

      // Check 1: EMPLOYEE effective role without linked employee
      if (effectiveRole === 'EMPLOYEE' && !linkedEmp) {
        violations.push({
          user_id: u.id,
          system_role: u.role,
          effective_role: effectiveRole,
          check_type: 'invariant_violation',
          description: `User ${u.email} has effective_role EMPLOYEE but no linked Employee record`,
          result: 'WARNING',
          timestamp: now,
          source_function: 'rbacDailySnapshot',
          metadata: { email: u.email, business_role: u.business_role },
        });
      }

      // Check 2: Non-admin with SUPER_ADMIN business role
      if (u.role !== 'admin' && (u.business_role === 'SUPER_ADMIN' || effectiveRole === 'SUPER_ADMIN')) {
        violations.push({
          user_id: u.id,
          system_role: u.role,
          effective_role: effectiveRole,
          check_type: 'invariant_violation',
          description: `User ${u.email} has SUPER_ADMIN business role but system_role is "${u.role}"`,
          result: 'VIOLATION',
          timestamp: now,
          source_function: 'rbacDailySnapshot',
          metadata: { email: u.email, business_role: u.business_role },
        });
      }

      // Check 3: business_role null but employee exists (mismatch, not a violation but notable)
      if (!u.business_role && linkedEmp) {
        violations.push({
          user_id: u.id,
          system_role: u.role,
          effective_role: effectiveRole,
          check_type: 'snapshot_anomaly',
          description: `User ${u.email} has null business_role but linked Employee exists (resolved to EMPLOYEE)`,
          result: 'WARNING',
          timestamp: now,
          source_function: 'rbacDailySnapshot',
          metadata: { email: u.email, employee_id: linkedEmp.id, employee_status: linkedEmp.status },
        });
      }
    }

    // Bulk create snapshots
    await svc.entities.UserRoleSnapshot.bulkCreate(snapshots);

    // Create violation/anomaly logs if any
    if (violations.length > 0) {
      await svc.entities.RBACDecisionLog.bulkCreate(violations);
    }

    console.log(`[RBAC_SNAPSHOT] ${snapshots.length} snapshots created, ${violations.length} findings logged`);

    return Response.json({
      timestamp: now,
      snapshots_created: snapshots.length,
      findings: violations.length,
      violations_count: violations.filter(v => v.result === 'VIOLATION').length,
      warnings_count: violations.filter(v => v.result === 'WARNING').length,
      summary: violations.map(v => ({
        email: v.metadata?.email,
        check_type: v.check_type,
        result: v.result,
        description: v.description,
      })),
    });
  } catch (error) {
    console.error('[RBAC_SNAPSHOT] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});