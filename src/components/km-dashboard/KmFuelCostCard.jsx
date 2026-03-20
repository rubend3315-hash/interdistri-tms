import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Fuel, TrendingUp, Loader2, AlertTriangle } from "lucide-react";

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

export default function KmFuelCostCard({ trips, vehicleMap, dieselData, dieselLoading, dieselError }) {
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

  // Group by vehicle
  const byVehicle = {};
  trips.forEach(t => {
    if (!byVehicle[t.vehicle_id]) {
      byVehicle[t.vehicle_id] = { totalKm: 0, trips: 0 };
    }
    byVehicle[t.vehicle_id].totalKm += t.total_km || 0;
    byVehicle[t.vehicle_id].trips++;
  });

  const totalKm = trips.reduce((s, t) => s + (t.total_km || 0), 0);

  const rows = Object.entries(byVehicle)
    .map(([id, data]) => {
      const vehicle = vehicleMap[id];
      const plate = vehicle?.license_plate || '?';
      const kmPerLiter = getKmPerLiter(plate);
      const liters = data.totalKm / kmPerLiter;
      const cost = liters * price;
      return { id, plate, totalKm: data.totalKm, trips: data.trips, kmPerLiter, liters, cost };
    })
    .sort((a, b) => b.cost - a.cost);

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