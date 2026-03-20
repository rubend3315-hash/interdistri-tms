// Debug: fuel data from trips + assetsensors deeper test
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

    // Get assets
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

    // Pick V-10-LVJ (known vehicle with trips)
    const target = assets.find(a => a.assetname?.includes('V-10')) || assets.find(a => a.gpsassetid);
    
    const results = {
      target: { name: target.assetname, gpsassetid: target.gpsassetid },
    };

    // Get trips for last 2 days
    const tripsRes = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{
        name: "dataexchange_trips",
        arguments: [
          { name: "gpsassetids", value: [target.gpsassetid] },
          { name: "starttime", value: "2026-03-19" },
          { name: "stoptime", value: "2026-03-20" },
          { name: "includeallattributes", value: true },
        ]
      }]),
    });
    const tripsJson = await tripsRes.json();
    const trips = tripsJson.dataexchange_trips || [];

    results.trip_count = trips.length;
    results.fuel_data = trips.slice(0, 8).map(t => ({
      type: t.type,
      start: t.start,
      stop: t.stop,
      distance_m: t.distance,
      totalfuelusedstart: t.totalfuelusedstart,
      totalfuelusedstop: t.totalfuelusedstop,
      fuel_consumed_liters: (t.totalfuelusedstop != null && t.totalfuelusedstart != null)
        ? Number((t.totalfuelusedstop - t.totalfuelusedstart).toFixed(2)) : null,
      odometerstartkm: t.odometerstartkm,
      odometerstopkm: t.odometerstopkm,
      km: (t.odometerstopkm && t.odometerstartkm) ? Number((t.odometerstopkm - t.odometerstartkm).toFixed(1)) : null,
    }));

    // Calculate fuel per 100km for Drive segments
    const driveTrips = trips.filter(t => t.type === 'Drive' && t.totalfuelusedstop > t.totalfuelusedstart);
    results.drive_trips_with_fuel = driveTrips.length;
    results.fuel_efficiency = driveTrips.slice(0, 5).map(t => {
      const liters = t.totalfuelusedstop - t.totalfuelusedstart;
      const km = (t.odometerstopkm - t.odometerstartkm);
      return {
        start: t.start,
        km: Number(km.toFixed(1)),
        liters: Number(liters.toFixed(2)),
        liters_per_100km: km > 0 ? Number((liters / km * 100).toFixed(1)) : null,
      };
    });

    // Try assetsensors with companyid-based approach
    // Based on the DB schema: public.dataexchange_assetsensors(assetuuid, s_personid, s_companyid)
    // Since assetuuid is not in asset data, try with assetid or gpsassetid as uuid
    const sensorTests = [
      { label: "gpsassetid_as_uuid", args: [{ name: "assetuuid", value: target.gpsassetid }] },
      { label: "with_companyid", args: [{ name: "assetuuid", value: target.gpsassetid }, { name: "s_companyid", value: target.companyid || 8971 }] },
      { label: "assetid_int", args: [{ name: "assetid", value: target.assetid }] },
    ];

    for (const test of sensorTests) {
      try {
        const res = await fetch(`${BASE_URL}/datad/execute`, {
          method: 'POST',
          headers,
          body: JSON.stringify([{ name: "dataexchange_assetsensors", arguments: test.args }]),
        });
        const text = await res.text();
        results[`sensor_${test.label}`] = {
          status: res.status,
          response: text.slice(0, 400),
        };
      } catch (err) {
        results[`sensor_${test.label}`] = { error: err.message };
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});