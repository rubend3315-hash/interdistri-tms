import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    : `Week ${weekNr} — ${format(parseISO(date_from), 'dd-MM-yyyy')} t/m ${format(parseISO(date_to), 'dd-MM-yyyy')}`;

  // Group trips by vehicle_type
  const typeGroups = {};
  trip_details.forEach(t => {
    const type = t.vehicle_type || 'Overig';
    if (!typeGroups[type]) typeGroups[type] = [];
    typeGroups[type].push(t);
  });

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
        <div className="overflow-x-auto">
          <Table className="table-fixed w-full">
            <colgroup>
              <col className="w-[90px]" />
              <col className="w-[90px]" />
              <col />
              <col className="w-[90px]" />
              <col className="w-[90px]" />
              <col className="w-[60px]" />
              <col className="w-[110px]" />
              <col className="w-[110px]" />
            </colgroup>
            <TableHeader>
              <TableRow className="bg-slate-700 hover:bg-slate-700 border-0">
                <TableHead colSpan={3} className="text-white font-medium text-xs py-2" />
                <TableHead className="text-white font-medium text-xs py-2" />
                <TableHead className="text-white font-medium text-xs py-2" />
                <TableHead className="text-white font-medium text-xs text-right py-2">KM</TableHead>
                <TableHead className="text-white font-medium text-xs text-right py-2">Brandstofprijs in tarief</TableHead>
                <TableHead className="text-white font-medium text-xs text-right py-2">Nacalculatie brandstofprijs</TableHead>
              </TableRow>
              <TableRow className="bg-slate-100 text-xs">
                <TableHead className="py-1.5 text-slate-600">Datum</TableHead>
                <TableHead className="py-1.5 text-slate-600">Klant</TableHead>
                <TableHead className="py-1.5 text-slate-600">Route</TableHead>
                <TableHead className="py-1.5 text-slate-600">Kenteken</TableHead>
                <TableHead className="py-1.5 text-slate-600">Type</TableHead>
                <TableHead className="py-1.5 text-slate-600 text-right">KM</TableHead>
                <TableHead className="py-1.5 text-slate-600 text-right">Kosten per dag</TableHead>
                <TableHead className="py-1.5 text-slate-600 text-right">Kosten per dag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(typeGroups).map(([type, trips]) => {
                const groupKm = trips.reduce((s, t) => s + (t.km || 0), 0);
                const groupBase = trips.reduce((s, t) => s + (t.base_cost || 0), 0);
                const groupActual = trips.reduce((s, t) => s + (t.actual_cost || 0), 0);

                return (
                  <React.Fragment key={type}>
                    {/* Type group header */}
                    <TableRow className="bg-slate-600 hover:bg-slate-600 border-0">
                      <TableCell colSpan={8} className="text-white text-sm font-medium py-1.5">{type}</TableCell>
                    </TableRow>
                    {trips.map((t, i) => (
                      <TableRow key={i} className="text-sm">
                        <TableCell className="tabular-nums py-1.5">{t.date ? format(parseISO(t.date), 'dd-MM-yyyy') : '-'}</TableCell>
                        <TableCell className="py-1.5">{customerName}</TableCell>
                        <TableCell className="py-1.5">{t.route || '-'}</TableCell>
                        <TableCell className="font-mono text-xs py-1.5">{t.vehicle_plate}</TableCell>
                        <TableCell className="text-xs py-1.5">{t.vehicle_type || '-'}</TableCell>
                        <TableCell className="text-right tabular-nums py-1.5">{t.km}</TableCell>
                        <TableCell className="text-right tabular-nums py-1.5">€ {fmt(t.base_cost)}</TableCell>
                        <TableCell className="text-right tabular-nums py-1.5 text-amber-700">€ {fmt(t.actual_cost)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Group subtotal */}
                    <TableRow className="bg-slate-50 border-t text-sm font-medium">
                      <TableCell colSpan={5} className="text-right text-xs text-slate-500 py-1.5">Subtotaal {type}</TableCell>
                      <TableCell className="text-right tabular-nums py-1.5">{Math.round(groupKm * 10) / 10}</TableCell>
                      <TableCell className="text-right tabular-nums py-1.5">€ {fmt(groupBase)}</TableCell>
                      <TableCell className="text-right tabular-nums py-1.5 text-amber-700">€ {fmt(groupActual)}</TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}

              {/* Grand total */}
              <TableRow className="bg-slate-100 font-bold border-t-2 text-sm">
                <TableCell colSpan={5} className="py-2" />
                <TableCell className="text-right tabular-nums py-2">{total_km}</TableCell>
                <TableCell className="text-right tabular-nums py-2">€ {fmt(base_cost)}</TableCell>
                <TableCell className="text-right tabular-nums py-2 text-amber-700">€ {fmt(actual_cost)}</TableCell>
              </TableRow>
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
            <span>Methode: {calculation_method === 'km' ? 'per KM' : calculation_method === 'hour' ? 'per uur' : 'gemengd'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}