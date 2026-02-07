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

export default function BesteltijdReport({ rows }) {
  const [sortBy, setSortBy] = useState("route");

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

  const totals = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    return rows.reduce((acc, r) => ({
      totaalRitUren: acc.totaalRitUren + (r.totaalRitUren || 0),
      aantalRouteStops: acc.aantalRouteStops + (r.aantalRouteStops || 0),
      aantalRouteStuks: acc.aantalRouteStuks + (r.aantalRouteStuks || 0),
      omzet: acc.omzet + (r.omzet || 0),
    }), { totaalRitUren: 0, aantalRouteStops: 0, aantalRouteStuks: 0, omzet: 0 });
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
      <div className="flex items-center gap-3 mb-3">
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
              <th className="text-right py-2 px-2 font-medium text-slate-600">Omzet</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Uurtarief</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r, idx) => {
              const uurtarief = r.totaalRitUren > 0 ? r.omzet / r.totaalRitUren : 0;
              return (
                <tr key={idx} className="border-b hover:bg-slate-50">
                  <td className="py-1.5 px-2 text-slate-700">{r.chauffeur}</td>
                  <td className="py-1.5 px-2 text-slate-700">{r.route}</td>
                  <td className="py-1.5 px-2 text-slate-500">{r.datum}</td>
                  <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r.besteltijdNorm)}</td>
                  <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r.besteltijdBruto)}</td>
                  <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r.besteltijdNetto)}</td>
                  <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r.voorbereiding)}</td>
                  <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r.totaalRit)}</td>
                  <td className="py-1.5 px-2 text-right text-slate-700">{r.aantalRouteStops || 0}</td>
                  <td className="py-1.5 px-2 text-right text-slate-700">{r.aantalRouteStuks || 0}</td>
                  <td className="py-1.5 px-2 text-right font-semibold text-slate-900">{fmt(r.omzet)}</td>
                  <td className="py-1.5 px-2 text-right font-semibold text-blue-700">{uurtarief > 0 ? fmt(uurtarief) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
          {totals && (
            <tfoot className="bg-slate-50 font-semibold">
              <tr>
                <td className="py-2 px-2 text-slate-700" colSpan={7}>Totaal</td>
                <td className="py-2 px-2 text-right text-slate-700">{totals.totaalRitUren > 0 ? `${totals.totaalRitUren.toFixed(1)} uur` : '-'}</td>
                <td className="py-2 px-2 text-right text-slate-700">{totals.aantalRouteStops}</td>
                <td className="py-2 px-2 text-right text-slate-700">{totals.aantalRouteStuks}</td>
                <td className="py-2 px-2 text-right font-bold text-slate-900">{fmt(totals.omzet)}</td>
                <td className="py-2 px-2 text-right font-bold text-blue-700">{totals.totaalRitUren > 0 ? fmt(totals.omzet / totals.totaalRitUren) : '-'}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export { parseTimeToHours };