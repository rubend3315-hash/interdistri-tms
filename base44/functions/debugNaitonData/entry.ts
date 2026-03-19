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

    // ═══════════════════════════════════════════════════════
    // Fetch currentpositions — focus on groupsjson + personjson
    // ═══════════════════════════════════════════════════════
    const positionsJson = await naitonCall([{
      name: "dataexchange_currentpositions",
      arguments: []
    }]);

    const positions = positionsJson.dataexchange_currentpositions || [];

    // Log ALL positions with their groupsjson and personjson
    const positionDetails = positions.map(p => {
      let groupsParsed = null;
      if (p.groupsjson) {
        try { groupsParsed = typeof p.groupsjson === 'string' ? JSON.parse(p.groupsjson) : p.groupsjson; }
        catch { groupsParsed = 'PARSE_ERROR'; }
      }
      let personParsed = null;
      if (p.personjson) {
        try { personParsed = typeof p.personjson === 'string' ? JSON.parse(p.personjson) : p.personjson; }
        catch { personParsed = 'PARSE_ERROR'; }
      }
      return {
        gpsassetid: p.gpsassetid,
        gpsassetname: p.gpsassetname,
        licenceplate: p.licenceplate,
        groupsjson: groupsParsed,
        personjson: personParsed,
        flagsjson: p.flagsjson || null,
        displayvaluesjson: p.displayvaluesjson ? String(p.displayvaluesjson).slice(0, 300) : null,
      };
    });

    // Stats
    const withGroups = positions.filter(p => p.groupsjson).length;
    const withPerson = positions.filter(p => p.personjson).length;
    const withFlags = positions.filter(p => p.flagsjson).length;

    return Response.json({
      total_positions: positions.length,
      with_groupsjson: withGroups,
      with_personjson: withPerson,
      with_flagsjson: withFlags,
      all_positions: positionDetails,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});