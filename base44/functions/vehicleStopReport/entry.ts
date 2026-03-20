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

    // 2. Fetch trip segments for this date
    const dateTo = new Date(date);
    dateTo.setDate(dateTo.getDate() + 1);
    const dateToStr = dateTo.toISOString().split('T')[0];

    const tripsJson = await naitonCall([{
      name: "dataexchange_trips",
      arguments: [
        { name: "gpsassetids", value: [assetId] },
        { name: "starttime", value: date },
        { name: "stoptime", value: dateToStr },
        { name: "includeallattributes", value: true }
      ]
    }]);
    const allSegments = (tripsJson.dataexchange_trips || [])
      .filter(s => s.gpsassetid === assetId)
      .sort((a, b) => new Date(a.start || a.stop) - new Date(b.start || b.stop));

    if (allSegments.length === 0) {
      return Response.json({ error: 'Geen segmenten gevonden voor dit voertuig op deze datum' }, { status: 404 });
    }

    // 3. Process all segments into a timeline
    const timeline = [];
    const depotStops = [];
    const longStops = [];
    const standplaatsStops = [];

    // Find ride boundaries (first drive after standplaats, last standplaats stop)
    let rideStart = null;
    let rideEnd = null;

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

      // For drive segments, track start+stop coords separately for standplaats merge logic
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

      // Track ride boundaries
      if (type === 'drive' && !rideStart) {
        rideStart = entry;
      }
      if (type === 'stop' && isStandplaats && rideStart) {
        // Only set rideEnd after ride has started (skip pre-departure standplaats)
        rideEnd = entry;
      }

      // Classify stops
      if (type === 'stop') {
        if (depotMatch && durMin > 0) {
          depotStops.push(entry);
        } else if (!isStandplaats && durMin > SHORT_STOP_THRESHOLD_MIN) {
          longStops.push(entry);
        }
        if (isStandplaats) {
          standplaatsStops.push(entry);
        }
      }
    }

    // Calculate totals
    const totalDepotMin = depotStops.reduce((s, e) => s + e.duration_min, 0);
    const totalStilstandMin = longStops.reduce((s, e) => s + e.duration_min, 0);

    // Ride info
    const rideStartLocal = rideStart ? toLocalTime(rideStart.start_utc) : null;
    const rideEndLocal = rideEnd ? toLocalTime(rideEnd.start_utc) : null;

    // KM
    const firstDrive = allSegments.find(s => (s.type || '').toLowerCase() === 'drive');
    const lastSeg = allSegments[allSegments.length - 1];
    const startKm = firstDrive ? Number(firstDrive.odometerstartkm || 0) : null;
    const endKm = lastSeg ? Number(lastSeg.odometerstopkm || lastSeg.odometerstartkm || 0) : null;
    const totalKm = (startKm && endKm && endKm > startKm) ? Math.round((endKm - startKm) * 10) / 10 : null;

    // Standplaats merge logic
    const computeStandplaats = () => {
      // Merge consecutive standplaats stops into single logical stops.
      // E.g. 14:17–00:59 + 01:00–01:00 + 01:00–07:29 → 14:17–07:29
      // A "real drive" = a drive segment where at least one endpoint is outside standplaats radius.
      const MERGE_MIN_RADIUS = 200;
      const mergeRadius = Math.max(STANDPLAATS_RADIUS_M, MERGE_MIN_RADIUS);
      const isPointNearStandplaats = (lat, lon) => {
        if (!lat || !lon) return true;
        if (gpsDistanceM(lat, lon, STANDPLAATS_LAT, STANDPLAATS_LON) <= mergeRadius) return true;
        return gpsLocations.some(loc => gpsDistanceM(lat, lon, loc.lat, loc.lon) <= Math.max(loc.radius_m || 500, MERGE_MIN_RADIUS));
      };
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
      // Wrap-around merge: if last and first are also consecutive standplaats
      // (Naiton splits nights at midnight), merge them into one entry
      if (merged.length >= 2) {
        const last = merged[merged.length - 1];
        const first = merged[0];
        const lastStopTime = new Date(last.stop_utc).getTime();
        const firstStartTime = new Date(first.start_utc).getTime();
        // Check: last stop → first start, no real drive between
        // Since this wraps around the day boundary, check if there's any real drive
        // between last.stop_utc and end-of-data, OR between start-of-data and first.start_utc
        const hasRealDriveAfterLast = timeline.some(t => {
          if (t.type !== 'drive') return false;
          const tStart = new Date(t.start_utc).getTime();
          if (tStart < lastStopTime) return false;
          const startNear = isPointNearStandplaats(t.startLat, t.startLon);
          const stopNear = isPointNearStandplaats(t.stopLat, t.stopLon);
          return !startNear || !stopNear;
        });
        const hasRealDriveBeforeFirst = timeline.some(t => {
          if (t.type !== 'drive') return false;
          const tStop = new Date(t.stop_utc).getTime();
          if (tStop > firstStartTime) return false;
          const startNear = isPointNearStandplaats(t.startLat, t.startLon);
          const stopNear = isPointNearStandplaats(t.stopLat, t.stopLon);
          return !startNear || !stopNear;
        });
        if (!hasRealDriveAfterLast && !hasRealDriveBeforeFirst) {
          // Merge: extend last to include first's end, remove first
          last.stop_utc = first.stop_utc;
          last.stop_local = first.stop_local;
          last.duration_min = Math.round((new Date(last.stop_utc) - new Date(last.start_utc)) / 60000);
          merged.shift(); // remove the first entry (now absorbed into last)
        }
      }

      return {
        count: merged.length,
        stops: merged.map((s, i) => ({
          nr: i + 1,
          start: s.start_local,
          stop: s.stop_local,
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
        start: rideStartLocal,
        end: rideEndLocal,
        total_km: totalKm,
        start_km: startKm,
        end_km: endKm,
      },
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
    });
  } catch (error) {
    console.error('[vehicleStopReport]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});