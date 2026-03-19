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

    // Collect all stop segments with their addresses
    const stops = segments
      .filter(s => (s.type || '').toLowerCase() === 'stop')
      .map(s => ({
        address: s.address || null,
        location: s.location || null,
        locationname: s.locationname || null,
        city: s.city || null,
        street: s.street || null,
        postalcode: s.postalcode || null,
        lat: s.latitude || s.lat || null,
        lng: s.longitude || s.lng || s.lon || null,
        gpsassetid: s.gpsassetid,
        start: s.start,
        stop: s.stop,
      }));

    // Find unique addresses
    const uniqueAddresses = {};
    for (const s of stops) {
      const key = `${s.address || ''}|${s.location || ''}|${s.street || ''}|${s.city || ''}`;
      if (!uniqueAddresses[key]) {
        uniqueAddresses[key] = { ...s, count: 0 };
      }
      uniqueAddresses[key].count++;
    }

    // Get all field names from first segment 
    const sampleSeg = segments[0] || {};
    const allFields = Object.keys(sampleSeg);

    // Find segments that might be standplaats (fleerbos/kapelle)
    const standplaatsMatches = stops.filter(s => {
      const all = JSON.stringify(s).toLowerCase();
      return all.includes('fleerbos') || all.includes('kapelle');
    });

    return Response.json({
      total_segments: segments.length,
      total_stops: stops.length,
      unique_addresses: Object.values(uniqueAddresses).sort((a, b) => b.count - a.count).slice(0, 30),
      standplaats_matches: standplaatsMatches.slice(0, 10),
      sample_segment_fields: allFields,
      sample_stop: stops[0] || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});