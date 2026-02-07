import React, { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Besteltijd rapportage: toont besteltijd norm, bruto, netto, voorbereiding, totaal rit
 * Gesorteerd op route of chauffeur, met omzet en behaald uurtarief.
 * 
 * rows: array of { chauffeur, route, datum, besteltijdNorm, besteltijdBruto, besteltijdNetto, 
 *   voorbereiding, totaalRit, totaalRitUren, omzet }
 */

function parseTimeToHours(timeStr) {
  if (!timeStr || timeStr === '-' || timeStr === '') return 0;
  const str = String(timeStr).trim();
  
  // HH:MM:SS format
  const partsHMS = str.match(/^(\d+):(\d+):(\d+)$/);
  if (partsHMS) {
    return parseInt(partsHMS[1]) + parseInt(partsHMS[2]) / 60 + parseInt(partsHMS[3]) / 3600;
  }
  
  // HH:MM format
  const partsHM = str.match(/^(\d+):(\d+)$/);
  if (partsHM) {
    return parseInt(partsHM[1]) + parseInt(partsHM[2]) / 60;
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function formatTime(timeStr) {
  if (!timeStr || timeStr === '' || timeStr === '-') return '-';
  return String(timeStr);
}

function hoursToHHMMSS(hours) {
  if (!hours || hours <= 0) return '-';
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.round(((hours - h) * 60 - m) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Match PostNL chauffeur name (e.g. "Es van, J.W.") to employee
function matchChauffeurToEmployee(chauffeurName, employees) {
  if (!chauffeurName || chauffeurName === '-' || !employees?.length) return null;
  const cn = chauffeurName.toLowerCase().trim();
  
  for (const emp of employees) {
    const last = (emp.last_name || '').toLowerCase();
    const prefix = (emp.prefix || '').toLowerCase();
    const first = (emp.first_name || '').toLowerCase();
    const initials = (emp.initials || '').toLowerCase();
    
    // Format: "Lastname, F." or "Lastname prefix, F." 
    // PostNL: "Es van, J.W." -> last=es, prefix=van
    // Try: "{last} {prefix}, {initials}" and "{last}, {initials}" and "{prefix} {last}, {initials}"
    const variants = [
      `${last} ${prefix}, ${initials}`.trim(),
      `${last}, ${initials}`.trim(),
      `${prefix} ${last}, ${initials}`.trim(),
      `${last} ${prefix}`.trim(),
      `${last}`.trim(),
    ];
    
    for (const v of variants) {
      if (v && cn === v) return emp;
    }
    
    // Fallback: check if last name is in chauffeur string
    if (last && cn.includes(last) && (
      (initials && cn.includes(initials)) ||
      (first && cn.includes(first.charAt(0)))
    )) {
      return emp;
    }
  }
  return null;
}

// Build a lookup: employee_id + date -> total_hours
function buildTimeEntryLookup(timeEntries, weekStart, weekEnd) {
  const lookup = {};
  if (!timeEntries?.length) return lookup;
  const start = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
  const end = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate()).getTime();
  
  timeEntries.forEach(te => {
    if (!te.date || !te.employee_id) return;
    const d = new Date(te.date);
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (dt < start || dt > end) return;
    const key = `${te.employee_id}_${te.date}`;
    lookup[key] = (lookup[key] || 0) + (te.total_hours || 0);
  });
  return lookup;
}

export default function BesteltijdReport({ rows, tiModelRoutes = [], employees = [], timeEntries = [], weekStart, weekEnd }) {
  const [sortBy, setSortBy] = useState("route");

  // Build a lookup map: route_code -> TI model route
  // Import Ritnaam format: "0315 GS-CO" where "0315" maps to route_code "315"
  const findTiRoute = useMemo(() => {
    const codeMap = {};
    tiModelRoutes.forEach(r => {
      if (r.route_code) {
        // Store by normalized code (strip leading zeros)
        const normalized = r.route_code.trim().replace(/^0+/, '');
        codeMap[normalized] = r;
      }
    });
    return (routeName) => {
      if (!routeName || routeName === '-') return null;
      const key = routeName.trim();
      // Extract leading digits from Ritnaam like "0315 GS-CO" -> "0315"
      const match = key.match(/^(\d+)/);
      if (match) {
        const normalized = match[1].replace(/^0+/, '');
        if (codeMap[normalized]) return codeMap[normalized];
      }
      return null;
    };
  }, [tiModelRoutes]);

  // Lookup maps for time entries
  const timeEntryLookup = useMemo(() => {
    if (!weekStart || !weekEnd) return {};
    return buildTimeEntryLookup(timeEntries, weekStart, weekEnd);
  }, [timeEntries, weekStart, weekEnd]);

  // Cache chauffeur -> employee mapping
  const chauffeurEmployeeMap = useMemo(() => {
    const map = {};
    if (!rows?.length || !employees?.length) return map;
    rows.forEach(r => {
      const ch = r.chauffeur;
      if (ch && !map.hasOwnProperty(ch)) {
        map[ch] = matchChauffeurToEmployee(ch, employees);
      }
    });
    return map;
  }, [rows, employees]);

  // Get gewerkte uren for a row
  const getGewerkteUren = (row) => {
    const emp = chauffeurEmployeeMap[row.chauffeur];
    if (!emp) return null;
    // Parse datum DD-MM-YYYY to YYYY-MM-DD
    if (!row.datum || row.datum === '-') return null;
    const parts = row.datum.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (!parts) return null;
    const dateKey = `${parts[3]}-${parts[2]}-${parts[1]}`;
    const key = `${emp.id}_${dateKey}`;
    return timeEntryLookup[key] || null;
  };

  const sortedRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const sorted = [...rows];
    if (sortBy === "route") {
      sorted.sort((a, b) => (a.route || '').localeCompare(b.route || ''));
    } else {
      sorted.sort((a, b) => (a.chauffeur || '').localeCompare(b.chauffeur || ''));
    }
    return sorted;
  }, [rows, sortBy]);

  // Group rows by week number (from datum DD-MM-YYYY)
  const getWeekNumber = (datumStr) => {
    if (!datumStr) return null;
    const parts = datumStr.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (!parts) return null;
    const d = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
    // ISO week number
    const tmp = new Date(d.valueOf());
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
    const week1 = new Date(tmp.getFullYear(), 0, 4);
    return 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  };

  const weekGroups = useMemo(() => {
    if (!sortedRows || sortedRows.length === 0) return {};
    const groups = {};
    sortedRows.forEach(r => {
      const wk = getWeekNumber(r.datum) || 0;
      if (!groups[wk]) groups[wk] = [];
      groups[wk].push(r);
    });
    return groups;
  }, [sortedRows]);

  const calcGroupTotals = (groupRows, findTiRouteFn) => {
    const t = groupRows.reduce((acc, r) => {
      let ritUren = r.totaalRitUren || 0;
      if (ritUren <= 0) {
        const tiRoute = findTiRouteFn(r.route);
        if (tiRoute && tiRoute.total_time_hours > 0) {
          ritUren = tiRoute.total_time_hours;
        }
      }
      return {
        totaalRitUren: acc.totaalRitUren + ritUren,
        aantalRouteStops: acc.aantalRouteStops + (r.aantalRouteStops || 0),
        aantalRouteStuks: acc.aantalRouteStuks + (r.aantalRouteStuks || 0),
        succesvolleStops: acc.succesvolleStops + (r.succesvolleStops || 0),
        omzet: acc.omzet + (r.omzet || 0),
      };
    }, { totaalRitUren: 0, aantalRouteStops: 0, aantalRouteStuks: 0, succesvolleStops: 0, omzet: 0 });
    t.count = groupRows.length;

    // Sum time fields for averaging
    let sumBesteltijdNorm = 0, sumBesteltijdBruto = 0, sumBesteltijdNetto = 0, sumVoorbereiding = 0;
    let countBesteltijdNorm = 0, countBesteltijdBruto = 0, countBesteltijdNetto = 0, countVoorbereiding = 0;

    let normSum = 0, normCount = 0;
    let actualSum = 0, actualCount = 0;
    groupRows.forEach(r => {
      const tiRoute = findTiRouteFn(r.route);
      const norm = tiRoute?.manual_norm_per_hour || tiRoute?.calculated_norm_per_hour || 0;
      if (norm > 0) { normSum += norm; normCount++; }
      const besteltijdUren = parseTimeToHours(r.besteltijdNetto);
      const actual = besteltijdUren > 0 ? (r.aantalRouteStops || 0) / besteltijdUren : 0;
      if (actual > 0) { actualSum += actual; actualCount++; }

      const bn = parseTimeToHours(r.besteltijdNorm);
      if (bn > 0) { sumBesteltijdNorm += bn; countBesteltijdNorm++; }
      const bb = parseTimeToHours(r.besteltijdBruto);
      if (bb > 0) { sumBesteltijdBruto += bb; countBesteltijdBruto++; }
      const bne = parseTimeToHours(r.besteltijdNetto);
      if (bne > 0) { sumBesteltijdNetto += bne; countBesteltijdNetto++; }
      const vb = parseTimeToHours(r.voorbereiding);
      if (vb > 0) { sumVoorbereiding += vb; countVoorbereiding++; }
    });
    t.gemNorm = normCount > 0 ? normSum / normCount : 0;
    t.gemActual = actualCount > 0 ? actualSum / actualCount : 0;
    t.gemBesteltijdNorm = countBesteltijdNorm > 0 ? sumBesteltijdNorm / countBesteltijdNorm : 0;
    t.gemBesteltijdBruto = countBesteltijdBruto > 0 ? sumBesteltijdBruto / countBesteltijdBruto : 0;
    t.gemBesteltijdNetto = countBesteltijdNetto > 0 ? sumBesteltijdNetto / countBesteltijdNetto : 0;
    t.gemVoorbereiding = countVoorbereiding > 0 ? sumVoorbereiding / countVoorbereiding : 0;
    return t;
  };

  const totals = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const t = rows.reduce((acc, r) => {
      let ritUren = r.totaalRitUren || 0;
      if (ritUren <= 0) {
        const tiRoute = findTiRoute(r.route);
        if (tiRoute && tiRoute.total_time_hours > 0) {
          ritUren = tiRoute.total_time_hours;
        }
      }
      return {
        totaalRitUren: acc.totaalRitUren + ritUren,
        aantalRouteStops: acc.aantalRouteStops + (r.aantalRouteStops || 0),
        aantalRouteStuks: acc.aantalRouteStuks + (r.aantalRouteStuks || 0),
        omzet: acc.omzet + (r.omzet || 0),
      };
    }, { totaalRitUren: 0, aantalRouteStops: 0, aantalRouteStuks: 0, omzet: 0 });
    t.count = rows.length;
    return t;
  }, [rows]);

  const fmt = (v) => {
    if (v === 0 || v === undefined || v === null) return '-';
    return `€ ${v.toFixed(2)}`;
  };

  if (!rows || rows.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen besteltijd data beschikbaar.</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 print:hidden">
        <span className="text-sm font-medium text-slate-700">Sorteer op:</span>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="route">Route</SelectItem>
            <SelectItem value="chauffeur">Chauffeur</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-2 px-2 font-medium text-slate-600">Chauffeur</th>
              <th className="text-left py-2 px-2 font-medium text-slate-600">Route</th>
              <th className="text-left py-2 px-2 font-medium text-slate-600">Datum</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Besteltijd Norm</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Besteltijd Bruto</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Besteltijd Netto</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Voorbereiding</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Totaal Rit</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Route stops</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Route stuks</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Norm/besteluur</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Werkelijk/uur</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Norm gehaald</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Hitrate</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Omzet</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Uurtarief</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(weekGroups).sort((a, b) => Number(a) - Number(b)).map(wk => {
              const groupRows = weekGroups[wk];
              const wkTotals = calcGroupTotals(groupRows, findTiRoute);
              const wkUurtarief = wkTotals.totaalRitUren > 0 ? wkTotals.omzet / wkTotals.totaalRitUren : 0;
              const wkGemStops = wkTotals.count > 0 ? wkTotals.aantalRouteStops / wkTotals.count : 0;
              const wkGemStuks = wkTotals.count > 0 ? wkTotals.aantalRouteStuks / wkTotals.count : 0;
              const wkGemOmzet = wkTotals.count > 0 ? wkTotals.omzet / wkTotals.count : 0;
              const wkGemUren = wkTotals.count > 0 ? wkTotals.totaalRitUren / wkTotals.count : 0;

              return (
                <React.Fragment key={`week-${wk}`}>
                  {groupRows.map((r, idx) => {
                    let effectieveRitUren = r.totaalRitUren || 0;
                    if (effectieveRitUren <= 0) {
                      const tiRouteForUren = findTiRoute(r.route);
                      if (tiRouteForUren && tiRouteForUren.total_time_hours > 0) {
                        effectieveRitUren = tiRouteForUren.total_time_hours;
                      }
                    }
                    const uurtarief = effectieveRitUren > 0 ? r.omzet / effectieveRitUren : 0;
                    const tiRoute = findTiRoute(r.route);
                    const normPerBesteluur = tiRoute?.manual_norm_per_hour || tiRoute?.calculated_norm_per_hour || null;
                    const besteltijdUren = parseTimeToHours(r.besteltijdNetto);
                    const actualPerHour = besteltijdUren > 0 ? (r.aantalRouteStops || 0) / besteltijdUren : 0;
                    const normGehaald = normPerBesteluur && actualPerHour > 0 ? actualPerHour >= normPerBesteluur : null;
                    const hitrate = r.aantalRouteStops > 0 ? (r.succesvolleStops || 0) / r.aantalRouteStops : 0;

                    const usedTiTime = (r.totaalRitUren || 0) <= 0 && effectieveRitUren > 0;

                    return (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="py-1.5 px-2 text-slate-700">{r.chauffeur}</td>
                        <td className="py-1.5 px-2 text-slate-700">{r.route}</td>
                        <td className="py-1.5 px-2 text-slate-500">{r.datum}</td>
                        <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r.besteltijdNorm)}</td>
                        <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r.besteltijdBruto)}</td>
                        <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r.besteltijdNetto)}</td>
                        <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r.voorbereiding)}</td>
                        <td className={`py-1.5 px-2 text-right ${usedTiTime ? 'text-orange-600 italic' : 'text-slate-700'}`} title={usedTiTime ? 'TI Model tijd gebruikt' : ''}>
                          {usedTiTime ? hoursToHHMMSS(effectieveRitUren) + ' *' : formatTime(r.totaalRit)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-700">{r.aantalRouteStops || 0}</td>
                        <td className="py-1.5 px-2 text-right text-slate-700">{r.aantalRouteStuks || 0}</td>
                        <td className="py-1.5 px-2 text-right text-slate-700">{normPerBesteluur ? normPerBesteluur.toFixed(1) : '-'}</td>
                        <td className="py-1.5 px-2 text-right text-slate-700">{actualPerHour > 0 ? actualPerHour.toFixed(1) : '-'}</td>
                        <td className="py-1.5 px-2 text-right">
                          {normGehaald === null ? '-' : normGehaald ? (
                            <span className="text-green-700 font-semibold">✓ Ja</span>
                          ) : (
                            <span className="text-red-600 font-semibold">✗ Nee</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-700">{hitrate > 0 ? `${(hitrate * 100).toFixed(1)}%` : '-'}</td>
                        <td className="py-1.5 px-2 text-right font-semibold text-slate-900">{fmt(r.omzet)}</td>
                        <td className={`py-1.5 px-2 text-right font-semibold ${uurtarief > 45 ? 'text-green-700' : uurtarief > 0 ? 'text-red-600' : 'text-slate-700'}`}>{uurtarief > 0 ? fmt(uurtarief) : '-'}</td>
                      </tr>
                    );
                  })}
                  {/* Week totaal */}
                  <tr className="bg-blue-50 border-b-2 border-blue-200 font-semibold text-xs">
                    <td className="py-1.5 px-2 text-blue-800" colSpan={2}>Week {wk} Totaal ({wkTotals.count} ritten)</td>
                    <td className="py-1.5 px-2"></td>
                    <td className="py-1.5 px-2" colSpan={4}></td>
                    <td className="py-1.5 px-2 text-right text-blue-800">{wkTotals.totaalRitUren > 0 ? `${wkTotals.totaalRitUren.toFixed(1)} uur` : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-800">{wkTotals.aantalRouteStops}</td>
                    <td className="py-1.5 px-2 text-right text-blue-800">{wkTotals.aantalRouteStuks}</td>
                    <td className="py-1.5 px-2" colSpan={3}></td>
                    <td className="py-1.5 px-2 text-right text-blue-800">{wkTotals.aantalRouteStops > 0 ? `${(wkTotals.succesvolleStops / wkTotals.aantalRouteStops * 100).toFixed(1)}%` : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-900">{fmt(wkTotals.omzet)}</td>
                    <td className={`py-1.5 px-2 text-right ${wkUurtarief > 45 ? 'text-green-700' : wkUurtarief > 0 ? 'text-red-600' : 'text-slate-700'}`}>{wkUurtarief > 0 ? fmt(wkUurtarief) : '-'}</td>
                  </tr>
                  {/* Week gemiddelde */}
                  <tr className="bg-blue-50/50 border-b-2 border-blue-300 text-xs italic">
                    <td className="py-1.5 px-2 text-blue-700" colSpan={2}>Week {wk} Gemiddelde</td>
                    <td className="py-1.5 px-2"></td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{hoursToHHMMSS(wkTotals.gemBesteltijdNorm)}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{hoursToHHMMSS(wkTotals.gemBesteltijdBruto)}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{hoursToHHMMSS(wkTotals.gemBesteltijdNetto)}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{hoursToHHMMSS(wkTotals.gemVoorbereiding)}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{wkGemUren > 0 ? `${wkGemUren.toFixed(1)} uur` : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{wkGemStops > 0 ? wkGemStops.toFixed(0) : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{wkGemStuks > 0 ? wkGemStuks.toFixed(0) : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{wkTotals.gemNorm > 0 ? wkTotals.gemNorm.toFixed(1) : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{wkTotals.gemActual > 0 ? wkTotals.gemActual.toFixed(1) : '-'}</td>
                    <td className="py-1.5 px-2"></td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{wkTotals.aantalRouteStops > 0 ? `${(wkTotals.succesvolleStops / wkTotals.aantalRouteStops * 100).toFixed(1)}%` : '-'}</td>
                    <td className="py-1.5 px-2 text-right text-blue-700">{wkGemOmzet > 0 ? fmt(wkGemOmzet) : '-'}</td>
                    <td className={`py-1.5 px-2 text-right ${wkUurtarief > 45 ? 'text-green-700' : wkUurtarief > 0 ? 'text-red-600' : 'text-slate-700'}`}>{wkUurtarief > 0 ? fmt(wkUurtarief) : '-'}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          {totals && (() => {
            const allTotals = calcGroupTotals(rows, findTiRoute);
            const totalUurtarief = allTotals.totaalRitUren > 0 ? allTotals.omzet / allTotals.totaalRitUren : 0;
            const gemStops = allTotals.count > 0 ? allTotals.aantalRouteStops / allTotals.count : 0;
            const gemStuks = allTotals.count > 0 ? allTotals.aantalRouteStuks / allTotals.count : 0;
            const gemOmzet = allTotals.count > 0 ? allTotals.omzet / allTotals.count : 0;
            const gemUren = allTotals.count > 0 ? allTotals.totaalRitUren / allTotals.count : 0;
            return (
              <tfoot>
                <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                  <td className="py-2 px-2 text-slate-700" colSpan={2}>Eindtotaal ({allTotals.count} ritten)</td>
                  <td className="py-2 px-2"></td>
                  <td className="py-2 px-2" colSpan={4}></td>
                  <td className="py-2 px-2 text-right text-slate-700">{allTotals.totaalRitUren > 0 ? `${allTotals.totaalRitUren.toFixed(1)} uur` : '-'}</td>
                  <td className="py-2 px-2 text-right text-slate-700">{allTotals.aantalRouteStops}</td>
                  <td className="py-2 px-2 text-right text-slate-700">{allTotals.aantalRouteStuks}</td>
                  <td className="py-2 px-2" colSpan={3}></td>
                  <td className="py-2 px-2 text-right text-slate-700">{allTotals.aantalRouteStops > 0 ? `${(allTotals.succesvolleStops / allTotals.aantalRouteStops * 100).toFixed(1)}%` : '-'}</td>
                  <td className="py-2 px-2 text-right font-bold text-slate-900">{fmt(allTotals.omzet)}</td>
                  <td className={`py-2 px-2 text-right font-bold ${totalUurtarief > 45 ? 'text-green-700' : 'text-red-600'}`}>{totalUurtarief > 0 ? fmt(totalUurtarief) : '-'}</td>
                </tr>
                <tr className="bg-slate-50 italic text-xs">
                  <td className="py-2 px-2 text-slate-600" colSpan={2}>Gemiddelde per rit</td>
                  <td className="py-2 px-2"></td>
                  <td className="py-2 px-2 text-right text-slate-600">{hoursToHHMMSS(allTotals.gemBesteltijdNorm)}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{hoursToHHMMSS(allTotals.gemBesteltijdBruto)}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{hoursToHHMMSS(allTotals.gemBesteltijdNetto)}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{hoursToHHMMSS(allTotals.gemVoorbereiding)}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{gemUren > 0 ? `${gemUren.toFixed(1)} uur` : '-'}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{gemStops > 0 ? gemStops.toFixed(0) : '-'}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{gemStuks > 0 ? gemStuks.toFixed(0) : '-'}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{allTotals.gemNorm > 0 ? allTotals.gemNorm.toFixed(1) : '-'}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{allTotals.gemActual > 0 ? allTotals.gemActual.toFixed(1) : '-'}</td>
                  <td className="py-2 px-2"></td>
                  <td className="py-2 px-2 text-right text-slate-600">{allTotals.aantalRouteStops > 0 ? `${(allTotals.succesvolleStops / allTotals.aantalRouteStops * 100).toFixed(1)}%` : '-'}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{gemOmzet > 0 ? fmt(gemOmzet) : '-'}</td>
                  <td className={`py-2 px-2 text-right text-slate-600 ${totalUurtarief > 45 ? 'text-green-700' : totalUurtarief > 0 ? 'text-red-600' : ''}`}>{totalUurtarief > 0 ? fmt(totalUurtarief) : '-'}</td>
                </tr>
              </tfoot>
            );
          })()}
        </table>
      </div>
    </div>
  );
}

export { parseTimeToHours };