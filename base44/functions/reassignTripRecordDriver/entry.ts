// reassignTripRecordDriver — Handmatige chauffeur-koppeling (lokaal)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = user.role === 'admin' || ['OPERATIONS_MANAGER', 'SUPERVISOR'].includes(user.business_role);
    if (!allowed) return Response.json({ error: 'Geen toegang' }, { status: 403 });

    const { trip_record_id, employee_id } = await req.json();
    if (!trip_record_id || !employee_id) {
      return Response.json({ error: 'trip_record_id en employee_id zijn verplicht' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    const [tripRecords, employees] = await Promise.all([
      svc.entities.TripRecord.filter({ id: trip_record_id }),
      svc.entities.Employee.filter({ id: employee_id }),
    ]);

    const tripRecord = tripRecords[0];
    const employee = employees[0];
    if (!tripRecord) return Response.json({ error: 'TripRecord niet gevonden' }, { status: 404 });
    if (!employee) return Response.json({ error: 'Medewerker niet gevonden' }, { status: 404 });

    const driverName = `${employee.first_name || ''} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name || ''}`.replace(/\s+/g, ' ').trim();

    // 1. Update TripRecord
    await svc.entities.TripRecord.update(trip_record_id, {
      driver: driverName,
      driver_source: 'manual',
      driver_manually_set: true,
    });

    // 2. Update or create TripRecordLink
    const existingLinks = await svc.entities.TripRecordLink.filter({ trip_record_id });
    if (existingLinks.length > 0) {
      await svc.entities.TripRecordLink.update(existingLinks[0].id, {
        employee_id: employee.id,
        employee_name: driverName,
      });
    } else {
      await svc.entities.TripRecordLink.create({
        trip_record_id,
        employee_id: employee.id,
        employee_name: driverName,
        date: tripRecord.date,
        approved: false,
      });
    }

    return Response.json({
      success: true,
      driver: driverName,
      employee_id: employee.id,
      employee_number: employee.employee_number || null,
    });

  } catch (error) {
    console.error('[REASSIGN] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});