import { useMemo } from "react";

// Map Vehicle.type → CustomerFuelSettings.vehicle_type
const VEHICLE_TYPE_MAP = {
  'Bestelbus': 'Bestelbus',
  'Vrachtwagen': 'Vrachtwagen',
  'Kleine vrachtwagen': 'Kleine vrachtwagen',
  'Personenauto': 'Kleine bestelbus',
};

/**
 * Build a lookup: given vehicles, fuelSettings, dieselPrices, cbsPrices,
 * returns a function getTripFuelCost(rec) → { costPerKm, costPerHour, method, noSettings, noPrice } | null
 */
export function useTripFuelCost({ vehicles, fuelSettings, dieselPrices, cbsPrices }) {
  // Index vehicles by plate (normalized)
  const vehicleByPlate = useMemo(() => {
    const m = {};
    (vehicles || []).forEach(v => {
      const key = (v.license_plate || '').replace(/[\s-]/g, '').toUpperCase();
      m[key] = v;
    });
    return m;
  }, [vehicles]);

  // Index fuel settings by vehicle_type (take first active per type)
  const settingsByType = useMemo(() => {
    const m = {};
    (fuelSettings || []).forEach(s => {
      if (!m[s.vehicle_type]) m[s.vehicle_type] = s;
    });
    return m;
  }, [fuelSettings]);

  // Index prices by date
  const tlnMap = useMemo(() => {
    const m = {};
    (dieselPrices || []).forEach(p => { m[p.date] = p.price; });
    return m;
  }, [dieselPrices]);

  const cbsMap = useMemo(() => {
    const m = {};
    (cbsPrices || []).forEach(p => { m[p.date] = p.price_excl_btw; });
    return m;
  }, [cbsPrices]);

  const getFuelPrice = (date) => {
    if (!date) return null;
    if (tlnMap[date]) return tlnMap[date];
    if (cbsMap[date]) return cbsMap[date];
    // Fallback: look back up to 7 days
    for (let i = 1; i <= 7; i++) {
      const d = new Date(date);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (tlnMap[ds]) return tlnMap[ds];
      if (cbsMap[ds]) return cbsMap[ds];
    }
    return null;
  };

  const getTripFuelCost = (rec) => {
    if (!rec) return null;
    const plate = (rec.plate || '').replace(/[\s-]/g, '').toUpperCase();
    const vehicle = vehicleByPlate[plate];
    if (!vehicle) return { noSettings: true };

    // Skip electric
    if (vehicle.fuel_type === 'Elektrisch') return null;

    const mappedType = VEHICLE_TYPE_MAP[vehicle.type];
    if (!mappedType) return { noSettings: true };

    const settings = settingsByType[mappedType];
    if (!settings) return { noSettings: true };

    const fuelPrice = getFuelPrice(rec.date);
    if (!fuelPrice) return { noPrice: true };

    const method = settings.calculation_method || 'km';
    const km = rec.total_km || 0;
    const hours = rec.total_hours || 0;

    const basePrice = settings.base_fuel_price || 0;

    if (method === 'km') {
      const factor = settings.fuel_consumption_per_km || 0.143;
      const totalLiters = km * factor;
      const totalCost = totalLiters * fuelPrice;
      const baseCost = totalLiters * basePrice;
      const surcharge = totalCost - baseCost;
      return {
        costPerKm: km > 0 ? totalCost / km : 0,
        costPerHour: hours > 0 ? totalCost / hours : 0,
        totalCost,
        surcharge,
        method: 'km',
        factor,
        fuelPrice,
        basePrice,
      };
    } else {
      const factor = settings.fuel_consumption_per_hour || 2.5;
      const totalLiters = hours * factor;
      const totalCost = totalLiters * fuelPrice;
      const baseCost = totalLiters * basePrice;
      const surcharge = totalCost - baseCost;
      return {
        costPerKm: km > 0 ? totalCost / km : 0,
        costPerHour: hours > 0 ? totalCost / hours : 0,
        totalCost,
        surcharge,
        method: 'hour',
        factor,
        fuelPrice,
        basePrice,
      };
    }
  };

  return getTripFuelCost;
}