// ╔══════════════════════════════════════════════════════════════════════╗
// ║ syncTripsFromNaiton v25 — Production GPS Buddy / Naiton integration ║
// ║ Auth: Admin-only                                                     ║
// ║ CHANGES vs v24:                                                      ║
// ║  - Stilstand-samenvoeging: opeenvolgende stops <200m worden          ║
// ║    samengevoegd tot één logische stop (compenseert ontbrekend         ║
// ║    ignition-signaal in API)                                          ║
// ╚══════════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BASE_URL = 'https://dawa-prod.naiton.com';
const INSERT_BATCH_SIZE = 50;
const MAX_DAYS = 31;
const SHORT_STOP_THRESHOLD_MIN = 5;  // >5 min telt als stilstand

// Fallback hardcoded waarden (gebruikt als GpsLocation entity leeg is)
const FALLBACK_STANDPLAATS = [{ name: 'Fleerbosseweg 19 Kapelle', lat: 51.4700, lon: 3.9716, radius_m: 500 }];
const FALLBACK_DEPOTS = [
  { name: 'PostNL Sorteercentrum Goes', lat: 51.4943, lon: 3.8778, radius_m: 300 },
  { name: 'PostNL Pakketten Goes', lat: 51.4846, lon: 3.8898, radius_m: 300 },
];

// Convert UTC ISO timestamp to CET/CEST date string (yyyy-MM-dd)
// Naiton API returns UTC timestamps, but drivers work in Europe/Amsterdam timezone
function utcToCetDate(isoStr) {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    // Intl.DateTimeFormat with Europe/Amsterdam gives us the correct local date
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    return parts; // en-CA gives yyyy-MM-dd format
  } catch {
    return isoStr.split('T')[0]; // fallback to UTC date
  }
}

