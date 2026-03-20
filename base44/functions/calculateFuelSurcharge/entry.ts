// calculateFuelSurcharge — Calculate fuel surcharge for a customer and period
// Supports multiple settings per customer (per vehicle_type: Bestelbus, Vrachtwagen, Personenauto)
// Uses Trip entity (manual entries) for km/hours data
// Uses DieselPrice (TLN excl BTW) as primary price source, CbsDieselPrice as fallback
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Map Vehicle.type to CustomerFuelSettings.vehicle_type
const VEHICLE_TYPE_MAP = {
  'Bestelbus': 'Bestelbus',
  'Vrachtwagen': 'Vrachtwagen',
  'Personenauto': 'Personenauto',
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

    // 1. Get ALL customer fuel settings (multiple per vehicle type)
    const allSettings = await svc.entities.CustomerFuelSettings.filter({ customer_id, is_active: true });
    if (!allSettings.length) {
      return Response.json({ error: 'Geen brandstof-instellingen gevonden voor deze klant' }, { status: 404 });
    }

    // Build settings map by vehicle_type
    const settingsByType = {};
    allSettings.forEach(s => { settingsByType[s.vehicle_type] = s; });

    // 2. Get trips for this customer in the period
    const trips = await svc.entities.Trip.filter({
      customer_id,
      date: { $gte: date_from, $lte: date_to }
    }, 'date', 500);

    // 3. Get vehicles for type mapping
    const vehicles = await svc.entities.Vehicle.filter({});
    const vehicleById = {};
    vehicles.forEach(v => { vehicleById[v.id] = v; });

    // 4. Get fuel prices: TLN (primary) + CBS (fallback)
    const [tlnPrices, cbsPrices] = await Promise.all([
      svc.entities.DieselPrice.filter({ date: { $gte: date_from, $lte: date_to } }, 'date', 500),
      svc.entities.CbsDieselPrice.filter({ date: { $gte: date_from, $lte: date_to } }, 'date', 500),
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
        hours: Math.round(hours * 100) / 100,
        base_cost: Math.round(baseCost * 100) / 100,
        actual_cost: Math.round(actualCost * 100) / 100,
        fuel_price_date: actualPrice,
        base_fuel_price: basePrice,
        consumption_factor: consumptionFactor,
      });
    }

    // Weighted average base price and actual price
    const avgBasePrice = tripDetails.length > 0
      ? tripDetails.reduce((s, t) => s + t.base_fuel_price, 0) / tripDetails.length
      : allSettings[0].base_fuel_price;

    const avgActualPrice = tripDetails.length > 0
      ? tripDetails.reduce((s, t) => s + t.fuel_price_date, 0) / tripDetails.length
      : avgBasePrice;

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
      total_hours: Math.round(totalHours * 100) / 100,
      trip_count: tripDetails.length,
      base_fuel_price: Math.round(avgBasePrice * 10000) / 10000,
      actual_fuel_price: Math.round(avgActualPrice * 10000) / 10000,
      price_difference: Math.round((avgActualPrice - avgBasePrice) * 10000) / 10000,
      surcharge_amount: surchargeAmount,
      base_cost: Math.round(totalBaseCost * 100) / 100,
      actual_cost: Math.round(totalActualCost * 100) / 100,
      calculation_method: 'mixed', // multiple types possible
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