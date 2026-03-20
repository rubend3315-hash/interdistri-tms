// Check truck trips for ALL available fields especially fuel
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
    const headers = {
      'Content-Type': 'application/json',
      'ClientId': CLIENT_ID,
      'ClientSecret': CLIENT_SECRET,
    };

    const truckUuid = "62f30c62-bc73-42d8-8761-8de1f320feb2";

    // Get trips with ALL attributes for the truck
    const res = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{
        name: "dataexchange_trips",
        arguments: [
          { name: "gpsassetids", value: [truckUuid] },
          { name: "starttime", value: "2026-03-19" },
          { name: "stoptime", value: "2026-03-20" },
          { name: "includefields", value: ["driver"] },
          { name: "includeallattributes", value: true },
        ]
      }]),
    });
    const text = await res.text();
    const tripsJson = JSON.parse(text);
    const trips = tripsJson.dataexchange_trips || [];

    // Collect all unique keys across all trips
    const allKeys = new Set();
    for (const t of trips) { Object.keys(t).forEach(k => allKeys.add(k)); }
    const sortedKeys = [...allKeys].sort();

    // Find fuel/ignition related keys
    const fuelKeys = sortedKeys.filter(k => 
      /fuel|ignit|contact|engine|sensor|consumption|tank|adblue|battery/i.test(k)
    );

    // Check which keys have non-null values
    const nonNullKeys = {};
    for (const key of sortedKeys) {
      const nonNull = trips.filter(t => t[key] != null && t[key] !== '').length;
      if (nonNull > 0) nonNullKeys[key] = `${nonNull}/${trips.length}`;
    }

    // Show a drive segment and a stop segment sample
    const driveSeg = trips.find(t => (t.type || '').toLowerCase() === 'drive');
    const stopSeg = trips.find(t => (t.type || '').toLowerCase() === 'stop');

    return Response.json({
      trip_count: trips.length,
      all_keys: sortedKeys,
      fuel_related_keys: fuelKeys,
      keys_with_data: nonNullKeys,
      sample_drive: driveSeg ? Object.fromEntries(Object.entries(driveSeg).filter(([, v]) => v != null)) : null,
      sample_stop: stopSeg ? Object.fromEntries(Object.entries(stopSeg).filter(([, v]) => v != null)) : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});