// Convert UTC ISO timestamp to CET/CEST hour (0-23)
function utcToCetHour(isoStr) {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hour12: false }).format(d));
    return h;
  } catch { return null; }
}

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
    // STEP 0: Load GPS locations from database
    // ═══════════════════════════════════════════════════════
    const gpsLocations = await svc.entities.GpsLocation.filter({ is_active: true });
    const dbStandplaatsen = gpsLocations.filter(l => l.type === 'standplaats');
    const dbDepots = gpsLocations.filter(l => l.type === 'depot');
    const STANDPLAATS_LOCATIONS = dbStandplaatsen.length > 0 ? dbStandplaatsen : FALLBACK_STANDPLAATS;
    const DEPOT_LOCATIONS = dbDepots.length > 0 ? dbDepots : FALLBACK_DEPOTS;
    addLog(`Locaties: ${STANDPLAATS_LOCATIONS.length} standplaats(en), ${DEPOT_LOCATIONS.length} depot(s)${dbStandplaatsen.length === 0 ? ' (fallback)' : ''}`);

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

    // 1b. User mapping: tachocardnumber/tagid/personid → fullname + employeenumber
    const naitonUsers = usersJson.dataexchange_users || [];
    const userByTacho = {};   // tachocardnumber → { name, employeenumber }
    const userByTag = {};     // tagid → { name, employeenumber }
    const userByPersonId = {}; // personid → { name, employeenumber }
    const userByName = {};    // normalized fullname → { name, employeenumber }
    const normDriverName = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    for (const u of naitonUsers) {
      const fullname = `${u.firstname || ''} ${u.lastname || ''}`.trim();
      if (!fullname) continue;
      // Naiton API uses "staffnumber" for personeelsnummer (not "employeenumber")
      const empNr = u.staffnumber || u.employeenumber;
      const info = { name: fullname, employeenumber: empNr ? String(empNr) : null };
      if (u.tachocardnumber) userByTacho[String(u.tachocardnumber)] = info;
      if (u.tagid) userByTag[String(u.tagid)] = info;
      if (u.personid) userByPersonId[String(u.personid)] = info;
      // Index by normalized name for reverse lookup when only driver name is known
      const normKey = normDriverName(fullname);
      if (normKey && !userByName[normKey]) userByName[normKey] = info;
    }
    addLog(`Users loaded: ${naitonUsers.length} total, ${Object.keys(userByTacho).length} tacho, ${Object.keys(userByTag).length} tag, ${Object.keys(userByPersonId).length} personid, ${Object.keys(userByName).length} naam-index`);

    // Debug: log user map sample + check employeenumber field availability
    const usersWithEmpNr = naitonUsers.filter(u => u.staffnumber || u.employeenumber);
    addLog(`Users met employeenumber: ${usersWithEmpNr.length}/${naitonUsers.length}`);
    // Log all field names from first user to diagnose missing employeenumber
    if (naitonUsers.length > 0) {
      const sampleFields = Object.keys(naitonUsers[0]);
      console.log('[NAITON] User fields:', JSON.stringify(sampleFields));
      // Check for alternative field names for employee number
      const altFields = sampleFields.filter(f => /employ|person|nummer|number|staff|pers/i.test(f));
      if (altFields.length > 0) addLog(`Mogelijke personeelsnummer-velden: ${altFields.join(', ')}`);
    }
    // Log Kim specifically if present
    const kimUser = naitonUsers.find(u => /broekhoven/i.test(`${u.firstname} ${u.lastname}`));
    if (kimUser) {
      console.log('[NAITON] Kim van Broekhoven user data:', JSON.stringify(kimUser));
    }
    const userMapSample = naitonUsers.slice(0, 5).map(u => ({
      name: `${u.firstname} ${u.lastname}`,
      employeenumber: u.employeenumber,
      tachocardnumber: u.tachocardnumber,
      tagid: u.tagid,
      personid: u.personid,
      isdriver: u.isdriver,
    }));
    console.log('[NAITON] userMap sample:', JSON.stringify(userMapSample));

    // 1c. TimeEntry cross-check: fetch submitted entries for the period
    // Used to validate driver assignment — if a driver submitted a shift on this vehicle+date,
    // that's a strong signal they were the actual driver (overrides GPS late-login artifacts)
    const timeEntryDriverMap = {}; // "gpsassetid_date" → { employee_name, employee_id }
    try {
      const timeEntries = await svc.entities.TimeEntry.filter({
        date: { $gte: date_from, $lte: date_to },
        status: { $in: ['Ingediend', 'Goedgekeurd'] },
      });
      // Get trips linked to these time entries to find vehicle
      const teIds = timeEntries.map(te => te.id).filter(Boolean);
      let linkedTrips = [];
      for (let i = 0; i < teIds.length; i += 50) {
        const batch = teIds.slice(i, i + 50);
        const trips = await svc.entities.Trip.filter({ time_entry_id: { $in: batch } });
        linkedTrips.push(...trips);
      }
      const employees = await svc.entities.Employee.filter({ status: 'Actief' });
      const empByIdLocal = {};
      for (const emp of employees) {
        empByIdLocal[emp.id] = `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim();
      }
      const vehiclesLocal = await svc.entities.Vehicle.filter({});
      const vehIdToPlateLocal = {};
      for (const v of vehiclesLocal) { if (v.license_plate) vehIdToPlateLocal[v.id] = v.license_plate; }

      for (const trip of linkedTrips) {
        if (!trip.employee_id || !trip.vehicle_id || !trip.date) continue;
        const plate = vehIdToPlateLocal[trip.vehicle_id];
        if (!plate) continue;
        const normPlate = plate.replace(/[-\s]/g, '').toLowerCase();
        for (const [gid, info] of Object.entries(assetMap)) {
          if (info.plate && info.plate.replace(/[-\s]/g, '').toLowerCase() === normPlate) {
            const key = `${gid}_${trip.date}`;
            timeEntryDriverMap[key] = {
              employee_name: empByIdLocal[trip.employee_id] || '',
              employee_id: trip.employee_id,
            };
            break;
          }
        }
      }
      if (Object.keys(timeEntryDriverMap).length > 0) {
        addLog(`TimeEntry cross-check: ${Object.keys(timeEntryDriverMap).length} voertuig+dag combinaties met ingediende dienst`);
      }
    } catch (err) {
      addLog(`TimeEntry cross-check failed (non-critical): ${err.message.slice(0, 150)}`);
    }

    // 1d. Planning fallback: Trip entity → employee name by plate+date
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

    // 1c. Vehicle home bases: fetch vehicles with home_base_lat/lon for alternative standplaats detection
    const allVehicles = await svc.entities.Vehicle.filter({});
    const homeBaseByGpsAssetId = {}; // gpsassetid → { lat, lon, radius }
    for (const v of allVehicles) {
      if (!v.home_base_lat || !v.home_base_lon || !v.license_plate) continue;
      const normPlate = v.license_plate.replace(/[-\s]/g, '').toLowerCase();
      for (const [gid, info] of Object.entries(assetMap)) {
        if (info.plate && info.plate.replace(/[-\s]/g, '').toLowerCase() === normPlate) {
          homeBaseByGpsAssetId[gid] = {
            lat: v.home_base_lat,
            lon: v.home_base_lon,
            radius: v.home_base_radius_m || 500,
          };
          break;
        }
      }
    }
    const homeBaseCount = Object.keys(homeBaseByGpsAssetId).length;
    if (homeBaseCount > 0) addLog(`${homeBaseCount} voertuigen met thuisbasis-locatie`);

    const gpsIds = Object.keys(assetMap);
    addLog(`${assets.length} assets, ${gpsIds.length} met gpsassetid`);

    if (gpsIds.length === 0) {
      return Response.json({ error: 'Geen GPS assets gevonden in Naiton' }, { status: 404 });
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2: Fetch trip segments (bulk, all assets at once)
    // ═══════════════════════════════════════════════════════
    // Naiton API stoptime is exclusive — always add +1 day to include the last day's data
    const apiStopDate = new Date(date_to);
    apiStopDate.setDate(apiStopDate.getDate() + 1);
    const apiStopTime = apiStopDate.toISOString().split('T')[0];
    // For overnight rides: fetch from 1 day BEFORE date_from so rides that started
    // the previous evening (e.g. 23:30) are included in the segment data
    const apiStartDate = new Date(date_from);
    apiStartDate.setDate(apiStartDate.getDate() - 1);
    const apiStartTime = apiStartDate.toISOString().split('T')[0];
    addLog(`Step 2: Fetching trips ${apiStartTime} → ${apiStopTime} (incl. overnight buffer)...`);

    const tripsJson = await naitonCall([{
      name: "dataexchange_trips",
      arguments: [
        { name: "gpsassetids", value: gpsIds },
        { name: "includefields", value: ["driver"] },
        { name: "starttime", value: apiStartTime },
        { name: "stoptime", value: apiStopTime },
        { name: "includeallattributes", value: true }
      ]
    }]);

    const rawSegments = tripsJson.dataexchange_trips || [];
    addLog(`${rawSegments.length} trip segmenten opgehaald`);

    if (rawSegments.length === 0) {
      return Response.json({
        success: true, message: 'Geen ritten gevonden in deze periode',
        assets: gpsIds.length, segments: 0, rides: 0, created: 0, skipped: 0, linked: 0, ms: Date.now() - t0, log
      });
    }

    // Sort segments by asset, then by time
    rawSegments.sort((a, b) => {
      const aId = String(a.gpsassetid || '');
      const bId = String(b.gpsassetid || '');
      if (aId !== bId) return aId < bId ? -1 : 1;
      return new Date(a.start || a.stop || 0) - new Date(b.start || b.stop || 0);
    });

    const allSegments = rawSegments;

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

    const isStandplaats = (seg, assetId) => {
      const { lat, lon } = getStopCoords(seg);
      if (!lat || !lon) return false;
      // Check configured standplaats locations
      if (STANDPLAATS_LOCATIONS.some(s => gpsDistanceM(lat, lon, s.lat, s.lon) <= (s.radius_m || 500))) return true;
      // Check vehicle-specific home base
      const hb = assetId ? homeBaseByGpsAssetId[assetId] : null;
      if (hb && gpsDistanceM(lat, lon, hb.lat, hb.lon) <= hb.radius) return true;
      return false;
    };

    const isDepot = (seg) => {
      const { lat, lon } = getStopCoords(seg);
      if (!lat || !lon) return false;
      return DEPOT_LOCATIONS.some(d => gpsDistanceM(lat, lon, d.lat, d.lon) <= (d.radius_m || 300));
    };

    // Already sorted in Step 2b — group per asset
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
        const segDate = utcToCetDate(seg.start || seg.stop) || (seg.start || seg.stop || '').split('T')[0];
        if (type === 'stop') totalStops++;
        const atStandplaats = type === 'stop' && isStandplaats(seg, assetId);
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
          // Cross-midnight handling: allow ride to span into the next calendar day
          // Only force-close if >1 day gap (data anomaly), NOT for normal overnight rides
          if (segDate !== currentRide.date) {
            const rideStart = new Date(currentRide.date);
            const segStart = new Date(segDate);
            const dayDiff = Math.round((segStart - rideStart) / 86400000);
            if (dayDiff > 1) {
              // >1 day gap = data anomaly, close the ride
              if (currentRide.segments.length > 0) rides.push(currentRide);
              currentRide = { gpsassetid: assetId, date: segDate, segments: [seg] };
              if (type === 'drive') { state = 'RIDING'; } else if (atStandplaats) { state = 'IDLE'; currentRide = null; }
              else { state = 'RIDING'; }
              continue;
            }
            // Normal overnight: keep building the same ride, date stays as departure date
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

    // Nachtrit datum-correctie: gebruik de CET-datum van het vertrek.
    // Ritten die VOLLEDIG in de vroege ochtend plaatsvinden (start vóór 06:00 CET)
    // worden toegekend aan de VORIGE kalenderdag (= de dienstdatum van de nachtdienst).
    // Ritten die starten vóór middernacht CET en doorlopen worden op de startdatum gehouden.
    const NIGHT_CUTOFF_HOUR = 6; // Ritten die starten voor 06:00 CET behoren bij de vorige dag
    for (const r of rides) {
      const firstSeg = r.segments[0];
      const startTimestamp = firstSeg.start || firstSeg.stop;
      if (!startTimestamp) continue;
      const cetDate = utcToCetDate(startTimestamp);
      const cetHour = utcToCetHour(startTimestamp);
      if (cetDate) {
        r.date = cetDate; // Use CET date instead of UTC date
      }
      // If ride starts before 06:00 CET, it belongs to the previous day's shift
      if (cetHour !== null && cetHour < NIGHT_CUTOFF_HOUR) {
        const prevDay = new Date(r.date);
        prevDay.setDate(prevDay.getDate() - 1);
        r.date = prevDay.toISOString().split('T')[0];
      }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 3b: Merge same-day rides for home_base vehicles
    // ═══════════════════════════════════════════════════════
    // Vehicles with a home_base (depot as standplaats) typically generate:
    //   ride 1: home → depot (commute)
    //   ride 2: depot → route → depot (work)
    //   ride 3: depot → home (commute back)
    // We merge ride 1 + ride 2 into a single work ride (home→depot→route→depot)
    // so that loading/unloading time at depot is included.
    // Ride 3 (depot→home) stays separate or gets merged if there's more work after.
    // Strategy: merge all rides EXCEPT the last one (which is usually the return commute).
    // If there's only 1 ride, keep it as-is.
    const mergedRides = [];
    const ridesByAssetDate = {};
    for (const ride of rides) {
      const hasHomeBase = !!homeBaseByGpsAssetId[ride.gpsassetid];
      if (!hasHomeBase) {
        mergedRides.push(ride);
        continue;
      }
      const key = `${ride.gpsassetid}_${ride.date}`;
      if (!ridesByAssetDate[key]) ridesByAssetDate[key] = [];
      ridesByAssetDate[key].push(ride);
    }
    let mergeCount = 0;
    for (const [key, dayRides] of Object.entries(ridesByAssetDate)) {
      if (dayRides.length <= 1) {
        mergedRides.push(...dayRides);
        continue;
      }
      // Sort by first segment start time
      dayRides.sort((a, b) => new Date(a.segments[0].start || 0) - new Date(b.segments[0].start || 0));

      if (dayRides.length === 2) {
        // 2 rides: merge both (home→depot + depot→route→depot = one work ride)
        const merged = {
          gpsassetid: dayRides[0].gpsassetid,
          date: dayRides[0].date,
          segments: dayRides.flatMap(r => r.segments),
        };
        mergedRides.push(merged);
        mergeCount += 1;
      } else {
        // 3+ rides: merge all except the last one (return commute)
        const workRides = dayRides.slice(0, -1);
        const returnRide = dayRides[dayRides.length - 1];
        const merged = {
          gpsassetid: workRides[0].gpsassetid,
          date: workRides[0].date,
          segments: workRides.flatMap(r => r.segments),
        };
        mergedRides.push(merged);
        mergedRides.push(returnRide);
        mergeCount += workRides.length - 1;
      }
    }
    if (mergeCount > 0) addLog(`${mergeCount} ritten samengevoegd (home_base voertuigen, aanrij+werkrit → 1)`);

    // Filter rides:
    // 1. Only dates within the requested range
    // 2. Only COMPLETE rides (ended at standplaats) — skip open-ended rides
    const todayStr = new Date().toISOString().split('T')[0];
    let openRides = 0;
    const filteredRides = mergedRides.filter(r => {
      if (r.date < date_from || r.date > date_to) return false;
      // Check if ride ended at standplaats (last segment is a stop at standplaats)
      const lastSeg = r.segments[r.segments.length - 1];
      const endedAtStandplaats = (lastSeg.type || '').toLowerCase() === 'stop' && isStandplaats(lastSeg, r.gpsassetid);
      if (!endedAtStandplaats) {
        openRides++;
        return false; // Skip incomplete rides
      }
      return true;
    });
    addLog(`Standplaats detectie: ${standplaatsHits}/${totalStops} stops herkend als standplaats`);
    if (openRides > 0) addLog(`${openRides} onafgeronde ritten overgeslagen (niet terug bij standplaats)`);
    addLog(`${filteredRides.length} voltooide ritten van ${mergedRides.length} totaal`);
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
      const endTime = (lastSegType === 'stop' && isStandplaats(lastSeg, ride.gpsassetid))
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
        if (si === segs.length - 1 && isStandplaats(s, ride.gpsassetid)) continue;
        // Skip stops op de standplaats zelf (bijv. tussenstop thuis)
        if (isStandplaats(s, ride.gpsassetid)) continue;
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

      // Driver resolution: find driver name + employeenumber from segments
      // Strategy: when multiple drivers appear in the same ride (late login),
      // pick the LAST logged-in driver (= the one who actually drove the route).
      // The first driver is typically still logged in from a previous shift.
      let driver = '';
      let driverSource = '';
      let driverEmployeeNumber = null;

      // Collect ALL driver candidates from segments with their km contribution
      const driverCandidates = []; // { name, source, employeenumber, km, segIndex }
      for (let si = 0; si < segs.length; si++) {
        const s = segs[si];
        let segDriver = null;
        let segSource = '';
        let segEmpNr = null;

        // Try additionaldata.Driver first (best name source)
        if (s.additionaldata) {
          try {
            const ad = typeof s.additionaldata === 'string' ? JSON.parse(s.additionaldata) : s.additionaldata;
            if (ad.Driver) { segDriver = ad.Driver; segSource = 'additionaldata.Driver'; }
            if (!segEmpNr && ad.tachocardnumber && userByTacho[String(ad.tachocardnumber)]?.employeenumber) {
              segEmpNr = userByTacho[String(ad.tachocardnumber)].employeenumber;
            }
            if (!segEmpNr && ad.tagid && userByTag[String(ad.tagid)]?.employeenumber) {
              segEmpNr = userByTag[String(ad.tagid)].employeenumber;
            }
          } catch { /* ignore */ }
        }
        // Fallback: tachocardnumber → user name
        if (!segDriver && s.tachocardnumber && userByTacho[String(s.tachocardnumber)]) {
          const info = userByTacho[String(s.tachocardnumber)];
          segDriver = info.name; segSource = 'tachocardnumber'; segEmpNr = info.employeenumber;
        }
        // Fallback: tagid → user name
        if (!segDriver && s.tagid && userByTag[String(s.tagid)]) {
          const info = userByTag[String(s.tagid)];
          segDriver = info.name; segSource = 'tagid'; segEmpNr = info.employeenumber;
        }
        // Fallback: personid → user name
        if (!segDriver && s.personid && userByPersonId[String(s.personid)]) {
          const info = userByPersonId[String(s.personid)];
          segDriver = info.name; segSource = 'personid'; segEmpNr = info.employeenumber;
        }
        // Fallback: direct driver field
        if (!segDriver && s.driver) {
          segDriver = s.driver; segSource = 'segment.driver';
        }

        if (segDriver) {
          const segKm = Number(s.distance || 0) / 1000;
          driverCandidates.push({ name: segDriver, source: segSource, employeenumber: segEmpNr, km: segKm, segIndex: si });
        }
      }

      if (driverCandidates.length > 0) {
        // Check if there are multiple different drivers
        const uniqueDrivers = [...new Set(driverCandidates.map(c => normDriverName(c.name)))];
        if (uniqueDrivers.length > 1) {
          // Multiple drivers on same ride = late login scenario
          // Take the LAST logged-in driver (highest segIndex = latest segment)
          const lastCandidate = driverCandidates[driverCandidates.length - 1];
          driver = lastCandidate.name;
          driverSource = `${lastCandidate.source} (laatst-ingelogd, ${uniqueDrivers.length} chauffeurs)`;
          driverEmployeeNumber = lastCandidate.employeenumber;
          addLog(`Multi-driver rit ${assetMap[ride.gpsassetid]?.plate || ride.gpsassetid} ${ride.date}: ${uniqueDrivers.join(' → ')} → gekozen: ${driver}`);
        } else {
          // Single driver — use first candidate
          driver = driverCandidates[0].name;
          driverSource = driverCandidates[0].source;
          driverEmployeeNumber = driverCandidates[0].employeenumber;
        }
      }

      // Fallback: planning (Trip entity match)
      if (!driver) {
        driver = planningDriverMap[ride.gpsassetid] || '';
        if (driver) driverSource = 'planning fallback';
      }

      // TimeEntry cross-check: if a driver submitted a shift on this vehicle+date,
      // use that as the definitive driver (overrides GPS late-login artifacts)
      const teKey = `${ride.gpsassetid}_${ride.date}`;
      const teMatch = timeEntryDriverMap[teKey];
      if (teMatch && teMatch.employee_name) {
        const teDriverNorm = normDriverName(teMatch.employee_name);
        const gpsDriverNorm = normDriverName(driver);
        if (teDriverNorm && teDriverNorm !== gpsDriverNorm) {
          addLog(`TimeEntry override ${assetMap[ride.gpsassetid]?.plate || ride.gpsassetid} ${ride.date}: GPS="${driver}" → TimeEntry="${teMatch.employee_name}"`);
          driver = teMatch.employee_name;
          driverSource = `timeentry-crosscheck (was: ${driverSource})`;
          driverEmployeeNumber = null; // will be re-resolved via name matching
        }
      }

      // ALWAYS resolve employeenumber via Naiton user name lookup if not yet found
      // This is critical: personeelsnummer is the primary key for Employee matching
      if (driver && !driverEmployeeNumber) {
        // Try segment-level tacho/tag/personid first (any segment in the ride)
        for (const s of segs) {
          if (s.tachocardnumber && userByTacho[String(s.tachocardnumber)]?.employeenumber) {
            driverEmployeeNumber = userByTacho[String(s.tachocardnumber)].employeenumber; break;
          }
          if (s.tagid && userByTag[String(s.tagid)]?.employeenumber) {
            driverEmployeeNumber = userByTag[String(s.tagid)].employeenumber; break;
          }
          if (s.personid && userByPersonId[String(s.personid)]?.employeenumber) {
            driverEmployeeNumber = userByPersonId[String(s.personid)].employeenumber; break;
          }
        }
        // Fallback: reverse lookup by driver name in Naiton users
        if (!driverEmployeeNumber) {
          const nameMatch = userByName[normDriverName(driver)];
          if (nameMatch?.employeenumber) {
            driverEmployeeNumber = nameMatch.employeenumber;
          }
        }
      }

      tripRecords.push({
        gpsassetid: ride.gpsassetid,
        driver: driver || null,
        driver_source: driverSource || null,
        driver_employee_number: driverEmployeeNumber || null,
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
    addLog('Step 5: Saving TripRecords...');

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
        newRecordIds.push({ id: results[j].id, driver: batch[j].driver, driver_employee_number: batch[j].driver_employee_number, date: batch[j].date });
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
      // SDK bug workaround: list/filter returns corrupted string for >~40 records
      // Paginate in batches of 20 to ensure proper JSON parsing
      const employees = [];
      let empSkip = 0;
      const EMP_PAGE = 20;
      while (true) {
        const page = await svc.entities.Employee.filter({ status: 'Actief' }, '-created_date', EMP_PAGE, empSkip);
        if (!Array.isArray(page) || page.length === 0) break;
        employees.push(...page);
        if (page.length < EMP_PAGE) break;
        empSkip += EMP_PAGE;
      }

      // PRIMARY: Index by employee_number (personeelsnummer) — most reliable
      const empByNumber = {};
      for (const emp of employees) {
        if (emp.employee_number) {
          empByNumber[String(emp.employee_number).trim()] = emp;
        }
      }
      addLog(`Employee index: ${Object.keys(empByNumber).length} met personeelsnummer, ${employees.length} totaal`);

      // SECONDARY: Name-based fallback (exact + partial/roepnaam matching)
      const normName = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      const empByName = {};
      const empByLastAndPartialFirst = []; // for partial first name matching (roepnaam)
      for (const emp of employees) {
        const fn = emp.first_name || '';
        const pf = emp.prefix || '';
        const ln = emp.last_name || '';
        const variants = [
          `${fn} ${pf} ${ln}`, `${fn} ${ln}`, `${ln} ${fn}`,
          `${ln}, ${fn}`, `${pf} ${ln} ${fn}`, `${pf} ${ln}, ${fn}`,
        ];
        for (const v of variants) {
          const key = normName(v);
          if (key && !empByName[key]) empByName[key] = emp;
        }
        // Index for partial first name matching (e.g. "Kim" → "Kimberley")
        if (fn && ln) {
          empByLastAndPartialFirst.push({
            emp,
            firstName: normName(fn),
            prefix: normName(pf),
            lastName: normName(ln),
          });
        }
      }

      // Partial name matcher: "Kim van Broekhoven" → matches "Kimberley van Broekhoven"
      const findByPartialName = (driverName) => {
        const parts = normName(driverName).split(' ').filter(Boolean);
        if (parts.length < 2) return null;
        const driverFirst = parts[0];
        const driverRest = parts.slice(1).join(' ');
        for (const entry of empByLastAndPartialFirst) {
          // Check if last name (with optional prefix) matches the rest of the driver name
          const empRest = entry.prefix ? `${entry.prefix} ${entry.lastName}` : entry.lastName;
          if (normName(empRest) !== driverRest && entry.lastName !== driverRest) continue;
          // Check if employee first name STARTS WITH the driver's first name (roepnaam)
          if (entry.firstName.startsWith(driverFirst) && driverFirst.length >= 3) {
            return entry.emp;
          }
        }
        return null;
      };

      const linksToCreate = [];
      const unmatchedDrivers = [];
      let matchedByNumber = 0;
      let matchedByName = 0;

      for (const rec of newRecordIds) {
        if (!rec.driver) continue;

        let emp = null;

        // Priority 1: Match by personeelsnummer (Naiton employeenumber → Employee.employee_number)
        if (rec.driver_employee_number) {
          emp = empByNumber[String(rec.driver_employee_number).trim()];
          if (emp) matchedByNumber++;
        }

        // Priority 2: Name-based fallback (exact match)
        if (!emp) {
          const norm = normName(rec.driver);
          emp = empByName[norm];
          if (emp) matchedByName++;
        }

        // Priority 3: Partial first name / roepnaam match (e.g. "Kim" → "Kimberley")
        if (!emp) {
          emp = findByPartialName(rec.driver);
          if (emp) matchedByName++;
        }

        if (emp) {
          linksToCreate.push({
            trip_record_id: rec.id,
            employee_id: emp.id,
            employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            date: rec.date,
            approved: false,
          });
        } else {
          unmatchedDrivers.push(`${rec.driver} (nr: ${rec.driver_employee_number || '?'})`);
        }
      }

      addLog(`Match resultaat: ${matchedByNumber} op personeelsnummer, ${matchedByName} op naam`);
      if (unmatchedDrivers.length > 0) {
        const unique = [...new Set(unmatchedDrivers)];
        addLog(`Ongematchte chauffeurs (${unique.length}): ${unique.join(', ')}`);
        console.log('[NAITON] Unmatched drivers:', JSON.stringify(unique));
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