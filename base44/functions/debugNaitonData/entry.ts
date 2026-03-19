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
    // Fetch assets, users, and trackergroups in parallel
    // ═══════════════════════════════════════════════════════
    const [assetsJson, usersJson, trackergroupsJson] = await Promise.all([
      naitonCall([{
        name: "dataexchange_assets",
        arguments: [{ name: "inactiveAttributes", value: true }]
      }]),
      naitonCall([{
        name: "dataexchange_users"
      }]),
      naitonCall([{
        name: "dataexchange_trackergroups"
      }]).catch(e => ({ error: e.message })),
    ]);

    const assets = assetsJson.dataexchange_assets || [];
    const users = usersJson.dataexchange_users || [];

    // ═══════════════════════════════════════════════════════
    // Trackergroups analysis
    // ═══════════════════════════════════════════════════════
    let trackergroupsResult;
    if (trackergroupsJson.error) {
      trackergroupsResult = { status: 'ERROR', error: String(trackergroupsJson.error).slice(0, 500) };
    } else {
      const tgData = trackergroupsJson.dataexchange_trackergroups;
      if (!tgData) {
        trackergroupsResult = { status: 'NO_DATA_KEY', rawKeys: Object.keys(trackergroupsJson), rawPreview: JSON.stringify(trackergroupsJson).slice(0, 1000) };
      } else if (!Array.isArray(tgData)) {
        trackergroupsResult = { status: 'NOT_ARRAY', type: typeof tgData, preview: JSON.stringify(tgData).slice(0, 1000) };
      } else {
        // Group by trackergrouptypeid
        const byType = {};
        for (const tg of tgData) {
          const typeId = tg.trackergrouptypeid || 'unknown';
          if (!byType[typeId]) byType[typeId] = { count: 0, typeName: tg.trackergrouptype || '', samples: [] };
          byType[typeId].count++;
          if (byType[typeId].samples.length < 3) byType[typeId].samples.push(tg);
        }

        // Driver groups (typeid=2 based on Naiton UI convention)
        const driverGroups = tgData.filter(tg => tg.trackergrouptypeid === 2 || (tg.trackergrouptype || '').toLowerCase().includes('driver'));

        // For each driver group, show which assets (vehicles) are linked
        const driverGroupDetails = driverGroups.slice(0, 10).map(dg => ({
          trackergroupid: dg.trackergroupid,
          trackergroupname: dg.trackergroupname,
          trackergrouptypeid: dg.trackergrouptypeid,
          trackergrouptype: dg.trackergrouptype,
          // Look for asset references
          assets: dg.assets || dg.gpsassetids || dg.trackers || null,
          allKeys: Object.keys(dg),
          fullData: dg,
        }));

        trackergroupsResult = {
          status: 'OK',
          total: tgData.length,
          allKeys: tgData[0] ? Object.keys(tgData[0]) : [],
          byType,
          driverGroups: {
            count: driverGroups.length,
            details: driverGroupDetails,
          },
        };
      }
    }

    // ═══════════════════════════════════════════════════════
    // Assets: check trackergroupjson field for driver links
    // ═══════════════════════════════════════════════════════
    const assetDriverLinks = assets.slice(0, 10).map(a => {
      let tgParsed = null;
      if (a.trackergroupjson) {
        try { tgParsed = typeof a.trackergroupjson === 'string' ? JSON.parse(a.trackergroupjson) : a.trackergroupjson; }
        catch { tgParsed = 'PARSE_ERROR'; }
      }
      return {
        assetid: a.assetid,
        gpsassetid: a.gpsassetid,
        assetname: a.assetname,
        licenceplate: a.licenceplate,
        trackergroupids: a.trackergroupids,
        trackergroup: a.trackergroup,
        trackergroupjson: tgParsed,
      };
    });

    // User samples
    const userSamples = users.slice(0, 5).map(u => ({
      personid: u.personid,
      firstname: u.firstname,
      lastname: u.lastname,
      tachocardnumber: u.tachocardnumber,
      tagid: u.tagid,
      isdriver: u.isdriver,
    }));

    return Response.json({
      trackergroups: trackergroupsResult,
      asset_driver_links: assetDriverLinks,
      users: { total: users.length, samples: userSamples },
      assets_total: assets.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});