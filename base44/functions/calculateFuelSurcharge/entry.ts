// calculateFuelSurcharge — Calculate fuel surcharge for a customer and period
// Uses Trip entity (manual entries) + TripRecord (GPS fallback) for km/hours data
// Uses DieselPrice (TLN excl BTW) as primary price source, CbsDieselPrice as fallback
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

    // 1. Get customer fuel settings
    const settingsArr = await svc.entities.CustomerFuelSettings.filter({ customer_id });
    const settings = settingsArr[0];
    if (!settings) {
      return Response.json({ error: 'Geen brandstof-instellingen gevonden voor deze klant' }, { status: 404 });
    }

    // 2. Get trips for this customer in the period
    const trips = await svc.entities.Trip.filter({
      customer_id,
      date: { $gte: date_from, $lte: date_to }
    }, 'date', 500);

    // 3. Get GPS TripRecords as fallback (we'll need vehicle mapping)
    const vehicles = await svc.entities.Vehicle.filter({});
    const vehicleById = {};
    vehicles.forEach(v => { vehicleById[v.id] = v; });

    // 4. Get fuel prices: TLN (primary) + CBS (fallback)
    const [tlnPrices, cbsPrices] = await Promise.all([
      svc.entities.DieselPrice.filter({ date: { $gte: date_from, $lte: date_to } }, 'date', 500),
      svc.entities.CbsDieselPrice.filter({ date: { $gte: date_from, $lte: date_to } }, 'date', 500),
    ]);

    // Build price maps
    const tlnPriceMap = {};
    tlnPrices.forEach(p => { tlnPriceMap[p.date] = p.price; }); // excl BTW

    const cbsPriceMap = {};
    cbsPrices.forEach(p => { cbsPriceMap[p.date] = p.price_excl_btw; }); // excl BTW (calculated)

    // Get fuel price for a specific date (TLN first, CBS fallback, then nearest)
    const getFuelPrice = (date) => {
      if (tlnPriceMap[date]) return { price: tlnPriceMap[date], source: 'TLN' };
      if (cbsPriceMap[date]) return { price: cbsPriceMap[date], source: 'CBS' };

      // Find nearest available price (look backwards up to 7 days)
      for (let i = 1; i <= 7; i++) {
        const d = new Date(date);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        if (tlnPriceMap[ds]) return { price: tlnPriceMap[ds], source: 'TLN' };
        if (cbsPriceMap[ds]) return { price: cbsPriceMap[ds], source: 'CBS' };
      }
      return null;
    };

    // 5. Calculate surcharge per trip
    const method = settings.calculation_method || 'km';
    const consumptionFactor = method === 'km'
      ? (settings.fuel_consumption_per_km || 0.1)
      : (settings.fuel_consumption_per_hour || 2.5);
    const basePrice = settings.base_fuel_price;

    const tripDetails = [];
    let totalKm = 0;
    let totalHours = 0;
    let totalBaseCost = 0;
    let totalActualCost = 0;

    for (const trip of trips) {
      const vehicle = vehicleById[trip.vehicle_id];
      const plate = vehicle?.license_plate || '?';

      // Skip electric vehicles
      if (vehicle?.fuel_type === 'Elektrisch') continue;

      const km = trip.total_km || 0;
      // Calculate hours from departure/arrival times
      let hours = 0;
      if (trip.departure_time && trip.arrival_time) {
        const [dh, dm] = trip.departure_time.split(':').map(Number);
        const [ah, am] = trip.arrival_time.split(':').map(Number);
        hours = Math.max(0, (ah * 60 + am - dh * 60 - dm) / 60);
      }

      const priceData = getFuelPrice(trip.date);
      const actualPrice = priceData?.price || basePrice;

      // Calculate consumption
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
        km,
        hours: Math.round(hours * 100) / 100,
        base_cost: Math.round(baseCost * 100) / 100,
        actual_cost: Math.round(actualCost * 100) / 100,
        fuel_price_date: actualPrice,
      });
    }

    // Average actual price
    const avgActualPrice = tripDetails.length > 0
      ? tripDetails.reduce((s, t) => s + t.fuel_price_date, 0) / tripDetails.length
      : basePrice;

    const surchargeAmount = Math.round((totalActualCost - totalBaseCost) * 100) / 100;

    // Determine period_type
    let periodType = 'custom';
    if (date_from === date_to) periodType = 'day';
    else {
      const fromDate = new Date(date_from);
      const toDate = new Date(date_to);
      const diffDays = Math.round((toDate - fromDate) / 86400000);
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
      base_fuel_price: basePrice,
      actual_fuel_price: Math.round(avgActualPrice * 10000) / 10000,
      price_difference: Math.round((avgActualPrice - basePrice) * 10000) / 10000,
      surcharge_amount: surchargeAmount,
      base_cost: Math.round(totalBaseCost * 100) / 100,
      actual_cost: Math.round(totalActualCost * 100) / 100,
      calculation_method: method,
      fuel_consumption_factor: consumptionFactor,
      trip_details: tripDetails,
      status: 'Concept',
    };

    // Save if requested
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