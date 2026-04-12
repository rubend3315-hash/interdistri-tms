// fetchRawNaitonData — Haalt ruwe Naiton data op voor een specifieke datum
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BASE_URL = 'https://dawa-prod.naiton.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { date } = await req.json();
    if (!date) return Response.json({ error: 'date is verplicht (yyyy-MM-dd)' }, { status: 400 });

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');
    const apiHeaders = {
      'Content-Type': 'application/json',
      'ClientId': CLIENT_ID,
      'ClientSecret': CLIENT_SECRET,
    };

    const naitonCall = async (functions) => {
      const res = await fetch(`${BASE_URL}/datad/execute`, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify(functions),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Naiton API ${res.status}: ${errText.slice(0, 500)}`);
      }
      return res.json();
    };

    // stoptime is exclusive — +1 day
    const stopDate = new Date(date);
    stopDate.setDate(stopDate.getDate() + 1);
    const stopDateStr = stopDate.toISOString().split('T')[0];

    // Fetch assets, users, trips in parallel
    const [assetsJson, usersJson] = await Promise.all([
      naitonCall([{ name: "dataexchange_assets", arguments: [{ name: "inactiveAttributes", value: true }] }]),
      naitonCall([{ name: "dataexchange_users" }]),
    ]);

    const assets = assetsJson.dataexchange_assets || [];
    const gpsIds = assets.filter(a => a.gpsassetid).map(a => a.gpsassetid);
    const naitonUsers = usersJson.dataexchange_users || [];

    // Batch gpsassetids in groups of 5 to avoid Naiton API empty-response bug
    const ASSET_BATCH_SIZE = 5;
    const segments = [];
    for (let bi = 0; bi < gpsIds.length; bi += ASSET_BATCH_SIZE) {
      const batchIds = gpsIds.slice(bi, bi + ASSET_BATCH_SIZE);
      const tripsJson = await naitonCall([{
        name: "dataexchange_trips",
        arguments: [
          { name: "gpsassetids", value: batchIds },
          { name: "includefields", value: ["driver"] },
          { name: "starttime", value: date },
          { name: "stoptime", value: stopDateStr },
          { name: "includeallattributes", value: true },
        ]
      }]);
      segments.push(...(tripsJson.dataexchange_trips || []));
    }

    // Build asset lookup
    const assetMap = {};
    for (const a of assets) {
      if (a.gpsassetid) assetMap[a.gpsassetid] = { name: a.assetname, plate: a.licenceplate };
    }

    // Enrich segments with vehicle info
    const enriched = segments.map(seg => ({
      ...seg,
      _vehicle: assetMap[seg.gpsassetid]?.name || null,
      _plate: assetMap[seg.gpsassetid]?.plate || null,
    }));

    // Sort by asset then time
    enriched.sort((a, b) => {
      const aId = String(a.gpsassetid || '');
      const bId = String(b.gpsassetid || '');
      if (aId !== bId) return aId < bId ? -1 : 1;
      return new Date(a.start || 0) - new Date(b.start || 0);
    });

    return Response.json({
      date,
      total_assets: assets.length,
      gps_assets: gpsIds.length,
      total_users: naitonUsers.length,
      total_segments: enriched.length,
      segments: enriched,
      users_sample: naitonUsers.slice(0, 5),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});