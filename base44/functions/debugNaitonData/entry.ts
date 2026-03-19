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

    // Extract positions — focus on driver-related fields
    const positions = positionsJson.dataexchange_currentpositions || [];
    const withPerson = positions.filter(p => p.personjson);
    const positionSamples = positions.slice(0, 5).map(p => {
      let personParsed = null;
      if (p.personjson) {
        try { personParsed = typeof p.personjson === 'string' ? JSON.parse(p.personjson) : p.personjson; }
        catch { personParsed = 'PARSE_ERROR'; }
      }
      return {
        gpsassetid: p.gpsassetid,
        gpsassetname: p.gpsassetname,
        licenceplate: p.licenceplate,
        personjson_raw: p.personjson ? String(p.personjson).slice(0, 300) : null,
        personjson_parsed: personParsed,
      };
    });
    // Also get ALL positions with personjson populated
    const withPersonSamples = withPerson.slice(0, 5).map(p => {
      let personParsed = null;
      try { personParsed = typeof p.personjson === 'string' ? JSON.parse(p.personjson) : p.personjson; }
      catch { personParsed = 'PARSE_ERROR'; }
      return {
        gpsassetid: p.gpsassetid,
        gpsassetname: p.gpsassetname,
        licenceplate: p.licenceplate,
        personjson_parsed: personParsed,
      };
    });

    // driverlogin
    const driverLoginData = driverLoginJson.dataexchange_driverlogin || driverLoginJson;
    const driverLoginSamples = Array.isArray(driverLoginData) ? driverLoginData.slice(0, 3) : driverLoginData;

    return Response.json({
      currentpositions: {
        total: positions.length,
        withPersonCount: withPerson.length,
        firstFiveSamples: positionSamples,
        withPersonSamples,
        allKeys: positions[0] ? Object.keys(positions[0]) : [],
      },
      driverlogin: {
        raw_keys: driverLoginJson ? Object.keys(driverLoginJson) : [],
        samples: driverLoginSamples,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});