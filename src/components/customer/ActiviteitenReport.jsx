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
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap">Dag</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap">Ritnaam</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap">Vrijgave</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap">debrief</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap">1ste stop</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px]">15 min geen scan</th>
              <th className="text-left py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap">Laatste stop</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[40px]">X 15 min geen scan</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px]">Bestel tijd Norm</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px]">Bestel tijd Bruto</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px]">Bestel tijd Netto</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[55px]">Laden aan-/afrijtij d debrief</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 whitespace-nowrap">Totaal rit</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px]">Aantal tijdens route - stuks</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px]">Aantal tijdens route - stops</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px]">Aantal stuks PKT GEW 2de</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px]">Stuks (geen aanbod poging)</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[40px]">Stops bij terug komst</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px]">Geleverd &amp; Collectie stuks</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[25px]">BML</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px]">Aantal PBA- pakketten bezorgd</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[45px]">Collectie stuks</th>
              <th className="text-right py-2 px-1.5 font-medium text-slate-600 min-w-[50px]">Geleverde stops</th>
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
                <td className="py-2 px-2 text-slate-800" colSpan={2}>Totaal</td>
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