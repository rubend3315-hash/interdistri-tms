// Debug: show all segments for a specific vehicle in a time window
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BASE_URL = 'https://dawa-prod.naiton.com';

function gpsDistanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const STANDPLAATS = { lat: 51.4700, lon: 3.9716, radius: 500 };
const DEPOTS = [
  { name: 'PostNL Sorteercentrum Goes', lat: 51.4943, lon: 3.8778, radius: 300 },
  { name: 'PostNL Pakketten Goes', lat: 51.4846, lon: 3.8898, radius: 300 },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { date, plate } = await req.json();

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');
    const apiHeaders = { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET };

    const naitonCall = async (functions) => {
      const res = await fetch(`${BASE_URL}/datad/execute`, { method: 'POST', headers: apiHeaders, body: JSON.stringify(functions) });
      if (!res.ok) throw new Error(`Naiton API ${res.status}`);
      return res.json();
    };

    const stopDate = new Date(date);
    stopDate.setDate(stopDate.getDate() + 1);
    const stopDateStr = stopDate.toISOString().split('T')[0];

    const assetsJson = await naitonCall([{ name: "dataexchange_assets", arguments: [{ name: "inactiveAttributes", value: true }] }]);
    const assets = assetsJson.dataexchange_assets || [];
    
    const normPlate = plate.replace(/[-\s]/g, '').toLowerCase();
    const matchedAsset = assets.find(a => a.licenceplate && a.licenceplate.replace(/[-\s]/g, '').toLowerCase() === normPlate);
    if (!matchedAsset) return Response.json({ error: `Kenteken ${plate} niet gevonden` }, { status: 404 });

    const assetId = matchedAsset.gpsassetid;

    // Also load GpsLocation from DB for home base check
    const svc = base44.asServiceRole;
    const gpsLocations = await svc.entities.GpsLocation.filter({ is_active: true });
    const dbStandplaatsen = gpsLocations.filter(l => l.type === 'standplaats');
    const dbDepots = gpsLocations.filter(l => l.type === 'depot');

    // Check vehicle home base
    const allVehicles = await svc.entities.Vehicle.filter({});
    const vehicle = allVehicles.find(v => v.license_plate && v.license_plate.replace(/[-\s]/g, '').toLowerCase() === normPlate);
    const homeBase = vehicle?.home_base_lat && vehicle?.home_base_lon ? {
      lat: vehicle.home_base_lat, lon: vehicle.home_base_lon, radius: vehicle.home_base_radius_m || 500
    } : null;

    const tripsJson = await naitonCall([{
      name: "dataexchange_trips",
      arguments: [
        { name: "gpsassetids", value: [assetId] },
        { name: "includefields", value: ["driver"] },
        { name: "starttime", value: date },
        { name: "stoptime", value: stopDateStr },
        { name: "includeallattributes", value: true },
      ]
    }]);

    const segments = (tripsJson.dataexchange_trips || [])
      .filter(s => s.gpsassetid === assetId)
      .sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));

    const timeline = segments.map(s => {
      const type = (s.type || '').toLowerCase();
      const lat = Number(s.stoplat || s.startlat || 0);
      const lon = Number(s.stoplon || s.startlon || 0);
      const startT = new Date(s.start);
      const stopT = new Date(s.stop || s.start);
      const durMin = Math.round((stopT - startT) / 60000);

      // Classification
      const distStandplaats = (lat && lon) ? Math.round(gpsDistanceM(lat, lon, STANDPLAATS.lat, STANDPLAATS.lon)) : null;
      const isStandplaatsCoords = distStandplaats !== null && distStandplaats <= STANDPLAATS.radius;

      // Check DB standplaatsen
      const isDbStandplaats = dbStandplaatsen.some(sp => lat && lon && gpsDistanceM(lat, lon, sp.lat, sp.lon) <= (sp.radius_m || 500));

      // Check home base
      const isHomeBase = homeBase && lat && lon ? gpsDistanceM(lat, lon, homeBase.lat, homeBase.lon) <= homeBase.radius : false;

      // Check depots
      let depotMatch = null;
      if (lat && lon) {
        for (const d of DEPOTS) {
          if (gpsDistanceM(lat, lon, d.lat, d.lon) <= d.radius) { depotMatch = d.name; break; }
        }
        if (!depotMatch) {
          for (const d of dbDepots) {
            if (gpsDistanceM(lat, lon, d.lat, d.lon) <= (d.radius_m || 300)) { depotMatch = d.name; break; }
          }
        }
      }

      const isAnyStandplaats = isStandplaatsCoords || isDbStandplaats || isHomeBase;

      let classification = type;
      if (type === 'stop') {
        if (isAnyStandplaats) classification = 'STANDPLAATS';
        else if (depotMatch) classification = 'DEPOT';
        else if (durMin > 5) classification = 'STOP_LANG';
        else classification = 'STOP_KORT';
      }

      return {
        type,
        classification,
        start: s.start?.slice(11, 19),
        stop: (s.stop || s.start)?.slice(11, 19),
        duration_min: durMin,
        lat: lat ? lat.toFixed(6) : null,
        lon: lon ? lon.toFixed(6) : null,
        dist_standplaats_m: distStandplaats,
        is_standplaats: isAnyStandplaats,
        is_home_base: isHomeBase,
        depot: depotMatch,
        odo_start: s.odometerstartkm || null,
        odo_stop: s.odometerstopkm || null,
        distance_m: s.distance || 0,
        additionaldata: s.additionaldata || null,
      };
    });

    return Response.json({
      plate,
      asset_id: assetId,
      home_base: homeBase,
      db_standplaatsen: dbStandplaatsen.map(s => ({ name: s.name, lat: s.lat, lon: s.lon, radius: s.radius_m })),
      db_depots: dbDepots.map(d => ({ name: d.name, lat: d.lat, lon: d.lon, radius: d.radius_m })),
      total_segments: timeline.length,
      timeline,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});