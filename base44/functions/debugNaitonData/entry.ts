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
    const mode = body.mode || 'explore'; // 'explore' = read-only discovery

    // ═══════════════════════════════════════════════════════
    // STEP 1: Fetch assets + users in parallel
    // ═══════════════════════════════════════════════════════
    const [assetsJson, usersJson] = await Promise.all([
      naitonCall([{
        name: "dataexchange_assets",
        arguments: [{ name: "inactiveAttributes", value: true }]
      }]),
      naitonCall([{
        name: "dataexchange_users"
      }]),
    ]);

    const assets = assetsJson.dataexchange_assets || [];
    const users = usersJson.dataexchange_users || [];

    // Asset samples with all UUIDs
    const assetSamples = assets.slice(0, 8).map(a => ({
      assetid: a.assetid,
      gpsassetid: a.gpsassetid,
      assetname: a.assetname,
      licenceplate: a.licenceplate,
      allKeys: Object.keys(a),
    }));

    // User samples — focus on uuid/id fields for linkasset compatibility
    const userSamples = users.slice(0, 8).map(u => ({
      personid: u.personid,
      personassetuuid: u.personassetuuid,
      firstname: u.firstname,
      lastname: u.lastname,
      tachocardnumber: u.tachocardnumber,
      tagid: u.tagid,
      isdriver: u.isdriver,
      allKeys: Object.keys(u),
    }));

    // Stats
    const usersWithPersonAssetUuid = users.filter(u => u.personassetuuid).length;
    const usersWithPersonId = users.filter(u => u.personid).length;
    const assetsWithAssetId = assets.filter(a => a.assetid).length;
    const assetsWithGpsAssetId = assets.filter(a => a.gpsassetid).length;

    // ═══════════════════════════════════════════════════════
    // STEP 2: Test if dataexchange_linkasset endpoint exists
    //         Use a DUMMY call with invalid UUID to check availability
    //         (will return error but confirms endpoint exists)
    // ═══════════════════════════════════════════════════════
    const linkAssetTest = await naitonCall([{
      name: "dataexchange_linkasset",
      arguments: [
        { name: "assetuuid", value: "00000000-0000-0000-0000-000000000000" },
        { name: "startdatum", value: "2026-03-19T00:00:00" },
        { name: "einddatum", value: "2026-03-19T23:59:59" },
      ]
    }]).catch(e => ({ error: e.message }));

    // Determine if the endpoint exists (even if the call fails with bad data)
    const linkAssetEndpointExists = !linkAssetTest.error?.includes('does not exist');

    // ═══════════════════════════════════════════════════════
    // STEP 3: If mode=link and assetuuid provided, do actual link
    // ═══════════════════════════════════════════════════════
    let linkResult = null;
    if (mode === 'link' && body.assetuuid) {
      linkResult = await naitonCall([{
        name: "dataexchange_linkasset",
        arguments: [
          { name: "assetuuid", value: body.assetuuid },
          { name: "startdatum", value: body.startdatum || new Date().toISOString() },
          { name: "einddatum", value: body.einddatum || new Date(Date.now() + 86400000).toISOString() },
        ]
      }]).catch(e => ({ error: e.message }));
    }

    return Response.json({
      assets: {
        total: assets.length,
        withAssetId: assetsWithAssetId,
        withGpsAssetId: assetsWithGpsAssetId,
        samples: assetSamples,
      },
      users: {
        total: users.length,
        withPersonAssetUuid: usersWithPersonAssetUuid,
        withPersonId: usersWithPersonId,
        samples: userSamples,
      },
      linkasset_endpoint: {
        exists: linkAssetEndpointExists,
        test_response: linkAssetTest.error
          ? { status: 'ERROR', error: String(linkAssetTest.error).slice(0, 500) }
          : { status: 'OK', rawKeys: Object.keys(linkAssetTest), preview: JSON.stringify(linkAssetTest).slice(0, 500) },
      },
      link_result: linkResult,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});