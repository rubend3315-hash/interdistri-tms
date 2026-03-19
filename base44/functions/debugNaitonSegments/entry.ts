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

    const { date, plate } = await req.json();
    const dateFrom = date || '2026-03-18';
    const dateTo = new Date(dateFrom);
    dateTo.setDate(dateTo.getDate() + 1);
    const dateToStr = dateTo.toISOString().split('T')[0];

    // Get assets + locations in parallel
    const [assetsRes, locationsRes] = await Promise.all([
      fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
        body: JSON.stringify([{ name: "dataexchange_assets", arguments: [{ name: "inactiveAttributes", value: true }] }]),
      }),
      fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
        body: JSON.stringify([{ name: "locationmanager_getlocations", arguments: [] }]),
      }).catch(err => ({ ok: false, error: err.message })),
    ]);
    const assetsJson = await assetsRes.json();
    const assets = assetsJson.dataexchange_assets || [];
    const gpsIds = assets.filter(a => a.gpsassetid).map(a => a.gpsassetid);

    let locations = [];
    try {
      if (locationsRes.ok) {
        const locJson = await locationsRes.json();
        locations = locJson.locationmanager_getlocations || locJson.locations || [];
        // Try all possible root keys
        if (locations.length === 0) {
          const keys = Object.keys(locJson);
          for (const k of keys) {
            if (Array.isArray(locJson[k]) && locJson[k].length > 0) {
              locations = locJson[k];
              break;
            }
          }
        }
      }
    } catch {};

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

    // Find stops near PostNL depot (Columbusweg 62, Goes)
    const DEPOT_LAT = 51.4846;
    const DEPOT_LON = 3.8898;
    const depotStops = stops.filter(s => {
      const lat = s.stoplat || s.startlat;
      const lon = s.stoplon || s.startlon;
      if (!lat || !lon) return false;
      return gpsDistanceM(lat, lon, DEPOT_LAT, DEPOT_LON) <= 500;
    });

    // Also find stops with "depot" or "postnl" in additionaldata
    const depotNameStops = stops.filter(s => {
      const raw = s.raw_additionaldata || '';
      return /depot|postnl/i.test(raw);
    });

    // If plate filter provided, show detailed timeline for that vehicle
    if (plate) {
      const normPlate = plate.replace(/[-\s]/g, '').toLowerCase();
      const matchedAsset = assets.find(a => 
        a.licenceplate && a.licenceplate.replace(/[-\s]/g, '').toLowerCase() === normPlate
      );
      if (!matchedAsset) {
        return Response.json({ error: `Kenteken ${plate} niet gevonden in assets` }, { status: 404 });
      }
      const assetId = matchedAsset.gpsassetid;
      
      // Get ALL segments for this asset, sorted by time
      const vehicleSegs = segments
        .filter(s => s.gpsassetid === assetId)
        .sort((a, b) => new Date(a.start || a.stop) - new Date(b.start || b.stop));
      
      const DEPOT_LOCATIONS = [
        { name: 'PostNL Sorteercentrum Goes', lat: 51.4943, lon: 3.8778 },
        { name: 'PostNL Pakketten Goes', lat: 51.4846, lon: 3.8898 },
      ];
      const DEPOT_RADIUS = 300;
      
      const timeline = vehicleSegs.map(s => {
        const type = (s.type || '').toLowerCase();
        const lat = Number(s.stoplat || s.startlat || 0);
        const lon = Number(s.stoplon || s.startlon || 0);
        const startT = new Date(s.start);
        const stopT = new Date(s.stop || s.end || s.start);
        const durMin = Math.round((stopT - startT) / 60000);
        
        const distStandplaats = (lat && lon) ? Math.round(gpsDistanceM(lat, lon, STANDPLAATS_LAT, STANDPLAATS_LON)) : null;
        const isStandplaats = distStandplaats !== null && distStandplaats <= 500;
        
        let depotMatch = null;
        if (lat && lon) {
          for (const d of DEPOT_LOCATIONS) {
            if (gpsDistanceM(lat, lon, d.lat, d.lon) <= DEPOT_RADIUS) {
              depotMatch = d.name;
              break;
            }
          }
        }
        
        let classification = type === 'drive' ? 'RIJDEN' : 'STOP';
        if (type === 'stop') {
          if (isStandplaats) classification = 'STANDPLAATS';
          else if (depotMatch) classification = 'DEPOT';
          else if (durMin > 5) classification = 'STILSTAND_LANG';
          else classification = 'STILSTAND_KORT';
        }
        
        return {
          type,
          start: s.start,
          stop: s.stop,
          duration_min: durMin,
          lat: lat || null,
          lon: lon || null,
          dist_standplaats_m: distStandplaats,
          classification,
          depot_name: depotMatch,
          odometer_start: s.odometerstartkm || null,
          odometer_stop: s.odometerstopkm || null,
        };
      });
      
      // Summary
      const inRideSegs = timeline.filter(t => {
        const h = new Date(t.start).getUTCHours();
        const m = new Date(t.start).getUTCMinutes();
        const timeVal = h * 60 + m;
        // Between 06:00 and 18:00 UTC (rough working hours)
        return timeVal >= 360 && timeVal <= 1080;
      });
      
      const longStops = timeline.filter(t => t.classification === 'STILSTAND_LANG');
      const depotStopsV = timeline.filter(t => t.classification === 'DEPOT');
      const standplaatsStops = timeline.filter(t => t.classification === 'STANDPLAATS');
      
      return Response.json({
        plate,
        asset_id: assetId,
        asset_name: matchedAsset.assetname,
        total_segments: vehicleSegs.length,
        // Only include timeline if < 30 segments, otherwise too large
        timeline: vehicleSegs.length <= 30 ? timeline : timeline.filter(t => t.classification !== 'RIJDEN' && t.classification !== 'STILSTAND_KORT'),
        summary: {
          depot_stops: depotStopsV.length,
          depot_total_min: depotStopsV.reduce((s, t) => s + t.duration_min, 0),
          long_stops: longStops.length,
          long_stops_total_min: longStops.reduce((s, t) => s + t.duration_min, 0),
          long_stops_detail: longStops.map(t => ({
            start: t.start,
            stop: t.stop,
            duration_min: t.duration_min,
            lat: t.lat,
            lon: t.lon,
          })),
          standplaats_stops: standplaatsStops.length,
        }
      });
    }

    return Response.json({
      total_segments: segments.length,
      total_stops: stops.length,
      stops_with_coords: withCoords.length,
      stops_near_standplaats: nearStandplaats.length,
      distance_distribution: distRanges,
      sample_segment_fields: allFields,
      naiton_locations: locations.slice(0, 20),
      naiton_locations_count: locations.length,
      depot_stops_by_coords: depotStops.slice(0, 10),
      depot_stops_by_name: depotNameStops.slice(0, 10),
      standplaats_stops: nearStandplaats.slice(0, 5),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});