// Debug: test which Naiton API functions exist
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

    // Test various potential Naiton API endpoints for ignition/contact data
    const apiTests = [
      'dataexchange_ignitions',
      'dataexchange_events', 
      'dataexchange_contactstatus',
      'dataexchange_status',
      'dataexchange_livedata',
      'dataexchange_lastpositions',
    ];

    const results = {};
    
    for (const apiName of apiTests) {
      try {
        const res = await fetch(`${BASE_URL}/datad/execute`, {
          method: 'POST',
          headers,
          body: JSON.stringify([{ name: apiName, arguments: [] }]),
        });
        const text = await res.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 500); }
        results[apiName] = {
          status: res.status,
          has_data: res.ok,
          keys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : [],
          sample: typeof parsed === 'object' ? JSON.stringify(parsed).slice(0, 300) : String(parsed).slice(0, 300),
        };
      } catch (err) {
        results[apiName] = { error: err.message };
      }
    }

    // Also try lastpositions with a specific asset
    try {
      const assetsRes = await fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify([{ name: "dataexchange_assets", arguments: [{ name: "inactiveAttributes", value: true }] }]),
      });
      const assetsJson = await assetsRes.json();
      const assets = assetsJson.dataexchange_assets || [];
      const firstGpsId = assets.find(a => a.gpsassetid)?.gpsassetid;
      
      if (firstGpsId) {
        const lpRes = await fetch(`${BASE_URL}/datad/execute`, {
          method: 'POST',
          headers,
          body: JSON.stringify([{ 
            name: "dataexchange_lastpositions", 
            arguments: [{ name: "gpsassetids", value: [firstGpsId] }] 
          }]),
        });
        const lpText = await lpRes.text();
        let lpParsed;
        try { lpParsed = JSON.parse(lpText); } catch { lpParsed = lpText.slice(0, 500); }
        results['dataexchange_lastpositions_with_asset'] = {
          status: lpRes.status,
          sample: typeof lpParsed === 'object' ? JSON.stringify(lpParsed).slice(0, 800) : String(lpParsed).slice(0, 800),
          keys: lpParsed && typeof lpParsed === 'object' ? Object.keys(lpParsed) : [],
        };
        
        // Check if lastpositions data has ignition fields
        const lpData = lpParsed?.dataexchange_lastpositions;
        if (Array.isArray(lpData) && lpData.length > 0) {
          results['lastposition_all_keys'] = Object.keys(lpData[0]).sort();
          results['lastposition_ignition_keys'] = Object.keys(lpData[0]).filter(k => /ignit|contact|engine|acc|power|status|volt|batt/i.test(k));
          results['lastposition_sample'] = lpData[0];
        }
      }
    } catch (err) {
      results['lastpositions_detail'] = { error: err.message };
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});