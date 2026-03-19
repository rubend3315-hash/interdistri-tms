// ╔══════════════════════════════════════════════════════════════════╗
// ║ syncTripsFromNaiton v7 — GPS Buddy / Naiton trip sync          ║
// ║ Auth: Admin-only                                                ║
// ║ Endpoint: POST /datad/execute                                   ║
// ║ Batching: max 10 assets per API call, max 50 records per insert ║
// ║ Max range: 31 dagen                                             ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const BASE_URL = 'https://dawa-prod.naiton.com';
const ASSET_BATCH_SIZE = 10;
const INSERT_BATCH_SIZE = 50;
const MAX_DAYS = 31;

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

    // Validate max range
    const diffDays = Math.ceil((new Date(date_to) - new Date(date_from)) / 86400000);
    if (diffDays > MAX_DAYS) {
      return Response.json({ error: `Maximaal ${MAX_DAYS} dagen per synchronisatie (opgegeven: ${diffDays} dagen)` }, { status: 400 });
    }
    if (diffDays < 0) {
      return Response.json({ error: 'date_from moet vóór date_to liggen' }, { status: 400 });
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

    // ── Step 1: Fetch assets ──
    console.log('[NAITON] Fetching assets...');
    const assetsRes = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST', headers,
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

    const assetMap = {};
    for (const a of assets) {
      if (!a.gpsassetid) continue;
      assetMap[a.gpsassetid] = {
        vehicle: a.assetname || '',
        plate: a.licenceplate || '',
      };
    }

    const gpsIds = Object.keys(assetMap);
    console.log(`[NAITON] ${assets.length} assets, ${gpsIds.length} met gpsassetid`);

    if (gpsIds.length === 0) {
      return Response.json({ error: 'Geen GPS assets gevonden in Naiton' }, { status: 404 });
    }

    // ── Step 2: Fetch trips in batches of ASSET_BATCH_SIZE ──
    console.log(`[NAITON] Fetching trips ${date_from} → ${date_to}, ${gpsIds.length} assets in batches of ${ASSET_BATCH_SIZE}...`);
    const allTrips = [];

    for (let i = 0; i < gpsIds.length; i += ASSET_BATCH_SIZE) {
      const chunk = gpsIds.slice(i, i + ASSET_BATCH_SIZE);
      console.log(`[NAITON] Batch ${Math.floor(i / ASSET_BATCH_SIZE) + 1}: ${chunk.length} assets`);

      const tripsRes = await fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST', headers,
        body: JSON.stringify([{
          name: "dataexchange_trips",
          arguments: [
            { name: "gpsassetids", value: chunk },
            { name: "starttime", value: date_from },
            { name: "stoptime", value: date_to },
            { name: "includeallattributes", value: true }
          ]
        }])
      });

      if (!tripsRes.ok) {
        const errText = await tripsRes.text();
        console.error(`[NAITON] Trips batch failed:`, tripsRes.status, errText);
        continue; // skip failed batch, process the rest
      }

      const tripsJson = await tripsRes.json();
      const batchTrips = tripsJson.dataexchange_trips || [];
      allTrips.push(...batchTrips);
    }

    console.log(`[NAITON] ${allTrips.length} trip segmenten totaal opgehaald`);

    if (allTrips.length === 0) {
      return Response.json({
        success: true, message: 'Geen ritten gevonden in deze periode',
        assets: gpsIds.length, segments: 0, rides: 0, created: 0, skipped: 0, linked: 0, ms: Date.now() - t0
      });
    }

    // ── Step 3: Sort segments by asset + time ──
    allTrips.sort((a, b) => {
      const aId = String(a.gpsassetid || '');
      const bId = String(b.gpsassetid || '');
      if (aId !== bId) return aId < bId ? -1 : 1;
      const aTime = a.start || a.stop || '';
      const bTime = b.start || b.stop || '';
      return new Date(aTime) - new Date(bTime);
    });

    // ── Step 4: Combine Drive + next Stop → 1 ride ──
    const rides = [];
    let idx = 0;

    while (idx < allTrips.length) {
      const t = allTrips[idx];
      const type = (t.type || '').toLowerCase();

      if (type === 'drive') {
        const drive = t;
        let stop = null;

        // Look ahead for matching stop on same asset
        if (idx + 1 < allTrips.length) {
          const next = allTrips[idx + 1];
          if ((next.type || '').toLowerCase() === 'stop' && next.gpsassetid === drive.gpsassetid) {
            stop = next;
            idx++; // consume the stop
          }
        }

        rides.push(buildRide(drive, stop, assetMap));
      }
      // Skip orphan stops
      idx++;
    }

    console.log(`[NAITON] ${rides.length} ritten samengesteld uit ${allTrips.length} segmenten`);

    // ── Step 5: Dedup against existing records ──
    const existingRecords = await svc.entities.TripRecord.filter({
      date: { $gte: date_from, $lte: date_to }
    });
    const existingKeys = new Set(
      existingRecords.map(r => `${r.gpsassetid}_${r.start_time}`)
    );

    const toInsert = [];
    let skipped = 0;

    for (const r of rides) {
      const key = `${r.gpsassetid}_${r.start_time}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }
      existingKeys.add(key);
      toInsert.push(r);
    }

    // ── Step 6: Insert in batches of INSERT_BATCH_SIZE ──
    let created = 0;
    const newRecordIds = [];

    for (let i = 0; i < toInsert.length; i += INSERT_BATCH_SIZE) {
      const batch = toInsert.slice(i, i + INSERT_BATCH_SIZE);
      const results = await svc.entities.TripRecord.bulkCreate(batch);

      for (let j = 0; j < results.length; j++) {
        newRecordIds.push({
          id: results[j].id,
          driver: batch[j].driver,
          date: batch[j].date,
        });
      }
      created += results.length;
    }

    console.log(`[NAITON] Created: ${created}, Skipped: ${skipped}`);

    // ── Step 7: Match drivers → employees → TripRecordLink ──
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

      const linksToCreate = [];
      for (const rec of newRecordIds) {
        if (!rec.driver) continue;
        const norm = rec.driver.replace(/\s+/g, ' ').trim().toLowerCase();
        const emp = empByName[norm];
        if (emp) {
          linksToCreate.push({
            trip_record_id: rec.id,
            employee_id: emp.id,
            employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            date: rec.date,
            approved: false,
          });
        }
      }

      // Bulk insert links
      for (let i = 0; i < linksToCreate.length; i += INSERT_BATCH_SIZE) {
        const batch = linksToCreate.slice(i, i + INSERT_BATCH_SIZE);
        await svc.entities.TripRecordLink.bulkCreate(batch);
        linked += batch.length;
      }

      console.log(`[NAITON] Linked ${linked} records to employees`);
    }

    return Response.json({
      success: true,
      assets: gpsIds.length,
      segments: allTrips.length,
      rides: rides.length,
      created,
      skipped,
      linked,
      ms: Date.now() - t0,
    });

  } catch (error) {
    console.error('[NAITON] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Build a ride from a Drive segment + optional Stop segment.
 */
function buildRide(drive, stop, assetMap) {
  const assetId = drive.gpsassetid;
  const startTime = drive.start;
  const endTime = stop ? (stop.stop || stop.end) : (drive.stop || drive.end || null);

  const startKm = Number(drive.odometerstartkm || 0);
  const endKm = stop
    ? Number(stop.odometerstopkm || 0)
    : Number(drive.odometerstopkm || 0);

  // total_hours
  let totalHours = null;
  if (startTime && endTime) {
    totalHours = Number(((new Date(endTime) - new Date(startTime)) / 3600000).toFixed(2));
  }

  // total_km: odometer first, fallback distance/1000
  let totalKm = null;
  if (endKm > 0 && startKm > 0 && endKm > startKm) {
    totalKm = endKm - startKm;
  } else {
    const dist = Number(drive.distance || 0);
    if (dist > 0) totalKm = Number((dist / 1000).toFixed(1));
  }

  // Driver: direct field or parse additionaldata
  let driver = drive.driver || '';
  if (!driver && drive.additionaldata) {
    try {
      const ad = typeof drive.additionaldata === 'string'
        ? JSON.parse(drive.additionaldata)
        : drive.additionaldata;
      driver = ad.driver || ad.drivername || ad.Driver || '';
    } catch { /* ignore */ }
  }

  // Long stops & depot time
  let longStopsMin = 0;
  let depotMin = 0;
  if (stop) {
    const stopStart = stop.start || stop.stop;
    const stopEnd = stop.stop || stop.end;
    if (stopStart && stopEnd) {
      const durMin = (new Date(stopEnd) - new Date(stopStart)) / 60000;
      if (durMin > 5) longStopsMin = Math.round(durMin);

      const addr = (stop.address || stop.location || '').toLowerCase();
      if (['postnl', 'depot', 'hub', 'sorteer', 'distributie'].some(kw => addr.includes(kw))) {
        depotMin = Math.round(durMin);
      }
    }
  }

  return {
    gpsassetid: assetId,
    driver,
    vehicle: assetMap[assetId]?.vehicle || '',
    plate: assetMap[assetId]?.plate || '',
    start_time: startTime,
    end_time: endTime,
    start_km: startKm > 0 ? startKm : null,
    end_km: endKm > 0 ? endKm : null,
    total_km: totalKm,
    total_hours: totalHours,
    depot_time_minutes: depotMin || null,
    long_stops_minutes: longStopsMin || null,
    date: startTime ? startTime.split('T')[0] : null,
  };
}