// vehicleStopReport — Generate detailed stop report for a vehicle on a specific date
// Returns all stops >5 min with LOCAL time (Europe/Amsterdam), duration, coords, classification
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const BASE_URL = 'https://dawa-prod.naiton.com';

let STANDPLAATS_LAT = 51.4700;
let STANDPLAATS_LON = 3.9716;
let STANDPLAATS_RADIUS_M = 500;

const DEPOT_LOCATIONS = [
  { name: 'PostNL Sorteercentrum Goes', lat: 51.4943, lon: 3.8778 },
  { name: 'PostNL Pakketten Goes', lat: 51.4846, lon: 3.8898 },
];
const DEPOT_RADIUS_M = 300;
const SHORT_STOP_THRESHOLD_MIN = 5;

function gpsDistanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toLocalTime(utcStr) {
  if (!utcStr) return null;
  const d = new Date(utcStr);
  return d.toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });
}

function toLocalDateTime(utcStr) {
  if (!utcStr) return null;
  const d = new Date(utcStr);
  return d.toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { plate, date } = await req.json();
    if (!plate || !date) {
      return Response.json({ error: 'plate en date zijn verplicht' }, { status: 400 });
    }

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');

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
      if (!res.ok) throw new Error(`Naiton API ${res.status}: ${(await res.text()).slice(0, 500)}`);
      return res.json();
    };

    // 1. Get assets to find gpsassetid for this plate
    const assetsJson = await naitonCall([{
      name: "dataexchange_assets",
      arguments: [{ name: "inactiveAttributes", value: true }]
    }]);
    const assets = assetsJson.dataexchange_assets || [];
    const normPlate = plate.replace(/[-\s]/g, '').toLowerCase();
    const matchedAsset = assets.find(a =>
      a.licenceplate && a.licenceplate.replace(/[-\s]/g, '').toLowerCase() === normPlate
    );
    if (!matchedAsset) {
      return Response.json({ error: `Kenteken ${plate} niet gevonden in Naiton assets` }, { status: 404 });
    }

    const assetId = matchedAsset.gpsassetid;
    const assetName = matchedAsset.assetname || plate;

    // 1b. Check if vehicle has a specific home base configured
    const svc = base44.asServiceRole;
    const vehicles = await svc.entities.Vehicle.filter({ license_plate: plate });
    const vehicle = vehicles[0];
    if (vehicle?.home_base_lat && vehicle?.home_base_lon) {
      STANDPLAATS_LAT = vehicle.home_base_lat;
      STANDPLAATS_LON = vehicle.home_base_lon;
      STANDPLAATS_RADIUS_M = vehicle.home_base_radius_m || 500;
    }
    // Also load GpsLocation standplaats entities as additional standplaats check
    const gpsLocations = await svc.entities.GpsLocation.filter({ is_active: true, type: 'standplaats' });

    // 2. Fetch trip segments: request previous day + this day + next day
    // Naiton splits data at ~00:00 UTC (= 01:00 CET / 02:00 CEST), so overnight standplaats
    // periods are fragmented across two API-days. By requesting prev+current+next we capture
    // all data that might overlap with the local calendar day.
    const prevDay = new Date(date);
    prevDay.setDate(prevDay.getDate() - 1);
    const prevDayStr = prevDay.toISOString().split('T')[0];
    const nextNextDay = new Date(date);
    nextNextDay.setDate(nextNextDay.getDate() + 2);
    const nextNextDayStr = nextNextDay.toISOString().split('T')[0];

    const tripsJson = await naitonCall([{
      name: "dataexchange_trips",
      arguments: [
        { name: "gpsassetids", value: [assetId] },
        { name: "starttime", value: prevDayStr },
        { name: "stoptime", value: nextNextDayStr },
        { name: "includeallattributes", value: true }
      ]
    }]);
    const allSegments = (tripsJson.dataexchange_trips || [])
      .filter(s => s.gpsassetid === assetId)
      .sort((a, b) => new Date(a.start || a.stop) - new Date(b.start || b.stop));

    if (allSegments.length === 0) {
      return Response.json({ error: 'Geen segmenten gevonden voor dit voertuig op deze datum' }, { status: 404 });
    }

    // 3. Compute local midnight boundaries for the requested date
    const toUtcMidnight = (localDateStr) => {
      const noonUtc = new Date(`${localDateStr}T12:00:00Z`);
      const parts = new Intl.DateTimeFormat('en', {
        timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).formatToParts(noonUtc);
      const p = {};
      parts.forEach(({ type, value }) => { p[type] = value; });
      const utcHour = noonUtc.getUTCHours();
      const localHour = parseInt(p.hour, 10);
      const offsetHours = localHour - utcHour;
      return new Date(`${localDateStr}T00:00:00Z`).getTime() - offsetHours * 3600000;
    };
    const dayStartUtc = toUtcMidnight(date);
    const nextDayDate = new Date(date);
    nextDayDate.setDate(nextDayDate.getDate() + 1);
    const dayEndUtc = toUtcMidnight(nextDayDate.toISOString().split('T')[0]);

    // Helper: does a timeline entry overlap with the requested date?
    const segOverlapsDate = (entry) => {
      const sStart = new Date(entry.start_utc).getTime();
      const sEnd = new Date(entry.stop_utc).getTime();
      return sStart < dayEndUtc && sEnd > dayStartUtc;
    };

    // Process all segments into a timeline
    const timeline = [];
    const depotStops = [];
    const longStops = [];
    const standplaatsStops = [];

    for (const seg of allSegments) {
      const type = (seg.type || '').toLowerCase();
      const lat = Number(seg.stoplat || seg.startlat || 0);
      const lon = Number(seg.stoplon || seg.startlon || 0);
      const startT = new Date(seg.start);
      const stopT = new Date(seg.stop || seg.end || seg.start);
      const durMin = Math.round((stopT - startT) / 60000);

      const isStandplaats = (lat && lon) ? (
        gpsDistanceM(lat, lon, STANDPLAATS_LAT, STANDPLAATS_LON) <= STANDPLAATS_RADIUS_M ||
        gpsLocations.some(loc => gpsDistanceM(lat, lon, loc.lat, loc.lon) <= (loc.radius_m || 500))
      ) : false;
      let depotMatch = null;
      if (lat && lon) {
        for (const d of DEPOT_LOCATIONS) {
          if (gpsDistanceM(lat, lon, d.lat, d.lon) <= DEPOT_RADIUS_M) {
            depotMatch = d.name;
            break;
          }
        }
      }

      let classification = type === 'drive' ? 'RIJDEN' : 'STOP';
      if (type === 'stop') {
        if (isStandplaats) classification = 'STANDPLAATS';
        else if (depotMatch) classification = 'DEPOT';
        else if (durMin > SHORT_STOP_THRESHOLD_MIN) classification = 'STILSTAND';
        else classification = 'KORTE_STOP';
      }

      const startLat = Number(seg.startlat || 0);
      const startLon = Number(seg.startlon || 0);
      const stopLat = Number(seg.stoplat || 0);
      const stopLon = Number(seg.stoplon || 0);

      const entry = {
        type,
        start_utc: seg.start,
        stop_utc: seg.stop || seg.end || seg.start,
        start_local: toLocalTime(seg.start),
        stop_local: toLocalTime(seg.stop || seg.end || seg.start),
        duration_min: durMin,
        lat: lat || null,
        lon: lon || null,
        startLat: startLat || null,
        startLon: startLon || null,
        stopLat: stopLat || null,
        stopLon: stopLon || null,
        classification,
        depot_name: depotMatch,
        odometer_start: seg.odometerstartkm ? Number(seg.odometerstartkm) : null,
        odometer_stop: seg.odometerstopkm ? Number(seg.odometerstopkm) : null,
      };

      timeline.push(entry);

      // Classify stops (only for segments that overlap with the requested date)
      if (type === 'stop' && segOverlapsDate(entry)) {
        if (depotMatch && durMin > 0) {
          depotStops.push(entry);
        } else if (!isStandplaats && durMin > SHORT_STOP_THRESHOLD_MIN) {
          longStops.push(entry);
        }
      }
      // Standplaats stops: collect ALL (needed for merge+clip logic later)
      if (type === 'stop' && isStandplaats) {
        standplaatsStops.push(entry);
      }
    }

    // Calculate totals
    const totalDepotMin = depotStops.reduce((s, e) => s + e.duration_min, 0);
    const totalStilstandMin = longStops.reduce((s, e) => s + e.duration_min, 0);

    // Ride info: use merged standplaats periods to find rides.
    // First compute merged standplaats periods, then derive rides as gaps between them.
    const computeMergedStandplaatsRaw = () => {
      const MERGE_MIN_RADIUS = 200;
      const mergeRadius = Math.max(STANDPLAATS_RADIUS_M, MERGE_MIN_RADIUS);
      const isPointNearStandplaats = (lat, lon) => {
        if (!lat || !lon) return true;
        if (gpsDistanceM(lat, lon, STANDPLAATS_LAT, STANDPLAATS_LON) <= mergeRadius) return true;
        return gpsLocations.some(loc => gpsDistanceM(lat, lon, loc.lat, loc.lon) <= Math.max(loc.radius_m || 500, MERGE_MIN_RADIUS));
      };
      const merged = [];
      for (const s of standplaatsStops) {
        if (merged.length === 0) { merged.push({ start_utc: s.start_utc, stop_utc: s.stop_utc }); continue; }
        const prev = merged[merged.length - 1];
        const prevStopTime = new Date(prev.stop_utc).getTime();
        const currStartTime = new Date(s.start_utc).getTime();
        const hasRealDriveBetween = timeline.some(t => {
          if (t.type !== 'drive') return false;
          const tStart = new Date(t.start_utc).getTime();
          const tStop = new Date(t.stop_utc).getTime();
          if (tStart < prevStopTime || tStop > currStartTime) return false;
          return !isPointNearStandplaats(t.startLat, t.startLon) || !isPointNearStandplaats(t.stopLat, t.stopLon);
        });
        if (hasRealDriveBetween) {
          merged.push({ start_utc: s.start_utc, stop_utc: s.stop_utc });
        } else {
          prev.stop_utc = s.stop_utc;
        }
      }
      return merged;
    };

    const mergedStandplaatsPeriods = computeMergedStandplaatsRaw();

    const computeRides = () => {
      const daySegments = timeline.filter(segOverlapsDate);
      if (daySegments.length === 0) return [];

      // Check if a UTC timestamp falls within any merged standplaats period
      const isInStandplaats = (utcMs) => {
        return mergedStandplaatsPeriods.some(sp => {
          const spStart = new Date(sp.start_utc).getTime();
          const spEnd = new Date(sp.stop_utc).getTime();
          return utcMs >= spStart && utcMs <= spEnd;
        });
      };

      // Find the merged standplaats period that contains this timestamp
      const getStandplaatsPeriod = (utcMs) => {
        return mergedStandplaatsPeriods.find(sp => {
          const spStart = new Date(sp.start_utc).getTime();
          const spEnd = new Date(sp.stop_utc).getTime();
          return utcMs >= spStart && utcMs <= spEnd;
        });
      };

      const rides = [];
      let currentRide = null;
      let sawStandplaatsFirst = false;

      for (const entry of daySegments) {
        const entryStartMs = new Date(entry.start_utc).getTime();
        const entryInStandplaats = isInStandplaats(entryStartMs);

        if (entryInStandplaats) {
          if (currentRide) {
            // Vehicle arrived at standplaats — close the ride
            // Use the start of the standplaats period that contains this entry as the arrival time
            currentRide.end_utc = entry.start_utc;
            rides.push(currentRide);
            currentRide = null;
          }
          sawStandplaatsFirst = true;
        } else if (entry.type === 'drive') {
          if (!currentRide) {
            // Departing: find when the standplaats period ended to get the departure time
            let departureUtc;
            if (sawStandplaatsFirst) {
              // Find the most recent standplaats period before this drive
              const beforePeriods = mergedStandplaatsPeriods.filter(sp => new Date(sp.stop_utc).getTime() <= entryStartMs);
              const lastSp = beforePeriods[beforePeriods.length - 1];
              departureUtc = lastSp ? lastSp.stop_utc : entry.start_utc;
            } else {
              departureUtc = new Date(dayStartUtc).toISOString();
            }
            currentRide = {
              start_utc: departureUtc,
              end_utc: null,
              start_km: entry.odometer_start,
              end_km: entry.odometer_stop,
              open_start: !sawStandplaatsFirst,
            };
          } else {
            if (entry.odometer_stop) currentRide.end_km = entry.odometer_stop;
          }
        } else {
          // Non-standplaats stop during ride
          if (currentRide && entry.odometer_stop) {
            currentRide.end_km = entry.odometer_stop;
          }
        }
      }

      // If ride still open → clip to midnight
      if (currentRide) {
        currentRide.end_utc = new Date(dayEndUtc).toISOString();
        currentRide.open_ended = true;
        rides.push(currentRide);
      }

      return rides;
    };

    const rides = computeRides();



    // Build ride summary
    const ridesSummary = rides.map((r, i) => {
      const startLocal = r.open_start ? 'middernacht' : toLocalTime(r.start_utc);
      const endLocal = r.open_ended ? 'middernacht' : toLocalTime(r.end_utc);
      const startKm = r.start_km;
      const endKm = r.end_km;
      const totalKm = (startKm && endKm && endKm > startKm) ? Math.round((endKm - startKm) * 10) / 10 : null;
      return { nr: i + 1, start: startLocal, end: endLocal, start_km: startKm, end_km: endKm, total_km: totalKm };
    });

    // Global KM from rides
    const globalStartKm = rides.length > 0 ? rides[0].start_km : null;
    const globalEndKm = rides.length > 0 ? rides[rides.length - 1].end_km : null;
    const globalTotalKm = (globalStartKm && globalEndKm && globalEndKm > globalStartKm) 
      ? Math.round((globalEndKm - globalStartKm) * 10) / 10 : null;

    // Standplaats logic: merge consecutive fragments, then clip to requested date boundaries
    const computeStandplaats = () => {
      const MERGE_MIN_RADIUS = 200;
      const mergeRadius = Math.max(STANDPLAATS_RADIUS_M, MERGE_MIN_RADIUS);
      const isPointNearStandplaats = (lat, lon) => {
        if (!lat || !lon) return true;
        if (gpsDistanceM(lat, lon, STANDPLAATS_LAT, STANDPLAATS_LON) <= mergeRadius) return true;
        return gpsLocations.some(loc => gpsDistanceM(lat, lon, loc.lat, loc.lon) <= Math.max(loc.radius_m || 500, MERGE_MIN_RADIUS));
      };

      // Step 1: Merge consecutive standplaats fragments (no real drive between them)
      const merged = [];
      for (const s of standplaatsStops) {
        if (merged.length === 0) {
          merged.push({ ...s });
          continue;
        }
        const prev = merged[merged.length - 1];
        const prevStopTime = new Date(prev.stop_utc).getTime();
        const currStartTime = new Date(s.start_utc).getTime();
        const hasRealDriveBetween = timeline.some(t => {
          if (t.type !== 'drive') return false;
          const tStart = new Date(t.start_utc).getTime();
          const tStop = new Date(t.stop_utc).getTime();
          if (tStart < prevStopTime || tStop > currStartTime) return false;
          const startNear = isPointNearStandplaats(t.startLat, t.startLon);
          const stopNear = isPointNearStandplaats(t.stopLat, t.stopLon);
          return !startNear || !stopNear;
        });
        if (hasRealDriveBetween) {
          merged.push({ ...s });
        } else {
          prev.stop_utc = s.stop_utc;
          prev.stop_local = s.stop_local;
          prev.duration_min = Math.round((new Date(prev.stop_utc) - new Date(prev.start_utc)) / 60000);
        }
      }

      // Step 2: Clip each merged period to the requested date (dayStartUtc/dayEndUtc computed above)
      const clipped = [];
      for (const s of merged) {
        const sStart = new Date(s.start_utc).getTime();
        const sEnd = new Date(s.stop_utc).getTime();
        // Adjust for overnight: if end < start, end is next day
        const effectiveEnd = sEnd < sStart ? sEnd + 24 * 60 * 60 * 1000 : sEnd;

        // Find overlap with [dayStartUtc, dayEndUtc)
        const overlapStart = Math.max(sStart, dayStartUtc);
        const overlapEnd = Math.min(effectiveEnd, dayEndUtc);
        if (overlapStart >= overlapEnd) continue; // no overlap with this date

        const durMin = Math.round((overlapEnd - overlapStart) / 60000);
        if (durMin <= 0) continue;

        const clippedStartLocal = new Date(overlapStart).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });
        const clippedEndLocal = new Date(overlapEnd).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });
        const clippedStartDate = new Date(overlapStart).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' });
        const clippedEndDate = new Date(overlapEnd).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' });

        clipped.push({
          start_local: clippedStartLocal,
          stop_local: clippedEndLocal,
          start_date: clippedStartDate,
          stop_date: clippedEndDate,
          duration_min: durMin,
        });
      }

      return {
        count: clipped.length,
        stops: clipped.map((s, i) => ({
          nr: i + 1,
          start: s.start_local,
          stop: s.stop_local,
          start_date: s.start_date,
          stop_date: s.stop_date,
          duration_min: s.duration_min,
        })),

      };
    };


    return Response.json({
      plate,
      asset_name: assetName,
      asset_id: assetId,
      date,
      ride: {
        start: ridesSummary.length > 0 ? ridesSummary[0].start : null,
        end: ridesSummary.length > 0 ? ridesSummary[ridesSummary.length - 1].end : null,
        total_km: globalTotalKm,
        start_km: globalStartKm,
        end_km: globalEndKm,
      },
      rides: ridesSummary,
      depot: {
        count: depotStops.length,
        total_minutes: totalDepotMin,
        stops: depotStops.map((s, i) => ({
          nr: i + 1,
          start: s.start_local,
          stop: s.stop_local,
          duration_min: s.duration_min,
          name: s.depot_name,
          lat: s.lat,
          lon: s.lon,
        })),
      },
      stilstand: {
        count: longStops.length,
        total_minutes: totalStilstandMin,
        stops: longStops.map((s, i) => ({
          nr: i + 1,
          start: s.start_local,
          stop: s.stop_local,
          duration_min: s.duration_min,
          lat: s.lat,
          lon: s.lon,
        })),
      },
      standplaats: computeStandplaats(),
      total_segments: allSegments.length,
      _debug_day_segments: daySegsDebug,
    });
  } catch (error) {
    console.error('[vehicleStopReport]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});