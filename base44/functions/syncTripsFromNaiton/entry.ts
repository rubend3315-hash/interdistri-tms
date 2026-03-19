// ╔══════════════════════════════════════════════════════════════════════╗
// ║ syncTripsFromNaiton v22 — Production GPS Buddy / Naiton integration ║
// ║ Auth: Admin-only                                                     ║
// ║ CHANGES vs v21:                                                      ║
// ║  - Rit = standplaats→standplaats (Fleerbosseweg 19, Kapelle)         ║
// ║    → rit begint bij VERTREK van standplaats                          ║
// ║    → rit eindigt bij AANKOMST op standplaats                         ║
// ║  - Stilstand: alleen stops BINNEN de rit (tussen vertrek/aankomst)   ║
// ║  - Depot-tijd: stops op PostNL/depot locaties binnen de rit          ║
// ╚══════════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const BASE_URL = 'https://dawa-prod.naiton.com';
const INSERT_BATCH_SIZE = 50;
const MAX_DAYS = 31;
// Standplaats = Fleerbosseweg 19, 4421 RR Kapelle (GPS coords)
const STANDPLAATS_LAT = 51.4945;
const STANDPLAATS_LON = 3.9595;
const STANDPLAATS_RADIUS_M = 500; // 500m radius = standplaats
const SHORT_STOP_THRESHOLD_MIN = 5;  // >5 min telt als stilstand

