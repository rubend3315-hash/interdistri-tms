// Debug: show first and last segments + standplaats detection summary for a vehicle
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BASE_URL = 'https://dawa-prod.naiton.com';

function gpsDistanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { plate, date } = await req.json();
    const svc = base44.asServiceRole;

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');
    const apiHeaders = { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET };
    const naitonCall = async (fns) => {
      const res = await fetch(`${BASE_URL}/datad/execute`, { method: 'POST', headers: apiHeaders, body: JSON.stringify(fns) });
      if (!res.ok) throw new Error(`Naiton API ${res.status}`);
      return res.json();
    };

    // Fetch asset
    const assetsJson = await naitonCall([{ name: "dataexchange_assets", arguments: [{ name: "inactiveAttributes", value: true }] }]);
    const normPlate = plate.replace(/[-\s]/g, '').toLowerCase();
    const matchedAsset = (assetsJson.dataexchange_assets || []).find(a => a.licenceplate && a.licenceplate.replace(/[-\s]/g, '').toLowerCase() === normPlate);
    if (!matchedAsset) return Response.json({ error: `Kenteken ${plate} niet gevonden` }, { status: 404 });
    const assetId = matchedAsset.gpsassetid;

    // Fetch locations
    const gpsLocations = await svc.entities.GpsLocation.filter({ is_active: true });
    const dbStandplaatsen = gpsLocations.filter(l => l.type === 'standplaats');

    // Fetch vehicle home base
    const allVehicles = await svc.entities.Vehicle.filter({});
    const vehicle = allVehicles.find(v => v.license_plate && v.license_plate.replace(/[-\s]/g, '').toLowerCase() === normPlate);
    const homeBase = vehicle?.home_base_lat && vehicle?.home_base_lon ? {
      lat: vehicle.home_base_lat, lon: vehicle.home_base_lon, radius: vehicle.home_base_radius_m || 500
    } : null;

    // Fetch segments with overnight buffer
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 1);
    const stopDate = new Date(date);
    stopDate.setDate(stopDate.getDate() + 1);

    const tripsJson = await naitonCall([{
      name: "dataexchange_trips",
      arguments: [
        { name: "gpsassetids", value: [assetId] },
        { name: "includefields", value: ["driver"] },
        { name: "starttime", value: startDate.toISOString().split('T')[0] },
        { name: "stoptime", value: stopDate.toISOString().split('T')[0] },
        { name: "includeallattributes", value: true },
      ]
    }]);

    const segments = (tripsJson.dataexchange_trips || [])
      .filter(s => s.gpsassetid === assetId)
      .sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));

    // Classify each segment
    const isStandplaats = (seg) => {
      const lat = Number(seg.stoplat || seg.startlat || 0);
      const lon = Number(seg.stoplon || seg.startlon || 0);
      if (!lat || !lon) return false;
      if (dbStandplaatsen.some(s => gpsDistanceM(lat, lon, s.lat, s.lon) <= (s.radius_m || 500))) return true;
      if (homeBase && gpsDistanceM(lat, lon, homeBase.lat, homeBase.lon) <= homeBase.radius) return true;
      return false;
    };

    const classify = (seg) => {
      const type = (seg.type || '').toLowerCase();
      const lat = Number(seg.stoplat || seg.startlat || 0);
      const lon = Number(seg.stoplon || seg.startlon || 0);
      const distStandplaats = (lat && lon && dbStandplaatsen.length > 0) 
        ? Math.round(Math.min(...dbStandplaatsen.map(s => gpsDistanceM(lat, lon, s.lat, s.lon))))
        : null;
      const distHomeBase = (lat && lon && homeBase) 
        ? Math.round(gpsDistanceM(lat, lon, homeBase.lat, homeBase.lon))
        : null;

      return {
        type,
        start: seg.start?.slice(0, 19),
        stop: (seg.stop || seg.start)?.slice(0, 19),
        lat: lat?.toFixed(4),
        lon: lon?.toFixed(4),
        dist_standplaats_m: distStandplaats,
        dist_homebase_m: distHomeBase,
        is_standplaats: type === 'stop' && isStandplaats(seg),
        odo_start: seg.odometerstartkm,
        odo_stop: seg.odometerstopkm,
        driver: seg.additionaldata?.Driver || null,
      };
    };

    // Show raw start/stop times for boundary segments
    const targetDate = date;
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    const prevDaySegs = [];
    const targetDaySegs = [];
    segments.forEach((s, i) => {
      const segDate = (s.start || '').slice(0, 10);
      if (segDate === prevDateStr) prevDaySegs.push({ i, s });
      else if (segDate === targetDate) targetDaySegs.push({ i, s });
    });

    const fmtSeg = ({ i, s }) => ({
      idx: i,
      type: (s.type || '').toLowerCase(),
      start: s.start,
      stop: s.stop,
      end: s.end,
      dist: Math.round(Math.min(...dbStandplaatsen.map(sp => gpsDistanceM(
        Number(s.stoplat || s.startlat || 0), Number(s.stoplon || s.startlon || 0), sp.lat, sp.lon
      )))),
    });

    const boundary = [
      ...prevDaySegs.slice(-3).map(fmtSeg),
      { marker: '--- DAY BOUNDARY ---' },
      ...targetDaySegs.slice(0, 3).map(fmtSeg),
    ];
    const endOfDay = targetDaySegs.slice(-3).map(fmtSeg);

    // Count standplaats stops
    const stopSegments = segments.filter(s => (s.type || '').toLowerCase() === 'stop');
    const standplaatsStops = stopSegments.filter(s => isStandplaats(s));

    // Simulated ride detection: find standplaats stops and what's between them
    const standplaatsIndices = [];
    segments.forEach((s, i) => {
      if ((s.type || '').toLowerCase() === 'stop' && isStandplaats(s)) {
        standplaatsIndices.push(i);
      }
    });

    return Response.json({
      plate,
      home_base: homeBase,
      total_segments: segments.length,
      total_stops: stopSegments.length,
      standplaats_stop_count: standplaatsStops.length,
      standplaats_indices: standplaatsIndices,
      boundary_segments: boundary,
      end_of_target_day: endOfDay,
      prev_day_count: prevDaySegs.length,
      target_day_count: targetDaySegs.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});