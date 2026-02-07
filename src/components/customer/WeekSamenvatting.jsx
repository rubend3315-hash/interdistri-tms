import React, { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseTimeToHours } from "./BesteltijdReport";

function hoursToHHMMSS(hours) {
  if (!hours || hours <= 0) return '-';
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.round(((hours - h) * 60 - m) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getWeekNumber(datumStr) {
  if (!datumStr) return null;
  const parts = datumStr.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!parts) return null;
  const d = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
  const tmp = new Date(d.valueOf());
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  return 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function calcAvg(rows, tiModelRoutes) {
  const count = rows.length;
  if (count === 0) return null;

  let totaalRitUren = 0, aantalRouteStops = 0, aantalRouteStuks = 0, succesvolleStops = 0, omzet = 0;
  let sumNorm = 0, sumBruto = 0, sumNetto = 0, sumVoorb = 0;
  let cNorm = 0, cBruto = 0, cNetto = 0, cVoorb = 0;
  let normSum = 0, normCount = 0, actualSum = 0, actualCount = 0;

  const findTiRoute = (routeName) => {
    if (!routeName || routeName === '-') return null;
    const match = routeName.trim().match(/^(\d+)/);
    if (!match) return null;
    const normalized = match[1].replace(/^0+/, '');
    return tiModelRoutes.find(r => r.route_code && r.route_code.trim().replace(/^0+/, '') === normalized) || null;
  };

  rows.forEach(r => {
    let ritUren = r.totaalRitUren || 0;
    // Als geen rit uren, gebruik TI Model route tijd
    if (ritUren <= 0) {
      const tiRoute = findTiRoute(r.route);
      if (tiRoute && tiRoute.total_time_hours > 0) {
        ritUren = tiRoute.total_time_hours;
      }
    }
    totaalRitUren += ritUren;
    aantalRouteStops += r.aantalRouteStops || 0;
    aantalRouteStuks += r.aantalRouteStuks || 0;
    succesvolleStops += r.succesvolleStops || 0;
    omzet += r.omzet || 0;

    const bn = parseTimeToHours(r.besteltijdNorm);
    if (bn > 0) { sumNorm += bn; cNorm++; }
    const bb = parseTimeToHours(r.besteltijdBruto);
    if (bb > 0) { sumBruto += bb; cBruto++; }
    const bne = parseTimeToHours(r.besteltijdNetto);
    if (bne > 0) { sumNetto += bne; cNetto++; }
    const vb = parseTimeToHours(r.voorbereiding);
    if (vb > 0) { sumVoorb += vb; cVoorb++; }

    const tiRoute = findTiRoute(r.route);
    const norm = tiRoute?.manual_norm_per_hour || tiRoute?.calculated_norm_per_hour || 0;
    if (norm > 0) { normSum += norm; normCount++; }
    const besteltijdUren = parseTimeToHours(r.besteltijdNetto);
    const actual = besteltijdUren > 0 ? (r.aantalRouteStops || 0) / besteltijdUren : 0;
    if (actual > 0) { actualSum += actual; actualCount++; }
  });

  const uurtarief = totaalRitUren > 0 ? omzet / totaalRitUren : 0;
  const hitrate = aantalRouteStops > 0 ? succesvolleStops / aantalRouteStops : 0;

  return {
    count,
    gemBesteltijdNorm: cNorm > 0 ? sumNorm / cNorm : 0,
    gemBesteltijdBruto: cBruto > 0 ? sumBruto / cBruto : 0,
    gemBesteltijdNetto: cNetto > 0 ? sumNetto / cNetto : 0,
    gemVoorbereiding: cVoorb > 0 ? sumVoorb / cVoorb : 0,
    gemUren: count > 0 ? totaalRitUren / count : 0,
    gemStops: count > 0 ? aantalRouteStops / count : 0,
    gemStuks: count > 0 ? aantalRouteStuks / count : 0,
    gemNorm: normCount > 0 ? normSum / normCount : 0,
    gemActual: actualCount > 0 ? actualSum / actualCount : 0,
    hitrate,
    gemOmzet: count > 0 ? omzet / count : 0,
    totaalOmzet: omzet,
    uurtarief,
    totaalRitUren,
  };
}

const fmt = (v) => {
  if (v === 0 || v === undefined || v === null) return '-';
  return `€ ${v.toFixed(2)}`;
};

function SummaryTable({ grouped, tiModelRoutes, labelHeader }) {
  // sorted keys
  const weeks = [...new Set(Object.values(grouped).flatMap(g => Object.keys(g)))].sort((a, b) => Number(a) - Number(b));
  const groupKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  if (groupKeys.length === 0) return <p className="text-slate-500 text-sm py-4">Geen data beschikbaar.</p>;

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="text-left py-2 px-2 font-medium text-slate-600">{labelHeader}</th>
            <th className="text-left py-2 px-2 font-medium text-slate-600">Week</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Ritten</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Gem. Besteltijd Norm</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Gem. Besteltijd Bruto</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Gem. Besteltijd Netto</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Gem. Voorbereiding</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Gem. Rit uren</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Gem. Stops</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Gem. Stuks</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Gem. Norm/uur</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Gem. Werkelijk/uur</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Hitrate</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Gem. Omzet</th>
            <th className="text-right py-2 px-2 font-medium text-slate-600">Uurtarief</th>
          </tr>
        </thead>
        <tbody>
          {groupKeys.map(key => {
            const weekMap = grouped[key];
            const weekKeys = Object.keys(weekMap).sort((a, b) => Number(a) - Number(b));
            // Collect all rows for grand avg of this group
            const allGroupRows = weekKeys.flatMap(wk => weekMap[wk]);
            const grandAvg = calcAvg(allGroupRows, tiModelRoutes);

            return (
              <React.Fragment key={key}>
                {/* Totaal rij per groep */}
                {grandAvg && (
                  <tr className="bg-blue-50 border-b hover:bg-blue-100 font-semibold text-xs">
                    <td className="py-1.5 px-2 text-blue-800">{key}</td>
                    <td className="py-1.5 px-2 text-blue-800">Totaal</td>
                    <td className="py-1.5 px-2 text-right text-blue-800">{grandAvg.count}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{hoursToHHMMSS(grandAvg.gemBesteltijdNorm)}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{hoursToHHMMSS(grandAvg.gemBesteltijdBruto)}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{hoursToHHMMSS(grandAvg.gemBesteltijdNetto)}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{hoursToHHMMSS(grandAvg.gemVoorbereiding)}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{grandAvg.gemUren > 0 ? `${grandAvg.gemUren.toFixed(1)}` : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{grandAvg.gemStops > 0 ? grandAvg.gemStops.toFixed(0) : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{grandAvg.gemStuks > 0 ? grandAvg.gemStuks.toFixed(0) : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{grandAvg.gemNorm > 0 ? grandAvg.gemNorm.toFixed(1) : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{grandAvg.gemActual > 0 ? grandAvg.gemActual.toFixed(1) : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{grandAvg.hitrate > 0 ? `${(grandAvg.hitrate * 100).toFixed(1)}%` : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-900">{fmt(grandAvg.gemOmzet)}</td>
                    <td className={`py-1.5 px-2 text-right ${grandAvg.uurtarief > 45 ? 'text-green-700' : grandAvg.uurtarief > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                      {grandAvg.uurtarief > 0 ? fmt(grandAvg.uurtarief) : '-'}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
        {(() => {
          const allRows = groupKeys.flatMap(key => Object.values(grouped[key]).flat());
          const totalAvg = calcAvg(allRows, tiModelRoutes);
          if (!totalAvg) return null;
          return (
            <tfoot>
              <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300 text-xs">
                <td className="py-2 px-2 text-slate-800">Eindtotaal</td>
                <td className="py-2 px-2 text-slate-800"></td>
                <td className="py-2 px-2 text-right text-slate-800">{totalAvg.count}</td>
                <td className="py-2 px-2 text-right text-slate-700">{hoursToHHMMSS(totalAvg.gemBesteltijdNorm)}</td>
                <td className="py-2 px-2 text-right text-slate-700">{hoursToHHMMSS(totalAvg.gemBesteltijdBruto)}</td>
                <td className="py-2 px-2 text-right text-slate-700">{hoursToHHMMSS(totalAvg.gemBesteltijdNetto)}</td>
                <td className="py-2 px-2 text-right text-slate-700">{hoursToHHMMSS(totalAvg.gemVoorbereiding)}</td>
                <td className="py-2 px-2 text-right text-slate-700">{totalAvg.gemUren > 0 ? `${totalAvg.gemUren.toFixed(1)}` : '-'}</td>
                <td className="py-2 px-2 text-right text-slate-700">{totalAvg.gemStops > 0 ? totalAvg.gemStops.toFixed(0) : '-'}</td>
                <td className="py-2 px-2 text-right text-slate-700">{totalAvg.gemStuks > 0 ? totalAvg.gemStuks.toFixed(0) : '-'}</td>
                <td className="py-2 px-2 text-right text-slate-700">{totalAvg.gemNorm > 0 ? totalAvg.gemNorm.toFixed(1) : '-'}</td>
                <td className="py-2 px-2 text-right text-slate-700">{totalAvg.gemActual > 0 ? totalAvg.gemActual.toFixed(1) : '-'}</td>
                <td className="py-2 px-2 text-right text-slate-700">{totalAvg.hitrate > 0 ? `${(totalAvg.hitrate * 100).toFixed(1)}%` : '-'}</td>
                <td className="py-2 px-2 text-right font-bold text-slate-900">{fmt(totalAvg.gemOmzet)}</td>
                <td className={`py-2 px-2 text-right font-bold ${totalAvg.uurtarief > 45 ? 'text-green-700' : totalAvg.uurtarief > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                  {totalAvg.uurtarief > 0 ? fmt(totalAvg.uurtarief) : '-'}
                </td>
              </tr>
            </tfoot>
          );
        })()}
      </table>
    </div>
  );
}

export default function WeekSamenvatting({ rows, tiModelRoutes = [] }) {
  const [viewBy, setViewBy] = useState("route");

  // Group rows: { [route/chauffeur]: { [weekNr]: [rows] } }
  const grouped = useMemo(() => {
    if (!rows || rows.length === 0) return {};
    const result = {};
    rows.forEach(r => {
      const key = viewBy === "route" ? (r.route || '-') : (r.chauffeur || '-');
      const wk = getWeekNumber(r.datum) || 0;
      if (!result[key]) result[key] = {};
      if (!result[key][wk]) result[key][wk] = [];
      result[key][wk].push(r);
    });
    return result;
  }, [rows, viewBy]);

  if (!rows || rows.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen data beschikbaar.</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-medium text-slate-700">Weergave per:</span>
        <Select value={viewBy} onValueChange={setViewBy}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="route">Route</SelectItem>
            <SelectItem value="chauffeur">Chauffeur</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <SummaryTable
        grouped={grouped}
        tiModelRoutes={tiModelRoutes}
        labelHeader={viewBy === "route" ? "Route" : "Chauffeur"}
      />
    </div>
  );
}