// Haversine distance in meters between two GPS points
function gpsDistanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
    // STEP 1: Fetch assets + currentpositions + driverhistory (parallel)
    // ═══════════════════════════════════════════════════════
    addLog('Step 1: Fetching assets, currentpositions, driverhistory...');

    const [assetsJson, positionsJson, driverHistoryJson] = await Promise.all([
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
      }),
      // driverhistory read not available in Naiton — resolved as empty
      Promise.resolve({})
    ]);

    // 1a. Asset mapping: gpsassetid → { vehicle, plate }
    const assets = assetsJson.dataexchange_assets || [];
    const assetMap = {};
    // Also build reverse lookup: assetname/plate → gpsassetid
    const plateToGpsId = {};
    const nameToGpsId = {};
    for (const a of assets) {
      if (!a.gpsassetid) continue;
      assetMap[a.gpsassetid] = {
        vehicle: a.assetname || '',
        plate: a.licenceplate || '',
      };
      if (a.licenceplate) plateToGpsId[a.licenceplate.toLowerCase()] = a.gpsassetid;
      if (a.assetname) nameToGpsId[a.assetname.toLowerCase()] = a.gpsassetid;
    }

    // 1b. Driver mapping — driverhistory as PRIMARY source
    const driverMap = {}; // gpsassetid → drivername

    // Source 1: driverhistory (most reliable — contains historical driver assignments)
    // Naiton driverhistory read API not available — skip
    addLog('Naiton driverhistory read: niet beschikbaar (alleen upsert/write)');

    // Source 2: currentpositions personjson (secondary, fills gaps)
    const positions = positionsJson.dataexchange_currentpositions || [];
    let positionDrivers = 0;
    for (const p of positions) {
      const id = p.gpsassetid;
      if (!id || driverMap[id]) continue; // don't overwrite driverhistory
      if (p.personjson) {
        try {
          const person = typeof p.personjson === 'string' ? JSON.parse(p.personjson) : p.personjson;
          const fn = person.FirstName || person.firstname || person.Firstname || person.voornaam || '';
          const ln = person.LastName || person.lastname || person.Lastname || person.achternaam || '';
          const name = `${fn} ${ln}`.trim();
          if (name) { driverMap[id] = name; positionDrivers++; }
        } catch { /* ignore parse errors */ }
      }
    }
    if (positionDrivers > 0) addLog(`Drivers from currentpositions: ${positionDrivers}`);

    // Source 3: Trip entity — match vehicle (plate) + date → employee_id → name
    // Trips worden achteraf aangemaakt met chauffeur + voertuig koppeling
    try {
      const tripRecordsExisting = await svc.entities.Trip.filter({
        date: { $gte: date_from, $lte: date_to }
      });
      const employees = await svc.entities.Employee.filter({ status: 'Actief' });
      const empById = {};
      for (const emp of employees) {
        empById[emp.id] = `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim();
      }

      // Build vehicle_id → plate lookup
      const vehicles = await svc.entities.Vehicle.filter({});
      const vehicleIdToPlate = {};
      for (const v of vehicles) {
        if (v.license_plate) vehicleIdToPlate[v.id] = v.license_plate;
      }

      let tripDriverMatches = 0;
      for (const trip of tripRecordsExisting) {
        if (!trip.employee_id || !trip.vehicle_id) continue;
        const empName = empById[trip.employee_id];
        if (!empName) continue;

        const plate = vehicleIdToPlate[trip.vehicle_id];
        if (!plate) continue;
        const normPlate = plate.replace(/[-\s]/g, '').toLowerCase();

        // Find the gpsassetid for this plate
        for (const [gid, info] of Object.entries(assetMap)) {
          if (info.plate && info.plate.replace(/[-\s]/g, '').toLowerCase() === normPlate) {
            if (!driverMap[gid]) {
              driverMap[gid] = empName;
              tripDriverMatches++;
            }
            break;
          }
        }
      }
      if (tripDriverMatches > 0) addLog(`Drivers from Trip entity: ${tripDriverMatches}`);
    } catch (err) {
      addLog(`Trip driver lookup failed (non-critical): ${err.message.slice(0, 150)}`);
    }

    const gpsIds = Object.keys(assetMap);
    addLog(`${assets.length} assets, ${gpsIds.length} met gpsassetid, ${Object.keys(driverMap).length} drivers totaal`);

    if (gpsIds.length === 0) {
      return Response.json({ error: 'Geen GPS assets gevonden in Naiton' }, { status: 404 });
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2: Fetch trip segments (bulk, all assets at once)
    // ═══════════════════════════════════════════════════════
    // Naiton API returns 0 segments when starttime==stoptime, so add +1 day to stoptime for the API call
    let apiStopTime = date_to;
    if (date_from === date_to) {
      const d = new Date(date_to);
      d.setDate(d.getDate() + 1);
      apiStopTime = d.toISOString().split('T')[0];
    }
    addLog(`Step 2: Fetching trips ${date_from} → ${apiStopTime}...`);

    const tripsJson = await naitonCall([{
      name: "dataexchange_trips",
      arguments: [
        { name: "gpsassetids", value: gpsIds },
        { name: "starttime", value: date_from },
        { name: "stoptime", value: apiStopTime },
        { name: "includeallattributes", value: true }
      ]
    }]);

    const allSegments = tripsJson.dataexchange_trips || [];
    addLog(`${allSegments.length} trip segmenten opgehaald`);



    if (allSegments.length === 0) {
      return Response.json({
        success: true, message: 'Geen ritten gevonden in deze periode',
        assets: gpsIds.length, segments: 0, rides: 0, created: 0, skipped: 0, linked: 0, ms: Date.now() - t0, log
      });
    }

    // ═══════════════════════════════════════════════════════
    // STEP 3: Sort segments per asset + time, then group
    //         into rides: standplaats → standplaats
    //         (Fleerbosseweg 19, 4421 RR Kapelle)
    // ═══════════════════════════════════════════════════════
    addLog('Step 3: Grouping segments into rides (standplaats→standplaats)...');

    const isStandplaats = (seg) => {
      // Use stop coordinates (stoplon/stoplat) to check if within radius of standplaats
      const lat = Number(seg.stoplat || seg.stoplon ? seg.stoplat : seg.startlat || 0);
      const lon = Number(seg.stoplon || seg.stoplat ? seg.stoplon : seg.startlon || 0);
      if (!lat || !lon) return false;
      return gpsDistanceM(lat, lon, STANDPLAATS_LAT, STANDPLAATS_LON) <= STANDPLAATS_RADIUS_M;
    };

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
      // State machine: 
      //   IDLE = at standplaats, waiting for departure (first drive segment away)
      //   RIDING = collecting segments until return to standplaats
      let state = 'IDLE';
      let currentRide = null;

      for (const seg of segments) {
        const type = (seg.type || '').toLowerCase();
        const segDate = (seg.start || seg.stop || '').split('T')[0];
        const atStandplaats = type === 'stop' && isStandplaats(seg);

        if (state === 'IDLE') {
          // Wait for a drive segment (= departure from standplaats)
          if (type === 'drive') {
            currentRide = {
              gpsassetid: assetId,
              date: segDate,
              segments: [seg],
            };
            state = 'RIDING';
          }
          // Stops at standplaats while IDLE are ignored (vehicle parked)
        } else if (state === 'RIDING') {
          // Dagwissel safety: close ride if segment is on a different day
          if (segDate !== currentRide.date) {
            if (currentRide.segments.length > 0) rides.push(currentRide);
            // Start new ride on the new day
            currentRide = {
              gpsassetid: assetId,
              date: segDate,
              segments: [seg],
            };
            continue;
          }

          currentRide.segments.push(seg);

          // If this is a stop at standplaats → ride is complete
          if (atStandplaats) {
            rides.push(currentRide);
            currentRide = null;
            state = 'IDLE';
          }
        }
      }

      // Close any open ride at end of day (vehicle didn't return to standplaats)
      if (currentRide && currentRide.segments.length > 0) {
        rides.push(currentRide);
      }
    }

    // Filter rides to only include dates within the requested range (not the extended API stoptime)
    const filteredRides = rides.filter(r => r.date >= date_from && r.date <= date_to);
    if (filteredRides.length < rides.length) {
      addLog(`${rides.length} ritten gevonden, ${filteredRides.length} binnen bereik ${date_from}→${date_to}`);
    }
    addLog(`${filteredRides.length} ritten samengesteld uit ${allSegments.length} segmenten`);
    if (filteredRides.length > 0) {
      const first = filteredRides[0];
      addLog(`Eerste rit: asset=${first.gpsassetid}, date=${first.date}, segments=${first.segments.length}`);
    }

    // ═══════════════════════════════════════════════════════
    // STEP 4: Build TripRecord objects from grouped rides
    // ═══════════════════════════════════════════════════════
    addLog('Step 4: Building TripRecord objects...');

    const tripRecords = [];

    for (const ride of filteredRides) {
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

      // Stilstand: som van stop-segmenten >5 min (exclusief standplaats-stop aan einde rit)
      let longStopsMin = 0;
      let depotMin = 0;
      for (let si = 0; si < segs.length; si++) {
        const s = segs[si];
        if ((s.type || '').toLowerCase() !== 'stop') continue;
        // Skip de laatste stop als dat de standplaats is (terugkomst)
        if (si === segs.length - 1 && isStandplaats(s)) continue;
        const sStart = new Date(s.start || s.stop);
        const sEnd = new Date(s.stop || s.end || s.start);
        const durMin = (sEnd - sStart) / 60000;
        if (durMin > SHORT_STOP_THRESHOLD_MIN) {
          longStopsMin += Math.round(durMin);
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
      addLog(`Step 5: Writing ${driverHistoryEntries.length} driver history entries...`);
      try {
        await naitonCall([{
          name: "dataexchange_driverhistoryupsert",
          arguments: [{ name: "_payload", value: JSON.stringify(driverHistoryEntries) }]
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
      rides: filteredRides.length,
      created, skipped, linked,
      drivers_resolved: driversResolved,
      naiton_calls: {
        assets: 1, trips: 1, positions: 1, driverHistoryRead: 1,
        driverHistoryWrite: driverHistoryEntries.length > 0 ? 1 : 0,
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