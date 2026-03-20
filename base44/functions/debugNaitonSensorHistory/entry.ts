// Try to find the sensordata/history API function
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

    // V-10-LVJ uuid
    const uuid = "6de7b3bc-8ce4-4b71-bcb9-89666e95990c";
    // Truck 91-BSP-6 uuid  
    const truckUuid = "62f30c62-bc73-42d8-8761-8de1f320feb2";

    // Try various possible function names for sensor history data
    const functionNames = [
      "dataexchange_assetsensordata",
      "dataexchange_assetsensorhistory",
      "dataexchange_sensorvalues",
      "dataexchange_sensorgraph",
      "dataexchange_sensorhistory",
      "dataexchange_assetsensorvalues",
    ];

    const results = {};

    for (const fn of functionNames) {
      try {
        const res = await fetch(`${BASE_URL}/datad/execute`, {
          method: 'POST',
          headers,
          body: JSON.stringify([{
            name: fn,
            arguments: [
              { name: "assetuuid", value: truckUuid },
              { name: "sensorids", value: [261] }, // Fuel consumption sensor
              { name: "starttime", value: "2026-03-19T00:00:00Z" },
              { name: "stoptime", value: "2026-03-20T00:00:00Z" },
            ]
          }]),
        });
        const text = await res.text();
        results[fn] = { status: res.status, response: text.slice(0, 400) };
      } catch (err) {
        results[fn] = { error: err.message };
      }
    }

    // Also try the multipart/form-data approach for assetsensordata
    try {
      const payload = JSON.stringify({
        assetuuid: truckUuid,
        sensorids: [261],
        starttime: "2026-03-19T00:00:00Z",
        stoptime: "2026-03-20T00:00:00Z",
      });
      const formData = new FormData();
      formData.append('_payload', payload);
      
      const res = await fetch(`${BASE_URL}/datad/execute/dataexchange_assetsensordata`, {
        method: 'POST',
        headers: {
          'ClientId': CLIENT_ID,
          'ClientSecret': CLIENT_SECRET,
        },
        body: formData,
      });
      const text = await res.text();
      results['multipart_assetsensordata'] = { status: res.status, response: text.slice(0, 400) };
    } catch (err) {
      results['multipart_assetsensordata'] = { error: err.message };
    }

    // Try with different parameter structure (gpsassetids array)
    try {
      const res = await fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify([{
          name: "dataexchange_assetsensordata",
          arguments: [
            { name: "gpsassetids", value: [truckUuid] },
            { name: "sensorids", value: [261] },
            { name: "starttime", value: "2026-03-19" },
            { name: "stoptime", value: "2026-03-20" },
          ]
        }]),
      });
      const text = await res.text();
      results['assetsensordata_v2'] = { status: res.status, response: text.slice(0, 600) };
      
      // Parse to check for actual data
      try {
        const parsed = JSON.parse(text);
        const key = Object.keys(parsed).find(k => !k.includes('error'));
        if (key && Array.isArray(parsed[key])) {
          results['assetsensordata_v2_count'] = parsed[key].length;
          if (parsed[key].length > 0) {
            results['assetsensordata_v2_keys'] = Object.keys(parsed[key][0]);
            results['assetsensordata_v2_sample'] = parsed[key].slice(0, 3);
          }
        }
      } catch {}
    } catch (err) {
      results['assetsensordata_v2'] = { error: err.message };
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});