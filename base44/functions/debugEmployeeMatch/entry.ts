// Debug: test paginated Employee loading (SDK workaround)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;

    // Paginated load (same as syncTripsFromNaiton fix)
    const employees = [];
    let empSkip = 0;
    const EMP_PAGE = 20;
    while (true) {
      const page = await svc.entities.Employee.filter({ status: 'Actief' }, '-created_date', EMP_PAGE, empSkip);
      if (!Array.isArray(page) || page.length === 0) break;
      employees.push(...page);
      if (page.length < EMP_PAGE) break;
      empSkip += EMP_PAGE;
    }

    const withEmpNr = employees.filter(e => e.employee_number).length;

    return Response.json({
      total_employees: employees.length,
      with_employee_number: withEmpNr,
      pages_loaded: Math.ceil(employees.length / EMP_PAGE),
      sample: employees.slice(0, 3).map(e => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
        employee_number: e.employee_number,
        status: e.status,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});