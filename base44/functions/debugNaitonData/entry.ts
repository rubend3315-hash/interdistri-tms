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

    // Fetch currentpositions and try driverlogin in parallel
    const [positionsJson, driverLoginJson] = await Promise.all([
      naitonCall([{ name: "dataexchange_currentpositions", arguments: [] }]),
      naitonCall([{ name: "dataexchange_driverlogin", arguments: [] }]).catch(e => ({ error: e.message })),
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