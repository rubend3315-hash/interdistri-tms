// ╔══════════════════════════════════════════════════════════════════╗
// ║ syncTripsFromNaiton — Haal ritdata op van Naiton API           ║
// ║ Auth: Admin-only                                                ║
// ║ Stap 1: dataexchange_assets → voertuiglijst                    ║
// ║ Stap 2: dataexchange_trips → ritdata per asset                 ║
// ║ Stap 3: Combineer Drive+Stop, bereken uren/km/stilstand        ║
// ║ Stap 4: Sla op in TripRecord (idempotent: gpsassetid+start)   ║
// ║ Stap 5: Match driver met Employee → TripRecordLink             ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const BASE_URL = 'https://dawa-prod.naiton.com';

Deno.serve(async (req) => {
  const t0 = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const payload = await req.json();
    const { date_from, date_to } = payload;

    if (!date_from || !date_to) {
      return Response.json({ error: 'date_from en date_to zijn verplicht' }, { status: 400 });
    }

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return Response.json({ error: 'Naiton API credentials niet geconfigureerd (NAITON_CLIENT_ID / NAITON_CLIENT_SECRET)' }, { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'ClientId': CLIENT_ID,
      'ClientSecret': CLIENT_SECRET,
    };

    // ── Step 1: Fetch assets ──
    console.log('[NAITON] Fetching assets...');
    const assetsRes = await fetch(`${BASE_URL}/dataexchange_assets`, { method: 'GET', headers });
    if (!assetsRes.ok) {
      const errText = await assetsRes.text();
      console.error('[NAITON] Assets fetch failed:', assetsRes.status, errText);
      return Response.json({ error: `Assets API fout: ${assetsRes.status}`, details: errText }, { status: 502 });
    }
    const assets = await assetsRes.json();
    console.log(`[NAITON] ${assets.length} assets opgehaald`);

    // Build asset lookup by gpsassetid
    const assetMap = {};
    for (const asset of assets) {
      const id = String(asset.gpsassetid || asset.GpsAssetId || asset.id || '');
      if (id) {
        assetMap[id] = {
          vehicle: asset.name || asset.Name || asset.vehicle || '',
          plate: asset.plate || asset.Plate || asset.licenseplate || asset.LicensePlate || '',
          driver: asset.driver || asset.Driver || asset.drivername || asset.DriverName || '',
        };
      }
    }

    // ── Step 2: Fetch trips per asset ──
    console.log(`[NAITON] Fetching trips from ${date_from} to ${date_to}...`);
    const allTrips = [];

    // Try bulk endpoint first
    const tripsUrl = `${BASE_URL}/dataexchange_trips?from=${encodeURIComponent(date_from)}&to=${encodeURIComponent(date_to)}`;
    const tripsRes = await fetch(tripsUrl, { method: 'GET', headers });
    
    if (tripsRes.ok) {
      const tripsData = await tripsRes.json();
      const tripsArray = Array.isArray(tripsData) ? tripsData : (tripsData.trips || tripsData.data || []);
      allTrips.push(...tripsArray);
      console.log(`[NAITON] ${allTrips.length} trip records opgehaald (bulk)`);
    } else {
      // Fallback: fetch per asset
      console.log('[NAITON] Bulk fetch failed, trying per-asset...');
      for (const assetId of Object.keys(assetMap)) {
        const url = `${BASE_URL}/dataexchange_trips?gpsassetid=${encodeURIComponent(assetId)}&from=${encodeURIComponent(date_from)}&to=${encodeURIComponent(date_to)}`;
        const res = await fetch(url, { method: 'GET', headers });
        if (res.ok) {
          const data = await res.json();
          const arr = Array.isArray(data) ? data : (data.trips || data.data || []);
          allTrips.push(...arr);
        }
      }
      console.log(`[NAITON] ${allTrips.length} trip records opgehaald (per-asset)`);
    }

    if (allTrips.length === 0) {
      return Response.json({ success: true, message: 'Geen ritten gevonden in deze periode', created: 0, skipped: 0, linked: 0, ms: Date.now() - t0 });
    }

    // ── Step 3: Group by gpsassetid + combine Drive/Stop segments ──
    // Group trips by gpsassetid and date into logical "rit" units
    const ritMap = {};
    for (const trip of allTrips) {
      const assetId = String(trip.gpsassetid || trip.GpsAssetId || trip.assetId || '');
      const tripType = (trip.type || trip.Type || trip.triptype || '').toLowerCase();
      const startStr = trip.start || trip.Start || trip.starttime || trip.StartTime || '';
      const endStr = trip.end || trip.End || trip.endtime || trip.EndTime || '';
      
      if (!assetId || !startStr) continue;

      const startDate = new Date(startStr);
      const dateKey = startDate.toISOString().split('T')[0];
      const ritKey = `${assetId}_${dateKey}`;

      if (!ritMap[ritKey]) {
        ritMap[ritKey] = {
          gpsassetid: assetId,
          date: dateKey,
          segments: [],
          driver: trip.driver || trip.Driver || trip.drivername || trip.DriverName || assetMap[assetId]?.driver || '',
          vehicle: assetMap[assetId]?.vehicle || '',
          plate: assetMap[assetId]?.plate || trip.plate || trip.Plate || '',
        };
      }
      ritMap[ritKey].segments.push({
        type: tripType,
        start: startStr,
        end: endStr,
        startKm: Number(trip.startmileage || trip.StartMileage || trip.startkm || 0),
        endKm: Number(trip.endmileage || trip.EndMileage || trip.endkm || 0),
        distance: Number(trip.distance || trip.Distance || 0),
        duration: Number(trip.duration || trip.Duration || 0),
        address: trip.address || trip.Address || trip.location || '',
      });
    }

    // ── Step 4: Calculate totals and save TripRecords ──
    // Fetch existing records for dedup
    const existingRecords = await svc.entities.TripRecord.filter({
      date: { $gte: date_from, $lte: date_to }
    });
    const existingKeys = new Set(existingRecords.map(r => `${r.gpsassetid}_${r.start_time}`));

    let created = 0, skipped = 0;
    const newRecordIds = []; // { id, driver, date }

    for (const [key, rit] of Object.entries(ritMap)) {
      const segments = rit.segments.sort((a, b) => new Date(a.start) - new Date(b.start));
      
      const firstStart = segments[0]?.start;
      const lastEnd = segments[segments.length - 1]?.end || segments[segments.length - 1]?.start;

      // Dedup check
      const dedupKey = `${rit.gpsassetid}_${firstStart}`;
      if (existingKeys.has(dedupKey)) {
        skipped++;
        continue;
      }

      // Calculate total hours
      let totalMs = 0;
      if (firstStart && lastEnd) {
        totalMs = new Date(lastEnd) - new Date(firstStart);
      }
      const totalHours = Math.round((totalMs / 3600000) * 100) / 100;

      // Calculate km
      const allKms = segments.filter(s => s.startKm > 0 || s.endKm > 0);
      const startKm = allKms.length > 0 ? Math.min(...allKms.map(s => s.startKm).filter(k => k > 0)) : null;
      const endKm = allKms.length > 0 ? Math.max(...allKms.map(s => s.endKm).filter(k => k > 0)) : null;
      const totalKm = (startKm != null && endKm != null && endKm > startKm) ? endKm - startKm : 
                       segments.reduce((sum, s) => sum + s.distance, 0);

      // Detect long stops (>5 min between segments)
      let longStopsMin = 0;
      const stopSegments = segments.filter(s => s.type === 'stop' || s.type === 'idle');
      for (const seg of stopSegments) {
        if (seg.start && seg.end) {
          const durMin = (new Date(seg.end) - new Date(seg.start)) / 60000;
          if (durMin > 5) longStopsMin += durMin;
        }
      }
      longStopsMin = Math.round(longStopsMin);

      // Detect depot time (PostNL location keywords)
      let depotMin = 0;
      const depotKeywords = ['postnl', 'depot', 'sorteer', 'hub', 'distributie'];
      for (const seg of segments) {
        if (seg.address && depotKeywords.some(kw => seg.address.toLowerCase().includes(kw))) {
          if (seg.start && seg.end) {
            depotMin += (new Date(seg.end) - new Date(seg.start)) / 60000;
          }
        }
      }
      depotMin = Math.round(depotMin);

      const record = await svc.entities.TripRecord.create({
        driver: rit.driver,
        vehicle: rit.vehicle,
        plate: rit.plate,
        gpsassetid: rit.gpsassetid,
        start_time: firstStart,
        end_time: lastEnd || null,
        total_hours: totalHours,
        start_km: startKm,
        end_km: endKm,
        total_km: totalKm > 0 ? totalKm : null,
        depot_time_minutes: depotMin || null,
        long_stops_minutes: longStopsMin || null,
        date: rit.date,
      });

      existingKeys.add(dedupKey);
      newRecordIds.push({ id: record.id, driver: rit.driver, date: rit.date });
      created++;
    }

    console.log(`[NAITON] Created: ${created}, Skipped (dedup): ${skipped}`);

    // ── Step 5: Match drivers to employees → TripRecordLink ──
    let linked = 0;
    if (newRecordIds.length > 0) {
      const employees = await svc.entities.Employee.filter({ status: 'Actief' });
      
      // Build name lookup (normalize: lowercase, trim)
      const empByName = {};
      for (const emp of employees) {
        const fullName = `${emp.first_name || ''} ${emp.prefix || ''} ${emp.last_name || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
        const shortName = `${emp.first_name || ''} ${emp.last_name || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
        empByName[fullName] = emp;
        empByName[shortName] = emp;
        // Also try last_name first_name order
        const reversed = `${emp.last_name || ''} ${emp.first_name || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
        empByName[reversed] = emp;
      }

      for (const rec of newRecordIds) {
        if (!rec.driver) continue;
        const driverNorm = rec.driver.replace(/\s+/g, ' ').trim().toLowerCase();
        const matchedEmp = empByName[driverNorm];
        
        if (matchedEmp) {
          await svc.entities.TripRecordLink.create({
            trip_record_id: rec.id,
            employee_id: matchedEmp.id,
            employee_name: `${matchedEmp.first_name || ''} ${matchedEmp.last_name || ''}`.trim(),
            date: rec.date,
            approved: false,
          });
          linked++;
        }
      }
      console.log(`[NAITON] Linked ${linked} records to employees`);
    }

    return Response.json({
      success: true,
      created,
      skipped,
      linked,
      total_fetched: allTrips.length,
      ms: Date.now() - t0,
    });

  } catch (error) {
    console.error('[NAITON] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});