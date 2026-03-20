// Get all sensor names + sensordata for ignition/fuel
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const BASE_URL = 'https://dawa-prod.naiton.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { gpsassetid } = await req.json().catch(() => ({}));
    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');
    const headers = {
      'Content-Type': 'application/json',
      'ClientId': CLIENT_ID,
      'ClientSecret': CLIENT_SECRET,
    };

    const uuid = gpsassetid || "6de7b3bc-8ce4-4b71-bcb9-89666e95990c"; // V-10-LVJ

    // Get all sensors for this vehicle
    const sensorsRes = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ name: "dataexchange_assetsensors", arguments: [{ name: "assetuuid", value: uuid }] }]),
    });
    const sensorsJson = await sensorsRes.json();
    const sensors = sensorsJson.dataexchange_assetsensors || [];

    const results = {
      vehicle_uuid: uuid,
      sensor_count: sensors.length,
      all_sensors: sensors.map(s => ({ id: s.sensorid, name: s.sensorname, last_data: s.datetime })),
    };

    // Try sensordata for the vehicle
    const sensorDataRes = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{
        name: "dataexchange_sensordata",
        arguments: [
          { name: "assetuuid", value: uuid },
          { name: "starttime", value: "2026-03-19T00:00:00Z" },
          { name: "stoptime", value: "2026-03-20T00:00:00Z" },
        ]
      }]),
    });
    const sdText = await sensorDataRes.text();
    try {
      const sdJson = JSON.parse(sdText);
      const sdData = sdJson.dataexchange_sensordata;
      if (Array.isArray(sdData)) {
        results.sensordata_count = sdData.length;
        results.sensordata_keys = sdData.length > 0 ? Object.keys(sdData[0]).sort() : [];
        // Group by sensor name to show what data is available
        const bySensor = {};
        for (const d of sdData) {
          const name = d.sensorname || d.sensor || `sensor_${d.sensorid}`;
          if (!bySensor[name]) bySensor[name] = { count: 0, sample: null };
          bySensor[name].count++;
          if (!bySensor[name].sample) bySensor[name].sample = d;
        }
        results.sensordata_by_sensor = bySensor;
      } else {
        results.sensordata_raw = sdText.slice(0, 600);
      }
    } catch {
      results.sensordata_raw = sdText.slice(0, 600);
    }

    // Also check a truck
    const truckUuid = "62f30c62-bc73-42d8-8761-8de1f320feb2"; // 91-BSP-6
    const truckSensorsRes = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ name: "dataexchange_assetsensors", arguments: [{ name: "assetuuid", value: truckUuid }] }]),
    });
    const truckSensorsJson = await truckSensorsRes.json();
    const truckSensors = truckSensorsJson.dataexchange_assetsensors || [];
    results.truck_sensors = truckSensors.map(s => ({ id: s.sensorid, name: s.sensorname, last_data: s.datetime }));

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});