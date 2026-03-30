import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO, getISOWeek } from "date-fns";
import { nl } from "date-fns/locale";

const fmt = (n) => n?.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '-';

export default function FuelSurchargeReport({ surcharge, customerName }) {
  if (!surcharge) return null;

  const { trip_details = [], base_fuel_price, actual_fuel_price, surcharge_amount, base_cost, actual_cost, date_from, date_to, total_km, total_gps_km, total_hours, calculation_method } = surcharge;

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

  const hasGpsData = trip_details.some(t => t.gps_km != null);

  const colStyle = {
    datum: { width: '9%', textAlign: 'left' },
    klant: { width: '8%', textAlign: 'left' },
    route: { width: '12%', textAlign: 'left' },
    kenteken: { width: '10%', textAlign: 'left' },
    type: { width: '10%', textAlign: 'left' },
    km: { width: '7%', textAlign: 'right' },
    gpsKm: { width: '7%', textAlign: 'right' },
    basis: { width: '16%', textAlign: 'right' },
    actueel: { width: '16%', textAlign: 'right' },
  };

  const thClass = "px-3 py-2 text-xs font-medium text-slate-600 whitespace-nowrap";
  const tdClass = "px-3 py-1.5 text-sm whitespace-nowrap";

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
          <table className="w-full border-collapse text-sm">
            {/* Top group header */}
            <thead>
              <tr className="bg-slate-700">
                <th style={colStyle.datum} className="px-3 py-2 text-left text-white text-xs font-medium" />
                <th style={colStyle.klant} className="px-3 py-2 text-left text-white text-xs font-medium" />
                <th style={colStyle.route} className="px-3 py-2 text-left text-white text-xs font-medium" />
                <th style={colStyle.kenteken} className="px-3 py-2 text-left text-white text-xs font-medium">Kenteken</th>
                <th style={colStyle.type} className="px-3 py-2 text-left text-white text-xs font-medium" />
                <th style={colStyle.km} className="px-3 py-2 text-right text-white text-xs font-medium">KM</th>
                {hasGpsData && <th style={colStyle.gpsKm} className="px-3 py-2 text-right text-white text-xs font-medium">GPS KM</th>}
                <th style={colStyle.basis} className="px-3 py-2 text-right text-white text-xs font-medium">Brandstofprijs in tarief</th>
                <th style={colStyle.actueel} className="px-3 py-2 text-right text-white text-xs font-medium">Nacalculatie brandstofprijs</th>
              </tr>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th style={colStyle.datum} className={thClass}>Datum</th>
                <th style={colStyle.klant} className={thClass}>Klant</th>
                <th style={colStyle.route} className={thClass}>Route</th>
                <th style={colStyle.kenteken} className={thClass}>Kenteken</th>
                <th style={colStyle.type} className={thClass}>Type</th>
                <th style={{ ...colStyle.km, textAlign: 'right' }} className={thClass + " text-right"}>KM</th>
                {hasGpsData && <th style={{ ...colStyle.gpsKm, textAlign: 'right' }} className={thClass + " text-right"}>GPS KM</th>}
                <th style={{ ...colStyle.basis, textAlign: 'right' }} className={thClass + " text-right"}>Kosten per dag</th>
                <th style={{ ...colStyle.actueel, textAlign: 'right' }} className={thClass + " text-right"}>Kosten per dag</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(typeGroups).map(([type, trips]) => {
                const groupKm = trips.reduce((s, t) => s + (t.km || 0), 0);
                const groupGpsKm = trips.reduce((s, t) => s + (t.gps_km || 0), 0);
                const groupBase = trips.reduce((s, t) => s + (t.base_cost || 0), 0);
                const groupActual = trips.reduce((s, t) => s + (t.actual_cost || 0), 0);
                const colCount = hasGpsData ? 9 : 8;

                return (
                  <React.Fragment key={type}>
                    {/* Vehicle type group header */}
                    <tr className="bg-slate-600">
                      <td colSpan={colCount} className="px-3 py-1.5 text-white text-sm font-medium">{type}</td>
                    </tr>
                    {trips.map((t, i) => {
                      const kmDiff = t.gps_km != null ? Math.round(t.gps_km - t.km) : null;
                      const diffWarning = kmDiff != null && Math.abs(kmDiff) > 20;
                      return (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td style={colStyle.datum} className={tdClass + " tabular-nums"}>{t.date ? format(parseISO(t.date), 'dd-MM-yyyy') : '-'}</td>
                          <td style={colStyle.klant} className={tdClass}>{customerName}</td>
                          <td style={colStyle.route} className={tdClass}>{t.route || '-'}</td>
                          <td style={colStyle.kenteken} className={tdClass + " font-mono text-xs"}>{t.vehicle_plate}</td>
                          <td style={colStyle.type} className={tdClass + " text-xs"}>{t.vehicle_type || '-'}</td>
                          <td style={colStyle.km} className={tdClass + " text-right tabular-nums"}>{t.km}</td>
                          {hasGpsData && (
                            <td style={colStyle.gpsKm} className={tdClass + " text-right tabular-nums " + (diffWarning ? "text-red-600 font-medium" : "text-slate-500")}>
                              {t.gps_km != null ? t.gps_km : '-'}
                            </td>
                          )}
                          <td style={colStyle.basis} className={tdClass + " text-right tabular-nums"}>€ {fmt(t.base_cost)}</td>
                          <td style={colStyle.actueel} className={tdClass + " text-right tabular-nums text-amber-700"}>€ {fmt(t.actual_cost)}</td>
                        </tr>
                      );
                    })}
                    {/* Subtotal per type */}
                    {Object.keys(typeGroups).length > 1 && (
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={5} className="px-3 py-1.5 text-right text-xs text-slate-500 font-medium">Subtotaal {type}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-sm font-medium">{Math.round(groupKm)}</td>
                        {hasGpsData && <td className="px-3 py-1.5 text-right tabular-nums text-sm font-medium text-slate-500">{Math.round(groupGpsKm)}</td>}
                        <td className="px-3 py-1.5 text-right tabular-nums text-sm font-medium">€ {fmt(groupBase)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-sm font-medium text-amber-700">€ {fmt(groupActual)}</td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Grand total row */}
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                <td colSpan={5} className="px-3 py-2" />
                <td className="px-3 py-2 text-right tabular-nums">{total_km}</td>
                {hasGpsData && <td className="px-3 py-2 text-right tabular-nums text-slate-500">{total_gps_km || '-'}</td>}
                <td className="px-3 py-2 text-right tabular-nums">€ {fmt(base_cost)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-amber-700">€ {fmt(actual_cost)}</td>
              </tr>
            </tbody>
          </table>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}