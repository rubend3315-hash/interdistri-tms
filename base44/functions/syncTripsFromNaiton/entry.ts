// ╔══════════════════════════════════════════════════════════════════════╗
// ║ syncTripsFromNaiton v20 — Production GPS Buddy / Naiton integration ║
// ║ Auth: Admin-only                                                     ║
// ║ CHANGES vs v16:                                                      ║
// ║  - Driver: currentpositions ONLY as source (personjson parsing)      ║
// ║  - driverhistory = WRITE ONLY (niet als lookup)                      ║
// ║  - Rit opbouw: depot-based grouping (niet 1 per segment)             ║
// ║    → rit eindigt bij depot-stop, >120min stilstand, of dagwissel     ║
// ║  - KM: odometer primair, distance fallback                           ║
// ║  - Stilstand: som van stop-segmenten >5min binnen gegroepeerde rit   ║
// ╚══════════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const BASE_URL = 'https://dawa-prod.naiton.com';
const INSERT_BATCH_SIZE = 50;
const MAX_DAYS = 31;
const DEPOT_KEYWORDS = ['postnl', 'depot', 'hub', 'sorteer', 'distributie', 'kapelle', 'fleerbos'];
const LONG_STOP_THRESHOLD_MIN = 120; // 2 uur = einde rit
const SHORT_STOP_THRESHOLD_MIN = 5;  // >5 min telt als stilstand

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

    const naitonCall = async (functions) => {
      const res = await fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify(functions),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Naiton API ${res.status}: ${errText.slice(0, 500)}`);
      }
      return res.json();
    };

    // ═══════════════════════════════════════════════════════
    // STEP 1: Fetch assets + currentpositions (parallel)
    // ═══════════════════════════════════════════════════════
    addLog('Step 1: Fetching assets + currentpositions...');

    const [assetsJson, positionsJson] = await Promise.all([
      naitonCall([{
        name: "dataexchange_assets",
        arguments: [{ name: "inactiveAttributes", value: true }]
      }]),
      naitonCall([{
        name: "dataexchange_currentpositions",
        arguments: []
      }]).catch(err => {
        addLog(`currentpositions failed (non-critical): ${err.message}`);
        return {};
      })
    ]);

    // 1a. Asset mapping: gpsassetid → { vehicle, plate }
    const assets = assetsJson.dataexchange_assets || [];
    const assetMap = {};
    for (const a of assets) {
      if (!a.gpsassetid) continue;
      assetMap[a.gpsassetid] = {
        vehicle: a.assetname || '',
        plate: a.licenceplate || '',
      };
    }

    // 1b. Driver mapping from currentpositions ONLY (= enige bron)
    const positions = positionsJson.dataexchange_currentpositions || [];
    const driverMap = {};

    // DEBUG: log positions met en zonder personjson
    addLog(`Positions count: ${positions.length}`);
    const withPerson = positions.filter(p => p.personjson);
    const withoutPerson = positions.filter(p => !p.personjson);
    addLog(`Positions with personjson: ${withPerson.length}, without: ${withoutPerson.length}`);
    if (withPerson.length > 0) {
      addLog(`Person sample: ${JSON.stringify(withPerson[0].personjson).slice(0, 500)}`);
      addLog(`Person asset: ${withPerson[0].gpsassetname} / ${withPerson[0].gpsassetid}`);
    }
    // Also check ALL driver-related fields across positions
    const allPersonData = positions.map(p => ({
      name: p.gpsassetname,
      id: p.gpsassetid,
      person: p.personjson,
      plate: p.licenceplate
    })).filter(p => p.person || p.plate);
    addLog(`Positions met person/plate data: ${allPersonData.length} → ${JSON.stringify(allPersonData).slice(0, 1000)}`);
    for (const p of positions) {
      const id = p.gpsassetid;
      if (!id) continue;
      if (p.personjson) {
        try {
          const person = typeof p.personjson === 'string' ? JSON.parse(p.personjson) : p.personjson;
          const fn = person.FirstName || person.firstname || person.Firstname || person.voornaam || '';
          const ln = person.LastName || person.lastname || person.Lastname || person.achternaam || '';
          const name = `${fn} ${ln}`.trim();
          if (name) driverMap[id] = name;
        } catch { /* ignore parse errors */ }
      }
    }

    const gpsIds = Object.keys(assetMap);
    addLog(`${assets.length} assets, ${gpsIds.length} met gpsassetid`);
    addLog(`DRIVER MAP: ${Object.keys(driverMap).length} entries → ${JSON.stringify(driverMap).slice(0, 500)}`);

    if (gpsIds.length === 0) {
      return Response.json({ error: 'Geen GPS assets gevonden in Naiton' }, { status: 404 });
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2: Fetch trip segments (bulk, all assets at once)
    // ═══════════════════════════════════════════════════════
    addLog(`Step 2: Fetching trips ${date_from} → ${date_to}...`);

    const tripsJson = await naitonCall([{
      name: "dataexchange_trips",
      arguments: [
        { name: "gpsassetids", value: gpsIds },
        { name: "starttime", value: date_from },
        { name: "stoptime", value: date_to },
        { name: "includeallattributes", value: true }
      ]
    }]);

    const allSegments = tripsJson.dataexchange_trips || [];
    addLog(`${allSegments.length} trip segmenten opgehaald`);

    // DEBUG: log segment driver info
    if (allSegments.length > 0) {
      const sample = allSegments[0];
      addLog(`Segment sample keys: ${JSON.stringify(Object.keys(sample))}`);
      // Check welke segmenten een driver veld hebben
      const withDriver = allSegments.filter(s => s.driver);
      const withAdditional = allSegments.filter(s => s.additionaldata);
      addLog(`Segments with driver field: ${withDriver.length}/${allSegments.length}`);
      addLog(`Segments with additionaldata: ${withAdditional.length}/${allSegments.length}`);
      if (withDriver.length > 0) {
        addLog(`Driver sample: ${withDriver[0].driver}`);
      }
      if (withAdditional.length > 0) {
        addLog(`Additional sample: ${JSON.stringify(withAdditional[0].additionaldata).slice(0, 500)}`);
      }
    }

    if (allSegments.length === 0) {
      return Response.json({
        success: true, message: 'Geen ritten gevonden in deze periode',
        assets: gpsIds.length, segments: 0, rides: 0, created: 0, skipped: 0, linked: 0, ms: Date.now() - t0, log
      });
    }

    // ═══════════════════════════════════════════════════════
    // STEP 3: Sort segments per asset + time, then group
    //         into rides (depot-based, >120min stop, dagwissel)
    // ═══════════════════════════════════════════════════════
    addLog('Step 3: Grouping segments into rides...');

    // Sort by gpsassetid then by start time
    allSegments.sort((a, b) => {
      const aId = String(a.gpsassetid || '');
      const bId = String(b.gpsassetid || '');
      if (aId !== bId) return aId < bId ? -1 : 1;
      return new Date(a.start || a.stop || 0) - new Date(b.start || b.stop || 0);
    });

    // Group per asset first
    const segmentsByAsset = {};
    for (const seg of allSegments) {
      const aid = seg.gpsassetid;
      if (!aid) continue;
      if (!segmentsByAsset[aid]) segmentsByAsset[aid] = [];
      segmentsByAsset[aid].push(seg);
    }

    const rides = [];

    for (const [assetId, segments] of Object.entries(segmentsByAsset)) {
      let currentRide = null;

      for (const seg of segments) {
        const type = (seg.type || '').toLowerCase();
        const segDate = (seg.start || seg.stop || '').split('T')[0];

        // Dagwissel: als het segment op een andere dag start dan de huidige rit, sluit de rit af
        if (currentRide && segDate !== currentRide.date) {
          rides.push(currentRide);
          currentRide = null;
        }

        if (type === 'drive') {
          if (!currentRide) {
            currentRide = {
              gpsassetid: assetId,
              date: segDate,
              segments: [],
            };
          }
          currentRide.segments.push(seg);
        }

        if (type === 'stop') {
          if (currentRide) {
            currentRide.segments.push(seg);

            // Check of dit een rit-eindigende stop is
            const stopStart = new Date(seg.start || seg.stop);
            const stopEnd = new Date(seg.stop || seg.end || seg.start);
            const stopMinutes = (stopEnd - stopStart) / 60000;

            const addr = (seg.address || seg.location || '').toLowerCase();
            const isDepot = DEPOT_KEYWORDS.some(kw => addr.includes(kw));
            const isLongStop = stopMinutes > LONG_STOP_THRESHOLD_MIN;

            if (isDepot || isLongStop) {
              rides.push(currentRide);
              currentRide = null;
            }
          }
          // Als er geen currentRide is, negeer losse stops
        }
      }

      // Laatste open rit afsluiten voor dit asset
      if (currentRide && currentRide.segments.length > 0) {
        rides.push(currentRide);
      }
    }

    addLog(`${rides.length} ritten samengesteld uit ${allSegments.length} segmenten`);
    if (rides.length > 0) {
      const first = rides[0];
      addLog(`Eerste rit: asset=${first.gpsassetid}, date=${first.date}, segments=${first.segments.length}`);
    }

    // ═══════════════════════════════════════════════════════
    // STEP 4: Build TripRecord objects from grouped rides
    // ═══════════════════════════════════════════════════════
    addLog('Step 4: Building TripRecord objects...');

    const tripRecords = [];

    for (const ride of rides) {
      const segs = ride.segments;
      if (segs.length === 0) continue;

      const firstSeg = segs[0];
      const lastSeg = segs[segs.length - 1];

      // Times
      const startTime = firstSeg.start;
      const endTime = lastSeg.stop || lastSeg.end || lastSeg.start;

      // Hours
      let totalHours = null;
      if (startTime && endTime) {
        totalHours = Number(((new Date(endTime) - new Date(startTime)) / 3600000).toFixed(2));
      }

      // KM: odometer primair, distance fallback
      const startKm = Number(firstSeg.odometerstartkm || 0);
      const endKm = Number(lastSeg.odometerstopkm || lastSeg.odometerstartkm || 0);
      let totalKm = null;
      if (endKm > startKm && startKm > 0) {
        totalKm = Number((endKm - startKm).toFixed(1));
      } else {
        // Fallback: som van alle distance velden (in meters)
        let totalDist = 0;
        for (const s of segs) {
          totalDist += Number(s.distance || 0);
        }
        if (totalDist > 0) totalKm = Number((totalDist / 1000).toFixed(1));
      }

      // Stilstand: som van stop-segmenten >5 min
      let longStopsMin = 0;
      let depotMin = 0;
      for (const s of segs) {
        if ((s.type || '').toLowerCase() !== 'stop') continue;
        const sStart = new Date(s.start || s.stop);
        const sEnd = new Date(s.stop || s.end || s.start);
        const durMin = (sEnd - sStart) / 60000;
        if (durMin > SHORT_STOP_THRESHOLD_MIN) {
          longStopsMin += Math.round(durMin);
          const addr = (s.address || s.location || '').toLowerCase();
          if (DEPOT_KEYWORDS.some(kw => addr.includes(kw))) {
            depotMin += Math.round(durMin);
          }
        }
      }

      // Driver: trip segment field → driverMap (currentpositions) → null
      let driver = '';
      // Check alle drive-segmenten voor een driver veld
      for (const s of segs) {
        if (s.driver) { driver = s.driver; break; }
      }
      // Fallback: currentpositions driverMap
      if (!driver) {
        driver = driverMap[ride.gpsassetid] || '';
      }

      tripRecords.push({
        gpsassetid: ride.gpsassetid,
        driver: driver || null,
        vehicle: assetMap[ride.gpsassetid]?.vehicle || '',
        plate: assetMap[ride.gpsassetid]?.plate || '',
        start_time: startTime,
        end_time: endTime,
        start_km: startKm > 0 ? startKm : null,
        end_km: endKm > 0 ? endKm : null,
        total_km: totalKm,
        total_hours: totalHours,
        depot_time_minutes: depotMin > 0 ? depotMin : null,
        long_stops_minutes: longStopsMin > 0 ? longStopsMin : null,
        date: ride.date,
      });
    }

    const driversResolved = tripRecords.filter(r => r.driver).length;
    addLog(`${tripRecords.length} trip records gebouwd, ${driversResolved} met driver`);

    // ═══════════════════════════════════════════════════════
    // STEP 5: Driver history upsert — WRITE ONLY
    //         (opslaan van ONZE bepaalde drivers, niet als bron)
    // ═══════════════════════════════════════════════════════
    const driverHistoryEntries = [];
    for (const r of tripRecords) {
      if (!r.driver || !r.plate || !r.start_time) continue;
      driverHistoryEntries.push({
        assetname: r.plate,
        drivername: r.driver,
        startdatetime: r.start_time,
        stopdatetime: r.end_time || r.start_time,
      });
    }

    if (driverHistoryEntries.length > 0) {
      addLog(`Step 5: Writing ${driverHistoryEntries.length} driver history entries (WRITE ONLY)...`);
      try {
        await naitonCall([{
          name: "dataexchange_driverhistoryupsert",
          arguments: driverHistoryEntries.map(e => ({
            name: "entry",
            value: e
          }))
        }]);
        addLog('Driver history write OK');
      } catch (err) {
        addLog(`Driver history write failed (non-critical): ${err.message}`);
      }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 6: Locations upsert (standplaats + depot)
    // ═══════════════════════════════════════════════════════
    const locations = [
      { referencenumber: "standplaats_kapelle", name: "Standplaats Kapelle", address: "Fleerbosseweg 19", city: "Kapelle", country: "NL" },
      { referencenumber: "postnl_depot", name: "PostNL Depot", address: "", city: "", country: "NL" }
    ];

    addLog('Step 6: Upserting locations...');
    try {
      await naitonCall([{
        name: "locationmanager_addupdatelocations",
        arguments: [{ name: "_locationsstr", value: JSON.stringify(locations) }]
      }]);
      addLog('Locations upsert OK');
    } catch (err) {
      addLog(`Locations upsert failed (non-critical): ${err.message}`);
    }

    // ═══════════════════════════════════════════════════════
    // STEP 7: Transport API import (1 bulk call)
    // ═══════════════════════════════════════════════════════
    const tripPayloads = [];
    for (const r of tripRecords) {
      if (!r.plate || !r.start_time) continue;
      const refId = `${r.gpsassetid}_${r.start_time}`;
      const startTime = r.start_time.includes('T') ? r.start_time.split('T')[1]?.slice(0, 5) : '';
      tripPayloads.push({
        refId,
        name: "GPS Import",
        licensePlate: r.plate,
        startDate: r.date,
        startTime,
        stops: [
          { startLocationRefId: "standplaats_kapelle", stopLocationRefId: "postnl_depot", sequenceId: 1 },
          { startLocationRefId: "postnl_depot", stopLocationRefId: "standplaats_kapelle", sequenceId: 2 },
        ],
      });
    }

    if (tripPayloads.length > 0) {
      addLog(`Step 7: Importing ${tripPayloads.length} trips to transport API...`);
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

    // ═══════════════════════════════════════════════════════
    // STEP 8: Save to TripRecord (dedup + batch)
    // ═══════════════════════════════════════════════════════
    addLog('Step 8: Saving TripRecords...');

    const existingRecords = await svc.entities.TripRecord.filter({
      date: { $gte: date_from, $lte: date_to }
    });
    const existingKeys = new Set(
      existingRecords.map(r => `${r.gpsassetid}_${r.date}_${r.start_time}`)
    );

    const toInsert = [];
    let skipped = 0;

    for (const r of tripRecords) {
      const key = `${r.gpsassetid}_${r.date}_${r.start_time}`;
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

    // ═══════════════════════════════════════════════════════
    // STEP 9: Match drivers → employees → TripRecordLink
    // ═══════════════════════════════════════════════════════
    let linked = 0;
    if (newRecordIds.length > 0) {
      addLog('Step 9: Matching drivers to employees...');
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
      segments: allSegments.length,
      rides: rides.length,
      created, skipped, linked,
      drivers_resolved: driversResolved,
      naiton_calls: {
        assets: 1, trips: 1, positions: 1,
        driverHistory: driverHistoryEntries.length > 0 ? 1 : 0,
        locations: 1,
        transport: tripPayloads.length > 0 ? 1 : 0
      },
      ms: Date.now() - t0,
      log,
    });

  } catch (error) {
    console.error('[NAITON] Error:', error);
    return Response.json({ error: error.message, log }, { status: 500 });
  }
});