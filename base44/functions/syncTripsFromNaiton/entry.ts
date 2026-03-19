// ╔══════════════════════════════════════════════════════════════════╗
// ║ syncTripsFromNaiton v16 — Full GPS Buddy / Naiton integration  ║
// ║ Auth: Admin-only                                                ║
// ║ 1. dataexchange_assets → voertuig mapping                      ║
// ║ 2. dataexchange_trips → Drive+Stop segmenten                   ║
// ║ 3. dataexchange_currentpositions → driver mapping (personjson)  ║
// ║ 4. Combine Drive+Stop → ritten, resolve drivers                ║
// ║ 5. dataexchange_driverhistoryupsert (1 bulk call)              ║
// ║ 6. locationmanager_addupdatelocations (1 call)                 ║
// ║ 7. transportapi_importorders (1 call)                          ║
// ║ 8. Save to TripRecord + TripRecordLink (batch insert)          ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const BASE_URL = 'https://dawa-prod.naiton.com';
const INSERT_BATCH_SIZE = 50;
const MAX_DAYS = 31;

Deno.serve(async (req) => {
  const t0 = Date.now();
  const log = [];
  const addLog = (msg) => { console.log(`[NAITON] ${msg}`); log.push(msg); };

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

    const diffDays = Math.ceil((new Date(date_to) - new Date(date_from)) / 86400000);
    if (diffDays > MAX_DAYS) {
      return Response.json({ error: `Maximaal ${MAX_DAYS} dagen per synchronisatie (opgegeven: ${diffDays})` }, { status: 400 });
    }
    if (diffDays < 0) {
      return Response.json({ error: 'date_from moet vóór date_to liggen' }, { status: 400 });
    }

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return Response.json({ error: 'Naiton API credentials niet geconfigureerd' }, { status: 500 });
    }

    const apiHeaders = {
      'Content-Type': 'application/json',
      'ClientId': CLIENT_ID,
      'ClientSecret': CLIENT_SECRET,
    };

    // Helper for /datad/execute calls
    const naitonCall = async (functions) => {
      const res = await fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify(functions),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Naiton API ${res.status}: ${errText.slice(0, 500)}`);
      }
      return res.json();
    };

    // ═══════════════════════════════════════════
    // STEP 1: Fetch assets + currentpositions (parallel)
    // ═══════════════════════════════════════════
    addLog('Fetching assets + currentpositions...');

    const [assetsJson, positionsJson] = await Promise.all([
      naitonCall([{
        name: "dataexchange_assets",
        arguments: [{ name: "inactiveAttributes", value: true }]
      }]),
      naitonCall([{
        name: "dataexchange_currentpositions",
        arguments: [{ name: "includeFields", value: "personjson" }]
      }]).catch(err => {
        addLog(`currentpositions failed (non-critical): ${err.message}`);
        return {};
      })
    ]);

    const assets = assetsJson.dataexchange_assets || [];
    const positions = positionsJson.dataexchange_currentpositions || [];

    // 3.1 Asset mapping: gpsassetid → { vehicle, plate }
    const assetMap = {};
    for (const a of assets) {
      if (!a.gpsassetid) continue;
      assetMap[a.gpsassetid] = {
        vehicle: a.assetname || '',
        plate: a.licenceplate || '',
      };
    }

    // 3.2 Driver mapping from currentpositions: gpsassetid → "Voornaam Achternaam"
    const driverMap = {};
    for (const p of positions) {
      const id = p.gpsassetid;
      if (!id) continue;
      let driverName = '';
      if (p.personjson) {
        try {
          const person = typeof p.personjson === 'string' ? JSON.parse(p.personjson) : p.personjson;
          const fn = person.firstname || person.Firstname || person.voornaam || '';
          const ln = person.lastname || person.Lastname || person.achternaam || '';
          driverName = `${fn} ${ln}`.trim();
        } catch { /* ignore parse errors */ }
      }
      if (driverName) driverMap[id] = driverName;
    }

    const gpsIds = Object.keys(assetMap);
    addLog(`${assets.length} assets, ${gpsIds.length} met gpsassetid, ${Object.keys(driverMap).length} drivers via positions`);

    if (gpsIds.length === 0) {
      return Response.json({ error: 'Geen GPS assets gevonden in Naiton' }, { status: 404 });
    }

    // ═══════════════════════════════════════════
    // STEP 2: Fetch trips (bulk, all assets at once)
    // ═══════════════════════════════════════════
    addLog(`Fetching trips ${date_from} → ${date_to}...`);

    const tripsJson = await naitonCall([{
      name: "dataexchange_trips",
      arguments: [
        { name: "gpsassetids", value: gpsIds },
        { name: "starttime", value: date_from },
        { name: "stoptime", value: date_to },
        { name: "includeallattributes", value: true }
      ]
    }]);

    const allTrips = tripsJson.dataexchange_trips || [];
    addLog(`${allTrips.length} trip segmenten opgehaald`);

    if (allTrips.length === 0) {
      return Response.json({
        success: true, message: 'Geen ritten gevonden in deze periode',
        assets: gpsIds.length, segments: 0, rides: 0, created: 0, skipped: 0, linked: 0, ms: Date.now() - t0, log
      });
    }

    // ═══════════════════════════════════════════
    // STEP 3: Sort + Combine Drive+Stop → rides
    // ═══════════════════════════════════════════
    allTrips.sort((a, b) => {
      const aId = String(a.gpsassetid || '');
      const bId = String(b.gpsassetid || '');
      if (aId !== bId) return aId < bId ? -1 : 1;
      return new Date(a.start || a.stop || 0) - new Date(b.start || b.stop || 0);
    });

    const rides = [];
    let idx = 0;
    while (idx < allTrips.length) {
      const t = allTrips[idx];
      const type = (t.type || '').toLowerCase();

      if (type === 'drive') {
        const drive = t;
        let stop = null;
        if (idx + 1 < allTrips.length) {
          const next = allTrips[idx + 1];
          if ((next.type || '').toLowerCase() === 'stop' && next.gpsassetid === drive.gpsassetid) {
            stop = next;
            idx++;
          }
        }
        rides.push(buildRide(drive, stop, assetMap, driverMap));
      }
      idx++;
    }

    addLog(`${rides.length} ritten samengesteld`);

    // ═══════════════════════════════════════════
    // STEP 4: Driver history upsert (1 bulk call)
    // ═══════════════════════════════════════════
    const driverHistoryEntries = [];
    for (const r of rides) {
      if (!r.driver || !r.plate || !r.start_time) continue;
      driverHistoryEntries.push({
        assetname: r.plate,
        drivername: r.driver,
        startdatetime: r.start_time,
        stopdatetime: r.end_time || r.start_time,
      });
    }

    if (driverHistoryEntries.length > 0) {
      addLog(`Upserting ${driverHistoryEntries.length} driver history entries...`);
      try {
        await naitonCall([{
          name: "dataexchange_driverhistoryupsert",
          arguments: driverHistoryEntries.map(e => ({
            name: "entry",
            value: e
          }))
        }]);
        addLog('Driver history upsert OK');
      } catch (err) {
        addLog(`Driver history upsert failed (non-critical): ${err.message}`);
      }
    }

    // ═══════════════════════════════════════════
    // STEP 5: Locations (standplaats + depot)
    // ═══════════════════════════════════════════
    const locations = [
      {
        referencenumber: "standplaats_kapelle",
        name: "Standplaats Kapelle",
        address: "Fleerbosseweg 19",
        city: "Kapelle",
        country: "NL"
      },
      {
        referencenumber: "postnl_depot",
        name: "PostNL Depot",
        address: "",
        city: "",
        country: "NL"
      }
    ];

    addLog('Upserting locations...');
    try {
      const formData = new FormData();
      formData.append('_locationsstr', JSON.stringify(locations));
      await fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST',
        headers: { 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
        body: (() => {
          // Use JSON call instead of multipart if possible
          return JSON.stringify([{
            name: "locationmanager_addupdatelocations",
            arguments: [{ name: "_locationsstr", value: JSON.stringify(locations) }]
          }]);
        })(),
      }).then(async res => {
        // Re-set content-type for this call
        if (!res.ok) addLog(`Locations upsert returned ${res.status}`);
        else addLog('Locations upsert OK');
      });
    } catch (err) {
      addLog(`Locations upsert failed (non-critical): ${err.message}`);
    }

    // ═══════════════════════════════════════════
    // STEP 6: Transport API import (1 bulk call)
    // ═══════════════════════════════════════════
    const tripPayloads = [];
    for (const r of rides) {
      if (!r.plate || !r.start_time) continue;

      const refId = `${r.gpsassetid}_${r.start_time}`;
      const startDate = r.date;
      const startTime = r.start_time.includes('T') ? r.start_time.split('T')[1]?.slice(0, 5) : '';

      // Build stops: Standplaats → Depot → Standplaats
      const stops = [
        { startLocationRefId: "standplaats_kapelle", stopLocationRefId: "postnl_depot", sequenceId: 1 },
        { startLocationRefId: "postnl_depot", stopLocationRefId: "standplaats_kapelle", sequenceId: 2 },
      ];

      tripPayloads.push({
        refId,
        name: "GPS Import",
        licensePlate: r.plate,
        startDate,
        startTime,
        stops,
      });
    }

    if (tripPayloads.length > 0) {
      addLog(`Importing ${tripPayloads.length} trips to transport API...`);
      try {
        await naitonCall([{
          name: "transportapi_importorders",
          arguments: [{ name: "_payload", value: JSON.stringify(tripPayloads) }]
        }]);
        addLog('Transport import OK');
      } catch (err) {
        addLog(`Transport import failed (non-critical): ${err.message}`);
      }
    }

    // ═══════════════════════════════════════════
    // STEP 7: Save to TripRecord (dedup + batch)
    // ═══════════════════════════════════════════
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
      if (existingKeys.has(key)) { skipped++; continue; }
      existingKeys.add(key);
      toInsert.push(r);
    }

    let created = 0;
    const newRecordIds = [];

    for (let i = 0; i < toInsert.length; i += INSERT_BATCH_SIZE) {
      const batch = toInsert.slice(i, i + INSERT_BATCH_SIZE);
      const results = await svc.entities.TripRecord.bulkCreate(batch);
      for (let j = 0; j < results.length; j++) {
        newRecordIds.push({ id: results[j].id, driver: batch[j].driver, date: batch[j].date });
      }
      created += results.length;
    }

    addLog(`Created: ${created}, Skipped: ${skipped}`);

    // ═══════════════════════════════════════════
    // STEP 8: Match drivers → employees → TripRecordLink
    // ═══════════════════════════════════════════
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

      for (let i = 0; i < linksToCreate.length; i += INSERT_BATCH_SIZE) {
        const batch = linksToCreate.slice(i, i + INSERT_BATCH_SIZE);
        await svc.entities.TripRecordLink.bulkCreate(batch);
        linked += batch.length;
      }
      addLog(`Linked ${linked}/${newRecordIds.length} to employees`);
    }

    return Response.json({
      success: true,
      assets: gpsIds.length,
      segments: allTrips.length,
      rides: rides.length,
      created, skipped, linked,
      drivers_resolved: rides.filter(r => r.driver).length,
      naiton_calls: { assets: 1, trips: 1, positions: 1, driverHistory: driverHistoryEntries.length > 0 ? 1 : 0, locations: 1, transport: tripPayloads.length > 0 ? 1 : 0 },
      ms: Date.now() - t0,
      log,
    });

  } catch (error) {
    console.error('[NAITON] Error:', error);
    return Response.json({ error: error.message, log }, { status: 500 });
  }
});

/**
 * Build a ride from Drive + optional Stop segment.
 * Driver priority: trip.driver → driverMap[gpsassetid] → additionaldata → null
 */
function buildRide(drive, stop, assetMap, driverMap) {
  const assetId = drive.gpsassetid;
  const startTime = drive.start;
  const endTime = stop ? (stop.stop || stop.end) : (drive.stop || drive.end || null);

  const startKm = Number(drive.odometerstartkm || 0);
  const endKm = stop ? Number(stop.odometerstopkm || 0) : Number(drive.odometerstopkm || 0);

  let totalHours = null;
  if (startTime && endTime) {
    totalHours = Number(((new Date(endTime) - new Date(startTime)) / 3600000).toFixed(2));
  }

  let totalKm = null;
  if (endKm > 0 && startKm > 0 && endKm > startKm) {
    totalKm = endKm - startKm;
  } else {
    const dist = Number(drive.distance || 0);
    if (dist > 0) totalKm = Number((dist / 1000).toFixed(1));
  }

  // Driver resolution: trip field → positions map → additionaldata
  let driver = drive.driver || '';
  if (!driver) driver = driverMap[assetId] || '';
  if (!driver && drive.additionaldata) {
    try {
      const ad = typeof drive.additionaldata === 'string' ? JSON.parse(drive.additionaldata) : drive.additionaldata;
      driver = ad.driver || ad.drivername || ad.Driver || '';
    } catch { /* ignore */ }
  }

  // Stop metrics
  let longStopsMin = 0, depotMin = 0;
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