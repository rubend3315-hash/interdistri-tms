import React, { useMemo, useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

function formatTime(val) {
  if (!val || val === '' || val === '-') return '';
  return String(val);
}

export default function ActiviteitenReport({ weekData }) {
  const [dayFilter, setDayFilter] = useState("auto");

  // Find available days and the latest import date
  const availableDays = useMemo(() => {
    if (!weekData || weekData.length === 0) return [];
    const dayMap = {};
    weekData.forEach(r => {
      const datum = r['Datum'];
      if (datum && !dayMap[datum]) {
        dayMap[datum] = r._dayName || datum;
      }
    });
    // Sort by parsed date
    return Object.entries(dayMap).sort((a, b) => {
      const pa = a[0].split('-');
      const pb = b[0].split('-');
      const da = new Date(parseInt(pa[2]), parseInt(pa[1]) - 1, parseInt(pa[0]));
      const db = new Date(parseInt(pb[2]), parseInt(pb[1]) - 1, parseInt(pb[0]));
      return da - db;
    }).map(([datum, dayName]) => ({ datum, dayName }));
  }, [weekData]);

  // Auto-select: last import date
  const latestDatum = useMemo(() => {
    if (availableDays.length === 0) return null;
    return availableDays[availableDays.length - 1].datum;
  }, [availableDays]);

  // Determine effective filter
  const effectiveFilter = dayFilter === "auto" ? latestDatum : dayFilter;

  // Build rows from raw import data, filtered and sorted by Ritnaam
  const rows = useMemo(() => {
    if (!weekData || weekData.length === 0) return [];
    let filtered = weekData;
    if (effectiveFilter && effectiveFilter !== "all") {
      filtered = weekData.filter(r => r['Datum'] === effectiveFilter);
    }
    return [...filtered].sort((a, b) => (a['Ritnaam'] || '').localeCompare(b['Ritnaam'] || ''));
  }, [weekData, effectiveFilter]);

  // Totals
  const totals = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    return rows.reduce((acc, r) => ({
      aantalPeriodesGeenScan: acc.aantalPeriodesGeenScan + (Number(r['Aantal periodes >15 min geen scan']) || 0),
      aantalTijdensRouteStuds: acc.aantalTijdensRouteStuds + (Number(r['Aantal tijdens route - stuks']) || 0),
      aantalTijdensRouteStops: acc.aantalTijdensRouteStops + (Number(r['Aantal tijdens route - stops']) || 0),
      aantalStuksAangeboden: acc.aantalStuksAangeboden + (Number(r['Aantal stuks aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)']) || 0),
      aantalStopsAangeboden: acc.aantalStopsAangeboden + (Number(r['Aantal stops aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)']) || 0),
      aantalBijTerugkomstStops: acc.aantalBijTerugkomstStops + (Number(r['Aantal bij terugkomst - stops']) || 0),
      aantalAfgeleverdStuks: acc.aantalAfgeleverdStuks + (Number(r['Aantal afgeleverd - stuks']) || 0),
      aantalAfgeleverdStops: acc.aantalAfgeleverdStops + (Number(r['Aantal afgeleverd - stops']) || 0),
      bml: acc.bml + (Number(r['Legitimatiecheck aan de deur']) || 0),
      pba: acc.pba + (Number(r['Aantal PBA-pakketten bezorgd']) || 0),
      collectie: acc.collectie + (Number(r['Aantal stuks afgehaald/gecollecteerd']) || 0),
    }), {
      aantalPeriodesGeenScan: 0,
      aantalTijdensRouteStuds: 0,
      aantalTijdensRouteStops: 0,
      aantalStuksAangeboden: 0,
      aantalStopsAangeboden: 0,
      aantalBijTerugkomstStops: 0,
      aantalAfgeleverdStuks: 0,
      aantalAfgeleverdStops: 0,
      bml: 0,
      pba: 0,
      collectie: 0,
    });
  }, [rows]);

  if (!rows || rows.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen activiteiten data beschikbaar.</p>;
  }

  const currentDayLabel = effectiveFilter && effectiveFilter !== "all"
    ? availableDays.find(d => d.datum === effectiveFilter)?.dayName + ' ' + effectiveFilter
    : 'Hele week';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-800">Activiteitenrapport{effectiveFilter && effectiveFilter !== "all" ? ` - ${currentDayLabel}` : ''}</h3>
        <div className="flex items-center gap-3 print:hidden">
          <span className="text-sm font-medium text-slate-700">Dag:</span>
          <Select value={dayFilter} onValueChange={setDayFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Laatste importdag</SelectItem>
              <SelectItem value="all">Hele week</SelectItem>
              {availableDays.map(d => (
                <SelectItem key={d.datum} value={d.datum}>{d.dayName} {d.datum}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dayFilter !== "all" && (
            <Button variant="outline" size="sm" onClick={() => setDayFilter("all")}>
              Toon hele week
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b align-bottom">
            <tr>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">Dag</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">Ritnaam</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">Vrijgave</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">debrief</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">1ste stop</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px] align-bottom">15 min geen scan</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Laatste stop</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[40px] align-bottom">X 15 min geen scan</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px] align-bottom">Bestel tijd Norm</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px] align-bottom">Bestel tijd Bruto</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px] align-bottom">Bestel tijd Netto</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[55px] align-bottom">Laden aan-/afrijtijd debrief</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap align-bottom">Totaal rit</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Aantal tijdens route - stuks</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Aantal tijdens route - stops</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Aantal stops aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Stuks (geen aanbod poging)</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[40px] align-bottom">Stops bij terug komst</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px] align-bottom">Aantal afgeleverd - stuks</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[25px] align-bottom">BML</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Aantal PBA- pakketten bezorgd</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px] align-bottom">Aantal stuks afgehaald/<wbr/>gecollecteerd</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px] align-bottom">Geleverde stops</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-b hover:bg-slate-50">
                <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap">{r._dayName || '-'}</td>
                <td className="py-1.5 px-2 font-medium text-slate-800">{r['Ritnaam'] || '-'}</td>
                <td className="py-1.5 px-2 text-slate-600">{formatTime(r['Vrijgegeven'])}</td>
                <td className="py-1.5 px-2 text-slate-600">{formatTime(r['Afgehandeld'])}</td>
                <td className="py-1.5 px-2 text-slate-600">{formatTime(r['Eerste stop'])}</td>
                <td className="py-1.5 px-2 text-right text-slate-600">{formatTime(r['>15 min geen scan'])}</td>
                <td className="py-1.5 px-2 text-slate-600">{formatTime(r['Laatste stop'])}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{Number(r['Aantal periodes >15 min geen scan']) || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r['Besteltijd Norm'])}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r['Besteltijd Bruto'])}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r['Besteltijd Netto'])}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r['Voorbereiding, aan-/afrijtijd en afhandeling'])}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{formatTime(r['Totaal rit'])}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{Number(r['Aantal tijdens route - stuks']) || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{Number(r['Aantal tijdens route - stops']) || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{Number(r['Aantal stops aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)']) || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{Number(r['Aantal stuks aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)']) || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{Number(r['Aantal bij terugkomst - stops']) || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{Number(r['Aantal afgeleverd - stuks']) || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{Number(r['Legitimatiecheck aan de deur']) || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{Number(r['Aantal PBA-pakketten bezorgd']) || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{Number(r['Aantal stuks afgehaald/gecollecteerd']) || 0}</td>
                <td className="py-1.5 px-2 text-right font-semibold text-slate-800">{Number(r['Aantal afgeleverd - stops']) || 0}</td>
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                <td className="py-2 px-2 text-slate-800" colSpan={2}>Totaal</td>
                <td className="py-2 px-2" colSpan={5}></td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalPeriodesGeenScan}</td>
                <td className="py-2 px-2" colSpan={4}></td>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalTijdensRouteStuds}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalTijdensRouteStops}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalStopsAangeboden}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalStuksAangeboden}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalBijTerugkomstStops}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalAfgeleverdStuks}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.bml}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.pba}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.collectie}</td>
                <td className="py-2 px-2 text-right font-bold text-slate-900">{totals.aantalAfgeleverdStops}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}