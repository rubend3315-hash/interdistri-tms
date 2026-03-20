// Test function to check if Naiton dataexchange_trips returns driver info with includefields
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
    const apiHeaders = {
      'Content-Type': 'application/json',
      'ClientId': CLIENT_ID,
      'ClientSecret': CLIENT_SECRET,
    };

    const body = await req.json().catch(() => ({}));
    const gpsassetid = body.gpsassetid || '5b377cc5-e555-4163-84e3-0fcc4f157d06'; // Edwin's vehicle VZD-87-T
    const starttime = body.starttime || '2026-03-19T00:00';
    const stoptime = body.stoptime || '2026-03-20T23:00';

    // Test 1: With includefields containing "driver"
    const withDriverRes = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify([{
        name: "dataexchange_trips",
        arguments: [
          { name: "gpsassetids", value: JSON.stringify([gpsassetid]) },
          { name: "includefields", value: JSON.stringify(["odometerstartam", "odometerstopam", "totalfuelconstart", "totalfuelconsumption", "startaddress", "stopaddress", "gpsdata", "address", "location", "driver", "startam", "trucktrailer", "gpsdatawithsensors"]) },
          { name: "starttime", value: starttime },
          { name: "stoptime", value: stoptime },
          { name: "includeallattributes", value: true },
          { name: "clienttimezone", value: "UTC" }
        ]
      }])
    });

    if (!withDriverRes.ok) {
      const errText = await withDriverRes.text();
      return Response.json({ error: `Naiton API error: ${withDriverRes.status}`, details: errText.slice(0, 2000) });
    }

    const withDriverData = await withDriverRes.json();
    const trips = withDriverData.dataexchange_trips || [];

    // Extract all unique keys from the trip data
    const allKeys = new Set();
    for (const trip of trips) {
      for (const key of Object.keys(trip)) allKeys.add(key);
    }

    // Check for driver-related fields
    const driverKeys = [...allKeys].filter(k => {
      const lower = k.toLowerCase();
      return lower.includes('driver') || lower.includes('person') || lower.includes('user') || lower.includes('name');
    });

    return Response.json({
      total_trips: trips.length,
      all_keys: [...allKeys].sort(),
      driver_related_keys: driverKeys,
      // Full dump of first 3 trips for inspection
      sample_trips: trips.slice(0, 3).map(t => {
        // Return all fields but truncate gpsdata arrays
        const clean = { ...t };
        if (clean.gpsdata && Array.isArray(clean.gpsdata)) clean.gpsdata = `[${clean.gpsdata.length} points]`;
        if (clean.gpsdatawithsensors && Array.isArray(clean.gpsdatawithsensors)) clean.gpsdatawithsensors = `[${clean.gpsdatawithsensors.length} points]`;
        return clean;
      }),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});