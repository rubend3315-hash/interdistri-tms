import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Test 1: Employee lookup (as user, NOT service role)
    let employeeResult = [];
    try {
      employeeResult = await base44.entities.Employee.filter({ email: user.email });
    } catch (e) {
      employeeResult = { error: e.message };
    }

    // Test 2: ShiftTime lookup (as user, NOT service role)
    let shiftResult = [];
    try {
      shiftResult = await base44.entities.ShiftTime.filter({ department: 'PakketDistributie', date: '2026-03-09' });
    } catch (e) {
      shiftResult = { error: e.message };
    }

    // Test 3: ShiftTime list all (as user)
    let shiftAll = [];
    try {
      shiftAll = await base44.entities.ShiftTime.list();
    } catch (e) {
      shiftAll = { error: e.message };
    }

    return Response.json({
      user: { id: user.id, email: user.email, role: user.role, business_role: user.business_role, employee_id: user.employee_id },
      employee_count: Array.isArray(employeeResult) ? employeeResult.length : employeeResult,
      employee_first: Array.isArray(employeeResult) && employeeResult[0] ? { id: employeeResult[0].id, name: employeeResult[0].first_name, dept: employeeResult[0].department, mobile_shift_dept: employeeResult[0].mobile_shift_department } : null,
      shift_filtered_count: Array.isArray(shiftResult) ? shiftResult.length : shiftResult,
      shift_filtered_first: Array.isArray(shiftResult) && shiftResult[0] ? { id: shiftResult[0].id, date: shiftResult[0].date, dept: shiftResult[0].department, service_start: shiftResult[0].service_start_time } : null,
      shift_all_count: Array.isArray(shiftAll) ? shiftAll.length : shiftAll,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});