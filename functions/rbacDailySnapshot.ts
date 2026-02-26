import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Compute SHA-256 hex hash using Web Crypto API (async).
 */
async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

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
    const today = now.slice(0, 10);
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

      // Check 3: business_role null but employee exists
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

    // --- Integrity Report with SHA-256 hash ---
    const violationCount = violations.filter(v => v.result === 'VIOLATION').length;
    const warningCount = violations.filter(v => v.result === 'WARNING').length;
    const adminCount = snapshots.filter(s => s.system_role === 'admin').length;
    const employeeEffectiveCount = snapshots.filter(s => s.effective_role === 'EMPLOYEE').length;
    const nullEffectiveCount = snapshots.filter(s => !s.effective_role).length;

    // Deterministic hash: sort by user_id, concatenate user_id:effective_role pairs
    const hashInput = snapshots
      .slice()
      .sort((a, b) => a.user_id.localeCompare(b.user_id))
      .map(s => `${s.user_id}:${s.effective_role || 'NULL'}`)
      .join('|');
    const hashSignature = await sha256Hex(hashInput);

    // --- Drift Detection ---
    const driftAlerts = [];

    // Fetch previous integrity report to compare
    const previousReports = await svc.entities.RBACIntegrityReport.list('-snapshot_date', 1);
    const prevReport = previousReports[0];

    if (prevReport) {
      // Drift: admin count changed
      if (prevReport.admin_count !== adminCount) {
        driftAlerts.push(`Admin count changed: ${prevReport.admin_count} → ${adminCount}`);
      }

      // Drift: >5% role changes (compare total vs previous)
      if (prevReport.total_users > 0) {
        const totalChanged = Math.abs(prevReport.total_users - snapshots.length);
        const pctChange = (totalChanged / prevReport.total_users) * 100;
        if (pctChange > 5) {
          driftAlerts.push(`User count changed >5%: ${prevReport.total_users} → ${snapshots.length} (${pctChange.toFixed(1)}%)`);
        }
      }

      // Drift: violations detected
      if (violationCount > 0) {
        driftAlerts.push(`${violationCount} RBAC violation(s) detected`);
      }
    }

    // Log drift alerts to AuditLog
    if (driftAlerts.length > 0) {
      await svc.entities.AuditLog.create({
        action_type: 'role_change',
        category: 'Security',
        description: `RBAC_DRIFT_DETECTED: ${driftAlerts.join('; ')}`,
        performed_by_email: 'system',
        performed_by_name: 'RBAC Monitor',
        performed_by_role: 'system',
        metadata: { drift_alerts: driftAlerts, snapshot_date: today },
      });
    }

    // Create integrity report
    await svc.entities.RBACIntegrityReport.create({
      snapshot_date: today,
      total_users: snapshots.length,
      admin_count: adminCount,
      employee_effective_count: employeeEffectiveCount,
      null_effective_count: nullEffectiveCount,
      violation_count: violationCount,
      warning_count: warningCount,
      hash_signature: hashSignature,
      drift_alerts: driftAlerts,
      source: 'rbacDailySnapshot',
    });

    console.log(`[RBAC_SNAPSHOT] ${snapshots.length} snapshots, ${violations.length} findings, hash=${hashSignature.slice(0, 12)}..., ${driftAlerts.length} drift alerts`);

    return Response.json({
      timestamp: now,
      snapshots_created: snapshots.length,
      findings: violations.length,
      violations_count: violationCount,
      warnings_count: warningCount,
      hash_signature: hashSignature,
      drift_alerts: driftAlerts,
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