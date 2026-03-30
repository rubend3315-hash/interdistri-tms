// calculateFuelSurcharge — Calculate fuel surcharge for a customer and period
// Supports multiple settings per customer (per vehicle_type: Bestelbus, Vrachtwagen, Personenauto)
// Uses Trip entity (manual entries) for km/hours data
// Uses DieselPrice (TLN excl BTW) as primary price source, CbsDieselPrice as fallback
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Map Vehicle.type to CustomerFuelSettings.vehicle_type
const VEHICLE_TYPE_MAP = {
  'Bestelbus': 'Bestelbus',
  'Vrachtwagen': 'Vrachtwagen',
  'Kleine vrachtwagen': 'Kleine vrachtwagen',
  'Personenauto': 'Kleine bestelbus',
  'Aanhanger': null, // skip trailers
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customer_id, date_from, date_to, save } = await req.json();
    if (!customer_id || !date_from || !date_to) {
      return Response.json({ error: 'customer_id, date_from en date_to zijn verplicht' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // Paginated fetch helper — SDK returns inconsistent page sizes
    // so we keep fetching until we get an empty page (not just < PAGE)
    async function paginatedFilter(entity, query, sortField) {
      const all = [];
      let skip = 0;
      const PAGE = 50;
      const MAX_RECORDS = 2000; // safety limit
      while (all.length < MAX_RECORDS) {
        const page = await entity.filter(query, sortField || '-created_date', PAGE, skip);
        if (!Array.isArray(page) || page.length === 0) break;
        all.push(...page);
        skip += page.length;
      }
      return all;
    }

    // 1. Get ALL customer fuel settings (multiple per vehicle type)
    const allSettings = await paginatedFilter(svc.entities.CustomerFuelSettings, { customer_id, is_active: true });
    if (!allSettings.length) {
      return Response.json({ error: 'Geen brandstof-instellingen gevonden voor deze klant' }, { status: 404 });
    }

    // Build settings map by vehicle_type
    const settingsByType = {};
    allSettings.forEach(s => { settingsByType[s.vehicle_type] = s; });

    // 2. Get trips for this customer in the period
    const trips = await paginatedFilter(svc.entities.Trip, { customer_id, date: { $gte: date_from, $lte: date_to } }, 'date');

    // 3. Get vehicles for type mapping
    const vehicles = await paginatedFilter(svc.entities.Vehicle, {});
    const vehicleById = {};
    vehicles.forEach(v => { vehicleById[v.id] = v; });

    // 4. Get fuel prices: TLN (primary) + CBS (fallback)
    // Fetch wider range: from 14 days before date_from to date_to, so we always have a recent price
    const priceSearchFrom = new Date(date_from);
    priceSearchFrom.setDate(priceSearchFrom.getDate() - 14);
    const priceSearchFromStr = priceSearchFrom.toISOString().split('T')[0];
    const [tlnPrices, cbsPrices] = await Promise.all([
      paginatedFilter(svc.entities.DieselPrice, { date: { $gte: priceSearchFromStr, $lte: date_to } }, 'date'),
      paginatedFilter(svc.entities.CbsDieselPrice, { date: { $gte: priceSearchFromStr, $lte: date_to } }, 'date'),
    ]);

    const tlnPriceMap = {};
    tlnPrices.forEach(p => { tlnPriceMap[p.date] = p.price; });
    const cbsPriceMap = {};
    cbsPrices.forEach(p => { cbsPriceMap[p.date] = p.price_excl_btw; });

    const getFuelPrice = (date) => {
      if (tlnPriceMap[date]) return { price: tlnPriceMap[date], source: 'TLN' };
      if (cbsPriceMap[date]) return { price: cbsPriceMap[date], source: 'CBS' };
      for (let i = 1; i <= 7; i++) {
        const d = new Date(date);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        if (tlnPriceMap[ds]) return { price: tlnPriceMap[ds], source: 'TLN' };
        if (cbsPriceMap[ds]) return { price: cbsPriceMap[ds], source: 'CBS' };
      }
      return null;
    };

    // 4b. Get GPS TripRecords for same period + plates for cross-reference
    // Fetch per-day to avoid SDK pagination issues with large date ranges
    const tripRecords = [];
    {
      const startDate = new Date(date_from);
      const endDate = new Date(date_to);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayStr = d.toISOString().split('T')[0];
        const dayRecords = await paginatedFilter(svc.entities.TripRecord, { date: dayStr }, '-created_date');
        tripRecords.push(...dayRecords);
      }
    }
    // Step 1: Build plate → gpsassetid mapping + index all TripRecords by plate+date
    const plateToAssetIds = {}; // normPlate → Set of gpsassetids
    const tripRecordsByPlateDate = {}; // normPlate_date → [TripRecord, ...]
    for (const tr of tripRecords) {
      if (!tr.plate || !tr.date) continue;
      const normPlate = tr.plate.replace(/[-\s]/g, '').toUpperCase();
      if (tr.gpsassetid) {
        if (!plateToAssetIds[normPlate]) plateToAssetIds[normPlate] = new Set();
        plateToAssetIds[normPlate].add(tr.gpsassetid);
      }
      const key = `${normPlate}_${tr.date}`;
      if (!tripRecordsByPlateDate[key]) tripRecordsByPlateDate[key] = [];
      tripRecordsByPlateDate[key].push(tr);
    }

    // GPS KM lookup: sum ALL TripRecords whose odometer range falls within the Trip's range
    // A Trip (manual entry) can span multiple GPS TripRecords (standplaats→standplaats segments)
    // E.g. Trip 148522→148681 (159 km) covers GPS records 148522→148589 + 148589→148659 + 148659→148681
    const findGpsKmForTrip = (trip, plate) => {
      const normPlate = plate.replace(/[-\s]/g, '').toUpperCase();
      const key = `${normPlate}_${trip.date}`;
      const candidates = tripRecordsByPlateDate[key];
      if (!candidates || candidates.length === 0) return null;

      // Strategy 1 (primary): Sum all TripRecords whose odometer falls within Trip range
      if (trip.start_km && trip.end_km) {
        let totalGps = 0;
        let matchCount = 0;
        for (const tr of candidates) {
          if (tr.start_km == null || tr.end_km == null || tr.end_km <= tr.start_km) continue;
          // TripRecord overlaps if its range intersects with Trip range (5 km tolerance)
          const overlapStart = Math.max(trip.start_km, tr.start_km);
          const overlapEnd = Math.min(trip.end_km, tr.end_km);
          if (overlapEnd - overlapStart > -5) {
            // Use only the portion within the Trip's range
            const clippedStart = Math.max(trip.start_km, tr.start_km);
            const clippedEnd = Math.min(trip.end_km, tr.end_km);
            const km = Math.max(0, clippedEnd - clippedStart);
            totalGps += km;
            matchCount++;
          }
        }
        if (matchCount > 0) return Math.round(totalGps * 10) / 10;
      }

      // Strategy 2 (fallback): Match by time overlap — sum all overlapping TripRecords
      const tripDepH = trip.departure_time ? parseInt(trip.departure_time.split(':')[0]) : null;
      const tripDepM = trip.departure_time ? parseInt(trip.departure_time.split(':')[1]) : null;
      const tripArrH = trip.arrival_time ? parseInt(trip.arrival_time.split(':')[0]) : null;
      const tripArrM = trip.arrival_time ? parseInt(trip.arrival_time.split(':')[1]) : null;
      const tripDepMin = (tripDepH != null && tripDepM != null) ? tripDepH * 60 + tripDepM : null;
      const tripArrMin = (tripArrH != null && tripArrM != null) ? tripArrH * 60 + tripArrM : null;

      if (tripDepMin != null && tripArrMin != null) {
        let totalGps = 0;
        let matchCount = 0;
        for (const tr of candidates) {
          if (!tr.start_time || !tr.end_time) continue;
          const trStart = new Date(tr.start_time);
          const trEnd = new Date(tr.end_time);
          const trStartMin = trStart.getUTCHours() * 60 + trStart.getUTCMinutes();
          const trEndMin = trEnd.getUTCHours() * 60 + trEnd.getUTCMinutes();
          const overlapStart = Math.max(tripDepMin, trStartMin);
          const overlapEnd = Math.min(tripArrMin, trEndMin);
          if (overlapEnd - overlapStart > 0) {
            const km = (tr.start_km != null && tr.end_km != null && tr.end_km > tr.start_km)
              ? tr.end_km - tr.start_km
              : (tr.total_km || 0);
            totalGps += km;
            matchCount++;
          }
        }
        if (matchCount > 0) return Math.round(totalGps * 10) / 10;
      }

      return null;
    };


    // 5. Calculate surcharge per trip, using the correct settings per vehicle type
    const tripDetails = [];
    let totalKm = 0;
    let totalHours = 0;
    let totalBaseCost = 0;
    let totalActualCost = 0;
    let skippedNoSettings = 0;


    for (const trip of trips) {
      const vehicle = vehicleById[trip.vehicle_id];
      const plate = vehicle?.license_plate || '?';

      // Skip electric vehicles
      if (vehicle?.fuel_type === 'Elektrisch') continue;

      // Determine vehicle type and find matching settings
      const vehicleType = VEHICLE_TYPE_MAP[vehicle?.type] || null;
      if (!vehicleType) continue; // skip unmapped types (e.g. trailers)

      const settings = settingsByType[vehicleType];
      if (!settings) {
        skippedNoSettings++;
        continue; // no settings for this vehicle type
      }

      const method = settings.calculation_method || 'km';
      const consumptionFactor = method === 'km'
        ? (settings.fuel_consumption_per_km || 0.143)
        : (settings.fuel_consumption_per_hour || 2.5);
      const basePrice = settings.base_fuel_price;

      const km = trip.total_km || 0;
      let hours = 0;
      if (trip.departure_time && trip.arrival_time) {
        const [dh, dm] = trip.departure_time.split(':').map(Number);
        const [ah, am] = trip.arrival_time.split(':').map(Number);
        hours = Math.max(0, (ah * 60 + am - dh * 60 - dm) / 60);
      }

      const priceData = getFuelPrice(trip.date);
      const actualPrice = priceData?.price || basePrice;

      const consumption = method === 'km'
        ? km * consumptionFactor
        : hours * consumptionFactor;

      const baseCost = consumption * basePrice;
      const actualCost = consumption * actualPrice;

      // GPS km lookup: match specific TripRecord to this Trip by time/odometer window
      const gpsKm = findGpsKmForTrip(trip, plate);

      totalKm += km;
      totalHours += hours;
      totalBaseCost += baseCost;
      totalActualCost += actualCost;

      tripDetails.push({
        trip_id: trip.id,
        date: trip.date,
        route: trip.route_name || '',
        vehicle_plate: plate,
        vehicle_type: vehicleType,
        km,
        start_km: trip.start_km || null,
        end_km: trip.end_km || null,
        gps_km: gpsKm ? Math.round(gpsKm * 10) / 10 : null,
        hours: Math.round(hours * 100) / 100,
        base_cost: Math.round(baseCost * 100) / 100,
        actual_cost: Math.round(actualCost * 100) / 100,
        fuel_price_date: actualPrice,
        base_fuel_price: basePrice,
        consumption_factor: consumptionFactor,
      });
    }

    // Calculate GPS total: sum all per-trip GPS km values
    let totalGpsKm = 0;
    for (const t of tripDetails) {
      if (t.gps_km == null) continue;
      totalGpsKm += t.gps_km;
    }

    // Weighted average base price and actual price
    const avgBasePrice = tripDetails.length > 0
      ? tripDetails.reduce((s, t) => s + t.base_fuel_price, 0) / tripDetails.length
      : allSettings[0].base_fuel_price;

    // For actual price: use trip data if available, otherwise get most recent TLN dagprijs
    let avgActualPrice;
    if (tripDetails.length > 0) {
      avgActualPrice = tripDetails.reduce((s, t) => s + t.fuel_price_date, 0) / tripDetails.length;
    } else {
      // Find most recent TLN price (sorted desc by date)
      const sortedTln = [...tlnPrices].sort((a, b) => b.date.localeCompare(a.date));
      const sortedCbs = [...cbsPrices].sort((a, b) => b.date.localeCompare(a.date));
      if (sortedTln.length > 0) {
        avgActualPrice = sortedTln[0].price;
      } else if (sortedCbs.length > 0) {
        avgActualPrice = sortedCbs[0].price_excl_btw;
      } else {
        avgActualPrice = avgBasePrice;
      }
    }

    const surchargeAmount = Math.round((totalActualCost - totalBaseCost) * 100) / 100;

    let periodType = 'custom';
    if (date_from === date_to) periodType = 'day';
    else {
      const diffDays = Math.round((new Date(date_to) - new Date(date_from)) / 86400000);
      if (diffDays >= 6 && diffDays <= 7) periodType = 'week';
    }

    const result = {
      customer_id,
      date_from,
      date_to,
      period_type: periodType,
      total_km: Math.round(totalKm * 10) / 10,
      total_gps_km: totalGpsKm > 0 ? Math.round(totalGpsKm * 10) / 10 : null,
      total_hours: Math.round(totalHours * 100) / 100,
      trip_count: tripDetails.length,
      base_fuel_price: Math.round(avgBasePrice * 10000) / 10000,
      actual_fuel_price: Math.round(avgActualPrice * 10000) / 10000,
      price_difference: Math.round((avgActualPrice - avgBasePrice) * 10000) / 10000,
      surcharge_amount: surchargeAmount,
      base_cost: Math.round(totalBaseCost * 100) / 100,
      actual_cost: Math.round(totalActualCost * 100) / 100,
      calculation_method: (() => {
        const methods = new Set(allSettings.map(s => s.calculation_method || 'km'));
        if (methods.size === 1) return [...methods][0];
        return 'mixed';
      })(),
      fuel_consumption_factor: null,
      trip_details: tripDetails,
      status: 'Concept',
    };

    if (skippedNoSettings > 0) {
      result._warnings = [`${skippedNoSettings} rit(ten) overgeslagen: geen instelling voor dat voertuigtype`];
    }

    if (save) {
      const saved = await svc.entities.FuelSurcharge.create(result);
      return Response.json({ success: true, surcharge: { ...result, id: saved.id } });
    }

    return Response.json({ success: true, surcharge: result });
  } catch (error) {
    console.error('[FuelSurcharge]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});