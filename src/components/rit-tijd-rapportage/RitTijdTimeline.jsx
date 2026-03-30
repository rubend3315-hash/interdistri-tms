import React from "react";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, Clock, Building2, Satellite, Gauge, CircleParking, Clock4, Fuel } from "lucide-react";

function timelineSortKey(timeStr) {
  if (!timeStr) return 9999;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return 9999;
  const mins = h * 60 + m;
  return mins < 360 ? mins + 1440 : mins;
}

function tripRecordSortKey(rec) {
  if (!rec.start_time) return 9999;
  try {
    const d = new Date(rec.start_time);
    const mins = d.getHours() * 60 + d.getMinutes();
    return mins < 360 ? mins + 1440 : mins;
  } catch { return 9999; }
}

function formatGpsTime(dt) {
  if (!dt) return '-';
  try {
    return new Date(dt).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });
  } catch { return '-'; }
}

function TripItem({ trip, vehicle, customer }) {
  const totalKm = trip.start_km != null && trip.end_km != null ? trip.end_km - trip.start_km : trip.total_km;
  let hours = null;
  if (trip.departure_time && trip.arrival_time) {
    const [dH, dM] = trip.departure_time.split(":").map(Number);
    const [aH, aM] = trip.arrival_time.split(":").map(Number);
    let m = (aH * 60 + aM) - (dH * 60 + dM);
    if (m < 0) m += 1440;
    hours = (m / 60).toFixed(1);
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white border border-slate-200 rounded-lg">
      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Truck className="w-4 h-4 text-blue-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-900 truncate">{trip.route_name || "Rit"}</span>
          <Badge className="text-[10px] px-1.5 py-0 leading-4 bg-blue-50 text-blue-700">{trip.status}</Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
          {vehicle && <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-slate-400" />{vehicle.license_plate}</span>}
          {customer && <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-400" />{customer.company_name}</span>}
          {trip.departure_time && trip.arrival_time && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" />{trip.departure_time} – {trip.arrival_time}</span>
          )}
          {trip.start_km != null && trip.end_km != null && <span>{trip.start_km} – {trip.end_km} km</span>}
          {totalKm > 0 && <span className="font-medium text-slate-700">{totalKm} km</span>}
          {hours && <span className="font-medium text-blue-600">{hours}u</span>}
          {trip.fuel_liters > 0 && <span>{trip.fuel_liters}L</span>}
        </div>
      </div>
    </div>
  );
}

function SpwItem({ record, customerName, activityName }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white border border-slate-200 rounded-lg">
      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Package className="w-4 h-4 text-amber-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-900 truncate">{activityName || "Standplaatswerk"}</span>
          <Badge className="text-[10px] px-1.5 py-0 leading-4 bg-amber-50 text-amber-700">Loodswerk</Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
          {customerName && <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-400" />{customerName}</span>}
          {(record.start_time || record.end_time) && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" />{record.start_time || "?"} – {record.end_time || "?"}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function GpsItem({ record, fuelCost }) {
  const fmt = (n) => n?.toFixed(2) ?? '-';
  const hasFuel = fuelCost && !fuelCost.noSettings && !fuelCost.noPrice;

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white border border-emerald-200 rounded-lg">
      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Satellite className="w-4 h-4 text-emerald-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-900 truncate">{record.vehicle || record.plate || "GPS Rit"}</span>
          <Badge className="text-[10px] px-1.5 py-0 leading-4 bg-emerald-50 text-emerald-700">GPS Buddy</Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
          {record.plate && <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-slate-400" />{record.plate}</span>}
          {record.start_time && record.end_time && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" />{formatGpsTime(record.start_time)} – {formatGpsTime(record.end_time)}</span>
          )}
          {record.start_km != null && record.end_km != null && <span>{record.start_km} – {record.end_km}</span>}
          {record.total_km > 0 && (
            <span className="flex items-center gap-1"><Gauge className="w-3 h-3 text-slate-400" /><span className="font-medium text-slate-700">{record.total_km} km</span></span>
          )}
          {record.total_hours > 0 && <span className="font-medium text-emerald-600">{record.total_hours}u</span>}
          {record.long_stops_minutes > 0 && (
            <span className="flex items-center gap-1 text-orange-500"><Clock4 className="w-3 h-3" />{record.long_stops_count || '?'}x/{record.long_stops_minutes}m stilstand</span>
          )}
          {hasFuel && (
            <span className="flex items-center gap-1 text-emerald-600"><Fuel className="w-3 h-3" /><span className="font-medium">€{fmt(fuelCost.costPerKm)}/km</span></span>
          )}
        </div>
        {record.driver && <span className="text-[11px] text-slate-400 mt-0.5 block">Chauffeur: {record.driver}</span>}
      </div>
    </div>
  );
}

export default function RitTijdTimeline({ trips, spws, gps, vehicles, customers, projects, activiteiten, getTripFuelCost }) {
  const getVehicle = (id) => vehicles.find(v => v.id === id);
  const getCustomer = (id) => customers.find(c => c.id === id);
  const getActiviteitName = (id) => activiteiten.find(a => a.id === id)?.name;

  const items = [
    ...trips.map(t => ({ type: 'trip', data: t, sortKey: timelineSortKey(t.departure_time) })),
    ...spws.map(s => ({ type: 'spw', data: s, sortKey: timelineSortKey(s.start_time) })),
    ...gps.map(r => ({ type: 'gps', data: r, sortKey: tripRecordSortKey(r) })),
  ].sort((a, b) => a.sortKey - b.sortKey);

  return (
    <div className="ml-4 pl-4 border-l-2 border-slate-200 pb-1 mt-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        Tijdlijn ({trips.length} rit{trips.length !== 1 ? 'ten' : ''}, {spws.length} standplaats{gps.length > 0 ? `, ${gps.length} GPS` : ''})
      </p>
      <div className="space-y-1.5">
        {items.map(item =>
          item.type === 'trip' ? (
            <TripItem key={item.data.id} trip={item.data} vehicle={getVehicle(item.data.vehicle_id)} customer={getCustomer(item.data.customer_id)} />
          ) : item.type === 'gps' ? (
            <GpsItem key={`gps-${item.data.id}`} record={item.data} fuelCost={getTripFuelCost ? getTripFuelCost(item.data) : null} />
          ) : (
            <SpwItem key={item.data.id} record={item.data} customerName={getCustomer(item.data.customer_id)?.company_name} activityName={getActiviteitName(item.data.activity_id)} />
          )
        )}
      </div>
    </div>
  );
}