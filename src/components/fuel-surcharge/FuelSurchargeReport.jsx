import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Fuel, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO, getISOWeek } from "date-fns";
import { nl } from "date-fns/locale";

const fmt = (n) => n?.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '-';

export default function FuelSurchargeReport({ surcharge, customerName }) {
  if (!surcharge) return null;

  const { trip_details = [], base_fuel_price, actual_fuel_price, surcharge_amount, base_cost, actual_cost, date_from, date_to, total_km, total_hours, calculation_method } = surcharge;

  const weekNr = getISOWeek(parseISO(date_from));
  const periodLabel = date_from === date_to
    ? format(parseISO(date_from), 'd MMMM yyyy', { locale: nl })
    : `Week ${weekNr} — ${format(parseISO(date_from), 'd-MM-yyyy')} t/m ${format(parseISO(date_to), 'd-MM-yyyy')}`;

  return (
    <Card className="print:shadow-none print:border-0">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Fuel className="w-5 h-5 text-amber-600" />
              Brandstofclausule
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Interdistri Kapelle-Zeeland · Distributie - Opslag - Transport - Koeriersdiensten
            </p>
            <p className="text-sm font-medium text-slate-700 mt-0.5">Periode {periodLabel}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden gap-2">
            <Printer className="w-4 h-4" />
            Printen
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Customer info bar */}
        <div className="bg-slate-700 text-white px-4 py-2 text-sm font-medium">
          Bestelbus
        </div>
        <div className="bg-slate-100 px-4 py-1.5 flex items-center justify-between text-xs font-medium text-slate-600 border-b">
          <div className="flex gap-8">
            <span className="w-24">Datum</span>
            <span className="w-32">Klant</span>
            <span className="w-40">Route</span>
            <span className="w-24">Kenteken</span>
            <span className="w-16 text-right">KM</span>
          </div>
          <div className="flex gap-8 text-right">
            <span className="w-28">Brandstofprijs in tarief</span>
            <span className="w-28">Nacalculatie brandstofprijs</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-24">Datum</TableHead>
                <TableHead className="w-32">Klant</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="w-28">Kenteken</TableHead>
                <TableHead className="text-right w-16">KM</TableHead>
                <TableHead className="text-right w-28">Kosten per dag</TableHead>
                <TableHead className="text-right w-28">Kosten per dag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trip_details.map((t, i) => (
                <TableRow key={i} className="text-sm">
                  <TableCell className="tabular-nums">{t.date ? format(parseISO(t.date), 'dd-MM-yyyy') : '-'}</TableCell>
                  <TableCell>{customerName}</TableCell>
                  <TableCell>{t.route || '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{t.vehicle_plate}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.km}</TableCell>
                  <TableCell className="text-right tabular-nums">€ {fmt(t.base_cost)}</TableCell>
                  <TableCell className="text-right tabular-nums">€ {fmt(t.actual_cost)}</TableCell>
                </TableRow>
              ))}
              {trip_details.length > 0 && (
                <TableRow className="bg-slate-50 font-semibold border-t-2 text-sm">
                  <TableCell colSpan={4}></TableCell>
                  <TableCell className="text-right tabular-nums">{total_km}</TableCell>
                  <TableCell className="text-right tabular-nums">€ {fmt(base_cost)}</TableCell>
                  <TableCell className="text-right tabular-nums">€ {fmt(actual_cost)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="p-4 border-t space-y-2">
          <div className="flex justify-end gap-8 text-sm">
            <span className="text-slate-600">Totaal te factureren dieseltoeslag excl. BTW</span>
            <span className="font-bold text-lg">€ {fmt(surcharge_amount)}</span>
          </div>
          <div className="flex justify-end gap-4 text-xs text-slate-500">
            <span>Basisprijs: € {base_fuel_price?.toFixed(4)}/ltr</span>
            <span>Gem. actueel: € {actual_fuel_price?.toFixed(4)}/ltr</span>
            <span>Methode: {calculation_method === 'km' ? 'per KM' : 'per uur'}</span>
            {calculation_method === 'km' && <span>{total_km} km</span>}
            {calculation_method === 'hour' && <span>{total_hours} uur</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}