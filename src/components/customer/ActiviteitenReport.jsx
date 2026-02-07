import React, { useMemo } from "react";

function formatTime(val) {
  if (!val || val === '' || val === '-') return '';
  return String(val);
}

export default function ActiviteitenReport({ weekData }) {
  // Build rows from raw import data, sorted by Ritnaam
  const rows = useMemo(() => {
    if (!weekData || weekData.length === 0) return [];
    return [...weekData].sort((a, b) => (a['Ritnaam'] || '').localeCompare(b['Ritnaam'] || ''));
  }, [weekData]);

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

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-800 mb-3">Activiteitenrapport</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs whitespace-nowrap">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-2 px-2 font-medium text-slate-600">Ritnaam</th>
              <th className="text-left py-2 px-2 font-medium text-slate-600">Vrijgave</th>
              <th className="text-left py-2 px-2 font-medium text-slate-600">Debrief</th>
              <th className="text-left py-2 px-2 font-medium text-slate-600">1ste stop</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">15 min geen scan</th>
              <th className="text-left py-2 px-2 font-medium text-slate-600">Laatste stop</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">X 15 min geen scan</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Besteltijd Norm</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Besteltijd Bruto</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Besteltijd Netto</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Laden aan-/afrijtijd</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Totaal rit</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Route stuks</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Route stops</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Stuks geen gehoor/gew.</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Stops geen gehoor/gew.</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Stops terugkomst</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Geleverd stuks</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">BML</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">PBA bezorgd</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Collectie stuks</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Geleverde stops</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-b hover:bg-slate-50">
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
                <td className="py-1.5 px-2 text-right text-slate-700">{Number(r['Aantal stuks aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)']) || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{Number(r['Aantal stops aangeboden (Geen gehoor-geweigerd-op verzoek afhaalkantoor)']) || 0}</td>
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
                <td className="py-2 px-2 text-slate-800">Totaal</td>
                <td className="py-2 px-2" colSpan={5}></td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalPeriodesGeenScan}</td>
                <td className="py-2 px-2" colSpan={4}></td>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalTijdensRouteStuds}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalTijdensRouteStops}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalStuksAangeboden}</td>
                <td className="py-2 px-2 text-right text-slate-800">{totals.aantalStopsAangeboden}</td>
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