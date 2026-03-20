// Check flagsjson and displayvaluesjson in currentpositions for ignition data
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

    const payload = JSON.stringify({
      includeFields: [],
      onlyWithCurrentPositions: true,
      groupIds: null,
      gpsAssetIds: null, // all assets
    });
    
    const formData = new FormData();
    formData.append('_payload', payload);
    
    const res = await fetch(`${BASE_URL}/datad/execute/dataexchange_currentpositions`, {
      method: 'POST',
      headers: { 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
      body: formData,
    });
    const posJson = await res.json();
    const positions = posJson.dataexchange_currentpositions || [];

    // Extract only vehicles (not tags) with interesting fields
    const vehicles = positions
      .filter(p => p.licenceplate) // Only real vehicles
      .map(p => {
        let flags = null, display = null;
        try { flags = p.flagsjson ? JSON.parse(p.flagsjson) : null; } catch { flags = p.flagsjson; }
        try { display = p.displayvaluesjson ? JSON.parse(p.displayvaluesjson) : null; } catch { display = p.displayvaluesjson; }
        
        return {
          plate: p.licenceplate,
          name: p.gpsassetname,
          velocity: p.velocity,
          timestamp: p.gpstimestamp,
          flags_raw: p.flags,
          flags_json: flags,
          display_values: display,
          health: p.healthjson ? (() => { try { return JSON.parse(p.healthjson); } catch { return p.healthjson; } })() : null,
        };
      });

    return Response.json({
      vehicle_count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});