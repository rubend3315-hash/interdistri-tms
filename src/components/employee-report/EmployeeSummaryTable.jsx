import React, { useMemo } from "react";
import { parseTimeToHours } from "@/components/customer/BesteltijdReport";
import { getValidPriceRule } from "@/components/utils/priceRuleUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";

function fmt(v) {
  if (v === 0 || v == null) return '-';
  return `€ ${v.toFixed(2)}`;
}

// Build per-chauffeur summary from rapportage rows + KPI + articles
function matchesPD(name, pdEmployees) {
  if (!pdEmployees || pdEmployees.length === 0) return true;
  const n = (name || '').toLowerCase().trim();
  return pdEmployees.some(e => {
    const last = (e.last_name || '').trim().toLowerCase();
    const first = (e.first_name || '').trim().toLowerCase();
    const initial = first ? first.charAt(0) + '.' : '';
    const variations = [
      `${last} ${initial}`.trim(),
      `${initial} ${last}`.trim(),
      `${last} ${first}`.trim(),
      `${first} ${last}`.trim(),
      last,
    ];
    return variations.some(v => v === n || n.includes(v) || v.includes(n));
  });
}

export default function EmployeeSummaryTable({ reportRows = [], kpiData = [], tiModelRoutes = [], articles = [], weekStart, pdEmployees = [] }) {
  // Get stop article price for the week
  const stopPrice = useMemo(() => {
    const stopArticle = articles.find(a => a.description === 'Aantal afgeleverd - Stops' || a.article_number === 'ART-001');
    if (!stopArticle) return 0;
    const rule = getValidPriceRule(stopArticle.price_rules, weekStart);
    return rule?.price || 0;
  }, [articles, weekStart]);

  const findTiRoute = (routeName) => {
    if (!routeName || routeName === '-') return null;
    const match = routeName.trim().match(/^(\d+)/);
    if (!match) return null;
    const normalized = match[1].replace(/^0+/, '');
    return tiModelRoutes.find(r => r.route_code && r.route_code.trim().replace(/^0+/, '') === normalized) || null;
  };

  // Group report rows by chauffeur
  const chauffeurData = useMemo(() => {
    const grouped = {};
    reportRows.forEach(r => {
      const name = r.chauffeur || '-';
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(r);
    });

    return Object.entries(grouped).map(([name, rows]) => {
      let totaalRitUren = 0, aantalRouteStops = 0, succesvolleStops = 0, omzet = 0;
      let normSum = 0, normCount = 0, actualSum = 0, actualCount = 0;

      rows.forEach(r => {
        let ritUren = r.totaalRitUren || 0;
        if (ritUren <= 0) {
          const tiRoute = findTiRoute(r.route);
          if (tiRoute && tiRoute.total_time_hours > 0) ritUren = tiRoute.total_time_hours;
        }
        totaalRitUren += ritUren;
        aantalRouteStops += r.aantalRouteStops || 0;
        succesvolleStops += r.succesvolleStops || 0;
        omzet += r.omzet || 0;

        const tiRoute = findTiRoute(r.route);
        const norm = tiRoute?.manual_norm_per_hour || tiRoute?.calculated_norm_per_hour || 0;
        if (norm > 0) { normSum += norm; normCount++; }

        const besteltijdUren = parseTimeToHours(r.besteltijdNetto);
        const actual = besteltijdUren > 0 ? (r.aantalRouteStops || 0) / besteltijdUren : 0;
        if (actual > 0) { actualSum += actual; actualCount++; }
      });

      const hitrate = aantalRouteStops > 0 ? succesvolleStops / aantalRouteStops : 0;
      const missedStops = aantalRouteStops - succesvolleStops;
      const misgelopenOmzet = missedStops > 0 ? missedStops * stopPrice : 0;
      const uurtarief = totaalRitUren > 0 ? omzet / totaalRitUren : 0;
      const gemNorm = normCount > 0 ? normSum / normCount : 0;
      const gemActual = actualCount > 0 ? actualSum / actualCount : 0;
      const uurtariefGehaald = uurtarief >= 45; // €45 threshold

      // Find matching KPI
      const kpi = kpiData.find(k => {
        // Match by partial name
        const kpiName = (k.medewerker_naam || '').toLowerCase().trim();
        const chauffeurName = name.toLowerCase().trim();
        return kpiName === chauffeurName || chauffeurName.includes(kpiName) || kpiName.includes(chauffeurName);
      });

      // Collect unique weeks from rows
      const weeks = [...new Set(rows.map(r => r.weekNum).filter(Boolean))].sort((a, b) => a - b);

      return {
        name,
        ritten: rows.length,
        weeks,
        totaalRitUren,
        aantalRouteStops,
        succesvolleStops,
        hitrate,
        missedStops,
        misgelopenOmzet,
        omzet,
        uurtarief,
        gemNorm,
        gemActual,
        uurtariefGehaald,
        kpi
      };
    }).sort((a, b) => b.hitrate - a.hitrate);
  }, [reportRows, kpiData, tiModelRoutes, stopPrice]);

  if (chauffeurData.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen data beschikbaar.</p>;
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-xs">
        <thead className="bg-[#2c3e6b] text-white">
          <tr>
            <th className="text-left py-2.5 px-2 font-medium">Medewerker</th>
            <th className="text-right py-2.5 px-2 font-medium">Week</th>
            <th className="text-right py-2.5 px-2 font-medium">Ritten</th>
            <th className="text-right py-2.5 px-2 font-medium">Route stops</th>
            <th className="text-right py-2.5 px-2 font-medium">Geleverd</th>
            <th className="text-right py-2.5 px-2 font-medium">Hitrate</th>
            <th className="text-right py-2.5 px-2 font-medium">Gemiste stops</th>
            <th className="text-right py-2.5 px-2 font-medium">Misgelopen omzet</th>
            <th className="text-right py-2.5 px-2 font-medium">Gem. Norm/uur</th>
            <th className="text-right py-2.5 px-2 font-medium">Gem. Werkelijk/uur</th>
            <th className="text-right py-2.5 px-2 font-medium">Omzet</th>
            <th className="text-right py-2.5 px-2 font-medium">Rit uren</th>
            <th className="text-right py-2.5 px-2 font-medium">Uurtarief</th>
            <th className="text-center py-2.5 px-2 font-medium">Gehaald</th>
          </tr>
        </thead>
        <tbody>
          {chauffeurData.map((row, idx) => (
            <tr key={row.name} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50`}>
              <td className="py-2 px-2 font-medium text-slate-800">
                <span className="flex items-center gap-1">
                  {row.name}
                  {!matchesPD(row.name, pdEmployees) && pdEmployees.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">Niet gevonden in afdeling PakketDistributie</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </span>
              </td>
              <td className="py-2 px-2 text-right text-slate-700">{row.weeks?.join(', ') || '-'}</td>
              <td className="py-2 px-2 text-right text-slate-700">{row.ritten}</td>
              <td className="py-2 px-2 text-right text-slate-700">{row.aantalRouteStops}</td>
              <td className="py-2 px-2 text-right text-slate-700">{row.succesvolleStops}</td>
              <td className={`py-2 px-2 text-right font-medium ${row.hitrate >= 0.95 ? 'text-green-700' : row.hitrate >= 0.9 ? 'text-orange-600' : 'text-red-600'}`}>
                {row.hitrate > 0 ? `${(row.hitrate * 100).toFixed(1)}%` : '-'}
              </td>
              <td className={`py-2 px-2 text-right ${row.missedStops > 0 ? 'text-red-600 font-medium' : 'text-slate-700'}`}>
                {row.missedStops}
              </td>
              <td className={`py-2 px-2 text-right ${row.misgelopenOmzet > 0 ? 'text-red-600 font-medium' : 'text-slate-700'}`}>
                {row.misgelopenOmzet > 0 ? fmt(row.misgelopenOmzet) : '-'}
              </td>
              <td className="py-2 px-2 text-right text-slate-700">{row.gemNorm > 0 ? row.gemNorm.toFixed(1) : '-'}</td>
              <td className="py-2 px-2 text-right text-slate-700">{row.gemActual > 0 ? row.gemActual.toFixed(1) : '-'}</td>
              <td className="py-2 px-2 text-right font-medium text-slate-800">{fmt(row.omzet)}</td>
              <td className="py-2 px-2 text-right text-slate-700">{row.totaalRitUren > 0 ? row.totaalRitUren.toFixed(1) : '-'}</td>
              <td className={`py-2 px-2 text-right font-bold ${row.uurtarief >= 45 ? 'text-green-700' : row.uurtarief > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {row.uurtarief > 0 ? fmt(row.uurtarief) : '-'}
              </td>
              <td className="py-2 px-2 text-center">
                {row.uurtarief > 0 ? (
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${row.uurtariefGehaald ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {row.uurtariefGehaald ? 'Ja' : 'Nee'}
                  </span>
                ) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
            <td className="py-2 px-2 text-slate-800">Totaal</td>
            <td className="py-2 px-2 text-right"></td>
            <td className="py-2 px-2 text-right">{chauffeurData.reduce((s, r) => s + r.ritten, 0)}</td>
            <td className="py-2 px-2 text-right">{chauffeurData.reduce((s, r) => s + r.aantalRouteStops, 0)}</td>
            <td className="py-2 px-2 text-right">{chauffeurData.reduce((s, r) => s + r.succesvolleStops, 0)}</td>
            <td className="py-2 px-2 text-right">
              {(() => {
                const totalRoute = chauffeurData.reduce((s, r) => s + r.aantalRouteStops, 0);
                const totalSuccess = chauffeurData.reduce((s, r) => s + r.succesvolleStops, 0);
                return totalRoute > 0 ? `${(totalSuccess / totalRoute * 100).toFixed(1)}%` : '-';
              })()}
            </td>
            <td className="py-2 px-2 text-right text-red-600">{chauffeurData.reduce((s, r) => s + r.missedStops, 0)}</td>
            <td className="py-2 px-2 text-right text-red-600">{fmt(chauffeurData.reduce((s, r) => s + r.misgelopenOmzet, 0))}</td>
            <td className="py-2 px-2 text-right" colSpan={2}></td>
            <td className="py-2 px-2 text-right font-bold">{fmt(chauffeurData.reduce((s, r) => s + r.omzet, 0))}</td>
            <td className="py-2 px-2 text-right">{chauffeurData.reduce((s, r) => s + r.totaalRitUren, 0).toFixed(1)}</td>
            <td className="py-2 px-2 text-right" colSpan={2}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}