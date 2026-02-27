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

    // Build employee email lookup (lowercase)
    const employeeByEmail = new Map();
    for (const emp of employees) {
      if (emp.email) {
        employeeByEmail.set(emp.email.toLowerCase(), emp);
      }
    }

    const changes = [];
    const skipped = [];

    for (const u of users) {
      const emailLower = u.email?.toLowerCase();
      const linkedEmp = emailLower ? employeeByEmail.get(emailLower) : null;

      // Skip: no linked employee
      if (!linkedEmp) {
        skipped.push({ email: u.email, reason: 'no_employee_link' });
        continue;
      }

      // Skip: already has a non-null business_role
      if (u.business_role) {
        skipped.push({ email: u.email, reason: 'already_has_business_role', current: u.business_role });
        continue;
      }

      // Update: business_role is null/missing but employee exists
      const oldValue = u.business_role || null;
      await svc.entities.User.update(u.id, { business_role: 'EMPLOYEE' });

      changes.push({
        user_email: u.email,
        user_id: u.id,
        old_business_role: oldValue,
        new_business_role: 'EMPLOYEE',
        employee_id: linkedEmp.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Log to AuditLog
    if (changes.length > 0) {
      await svc.entities.AuditLog.create({
        action_type: 'role_change',
        category: 'Security',
        description: `BULK_SYNC_BUSINESS_ROLE: ${changes.length} users updated to business_role=EMPLOYEE`,
        performed_by_email: user.email,
        performed_by_name: user.full_name || user.email,
        performed_by_role: user.role,
        metadata: {
          changes_count: changes.length,
          skipped_count: skipped.length,
          changes: changes.map(c => ({ email: c.user_email, old: c.old_business_role, new: c.new_business_role })),
        },
      });
    }

    console.log(`[BULK_SYNC] ${changes.length} updated, ${skipped.length} skipped`);

    return Response.json({
      success: true,
      updated: changes.length,
      skipped: skipped.length,
      changes,
      skipped_details: skipped,
    });
  } catch (error) {
    console.error('[BULK_SYNC] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});