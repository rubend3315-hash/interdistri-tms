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
    // Fetch assets with includeallattributes=true
    // ═══════════════════════════════════════════════════════
    const assetsJson = await naitonCall([{
      name: "dataexchange_assets",
      arguments: [{ name: "inactiveAttributes", value: true }]
    }]);

    const assets = assetsJson.dataexchange_assets || [];

    // Target fields to search for
    const TARGET_FIELDS = ['personassetuuid', 'personid', 'driver', 'linkedperson', 'tagid', 'person', 'driverid', 'drivername', 'personname', 'userid', 'username'];

    // Analyze ALL keys across all assets
    const allKeysSet = new Set();
    for (const a of assets) {
      for (const k of Object.keys(a)) allKeysSet.add(k);
    }
    const allKeys = [...allKeysSet].sort();

    // Check which target fields exist
    const foundTargetFields = {};
    for (const field of TARGET_FIELDS) {
      const matchingAssets = assets.filter(a => a[field] !== undefined && a[field] !== null);
      if (matchingAssets.length > 0) {
        foundTargetFields[field] = {
          count: matchingAssets.length,
          samples: matchingAssets.slice(0, 3).map(a => ({ gpsassetid: a.gpsassetid, assetname: a.assetname, licenceplate: a.licenceplate, [field]: a[field] })),
        };
      }
    }

    // Also scan for any key containing 'person', 'driver', 'user', 'linked' (case-insensitive)
    const driverRelatedKeys = allKeys.filter(k => {
      const lower = k.toLowerCase();
      return lower.includes('person') || lower.includes('driver') || lower.includes('user') || lower.includes('linked') || lower.includes('tag');
    });

    // Full dump of first 3 assets with licence plates (real vehicles, not tags)
    const vehicleAssets = assets.filter(a => a.licenceplate);
    const fullDump = vehicleAssets.slice(0, 3).map(a => a);

    return Response.json({
      total_assets: assets.length,
      total_with_plate: vehicleAssets.length,
      all_keys: allKeys,
      driver_related_keys: driverRelatedKeys,
      target_fields_found: foundTargetFields,
      target_fields_missing: TARGET_FIELDS.filter(f => !foundTargetFields[f]),
      full_asset_dump_3_vehicles: fullDump,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});