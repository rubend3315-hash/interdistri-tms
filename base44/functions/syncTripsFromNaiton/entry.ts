// ╔══════════════════════════════════════════════════════════════════════╗
// ║ syncTripsFromNaiton v24 — Production GPS Buddy / Naiton integration ║
// ║ Auth: Admin-only                                                     ║
// ║ CHANGES vs v22:                                                      ║
// ║  - Driver mapping via dataexchange_users (tachocardnumber/tagid)     ║
// ║  - Trip segments matched via tachocardnumber/tagid/personid fields   ║
// ║  - personjson fallback removed (unreliable)                          ║
// ╚══════════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const BASE_URL = 'https://dawa-prod.naiton.com';
const INSERT_BATCH_SIZE = 50;
const MAX_DAYS = 31;
// Standplaats = Fleerbosseweg 19, 4421 RR Kapelle (GPS coords)
const STANDPLAATS_LAT = 51.4700;
const STANDPLAATS_LON = 3.9716;
const STANDPLAATS_RADIUS_M = 500; // 500m radius = standplaats
const SHORT_STOP_THRESHOLD_MIN = 5;  // >5 min telt als stilstand

// PostNL depot locaties in Goes
const DEPOT_LOCATIONS = [
  { name: 'PostNL Sorteercentrum Goes', lat: 51.4943, lon: 3.8778 },  // Verrijn Stuartweg 5
  { name: 'PostNL Pakketten Goes', lat: 51.4846, lon: 3.8898 },       // Columbusweg 62
];
const DEPOT_RADIUS_M = 300; // 300m radius = depot

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
    // STEP 1: Fetch assets + users (parallel)
    // ═══════════════════════════════════════════════════════
    addLog('Step 1: Fetching assets + users...');

    const [assetsJson, usersJson] = await Promise.all([
      naitonCall([{
        name: "dataexchange_assets",
        arguments: [{ name: "inactiveAttributes", value: true }]
      }]),
      naitonCall([{
        name: "dataexchange_users"
      }]),
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

    // 1b. User mapping: tachocardnumber/tagid/personid → fullname
    const naitonUsers = usersJson.dataexchange_users || [];
    const userByTacho = {};   // tachocardnumber → fullname
    const userByTag = {};     // tagid → fullname
    const userByPersonId = {}; // personid → fullname
    for (const u of naitonUsers) {
      const fullname = `${u.firstname || ''} ${u.lastname || ''}`.trim();
      if (!fullname) continue;
      if (u.tachocardnumber) userByTacho[String(u.tachocardnumber)] = fullname;
      if (u.tagid) userByTag[String(u.tagid)] = fullname;
      if (u.personid) userByPersonId[String(u.personid)] = fullname;
    }
    addLog(`Users loaded: ${naitonUsers.length} total, ${Object.keys(userByTacho).length} tacho, ${Object.keys(userByTag).length} tag, ${Object.keys(userByPersonId).length} personid`);

    // Debug: log user map sample
    const userMapSample = naitonUsers.slice(0, 5).map(u => ({
      name: `${u.firstname} ${u.lastname}`,
      tachocardnumber: u.tachocardnumber,
      tagid: u.tagid,
      personid: u.personid,
      isdriver: u.isdriver,
    }));
    console.log('[NAITON] userMap sample:', JSON.stringify(userMapSample));

    // 1c. Planning fallback: Trip entity → employee name by plate+date
    const planningDriverMap = {}; // gpsassetid → drivername
    try {
      const tripRecordsExisting = await svc.entities.Trip.filter({
        date: { $gte: date_from, $lte: date_to }
      });
      const employees = await svc.entities.Employee.filter({ status: 'Actief' });
      const empById = {};
      for (const emp of employees) {
        empById[emp.id] = `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim();
      }
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
        for (const [gid, info] of Object.entries(assetMap)) {
          if (info.plate && info.plate.replace(/[-\s]/g, '').toLowerCase() === normPlate) {
            if (!planningDriverMap[gid]) {
              planningDriverMap[gid] = empName;
              tripDriverMatches++;
            }
            break;
          }
        }
      }
      if (tripDriverMatches > 0) addLog(`Planning fallback drivers: ${tripDriverMatches}`);
    } catch (err) {
      addLog(`Planning driver lookup failed (non-critical): ${err.message.slice(0, 150)}`);
    }

    const gpsIds = Object.keys(assetMap);
    addLog(`${assets.length} assets, ${gpsIds.length} met gpsassetid`);

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
        { name: "includefields", value: ["driver"] },
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

    const getStopCoords = (seg) => {
      const lat = Number(seg.stoplat || seg.startlat || 0);
      const lon = Number(seg.stoplon || seg.startlon || 0);
      return { lat, lon };
    };

    const isStandplaats = (seg) => {
      const { lat, lon } = getStopCoords(seg);
      if (!lat || !lon) return false;
      return gpsDistanceM(lat, lon, STANDPLAATS_LAT, STANDPLAATS_LON) <= STANDPLAATS_RADIUS_M;
    };

    const isDepot = (seg) => {
      const { lat, lon } = getStopCoords(seg);
      if (!lat || !lon) return false;
      return DEPOT_LOCATIONS.some(d => gpsDistanceM(lat, lon, d.lat, d.lon) <= DEPOT_RADIUS_M);
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

    let standplaatsHits = 0;
    let totalStops = 0;

    for (const [assetId, segments] of Object.entries(segmentsByAsset)) {
      // State machine: 
      //   IDLE = at standplaats, waiting for departure (first drive segment away)
      //   RIDING = collecting segments until return to standplaats
      let state = 'IDLE';
      let currentRide = null;

      for (const seg of segments) {
        const type = (seg.type || '').toLowerCase();
        const segDate = (seg.start || seg.stop || '').split('T')[0];
        if (type === 'stop') totalStops++;
        const atStandplaats = type === 'stop' && isStandplaats(seg);
        if (atStandplaats) standplaatsHits++;

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

    // Filter rides:
    // 1. Only dates within the requested range
    // 2. Only COMPLETE rides (ended at standplaats) — skip open-ended rides
    const todayStr = new Date().toISOString().split('T')[0];
    let openRides = 0;
    const filteredRides = rides.filter(r => {
      if (r.date < date_from || r.date > date_to) return false;
      // Check if ride ended at standplaats (last segment is a stop at standplaats)
      const lastSeg = r.segments[r.segments.length - 1];
      const endedAtStandplaats = (lastSeg.type || '').toLowerCase() === 'stop' && isStandplaats(lastSeg);
      if (!endedAtStandplaats) {
        openRides++;
        return false; // Skip incomplete rides
      }
      return true;
    });
    addLog(`Standplaats detectie: ${standplaatsHits}/${totalStops} stops herkend als standplaats (radius ${STANDPLAATS_RADIUS_M}m)`);
    if (openRides > 0) addLog(`${openRides} onafgeronde ritten overgeslagen (niet terug bij standplaats)`);
    addLog(`${filteredRides.length} voltooide ritten van ${rides.length} totaal`);
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
      // startTime = start of first drive segment (departure from standplaats)
      const startTime = firstSeg.start;
      // endTime = ARRIVAL at standplaats = start of last stop segment (not its stop, which is when vehicle departs again)
      const lastSegType = (lastSeg.type || '').toLowerCase();
      const endTime = (lastSegType === 'stop' && isStandplaats(lastSeg))
        ? (lastSeg.start || lastSeg.stop || lastSeg.end)
        : (lastSeg.stop || lastSeg.end || lastSeg.start);

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

      // Stilstand: classificeer stops als depot of overige stilstand
      let longStopsMin = 0;  // stilstand >5 min buiten depot (en buiten standplaats)
      let longStopsCount = 0;
      let depotMin = 0;      // stilstand op PostNL depot
      let depotStopsCount = 0;
      for (let si = 0; si < segs.length; si++) {
        const s = segs[si];
        if ((s.type || '').toLowerCase() !== 'stop') continue;
        // Skip de laatste stop als dat de standplaats is (terugkomst)
        if (si === segs.length - 1 && isStandplaats(s)) continue;
        // Skip stops op de standplaats zelf (bijv. tussenstop thuis)
        if (isStandplaats(s)) continue;
        const sStart = new Date(s.start || s.stop);
        const sEnd = new Date(s.stop || s.end || s.start);
        const durMin = (sEnd - sStart) / 60000;
        if (isDepot(s)) {
          depotMin += Math.round(durMin);
          depotStopsCount++;
        } else if (durMin > SHORT_STOP_THRESHOLD_MIN) {
          longStopsMin += Math.round(durMin);
          longStopsCount++;
        }
      }

      // Driver resolution: additionaldata.Driver → tachocardnumber → tagid → personid → planning → null
      let driver = '';
      let driverSource = '';

      // Priority 0 (best source): additionaldata.Driver from Naiton includefields=["driver"]
      if (!driver) {
        for (const s of segs) {
          if (s.additionaldata) {
            const ad = typeof s.additionaldata === 'string' ? JSON.parse(s.additionaldata) : s.additionaldata;
            if (ad.Driver) { driver = ad.Driver; driverSource = 'additionaldata.Driver'; break; }
          }
        }
      }
      // Priority 1: tachocardnumber on trip segments
      if (!driver) {
        for (const s of segs) {
          if (s.tachocardnumber && userByTacho[String(s.tachocardnumber)]) {
            driver = userByTacho[String(s.tachocardnumber)];
            driverSource = 'tachocardnumber';
            break;
          }
        }
      }
      // Priority 2: tagid on trip segments
      if (!driver) {
        for (const s of segs) {
          if (s.tagid && userByTag[String(s.tagid)]) {
            driver = userByTag[String(s.tagid)];
            driverSource = 'tagid';
            break;
          }
        }
      }
      // Priority 3: personid on trip segments
      if (!driver) {
        for (const s of segs) {
          if (s.personid && userByPersonId[String(s.personid)]) {
            driver = userByPersonId[String(s.personid)];
            driverSource = 'personid';
            break;
          }
        }
      }
      // Priority 4: additionaldata may contain tachocardnumber or tagid
      if (!driver) {
        for (const s of segs) {
          if (s.additionaldata) {
            try {
              const ad = typeof s.additionaldata === 'string' ? JSON.parse(s.additionaldata) : s.additionaldata;
              if (ad.tachocardnumber && userByTacho[String(ad.tachocardnumber)]) {
                driver = userByTacho[String(ad.tachocardnumber)];
                driverSource = 'additionaldata.tachocardnumber';
                break;
              }
              if (ad.tagid && userByTag[String(ad.tagid)]) {
                driver = userByTag[String(ad.tagid)];
                driverSource = 'additionaldata.tagid';
                break;
              }
            } catch { /* ignore */ }
          }
        }
      }
      // Priority 5: direct driver field on segment
      if (!driver) {
        for (const s of segs) {
          if (s.driver) { driver = s.driver; driverSource = 'segment.driver'; break; }
        }
      }
      // Priority 6: planning fallback (Trip entity match)
      if (!driver) {
        driver = planningDriverMap[ride.gpsassetid] || '';
        if (driver) driverSource = 'planning fallback';
      }

      tripRecords.push({
        gpsassetid: ride.gpsassetid,
        driver: driver || null,
        driver_source: driverSource || null,
        vehicle: assetMap[ride.gpsassetid]?.vehicle || '',
        plate: assetMap[ride.gpsassetid]?.plate || '',
        start_time: startTime,
        end_time: endTime,
        start_km: startKm > 0 ? startKm : null,
        end_km: endKm > 0 ? endKm : null,
        total_km: totalKm,
        total_hours: totalHours,
        depot_time_minutes: depotMin > 0 ? depotMin : null,
        depot_stops_count: depotStopsCount > 0 ? depotStopsCount : null,
        long_stops_minutes: longStopsMin > 0 ? longStopsMin : null,
        long_stops_count: longStopsCount > 0 ? longStopsCount : null,
        date: ride.date,
      });
    }

    // Filter out non-trips:
    // 1. No plate AND no km data = GPS tag on standplaats, not a vehicle trip
    // 2. Duration < 5 minutes = micro-movement on terrain, not a real trip
    // 3. > 2 hours with < 10 km = parked vehicle with GPS noise
    // 4. Very low avg speed (< 2 km/h) over > 1 hour = not really driving
    const MIN_TRIP_MINUTES = 5;
    const MIN_KM_FOR_LONG_RIDE = 10;
    const MIN_HOURS_THRESHOLD = 2;
    const MIN_AVG_SPEED = 2; // km/h
    let ghostFiltered = 0;
    const ghostReasons = {};
    const realTripRecords = tripRecords.filter(r => {
      const km = r.total_km || 0;
      const hours = r.total_hours || 0;
      const minutes = hours * 60;
      const reason = (msg) => { ghostFiltered++; ghostReasons[msg] = (ghostReasons[msg] || 0) + 1; return false; };

      // No plate AND no km = GPS tag, not a real vehicle
      if (!r.plate && !km) return reason('geen kenteken + geen km');
      // Micro-trips < 5 min = terrain movement
      if (minutes < MIN_TRIP_MINUTES) return reason('< 5 min');
      // Long rides with very low km = parked vehicle
      if (hours > MIN_HOURS_THRESHOLD && km < MIN_KM_FOR_LONG_RIDE) return reason('> 2u met < 10 km');
      // Very low average speed = not really driving
      if (hours > 1 && km > 0 && km / hours < MIN_AVG_SPEED) return reason('gem. snelheid < 2 km/u');
      return true;
    });
    if (ghostFiltered > 0) {
      const reasonStr = Object.entries(ghostReasons).map(([k, v]) => `${v}x ${k}`).join(', ');
      addLog(`${ghostFiltered} spookritten gefilterd: ${reasonStr}`);
    }

    const driversResolved = realTripRecords.filter(r => r.driver).length;
    // Log driver source summary
    const sourceCounts = {};
    for (const r of realTripRecords) {
      const src = r.driver_source || 'geen';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    }
    const sourceStr = Object.entries(sourceCounts).map(([k, v]) => `${v}x ${k}`).join(', ');
    addLog(`${realTripRecords.length} echte trip records (van ${tripRecords.length}), ${driversResolved} met driver`);
    addLog(`Driver bronnen: ${sourceStr}`);

    // ═══════════════════════════════════════════════════════
    // STEP 5: Save to TripRecord (dedup + batch)
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

    for (const r of realTripRecords) {
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
    // STEP 6: Match drivers → employees → TripRecordLink
    // ═══════════════════════════════════════════════════════
    let linked = 0;
    if (newRecordIds.length > 0) {
      addLog('Step 6: Matching drivers to employees...');
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
      naiton_calls: { assets: 1, users: 1, trips: 1 },
      ms: Date.now() - t0,
      log,
    });

  } catch (error) {
    console.error('[NAITON] Error:', error);
    return Response.json({ error: error.message, log }, { status: 500 });
  }
});