// Debug: deep dive into assetsensors with correct params
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

    // Get all assets to see what we have
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

    // List all assets with their fields
    const assetSummary = assets.map(a => ({
      name: a.assetname,
      plate: a.licenseplate,
      gpsassetid: a.gpsassetid,
      assetuuid: a.assetuuid,
      personid: a.personid,
      companyid: a.companyid,
    }));

    // Pick an asset that has an assetuuid
    const targetAsset = assets.find(a => a.assetuuid) || assets[0];
    
    const results = {
      total_assets: assets.length,
      assets_with_uuid: assets.filter(a => a.assetuuid).length,
      asset_summary: assetSummary.slice(0, 10),
      target_asset: {
        name: targetAsset?.assetname,
        plate: targetAsset?.licenseplate,
        gpsassetid: targetAsset?.gpsassetid,
        assetuuid: targetAsset?.assetuuid,
        all_keys: targetAsset ? Object.keys(targetAsset).sort() : [],
      },
    };

    // Try assetsensors with various param formats
    if (targetAsset?.assetuuid) {
      const sensorArgSets = [
        // s_personid / s_companyid based on the DB schema hint
        [{ name: "assetuuid", value: targetAsset.assetuuid }],
        [{ name: "assetuuid", value: String(targetAsset.assetuuid) }],
        [{ name: "s_personid", value: targetAsset.personid || 0 }, { name: "s_companyid", value: targetAsset.companyid || 9293 }],
        [{ name: "assetuuids", value: [targetAsset.assetuuid] }],
      ];

      for (let i = 0; i < sensorArgSets.length; i++) {
        try {
          const res = await fetch(`${BASE_URL}/datad/execute`, {
            method: 'POST',
            headers,
            body: JSON.stringify([{ name: "dataexchange_assetsensors", arguments: sensorArgSets[i] }]),
          });
          const text = await res.text();
          let parsed;
          try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 800); }
          
          results[`sensors_args${i}`] = {
            args: sensorArgSets[i],
            status: res.status,
            response: typeof parsed === 'object' ? JSON.stringify(parsed).slice(0, 600) : String(parsed).slice(0, 600),
          };

          // If got sensor data
          const sData = parsed?.dataexchange_assetsensors;
          if (Array.isArray(sData) && sData.length > 0) {
            results[`sensors_args${i}_keys`] = Object.keys(sData[0]).sort();
            results[`sensors_args${i}_sample`] = sData.slice(0, 5);
            results[`sensors_args${i}_count`] = sData.length;
            results[`sensors_ignition_fields`] = sData.map(s => s.sensorname).filter(n => /ignit|contact|key|engine|power|acc/i.test(n || ''));
            results[`sensors_fuel_fields`] = sData.map(s => s.sensorname).filter(n => /fuel|brandstof|tank|liter/i.test(n || ''));
            results[`sensors_all_names`] = sData.map(s => s.sensorname);
            break;
          }
        } catch (err) {
          results[`sensors_args${i}_error`] = err.message;
        }
      }
    }

    // Also get fuel data from trips for a vehicle with real trips
    const tripsAsset = assets.find(a => a.licenseplate && a.gpsassetid);
    if (tripsAsset) {
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 3);
      
      try {
        const tripsRes = await fetch(`${BASE_URL}/datad/execute`, {
          method: 'POST',
          headers,
          body: JSON.stringify([{
            name: "dataexchange_trips",
            arguments: [
              { name: "gpsassetids", value: [tripsAsset.gpsassetid] },
              { name: "starttime", value: weekAgo.toISOString().split('T')[0] },
              { name: "stoptime", value: now.toISOString().split('T')[0] },
              { name: "includeallattributes", value: true },
            ]
          }]),
        });
        const tripsJson = await tripsRes.json();
        const trips = tripsJson.dataexchange_trips || [];
        
        // Find trips with fuel changes
        const fuelTrips = trips.filter(t => t.totalfuelusedstart !== t.totalfuelusedstop);
        
        results.fuel_analysis = {
          vehicle: tripsAsset.assetname,
          plate: tripsAsset.licenseplate,
          total_trips: trips.length,
          trips_with_fuel_change: fuelTrips.length,
          sample: trips.slice(0, 5).map(t => ({
            type: t.type,
            start: t.start,
            stop: t.stop,
            distance: t.distance,
            totalfuelusedstart: t.totalfuelusedstart,
            totalfuelusedstop: t.totalfuelusedstop,
            fuel_consumed: t.totalfuelusedstop != null && t.totalfuelusedstart != null 
              ? (t.totalfuelusedstop - t.totalfuelusedstart) : null,
            odometerstartkm: t.odometerstartkm,
            odometerstopkm: t.odometerstopkm,
          })),
        };
      } catch (err) {
        results.fuel_analysis_error = err.message;
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});