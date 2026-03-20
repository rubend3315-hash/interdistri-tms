// Exhaustive search for sensor history API
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

    // More function name variations based on common Naiton/Flowter naming patterns
    const tests = [
      // sensor_ prefix
      "sensor_getdata",
      "sensor_gethistory",
      "sensor_history",
      // asset_ prefix  
      "asset_sensordata",
      "asset_getsensordata",
      // gps_ prefix
      "gps_sensordata",
      "gps_sensorhistory",
      // Without dataexchange_ prefix
      "assetsensors_getdata",
      "assetsensors_gethistory",
      // Possible REST-style patterns using assetsensors as base
      "dataexchange_assetsensors_data",
      "dataexchange_assetsensors_history",
      // CurrentPositions style (known working function)
      "dataexchange_currentpositions",
    ];

    const results = {};

    for (const fn of tests) {
      try {
        const res = await fetch(`${BASE_URL}/datad/execute`, {
          method: 'POST',
          headers,
          body: JSON.stringify([{
            name: fn,
            arguments: [
              { name: "assetuuid", value: truckUuid },
              { name: "sensorid", value: 261 },
              { name: "starttime", value: "2026-03-19" },
              { name: "stoptime", value: "2026-03-20" },
            ]
          }]),
        });
        const text = await res.text();
        const isNotFound = text.includes('does not exist');
        if (!isNotFound) {
          results[fn] = { status: res.status, response: text.slice(0, 500) };
        } else {
          results[fn] = 'NOT_FOUND';
        }
      } catch (err) {
        results[fn] = { error: err.message };
      }
    }

    // Also try calling assetsensors with extra parameters to get data values
    try {
      const res = await fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify([{
          name: "dataexchange_assetsensors",
          arguments: [
            { name: "assetuuid", value: truckUuid },
            { name: "sensorids", value: [261, 10] },
            { name: "starttime", value: "2026-03-19" },
            { name: "stoptime", value: "2026-03-20" },
            { name: "includedata", value: true },
            { name: "includehistory", value: true },
          ]
        }]),
      });
      const text = await res.text();
      results['assetsensors_with_data_params'] = { status: res.status, response: text.slice(0, 600) };
      try {
        const parsed = JSON.parse(text);
        const data = parsed.dataexchange_assetsensors;
        if (Array.isArray(data) && data.length > 0) {
          results['assetsensors_with_data_keys'] = Object.keys(data[0]).sort();
          results['assetsensors_with_data_sample'] = data.slice(0, 3);
        }
      } catch {}
    } catch (err) {
      results['assetsensors_with_data_params'] = { error: err.message };
    }

    // Try currentpositions to confirm it works (validation)
    try {
      const res = await fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify([{
          name: "dataexchange_currentpositions",
          arguments: [
            { name: "gpsAssetIds", value: [truckUuid] },
            { name: "onlyWithCurrentPositions", value: true },
          ]
        }]),
      });
      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        const data = parsed.dataexchange_currentpositions;
        if (Array.isArray(data) && data.length > 0) {
          results['currentpositions_keys'] = Object.keys(data[0]).sort();
          // Check if there's ignition/contact info in currentpositions
          const sample = data[0];
          const relevantKeys = Object.keys(sample).filter(k => 
            /ignit|contact|engine|status|speed|moving/i.test(k)
          );
          results['currentpositions_ignition_keys'] = relevantKeys;
          results['currentpositions_ignition_values'] = {};
          for (const k of relevantKeys) {
            results['currentpositions_ignition_values'][k] = sample[k];
          }
        }
      } catch {}
    } catch (err) {
      results['currentpositions'] = { error: err.message };
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});