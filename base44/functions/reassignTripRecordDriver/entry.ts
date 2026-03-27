// reassignTripRecordDriver — Handmatige chauffeur-koppeling + Naiton write-back
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BASE_URL = 'https://dawa-prod.naiton.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Allow admin, OPERATIONS_MANAGER, SUPERVISOR
    const allowed = user.role === 'admin' || ['OPERATIONS_MANAGER', 'SUPERVISOR'].includes(user.business_role);
    if (!allowed) return Response.json({ error: 'Geen toegang' }, { status: 403 });

    const { trip_record_id, employee_id } = await req.json();
    if (!trip_record_id || !employee_id) {
      return Response.json({ error: 'trip_record_id en employee_id zijn verplicht' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // Fetch TripRecord + Employee in parallel
    const [tripRecords, employees] = await Promise.all([
      svc.entities.TripRecord.filter({ id: trip_record_id }),
      svc.entities.Employee.filter({ id: employee_id }),
    ]);

    const tripRecord = tripRecords[0];
    const employee = employees[0];

    if (!tripRecord) return Response.json({ error: 'TripRecord niet gevonden' }, { status: 404 });
    if (!employee) return Response.json({ error: 'Medewerker niet gevonden' }, { status: 404 });

    const driverName = `${employee.first_name || ''} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name || ''}`.replace(/\s+/g, ' ').trim();

    // 1. Update TripRecord with correct driver
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

    // 3. Write-back to Naiton (best-effort)
    let naitonResult = null;
    try {
      const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
      const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');

      if (CLIENT_ID && CLIENT_SECRET && tripRecord.gpsassetid && tripRecord.start_time && tripRecord.end_time) {
        const upsertArgs = [
          { name: "gpsassetid", value: tripRecord.gpsassetid },
          { name: "drivername", value: driverName },
          { name: "starttime", value: tripRecord.start_time },
          { name: "stoptime", value: tripRecord.end_time },
        ];
        if (employee.employee_number) {
          upsertArgs.push({ name: "staffnumber", value: String(employee.employee_number) });
        }

        console.log(`[REASSIGN] Naiton write-back: ${driverName} (nr=${employee.employee_number || '-'}) → asset=${tripRecord.gpsassetid}`);

        const res = await fetch(`${BASE_URL}/datad/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ClientId': CLIENT_ID,
            'ClientSecret': CLIENT_SECRET,
          },
          body: JSON.stringify([{
            name: "dataexchange_driverhistoryupsert",
            arguments: upsertArgs,
          }]),
        });

        const resText = await res.text();

        if (res.ok) {
          naitonResult = 'success';
        } else {
          // AC003 = Naiton API accepteert momenteel geen write-parameters
          // Dit vereist configuratie aan GPS Buddy / Naiton-zijde
          naitonResult = `naiton_api_error: ${res.status} — ${resText.slice(0, 200)}`;
          console.warn(`[REASSIGN] Naiton write-back failed: ${res.status} ${resText.slice(0, 200)}`);
        }
      } else {
        naitonResult = 'skipped (missing credentials or trip data)';
      }
    } catch (naitonErr) {
      naitonResult = `exception: ${naitonErr.message}`;
      console.warn(`[REASSIGN] Naiton write-back exception: ${naitonErr.message}`);
    }

    return Response.json({
      success: true,
      driver: driverName,
      employee_id: employee.id,
      employee_number: employee.employee_number || null,
      naiton_writeback: naitonResult,
    });

  } catch (error) {
    console.error('[REASSIGN] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});