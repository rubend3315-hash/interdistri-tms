// Diagnostic: show unique stop addresses for a given asset on a given date
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const BASE_URL = 'https://dawa-prod.naiton.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');

    const { date } = await req.json();
    const dateFrom = date || '2026-03-18';
    const dateTo = new Date(dateFrom);
    dateTo.setDate(dateTo.getDate() + 1);
    const dateToStr = dateTo.toISOString().split('T')[0];

    // Get assets
    const assetsRes = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
      body: JSON.stringify([{ name: "dataexchange_assets", arguments: [{ name: "inactiveAttributes", value: true }] }]),
    });
    const assetsJson = await assetsRes.json();
    const assets = assetsJson.dataexchange_assets || [];
    const gpsIds = assets.filter(a => a.gpsassetid).map(a => a.gpsassetid);

    // Get trips
    const tripsRes = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
      body: JSON.stringify([{
        name: "dataexchange_trips",
        arguments: [
          { name: "gpsassetids", value: gpsIds },
          { name: "starttime", value: dateFrom },
          { name: "stoptime", value: dateToStr },
          { name: "includeallattributes", value: true }
        ]
      }]),
    });
    const tripsJson = await tripsRes.json();
    const segments = tripsJson.dataexchange_trips || [];

    // Haversine distance in meters
    const gpsDistanceM = (lat1, lon1, lat2, lon2) => {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    const STANDPLAATS_LAT = 51.4700;
    const STANDPLAATS_LON = 3.9716;

    // Collect all stop segments with their GPS coordinates and additionaldata
    const stops = segments
      .filter(s => (s.type || '').toLowerCase() === 'stop')
      .map(s => {
        const stopLat = Number(s.stoplat || 0);
        const stopLon = Number(s.stoplon || 0);
        const startLat = Number(s.startlat || 0);
        const startLon = Number(s.startlon || 0);
        const lat = stopLat || startLat;
        const lon = stopLon || startLon;
        const dist = (lat && lon) ? Math.round(gpsDistanceM(lat, lon, STANDPLAATS_LAT, STANDPLAATS_LON)) : null;
        // Parse additionaldata for location info
        let additionalParsed = null;
        if (s.additionaldata) {
          try { additionalParsed = typeof s.additionaldata === 'string' ? JSON.parse(s.additionaldata) : s.additionaldata; } catch {}
        }
        return {
          gpsassetid: s.gpsassetid,
          start: s.start,
          stop: s.stop,
          startlat: startLat || null,
          startlon: startLon || null,
          stoplat: stopLat || null,
          stoplon: stopLon || null,
          distance_to_standplaats_m: dist,
          is_standplaats: dist !== null && dist <= 500,
          additionaldata: additionalParsed,
          raw_additionaldata: s.additionaldata ? String(s.additionaldata).slice(0, 500) : null,
        };
      });

    // Stats
    const withCoords = stops.filter(s => s.stoplat || s.startlat);
    const nearStandplaats = stops.filter(s => s.is_standplaats);

    // Group by distance ranges
    const distRanges = { '0-100m': 0, '100-500m': 0, '500-1000m': 0, '1-5km': 0, '5km+': 0, 'no_coords': 0 };
    for (const s of stops) {
      const d = s.distance_to_standplaats_m;
      if (d === null) distRanges['no_coords']++;
      else if (d <= 100) distRanges['0-100m']++;
      else if (d <= 500) distRanges['100-500m']++;
      else if (d <= 1000) distRanges['500-1000m']++;
      else if (d <= 5000) distRanges['1-5km']++;
      else distRanges['5km+']++;
    }

    // Get all field names from first segment 
    const sampleSeg = segments[0] || {};
    const allFields = Object.keys(sampleSeg);

    return Response.json({
      total_segments: segments.length,
      total_stops: stops.length,
      stops_with_coords: withCoords.length,
      stops_near_standplaats: nearStandplaats.length,
      distance_distribution: distRanges,
      sample_segment_fields: allFields,
      sample_stops: stops.slice(0, 5),
      standplaats_stops: nearStandplaats.slice(0, 10),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});