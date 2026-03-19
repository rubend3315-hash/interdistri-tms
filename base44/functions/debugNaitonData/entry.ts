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

    // Extract first 3 positions with full detail
    const positions = positionsJson.dataexchange_currentpositions || [];
    const positionSamples = positions.slice(0, 3).map(p => {
      // Parse personjson if present
      let personParsed = null;
      if (p.personjson) {
        try {
          personParsed = typeof p.personjson === 'string' ? JSON.parse(p.personjson) : p.personjson;
        } catch { personParsed = 'PARSE_ERROR'; }
      }
      return { ...p, personjson_parsed: personParsed, allKeys: Object.keys(p) };
    });

    return Response.json({
      currentpositions: {
        total: positions.length,
        samples: positionSamples,
        allKeysFromFirst: positions[0] ? Object.keys(positions[0]) : [],
      },
      driverlogin: driverLoginJson,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});