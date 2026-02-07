import React, { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseTimeToHours } from "./BesteltijdReport";

function hoursToHHMMSS(hours) {
  if (!hours || hours <= 0) return '-';
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.round(((hours - h) * 60 - m) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const fmt = (v) => (v != null && v > 0) ? `€${v.toFixed(2)}` : '-';
const fmtPct = (v) => (v != null && v > 0) ? `${(v * 100).toFixed(1)}%` : '-';
const fmtNum = (v, dec = 1) => (v != null && v > 0) ? v.toFixed(dec) : '-';

function calcRouteStats(rows, tiModelRoutes) {
  const count = rows.length;
  if (count === 0) return null;

  const findTiRoute = (routeName) => {
    if (!routeName || routeName === '-') return null;
    const match = routeName.trim().match(/^(\d+)/);
    if (!match) return null;
    const normalized = match[1].replace(/^0+/, '');
    return tiModelRoutes.find(r => r.route_code && r.route_code.trim().replace(/^0+/, '') === normalized) || null;
  };

  let totaalRitUren = 0, routeStops = 0, routeStuks = 0, succesvolleStops = 0, omzet = 0;
  let sumNorm = 0, cNorm = 0, sumBruto = 0, cBruto = 0, sumNetto = 0, cNetto = 0;
  let sumVoorb = 0, cVoorb = 0;
  let aantalGeenScan = 0, sumTijdGeenScan = 0, cTijdGeenScan = 0;
  let stopsGeenAanbiedpoging = 0, stopsAangeboden = 0, stopsTerug = 0;
  let bml = 0, pba = 0, collectie = 0, afgeleverdStuks = 0;

  rows.forEach(r => {
    let ritUren = r.totaalRitUren || parseTimeToHours(r.totaalRit) || 0;
    if (ritUren <= 0) {
      const tiRoute = findTiRoute(r.route);
      if (tiRoute?.total_time_hours > 0) ritUren = tiRoute.total_time_hours;
    }
    totaalRitUren += ritUren;
    routeStops += r.aantalRouteStops || 0;
    routeStuks += r.aantalRouteStuks || 0;
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

    aantalGeenScan += r.aantalPeriodesGeenScan || 0;
    const tgs = parseTimeToHours(r.tijdGeenScan);
    if (tgs > 0) { sumTijdGeenScan += tgs; cTijdGeenScan++; }

    stopsGeenAanbiedpoging += r.stopsGeenAanbiedpoging || 0;
    stopsAangeboden += r.stopsAangeboden || 0;
    stopsTerug += r.stopsTerug || 0;
    bml += r.bml || 0;
    pba += r.pba || 0;
    collectie += r.collectie || 0;
    afgeleverdStuks += r.afgeleverdStuks || 0;
  });

  const hitrate = routeStops > 0 ? succesvolleStops / routeStops : 0;
  const uurtarief = totaalRitUren > 0 ? omzet / totaalRitUren : 0;

  return {
    count,
    totaalRitUren,
    gemUren: count > 0 ? totaalRitUren / count : 0,
    gemStops: count > 0 ? routeStops / count : 0,
    gemStuks: count > 0 ? routeStuks / count : 0,
    hitrate,
    omzet,
    gemOmzet: count > 0 ? omzet / count : 0,
    uurtarief,
    gemBesteltijdNorm: cNorm > 0 ? sumNorm / cNorm : 0,
    gemBesteltijdBruto: cBruto > 0 ? sumBruto / cBruto : 0,
    gemBesteltijdNetto: cNetto > 0 ? sumNetto / cNetto : 0,
    gemVoorbereiding: cVoorb > 0 ? sumVoorb / cVoorb : 0,
    aantalGeenScan,
    gemTijdGeenScan: cTijdGeenScan > 0 ? sumTijdGeenScan / cTijdGeenScan : 0,
    totTijdGeenScan: sumTijdGeenScan,
    stopsGeenAanbiedpoging,
    stopsAangeboden,
    stopsTerug,
    bml,
    pba,
    collectie,
    afgeleverdStuks,
    succesvolleStops,
    routeStops,
    routeStuks,
  };
}

export default function RouteOverview({ weekData, besteltijdRows, tiModelRoutes = [] }) {
  const [sortBy, setSortBy] = useState("route");
  const [sortDir, setSortDir] = useState("asc");

  // Build enriched rows from weekData (raw) + besteltijdRows (calculated)
  const enrichedRows = useMemo(() => {
    if (!weekData || weekData.length === 0) return [];

    return weekData.map((raw, idx) => {
      const matched = besteltijdRows?.[idx] || {};
      return {
        route: raw['Ritnaam'] || '-',
        chauffeur: raw['Chauffeur'] || '-',
        datum: raw['Datum'] || '-',
        totaalRitUren: parseTimeToHours(raw['Totaal rit']),
        totaalRit: raw['Totaal rit'] || '-',
        aantalRouteStops: Number(raw['Aantal tijdens route - stops']) || 0,
        aantalRouteStuks: Number(raw['Aantal tijdens route - stuks']) || 0,
        succesvolleStops: Number(raw['Aantal afgeleverd - stops']) || 0,
        omzet: matched.omzet || 0,
        besteltijdNorm: raw['Besteltijd Norm'] || '-',
        besteltijdBruto: raw['Besteltijd Bruto'] || '-',
        besteltijdNetto: raw['Besteltijd Netto'] || '-',
        voorbereiding: raw['Voorbereiding, aan-/afrijtijd en afhandeling'] || '-',
        aantalPeriodesGeenScan: Number(raw['Aantal periodes >15 min geen scan']) || 0,
        tijdGeenScan: raw['>15 min geen scan'] || '-',
        stopsGeenAanbiedpoging: Number(raw['Aantal stops waarvoor geen aanbiedpoging is uitgevoerd']) || 0,
        stopsAangeboden: Number(raw['Aantal stops aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)']) || 0,
        stopsTerug: Number(raw['Aantal bij terugkomst - stops']) || 0,
        bml: Number(raw['Legitimatiecheck aan de deur']) || 0,
        pba: Number(raw['Aantal PBA-pakketten bezorgd']) || 0,
        collectie: Number(raw['Aantal stuks afgehaald/gecollecteerd']) || 0,
        afgeleverdStuks: Number(raw['Aantal afgeleverd - stuks']) || 0,
      };
    });
  }, [weekData, besteltijdRows]);

  // Group by route
  const routeStats = useMemo(() => {
    const grouped = {};
    enrichedRows.forEach(r => {
      const key = r.route || '-';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    return Object.entries(grouped).map(([route, rows]) => ({
      route,
      ...calcRouteStats(rows, tiModelRoutes),
    }));
  }, [enrichedRows, tiModelRoutes]);

  // Sort
  const sortedStats = useMemo(() => {
    return [...routeStats].sort((a, b) => {
      let va, vb;
      if (sortBy === "route") { va = a.route; vb = b.route; }
      else { va = a[sortBy] || 0; vb = b[sortBy] || 0; }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [routeStats, sortBy, sortDir]);

  // Totals
  const totals = useMemo(() => {
    if (enrichedRows.length === 0) return null;
    return calcRouteStats(enrichedRows, tiModelRoutes);
  }, [enrichedRows, tiModelRoutes]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  if (!weekData || weekData.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen data beschikbaar.</p>;
  }

  const SortHeader = ({ col, children, className = "" }) => (
    <th
      className={`py-2 px-1.5 font-medium text-slate-600 cursor-pointer hover:text-blue-600 select-none ${className}`}
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-0.5 justify-end">
        {children}
        {sortBy === col && <span className="text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </span>
    </th>
  );

  return (
    <div>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b">
            <tr>
              <SortHeader col="route" className="text-left min-w-[80px]">Route</SortHeader>
              <SortHeader col="count" className="text-right">Ritten</SortHeader>
              <SortHeader col="gemUren" className="text-right">Gem. Uren</SortHeader>
              <SortHeader col="totaalRitUren" className="text-right">Tot. Uren</SortHeader>
              <SortHeader col="gemStops" className="text-right">Gem. Stops</SortHeader>
              <SortHeader col="gemStuks" className="text-right">Gem. Stuks</SortHeader>
              <SortHeader col="hitrate" className="text-right">Hitrate</SortHeader>
              <SortHeader col="gemOmzet" className="text-right">Gem. Omzet</SortHeader>
              <SortHeader col="omzet" className="text-right">Tot. Omzet</SortHeader>
              <SortHeader col="uurtarief" className="text-right">Uurtarief</SortHeader>
              <SortHeader col="gemBesteltijdNorm" className="text-right">Gem. BT Norm</SortHeader>
              <SortHeader col="gemBesteltijdBruto" className="text-right">Gem. BT Bruto</SortHeader>
              <SortHeader col="gemBesteltijdNetto" className="text-right">Gem. BT Netto</SortHeader>
              <SortHeader col="gemVoorbereiding" className="text-right">Gem. Voorb.</SortHeader>
              <SortHeader col="aantalGeenScan" className="text-right">X Geen Scan</SortHeader>
              <SortHeader col="totTijdGeenScan" className="text-right">Tijd Geen Scan</SortHeader>
              <SortHeader col="stopsAangeboden" className="text-right">Aangeboden</SortHeader>
              <SortHeader col="stopsGeenAanbiedpoging" className="text-right">Geen Aanbied</SortHeader>
              <SortHeader col="stopsTerug" className="text-right">Terug</SortHeader>
              <SortHeader col="bml" className="text-right">BML</SortHeader>
              <SortHeader col="pba" className="text-right">PBA</SortHeader>
              <SortHeader col="collectie" className="text-right">Collectie</SortHeader>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((s, idx) => (
              <tr key={s.route} className={`border-b hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="py-1.5 px-1.5 font-medium text-slate-800">{s.route}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{s.count}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{fmtNum(s.gemUren)}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{fmtNum(s.totaalRitUren)}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{fmtNum(s.gemStops, 0)}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{fmtNum(s.gemStuks, 0)}</td>
                <td className={`py-1.5 px-1.5 text-right font-medium ${s.hitrate >= 0.95 ? 'text-green-700' : s.hitrate >= 0.90 ? 'text-orange-600' : 'text-red-600'}`}>
                  {fmtPct(s.hitrate)}
                </td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{fmt(s.gemOmzet)}</td>
                <td className="py-1.5 px-1.5 text-right font-medium text-slate-900">{fmt(s.omzet)}</td>
                <td className={`py-1.5 px-1.5 text-right font-medium ${s.uurtarief >= 45 ? 'text-green-700' : s.uurtarief > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {fmt(s.uurtarief)}
                </td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{hoursToHHMMSS(s.gemBesteltijdNorm)}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{hoursToHHMMSS(s.gemBesteltijdBruto)}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{hoursToHHMMSS(s.gemBesteltijdNetto)}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{hoursToHHMMSS(s.gemVoorbereiding)}</td>
                <td className={`py-1.5 px-1.5 text-right ${s.aantalGeenScan > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}`}>{s.aantalGeenScan || '-'}</td>
                <td className={`py-1.5 px-1.5 text-right ${s.totTijdGeenScan > 0 ? 'text-red-600' : 'text-slate-400'}`}>{hoursToHHMMSS(s.totTijdGeenScan)}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{s.stopsAangeboden || '-'}</td>
                <td className={`py-1.5 px-1.5 text-right ${s.stopsGeenAanbiedpoging > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{s.stopsGeenAanbiedpoging || '-'}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{s.stopsTerug || '-'}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{s.bml || '-'}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{s.pba || '-'}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{s.collectie || '-'}</td>
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                <td className="py-2 px-1.5 text-slate-800">Totaal ({sortedStats.length} routes)</td>
                <td className="py-2 px-1.5 text-right text-slate-800">{totals.count}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{fmtNum(totals.gemUren)}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{fmtNum(totals.totaalRitUren)}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{fmtNum(totals.gemStops, 0)}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{fmtNum(totals.gemStuks, 0)}</td>
                <td className={`py-2 px-1.5 text-right font-bold ${totals.hitrate >= 0.95 ? 'text-green-700' : 'text-orange-600'}`}>{fmtPct(totals.hitrate)}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{fmt(totals.gemOmzet)}</td>
                <td className="py-2 px-1.5 text-right font-bold text-slate-900">{fmt(totals.omzet)}</td>
                <td className={`py-2 px-1.5 text-right font-bold ${totals.uurtarief >= 45 ? 'text-green-700' : 'text-red-600'}`}>{fmt(totals.uurtarief)}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{hoursToHHMMSS(totals.gemBesteltijdNorm)}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{hoursToHHMMSS(totals.gemBesteltijdBruto)}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{hoursToHHMMSS(totals.gemBesteltijdNetto)}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{hoursToHHMMSS(totals.gemVoorbereiding)}</td>
                <td className="py-2 px-1.5 text-right text-red-600">{totals.aantalGeenScan || '-'}</td>
                <td className="py-2 px-1.5 text-right text-red-600">{hoursToHHMMSS(totals.totTijdGeenScan)}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{totals.stopsAangeboden || '-'}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{totals.stopsGeenAanbiedpoging || '-'}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{totals.stopsTerug || '-'}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{totals.bml || '-'}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{totals.pba || '-'}</td>
                <td className="py-2 px-1.5 text-right text-slate-700">{totals.collectie || '-'}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}