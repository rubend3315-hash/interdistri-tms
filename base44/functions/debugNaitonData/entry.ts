// Debug function to fetch raw Naiton data for analysis
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
        return { error: `${res.status}: ${errText.slice(0, 1000)}` };
      }
      return res.json();
    };

    const body = await req.json().catch(() => ({}));
    const date_from = body.date_from || '2026-03-19';
    const date_to = body.date_to || '2026-03-19';

    // Fetch assets first to get gpsassetids
    const assetsJson = await naitonCall([{
      name: "dataexchange_assets",
      arguments: [{ name: "inactiveAttributes", value: true }]
    }]);
    const assets = assetsJson.dataexchange_assets || [];
    const gpsIds = assets.filter(a => a.gpsassetid).map(a => a.gpsassetid);

    // Try multiple driverhistory call variants in parallel
    const [dh1, dh2, dh3, dh4] = await Promise.all([
      // Variant 1: with gpsassetids + date range
      naitonCall([{
        name: "dataexchange_driverhistory",
        arguments: [
          { name: "gpsassetids", value: gpsIds },
          { name: "starttime", value: date_from },
          { name: "stoptime", value: date_to },
        ]
      }]).catch(e => ({ error: `variant1: ${e.message}` })),
      // Variant 2: without gpsassetids
      naitonCall([{
        name: "dataexchange_driverhistory",
        arguments: [
          { name: "starttime", value: date_from },
          { name: "stoptime", value: date_to },
        ]
      }]).catch(e => ({ error: `variant2: ${e.message}` })),
      // Variant 3: no arguments at all
      naitonCall([{
        name: "dataexchange_driverhistory"
      }]).catch(e => ({ error: `variant3: ${e.message}` })),
      // Variant 4: with startdatetime/stopdatetime naming
      naitonCall([{
        name: "dataexchange_driverhistory",
        arguments: [
          { name: "startdatetime", value: date_from },
          { name: "stopdatetime", value: date_to },
        ]
      }]).catch(e => ({ error: `variant4: ${e.message}` })),
    ]);

    // Process results
    const processResult = (label, json) => {
      if (json.error) return { status: 'ERROR', error: String(json.error).slice(0, 500) };
      const data = json.dataexchange_driverhistory;
      if (!data) return { status: 'NO_DATA_KEY', rawKeys: Object.keys(json), rawPreview: JSON.stringify(json).slice(0, 500) };
      if (!Array.isArray(data)) return { status: 'NOT_ARRAY', type: typeof data, preview: JSON.stringify(data).slice(0, 500) };
      return {
        status: 'OK',
        count: data.length,
        samples: data.slice(0, 5),
        allKeys: data[0] ? Object.keys(data[0]) : [],
      };
    };

    return Response.json({
      date_range: { date_from, date_to },
      assets_count: gpsIds.length,
      variant1_with_assets_and_dates: processResult('v1', dh1),
      variant2_dates_only: processResult('v2', dh2),
      variant3_no_args: processResult('v3', dh3),
      variant4_alt_date_names: processResult('v4', dh4),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});