import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check: allow service role (function-to-function) or admin/hr_admin users
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      const user = await base44.auth.me();
      if (user.role !== 'admin' && !['ADMIN', 'HR_ADMIN'].includes(user.business_role)) {
        return Response.json({ error: 'Forbidden: alleen admin en hr_admin' }, { status: 403 });
      }
    }

    const { date } = await req.json();
    if (!date) return Response.json({ error: 'date is verplicht (YYYY-MM-DD)' }, { status: 400 });

    // Fetch all data in parallel
    const [employees, timeEntries, trips, standplaatsWerk, customers] = await Promise.all([
      base44.asServiceRole.entities.Employee.filter({ status: 'Actief' }),
      base44.asServiceRole.entities.TimeEntry.filter({ date }),
      base44.asServiceRole.entities.Trip.filter({ date }),
      base44.asServiceRole.entities.StandplaatsWerk.filter({ date }),
      base44.asServiceRole.entities.Customer.filter({}),
    ]);

    const customerMap = {};
    for (const c of customers) customerMap[c.id] = c.company_name || '';

    // Sort employees by employee_number ascending
    employees.sort((a, b) => {
      const numA = a.employee_number || '';
      const numB = b.employee_number || '';
      return numA.localeCompare(numB, 'nl', { numeric: true });
    });

    // Build per-employee data, only include employees with data
    const employeesWithData = [];

    for (const emp of employees) {
      const empTimeEntries = timeEntries.filter(t => t.employee_id === emp.id);
      const empTrips = trips.filter(t => t.employee_id === emp.id);
      const empStandplaats = standplaatsWerk.filter(s => s.employee_id === emp.id);

      if (empTimeEntries.length === 0 && empTrips.length === 0 && empStandplaats.length === 0) continue;

      const empName = [emp.first_name, emp.prefix, emp.last_name].filter(Boolean).join(' ');

      // Enrich trips with customer names
      const enrichedTrips = empTrips.map(trip => ({
        ...trip,
        customer_name: customerMap[trip.customer_id] || '-',
      }));

      employeesWithData.push({
        employeeNumber: emp.employee_number || '-',
        employeeId: emp.id,
        name: empName,
        department: emp.department || '-',
        timeEntries: empTimeEntries,
        trips: enrichedTrips,
        standplaatsWerk: empStandplaats,
      });
    }

    return Response.json({
      success: true,
      reportDate: date,
      generatedAt: new Date().toISOString(),
      employees: employeesWithData,
    });
  } catch (error) {
    console.error('buildDailyPayrollReportData error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});