// Focused test: assetsensors API with various parameters
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

    // Test assetsensors with gpsassetid as uuid (since assetuuid is not in assets)
    const gpsId = "6de7b3bc-8ce4-4b71-bcb9-89666e95990c"; // V-10-LVJ

    const tests = [
      { label: "uuid_only", body: [{ name: "dataexchange_assetsensors", arguments: [{ name: "assetuuid", value: gpsId }] }] },
      { label: "uuid_company", body: [{ name: "dataexchange_assetsensors", arguments: [{ name: "assetuuid", value: gpsId }, { name: "s_companyid", value: 8971 }] }] },
      { label: "uuid_person_company", body: [{ name: "dataexchange_assetsensors", arguments: [{ name: "assetuuid", value: gpsId }, { name: "s_personid", value: 0 }, { name: "s_companyid", value: 8971 }] }] },
      // Try sensordata API
      { label: "sensordata_uuid", body: [{ name: "dataexchange_sensordata", arguments: [{ name: "assetuuid", value: gpsId }, { name: "starttime", value: "2026-03-19" }, { name: "stoptime", value: "2026-03-20" }] }] },
      // Try to list all available functions
      { label: "list_functions", body: [{ name: "dataexchange_functions", arguments: [] }] },
    ];

    const results = {};
    for (const test of tests) {
      try {
        const res = await fetch(`${BASE_URL}/datad/execute`, {
          method: 'POST',
          headers,
          body: JSON.stringify(test.body),
        });
        const text = await res.text();
        results[test.label] = {
          status: res.status,
          response: text.slice(0, 500),
        };
        
        // If it has data, extract more
        try {
          const parsed = JSON.parse(text);
          const dataKey = Object.keys(parsed).find(k => k.startsWith('dataexchange_'));
          if (dataKey && Array.isArray(parsed[dataKey]) && parsed[dataKey].length > 0) {
            results[test.label + '_keys'] = Object.keys(parsed[dataKey][0]).sort();
            results[test.label + '_count'] = parsed[dataKey].length;
            results[test.label + '_sample'] = parsed[dataKey].slice(0, 3);
          }
        } catch {}
      } catch (err) {
        results[test.label] = { error: err.message };
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});