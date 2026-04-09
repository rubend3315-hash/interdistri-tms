// Debug: show last N segments of a vehicle with home_base distance
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

    const { plate, date, count = 5 } = await req.json();
    const svc = base44.asServiceRole;

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');
    const apiHeaders = { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET };
    const naitonCall = async (fns) => {
      const res = await fetch(`${BASE_URL}/datad/execute`, { method: 'POST', headers: apiHeaders, body: JSON.stringify(fns) });
      if (!res.ok) throw new Error(`Naiton API ${res.status}`);
      return res.json();
    };

    // Find asset
    const assetsJson = await naitonCall([{ name: "dataexchange_assets", arguments: [{ name: "inactiveAttributes", value: true }] }]);
    const normPlate = plate.replace(/[-\s]/g, '').toLowerCase();
    const matchedAsset = (assetsJson.dataexchange_assets || []).find(a => a.licenceplate && a.licenceplate.replace(/[-\s]/g, '').toLowerCase() === normPlate);
    if (!matchedAsset) return Response.json({ error: `Kenteken ${plate} niet gevonden` }, { status: 404 });

    // Locations
    const gpsLocations = await svc.entities.GpsLocation.filter({ is_active: true });
    const dbStandplaatsen = gpsLocations.filter(l => l.type === 'standplaats');
    const allVehicles = await svc.entities.Vehicle.filter({});
    const vehicle = allVehicles.find(v => v.license_plate && v.license_plate.replace(/[-\s]/g, '').toLowerCase() === normPlate);
    const homeBase = vehicle?.home_base_lat && vehicle?.home_base_lon ? {
      lat: vehicle.home_base_lat, lon: vehicle.home_base_lon, radius: vehicle.home_base_radius_m || 500
    } : null;

    // Fetch segments
    const stopDate = new Date(date);
    stopDate.setDate(stopDate.getDate() + 1);
    const tripsJson = await naitonCall([{
      name: "dataexchange_trips",
      arguments: [
        { name: "gpsassetids", value: [matchedAsset.gpsassetid] },
        { name: "includefields", value: ["driver"] },
        { name: "starttime", value: date },
        { name: "stoptime", value: stopDate.toISOString().split('T')[0] },
        { name: "includeallattributes", value: true },
      ]
    }]);

    const segments = (tripsJson.dataexchange_trips || [])
      .filter(s => s.gpsassetid === matchedAsset.gpsassetid)
      .sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));

    // Show last N segments with full detail
    const lastSegs = segments.slice(-count).map(s => {
      const lat = Number(s.stoplat || s.startlat || 0);
      const lon = Number(s.stoplon || s.startlon || 0);
      return {
        type: (s.type || '').toLowerCase(),
        start: s.start,
        stop: s.stop,
        lat,
        lon,
        dist_standplaats_m: (lat && lon && dbStandplaatsen.length > 0) 
          ? Math.round(Math.min(...dbStandplaatsen.map(sp => gpsDistanceM(lat, lon, sp.lat, sp.lon))))
          : null,
        dist_homebase_m: (lat && lon && homeBase) 
          ? Math.round(gpsDistanceM(lat, lon, homeBase.lat, homeBase.lon))
          : null,
        is_within_homebase: (lat && lon && homeBase) 
          ? gpsDistanceM(lat, lon, homeBase.lat, homeBase.lon) <= homeBase.radius
          : false,
        odo_start: s.odometerstartkm,
        odo_stop: s.odometerstopkm,
        driver: (() => {
          try {
            const ad = typeof s.additionaldata === 'string' ? JSON.parse(s.additionaldata) : s.additionaldata;
            return ad?.Driver || null;
          } catch { return null; }
        })(),
      };
    });

    return Response.json({
      plate,
      home_base: homeBase,
      total_segments: segments.length,
      last_segments: lastSegs,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});