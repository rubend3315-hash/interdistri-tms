// ╔══════════════════════════════════════════════════════════════════╗
// ║ syncTripsFromNaiton v3 — GPS Buddy / Naiton trip sync          ║
// ║ Auth: Admin-only                                                ║
// ║ Endpoint: POST /datad/execute                                   ║
// ║ 1. dataexchange_assets → voertuiglijst                         ║
// ║ 2. dataexchange_trips → Drive+Stop segmenten                   ║
// ║ 3. Combineer Drive + eerstvolgende Stop → 1 rit                ║
// ║ 4. Sla op in TripRecord (dedup: gpsassetid + start_time)       ║
// ║ 5. Match driver met Employee → TripRecordLink                  ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const BASE_URL = 'https://dawa-prod.naiton.com';

Deno.serve(async (req) => {
  const t0 = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const { date_from, date_to } = await req.json();

    if (!date_from || !date_to) {
      return Response.json({ error: 'date_from en date_to zijn verplicht' }, { status: 400 });
    }

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return Response.json({ error: 'Naiton API credentials niet geconfigureerd' }, { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'ClientId': CLIENT_ID,
      'ClientSecret': CLIENT_SECRET,
    };

    // ── Step 1: Fetch assets via /datad/execute ──
    console.log('[NAITON] Fetching assets...');
    const assetsRes = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{
        name: "dataexchange_assets",
        arguments: [{ name: "inactiveAttributes", value: true }]
      }])
    });

    if (!assetsRes.ok) {
      const errText = await assetsRes.text();
      console.error('[NAITON] Assets fetch failed:', assetsRes.status, errText);
      return Response.json({ error: `Assets API fout: ${assetsRes.status}`, details: errText }, { status: 502 });
    }

    const assetsJson = await assetsRes.json();
    const assets = assetsJson.dataexchange_assets || [];
    console.log(`[NAITON] ${assets.length} assets opgehaald`);

    // Build asset lookup
    const assetMap = {};
    for (const a of assets) {
      if (!a.gpsassetid) continue;
      assetMap[a.gpsassetid] = {
        vehicle: a.assetname || '',
        plate: a.licenceplate || '',
      };
    }

    const gpsIds = Object.keys(assetMap);
    if (gpsIds.length === 0) {
      return Response.json({ success: true, message: 'Geen GPS assets gevonden', created: 0, skipped: 0, linked: 0, ms: Date.now() - t0 });
    }

    // ── Step 2: Fetch trips via /datad/execute ──
    console.log(`[NAITON] Fetching trips from ${date_from} to ${date_to} for ${gpsIds.length} assets...`);
    const tripsRes = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{
        name: "dataexchange_trips",
        arguments: [
          { name: "gpsassetids", value: gpsIds },
          { name: "starttime", value: date_from },
          { name: "stoptime", value: date_to },
          { name: "includeallattributes", value: true }
        ]
      }])
    });

    if (!tripsRes.ok) {
      const errText = await tripsRes.text();
      console.error('[NAITON] Trips fetch failed:', tripsRes.status, errText);
      return Response.json({ error: `Trips API fout: ${tripsRes.status}`, details: errText }, { status: 502 });
    }

    const tripsJson = await tripsRes.json();
    const trips = tripsJson.dataexchange_trips || [];
    console.log(`[NAITON] ${trips.length} trip segmenten opgehaald`);

    if (trips.length === 0) {
      return Response.json({ success: true, message: 'Geen trips gevonden in deze periode', created: 0, skipped: 0, linked: 0, ms: Date.now() - t0 });
    }

    // ── Step 3: Combine Drive + eerstvolgende Stop → 1 rit ──
    // Sort by gpsassetid + start time to ensure correct ordering
    trips.sort((a, b) => {
      const aId = a.gpsassetid || '';
      const bId = b.gpsassetid || '';
      if (aId !== bId) return aId < bId ? -1 : 1;
      return new Date(a.start || 0) - new Date(b.start || 0);
    });

    const rides = [];
    let currentDrive = null;

    for (const t of trips) {
      const type = (t.type || '').toLowerCase();

      if (type === 'drive') {
        // If there was a previous drive without a matching stop, save it standalone
        if (currentDrive) {
          rides.push(finalizeDrive(currentDrive, null, assetMap));
        }
        currentDrive = t;
      } else if (type === 'stop' && currentDrive && t.gpsassetid === currentDrive.gpsassetid) {
        // Match this stop to the current drive
        rides.push(finalizeDrive(currentDrive, t, assetMap));
        currentDrive = null;
      }
      // Ignore stops without a preceding drive
    }

    // Handle trailing drive without stop
    if (currentDrive) {
      rides.push(finalizeDrive(currentDrive, null, assetMap));
    }

    console.log(`[NAITON] ${rides.length} ritten samengesteld uit ${trips.length} segmenten`);

    // ── Step 4: Save TripRecords (dedup via gpsassetid + start_time) ──
    const existingRecords = await svc.entities.TripRecord.filter({
      date: { $gte: date_from, $lte: date_to }
    });
    const existingKeys = new Set(
      existingRecords.map(r => `${r.gpsassetid}_${r.start_time}`)
    );

    let created = 0, skipped = 0;
    const newRecordIds = [];

    for (const r of rides) {
      const dedupKey = `${r.gpsassetid}_${r.start_time}`;
      if (existingKeys.has(dedupKey)) {
        skipped++;
        continue;
      }

      const record = await svc.entities.TripRecord.create(r);
      existingKeys.add(dedupKey);
      newRecordIds.push({ id: record.id, driver: r.driver, date: r.date });
      created++;
    }

    console.log(`[NAITON] Created: ${created}, Skipped (dedup): ${skipped}`);

    // ── Step 5: Match drivers to employees → TripRecordLink ──
    let linked = 0;
    if (newRecordIds.length > 0) {
      const employees = await svc.entities.Employee.filter({ status: 'Actief' });

      const empByName = {};
      for (const emp of employees) {
        const full = `${emp.first_name || ''} ${emp.prefix || ''} ${emp.last_name || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
        const short = `${emp.first_name || ''} ${emp.last_name || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
        const reversed = `${emp.last_name || ''} ${emp.first_name || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
        empByName[full] = emp;
        empByName[short] = emp;
        empByName[reversed] = emp;
      }

      for (const rec of newRecordIds) {
        if (!rec.driver) continue;
        const driverNorm = rec.driver.replace(/\s+/g, ' ').trim().toLowerCase();
        const matchedEmp = empByName[driverNorm];

        if (matchedEmp) {
          await svc.entities.TripRecordLink.create({
            trip_record_id: rec.id,
            employee_id: matchedEmp.id,
            employee_name: `${matchedEmp.first_name || ''} ${matchedEmp.last_name || ''}`.trim(),
            date: rec.date,
            approved: false,
          });
          linked++;
        }
      }
      console.log(`[NAITON] Linked ${linked} records to employees`);
    }

    return Response.json({
      success: true,
      created,
      skipped,
      linked,
      total_segments: trips.length,
      total_rides: rides.length,
      ms: Date.now() - t0,
    });

  } catch (error) {
    console.error('[NAITON] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Combine a Drive segment + optional Stop segment into a single ride record.
 */
function finalizeDrive(drive, stop, assetMap) {
  const assetId = drive.gpsassetid;
  const startTime = drive.start;
  const endTime = stop ? stop.stop : (drive.stop || drive.end || null);

  const startKm = Number(drive.odometerstartkm || 0);
  const endKm = stop ? Number(stop.odometerstopkm || 0) : Number(drive.odometerstopkm || 0);

  let totalHours = null;
  if (startTime && endTime) {
    totalHours = Number(((new Date(endTime) - new Date(startTime)) / 3600000).toFixed(2));
  }

  const totalKm = (endKm > 0 && startKm > 0 && endKm > startKm) ? endKm - startKm : null;

  return {
    gpsassetid: assetId,
    driver: drive.driver || '',
    vehicle: assetMap[assetId]?.vehicle || '',
    plate: assetMap[assetId]?.plate || '',
    start_time: startTime,
    end_time: endTime,
    start_km: startKm > 0 ? startKm : null,
    end_km: endKm > 0 ? endKm : null,
    total_km: totalKm,
    total_hours: totalHours,
    date: startTime ? startTime.split('T')[0] : null,
  };
}