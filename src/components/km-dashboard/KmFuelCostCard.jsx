import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Fuel, Loader2, AlertTriangle, Satellite } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Verbruik mapping: kenteken → km per liter (1:X)
const CONSUMPTION_OVERRIDES = {
  '91-BSP-6': 5, // vrachtwagen
};
const DEFAULT_KM_PER_LITER = 7; // bestelbussen standaard 1:7

function getKmPerLiter(plate) {
  if (!plate) return DEFAULT_KM_PER_LITER;
  const normalized = plate.replace(/[-\s]/g, '').toUpperCase();
  for (const [key, val] of Object.entries(CONSUMPTION_OVERRIDES)) {
    if (key.replace(/[-\s]/g, '').toUpperCase() === normalized) return val;
  }
  return DEFAULT_KM_PER_LITER;
}

function normPlate(p) {
  return (p || '').replace(/[-\s]/g, '').toUpperCase();
}

export default function KmFuelCostCard({ trips, tripRecords = [], vehicleMap, vehicles = [], dieselData, dieselLoading, dieselError }) {
  if (dieselLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Dieselprijs ophalen...</span>
        </CardContent>
      </Card>
    );
  }

  if (dieselError || !dieselData?.latest) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-amber-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">Dieselprijs niet beschikbaar</span>
        </CardContent>
      </Card>
    );
  }

  const price = dieselData.latest.price;
  const priceDate = dieselData.latest.date;

  // Build plate → vehicle_id mapping
  const plateToVehicleId = useMemo(() => {
    const m = {};
    vehicles.forEach(v => {
      if (v.license_plate) m[normPlate(v.license_plate)] = v.id;
    });
    return m;
  }, [vehicles]);

  // Group manual Trip km by vehicle_id
  const tripKmByVehicle = useMemo(() => {
    const m = {};
    trips.forEach(t => {
      if (!t.vehicle_id) return;
      if (!m[t.vehicle_id]) m[t.vehicle_id] = 0;
      m[t.vehicle_id] += t.total_km || 0;
    });
    return m;
  }, [trips]);

  // Group GPS TripRecord km by vehicle_id (matched via plate)
  const gpsKmByVehicle = useMemo(() => {
    const m = {};
    tripRecords.forEach(tr => {
      if (!tr.plate || !tr.total_km) return;
      const vid = plateToVehicleId[normPlate(tr.plate)];
      if (!vid) return;
      if (!m[vid]) m[vid] = 0;
      m[vid] += tr.total_km || 0;
    });
    return m;
  }, [tripRecords, plateToVehicleId]);

  // Combine: all vehicle_ids that appear in either source
  const allVehicleIds = useMemo(() => {
    const ids = new Set([...Object.keys(tripKmByVehicle), ...Object.keys(gpsKmByVehicle)]);
    return Array.from(ids);
  }, [tripKmByVehicle, gpsKmByVehicle]);

  const rows = useMemo(() => {
    return allVehicleIds
      .map(id => {
        const vehicle = vehicleMap[id];
        const plate = vehicle?.license_plate || '?';
        const fuelType = vehicle?.fuel_type;

        // Skip electric vehicles
        if (fuelType === 'Elektrisch') return null;

        const manualKm = tripKmByVehicle[id] || 0;
        const gpsKm = gpsKmByVehicle[id] || 0;

        // Use the highest value — manual trips or GPS
        const totalKm = Math.max(manualKm, gpsKm);
        const source = manualKm >= gpsKm ? 'manual' : 'gps';

        if (totalKm <= 0) return null;

        const kmPerLiter = getKmPerLiter(plate);
        const liters = totalKm / kmPerLiter;
        const cost = liters * price;

        return { id, plate, totalKm, source, manualKm, gpsKm, kmPerLiter, liters, cost };
      })
      .filter(Boolean)
      .sort((a, b) => b.cost - a.cost);
  }, [allVehicleIds, vehicleMap, tripKmByVehicle, gpsKmByVehicle, price]);

  const totalKm = rows.reduce((s, r) => s + r.totalKm, 0);
  const totalLiters = rows.reduce((s, r) => s + r.liters, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);

  const fmt = (n) => n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Fuel className="w-5 h-5 text-amber-600" />
          Brandstofkosten (geschat)
        </CardTitle>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
          <span>
            Dieselprijs: <strong className="text-slate-900">€ {fmt(price)}</strong>/ltr excl. BTW
          </span>
          <Badge variant="outline" className="text-[10px]">
            TLN {priceDate}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voertuig</TableHead>
                <TableHead className="text-right">Km</TableHead>
                <TableHead className="text-right">Verbruik</TableHead>
                <TableHead className="text-right">Liters (geschat)</TableHead>
                <TableHead className="text-right">Kosten (geschat)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="font-medium">{r.plate}</span>
                    {r.kmPerLiter !== DEFAULT_KM_PER_LITER && (
                      <Badge className="ml-2 text-[10px] bg-orange-100 text-orange-700">1:{r.kmPerLiter}</Badge>
                    )}
                    {r.source === 'gps' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Satellite className="w-3.5 h-3.5 ml-1.5 text-blue-500 inline-block" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">GPS data (geen handmatige rit ingevoerd)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.totalKm.toLocaleString('nl-NL')}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-500">1:{r.kmPerLiter}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(r.liters)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">€ {fmt(r.cost)}</TableCell>
                </TableRow>
              ))}
              {rows.length > 0 && (
                <TableRow className="bg-slate-50 font-semibold border-t-2">
                  <TableCell>Totaal</TableCell>
                  <TableCell className="text-right tabular-nums">{totalKm.toLocaleString('nl-NL')}</TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums">{fmt(totalLiters)}</TableCell>
                  <TableCell className="text-right tabular-nums">€ {fmt(totalCost)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}