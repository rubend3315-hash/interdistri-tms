// Test currentpositions for ignition/contact data
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
    const vanUuid = "6de7b3bc-8ce4-4b71-bcb9-89666e95990c";

    // Correct multipart form approach as per documentation
    const payload = JSON.stringify({
      includeFields: [],
      onlyWithCurrentPositions: true,
      groupIds: null,
      gpsAssetIds: [truckUuid, vanUuid],
    });
    
    const formData = new FormData();
    formData.append('_payload', payload);
    
    const res = await fetch(`${BASE_URL}/datad/execute/dataexchange_currentpositions`, {
      method: 'POST',
      headers: {
        'ClientId': CLIENT_ID,
        'ClientSecret': CLIENT_SECRET,
      },
      body: formData,
    });
    const posJson = await res.json();
    const positions = posJson.dataexchange_currentpositions || [];

    const results = {
      count: positions.length,
      all_keys: positions.length > 0 ? Object.keys(positions[0]).sort() : [],
    };

    // Show full data for both vehicles with focus on ignition/contact fields
    for (const pos of positions) {
      const plate = pos.licenceplate || pos.gpsassetid;
      results[plate] = pos;
    }

    // Also try JSON approach with correct params
    const res2 = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{
        name: "dataexchange_currentpositions",
        arguments: [
          { name: "includeFields", value: [] },
          { name: "onlyWithCurrentPositions", value: true },
          { name: "gpsAssetIds", value: [truckUuid, vanUuid] },
        ]
      }]),
    });
    const res2Text = await res2.text();
    results['json_approach'] = { status: res2.status, response: res2Text.slice(0, 500) };

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});