// Debug: test dataexchange_assetsensors API for ignition/fuel data
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const BASE_URL = 'https://dawa-prod.naiton.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { plate, gpsassetid } = await req.json();

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');
    const headers = {
      'Content-Type': 'application/json',
      'ClientId': CLIENT_ID,
      'ClientSecret': CLIENT_SECRET,
    };

    // First get assets to find the target
    const assetsRes = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{
        name: "dataexchange_assets",
        arguments: [{ name: "inactiveAttributes", value: true }]
      }]),
    });
    const assetsJson = await assetsRes.json();
    const assets = assetsJson.dataexchange_assets || [];

    let targetAsset = null;
    if (plate) {
      const plateClean = plate.replace(/[-\s]/g, '').toUpperCase();
      targetAsset = assets.find(a => {
        const ap = (a.licenseplate || '').replace(/[-\s]/g, '').toUpperCase();
        return ap === plateClean;
      });
    } else if (gpsassetid) {
      targetAsset = assets.find(a => String(a.gpsassetid) === String(gpsassetid));
    } else {
      targetAsset = assets.find(a => a.gpsassetid);
    }

    if (!targetAsset) {
      return Response.json({ error: 'Asset not found', plate, available: assets.length });
    }

    const results = { asset: { name: targetAsset.assetname, plate: targetAsset.licenseplate, gpsassetid: targetAsset.gpsassetid, uuid: targetAsset.assetuuid } };

    // Test various sensor-related APIs
    const sensorApis = [
      'dataexchange_assetsensors',
      'dataexchange_sensordata',
      'dataexchange_sensors',
      'dataexchange_assetstatus',
      'dataexchange_fueldata',
    ];

    for (const apiName of sensorApis) {
      // Try with different argument combinations
      const argSets = [
        [],
        [{ name: "assetuuid", value: targetAsset.assetuuid }],
        [{ name: "gpsassetids", value: [targetAsset.gpsassetid] }],
        [{ name: "assetuuids", value: [targetAsset.assetuuid] }],
      ];

      for (let i = 0; i < argSets.length; i++) {
        try {
          const res = await fetch(`${BASE_URL}/datad/execute`, {
            method: 'POST',
            headers,
            body: JSON.stringify([{ name: apiName, arguments: argSets[i] }]),
          });
          const text = await res.text();
          let parsed;
          try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 500); }
          
          const hasError = parsed?.error;
          if (hasError && hasError.message?.includes('does not exist')) {
            results[apiName] = { exists: false };
            break; // No need to try other arg sets
          }
          
          results[`${apiName}_args${i}`] = {
            status: res.status,
            ok: res.ok,
            response: typeof parsed === 'object' ? parsed : String(parsed).slice(0, 500),
          };

          // If we got data, check the keys
          const data = parsed?.[apiName];
          if (Array.isArray(data) && data.length > 0) {
            results[`${apiName}_keys`] = Object.keys(data[0]).sort();
            results[`${apiName}_sample`] = data.slice(0, 3);
            results[`${apiName}_count`] = data.length;
            break; // Got data, no need for more arg sets
          }
        } catch (err) {
          results[`${apiName}_args${i}_error`] = err.message;
        }
      }
    }

    // Also try trips with includefields for fuel fields
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tripsRes = await fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify([{
          name: "dataexchange_trips",
          arguments: [
            { name: "gpsassetids", value: [targetAsset.gpsassetid] },
            { name: "starttime", value: yesterday.toISOString().split('T')[0] },
            { name: "stoptime", value: now.toISOString().split('T')[0] },
            { name: "includeallattributes", value: true },
          ]
        }]),
      });
      const tripsJson = await tripsRes.json();
      const trips = tripsJson.dataexchange_trips || [];
      
      if (trips.length > 0) {
        results.trips_all_keys = Object.keys(trips[0]).sort();
        results.trips_fuel_keys = Object.keys(trips[0]).filter(k => /fuel|brandstof|liter|consumption|tank/i.test(k));
        results.trips_fuel_sample = trips.slice(0, 2).map(t => ({
          type: t.type,
          start: t.start,
          stop: t.stop,
          totalfuelusedstart: t.totalfuelusedstart,
          totalfuelusedstop: t.totalfuelusedstop,
          distance: t.distance,
          odometerstartkm: t.odometerstartkm,
          odometerstopkm: t.odometerstopkm,
        }));
      }
      results.trips_count = trips.length;
    } catch (err) {
      results.trips_error = err.message;
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});