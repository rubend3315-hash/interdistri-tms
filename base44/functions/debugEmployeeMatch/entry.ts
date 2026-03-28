// Debug: test different limits to find threshold
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;
    const results = {};

    for (const limit of [3, 10, 20, 50, 100]) {
      const data = await svc.entities.Employee.list('-created_date', limit);
      const isArr = Array.isArray(data);
      results[`limit_${limit}`] = {
        isArray: isArr,
        length: data?.length,
        hasEmpNr: isArr ? data.filter(e => e.employee_number).length : 0,
        sampleId: isArr && data[0] ? data[0].id : null,
      };
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});