// Try alternative Naiton endpoints for sensor graph data
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
    const authHeaders = {
      'ClientId': CLIENT_ID,
      'ClientSecret': CLIENT_SECRET,
    };

    const truckUuid = "62f30c62-bc73-42d8-8761-8de1f320feb2";
    const truckGpsAttribId = "e01a2870-c03b-404f-a3b9-92f1e6fece0e"; // from assets data

    const results = {};

    // Test 1: Try REST-style endpoint /datad/sensors/{uuid}
    const endpoints = [
      { label: "sensors_rest", url: `${BASE_URL}/datad/sensors/${truckUuid}` },
      { label: "sensor_data_rest", url: `${BASE_URL}/datad/sensordata/${truckUuid}?starttime=2026-03-19&stoptime=2026-03-20` },
      { label: "api_sensors", url: `${BASE_URL}/api/sensors/${truckUuid}` },
      { label: "api_sensordata", url: `${BASE_URL}/api/sensordata/${truckUuid}` },
      { label: "asset_sensors_rest", url: `${BASE_URL}/datad/asset/${truckUuid}/sensors` },
      { label: "asset_sensordata_rest", url: `${BASE_URL}/datad/asset/${truckUuid}/sensordata?from=2026-03-19&to=2026-03-20` },
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
        const text = await res.text();
        results[ep.label] = { status: res.status, response: text.slice(0, 300) };
      } catch (err) {
        results[ep.label] = { error: err.message };
      }
    }

    // Test 2: Try the trips endpoint with ignition/fuel include fields
    try {
      const res = await fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          name: "dataexchange_trips",
          arguments: [
            { name: "gpsassetids", value: [truckUuid] },
            { name: "starttime", value: "2026-03-19" },
            { name: "stoptime", value: "2026-03-20" },
            { name: "includefields", value: ["driver", "fuel", "sensors", "ignition"] },
            { name: "includeallattributes", value: true },
          ]
        }]),
      });
      const tripsJson = await res.json();
      const trips = tripsJson.dataexchange_trips || [];
      if (trips.length > 0) {
        // Find all keys that might relate to fuel/ignition
        const allKeys = new Set();
        for (const t of trips) { Object.keys(t).forEach(k => allKeys.add(k)); }
        const fuelIgnitionKeys = [...allKeys].filter(k => 
          /fuel|ignit|contact|engine|sensor|consumption|tank/i.test(k)
        );
        results['trips_fuel_ignition_keys'] = fuelIgnitionKeys;
        if (fuelIgnitionKeys.length > 0) {
          results['trips_fuel_ignition_sample'] = {};
          for (const k of fuelIgnitionKeys) {
            results['trips_fuel_ignition_sample'][k] = trips[0][k];
          }
        }
        // Check if any trip has non-null fuel data
        const fuelTrips = trips.filter(t => 
          t.totalfuelusedstart != null || t.totalfuelusedstop != null || 
          t.fuelconsumption != null || t.fuellevelstart != null
        );
        results['trips_with_fuel_data'] = fuelTrips.length;
        results['trips_total'] = trips.length;
        // Show ALL keys for reference
        results['trips_all_keys'] = [...allKeys].sort();
      }
    } catch (err) {
      results['trips_with_includes'] = { error: err.message };
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});