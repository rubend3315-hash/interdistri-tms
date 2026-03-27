// Debug: show segments for a vehicle between specific times
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

    const { date, plate, from_time, to_time } = await req.json();
    const fromH = from_time || '07:00';
    const toH = to_time || '10:00';

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');
    const apiHeaders = { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET };

    const naitonCall = async (fns) => {
      const res = await fetch(`${BASE_URL}/datad/execute`, { method: 'POST', headers: apiHeaders, body: JSON.stringify(fns) });
      return res.json();
    };

    const stopDate = new Date(date);
    stopDate.setDate(stopDate.getDate() + 1);

    const [assetsJson, locsRes] = await Promise.all([
      naitonCall([{ name: "dataexchange_assets", arguments: [{ name: "inactiveAttributes", value: true }] }]),
      base44.asServiceRole.entities.GpsLocation.filter({ is_active: true }),
    ]);

    const assets = assetsJson.dataexchange_assets || [];
    const normPlate = plate.replace(/[-\s]/g, '').toLowerCase();
    const matchedAsset = assets.find(a => a.licenceplate && a.licenceplate.replace(/[-\s]/g, '').toLowerCase() === normPlate);
    if (!matchedAsset) return Response.json({ error: 'Not found' }, { status: 404 });

    const assetId = matchedAsset.gpsassetid;
    const STANDPLAATS = { lat: 51.4700, lon: 3.9716, radius: 500 };
    const dbStandplaatsen = locsRes.filter(l => l.type === 'standplaats');

    const tripsJson = await naitonCall([{
      name: "dataexchange_trips",
      arguments: [
        { name: "gpsassetids", value: [assetId] },
        { name: "includefields", value: ["driver"] },
        { name: "starttime", value: date },
        { name: "stoptime", value: stopDate.toISOString().split('T')[0] },
        { name: "includeallattributes", value: true },
      ]
    }]);

    const segments = (tripsJson.dataexchange_trips || [])
      .filter(s => s.gpsassetid === assetId)
      .sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0))
      .filter(s => {
        const t = (s.start || '').slice(11, 16);
        return t >= fromH && t <= toH;
      });

    const result = segments.map((s, idx) => {
      const lat = Number(s.stoplat || s.startlat || 0);
      const lon = Number(s.stoplon || s.startlon || 0);
      const startLat = Number(s.startlat || 0);
      const startLon = Number(s.startlon || 0);
      const distStandplaats = (lat && lon) ? Math.round(gpsDistanceM(lat, lon, STANDPLAATS.lat, STANDPLAATS.lon)) : null;
      const distStandplaatsStart = (startLat && startLon) ? Math.round(gpsDistanceM(startLat, startLon, STANDPLAATS.lat, STANDPLAATS.lon)) : null;
      const isStandplaats = distStandplaats !== null && distStandplaats <= 150; // use DB radius
      const isStandplaatsDb = dbStandplaatsen.some(sp => lat && lon && gpsDistanceM(lat, lon, sp.lat, sp.lon) <= (sp.radius_m || 500));

      return {
        idx,
        type: s.type,
        start: s.start?.slice(11, 19),
        stop: (s.stop || s.start)?.slice(11, 19),
        dur_min: Math.round((new Date(s.stop || s.start) - new Date(s.start)) / 60000),
        startlat: startLat || null,
        startlon: startLon || null,
        stoplat: lat || null,
        stoplon: lon || null,
        dist_standplaats_stop: distStandplaats,
        dist_standplaats_start: distStandplaatsStart,
        is_standplaats_150m: isStandplaats,
        is_standplaats_db: isStandplaatsDb,
        odo_start: s.odometerstartkm,
        odo_stop: s.odometerstopkm,
        distance_m: s.distance,
      };
    });

    return Response.json({ plate, asset_id: assetId, window: `${fromH}-${toH}`, segments: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});