import React from "react";

/**
 * Renders a day table (like the screenshot) for a given set of rows.
 * dayLabel: e.g. "Maandag", "Dinsdag"
 * rows: array of { chauffeur, kenteken, route, succesvolleStops, stuksGeleverd, bml, pbaBezorgd, stoptarief, stukstarief, bmlTarief, pbaTarief, omzet }
 */
export default function WeekReportTable({ dayLabel, rows, bgColor = "bg-[#2c3e6b]" }) {
  if (!rows || rows.length === 0) return null;

  const totals = rows.reduce((acc, r) => ({
    succesvolleStops: acc.succesvolleStops + (r.succesvolleStops || 0),
    stuksGeleverd: acc.stuksGeleverd + (r.stuksGeleverd || 0),
    bml: acc.bml + (r.bml || 0),
    pbaBezorgd: acc.pbaBezorgd + (r.pbaBezorgd || 0),
    collectie: acc.collectie + (r.collectie || 0),
    stoptarief: acc.stoptarief + (r.stoptarief || 0),
    stukstarief: acc.stukstarief + (r.stukstarief || 0),
    bmlTarief: acc.bmlTarief + (r.bmlTarief || 0),
    pbaTarief: acc.pbaTarief + (r.pbaTarief || 0),
    collectTarief: acc.collectTarief + (r.collectTarief || 0),
    omzet: acc.omzet + (r.omzet || 0),
  }), { succesvolleStops: 0, stuksGeleverd: 0, bml: 0, pbaBezorgd: 0, collectie: 0, stoptarief: 0, stukstarief: 0, bmlTarief: 0, pbaTarief: 0, collectTarief: 0, omzet: 0 });

  const fmt = (v) => {
    if (v === 0 || v === undefined || v === null) return '-';
    return `€ ${v.toFixed(2)}`;
  };

  return (
    <div className="mb-6">
      <div className={`${bgColor} text-white px-4 py-1.5 rounded-t-lg`}>
        <span className="font-semibold text-sm">{dayLabel}</span>
      </div>
      <div className="overflow-x-auto border border-t-0 border-slate-200 rounded-b-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-2 px-2 font-medium text-slate-600">Chauffeur</th>
              <th className="text-left py-2 px-2 font-medium text-slate-600">Kenteken</th>
              <th className="text-left py-2 px-2 font-medium text-slate-600">Route</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Succesvolle stops</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Stuks geleverd</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">BML</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">PBA Bezorgd</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Collectie</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Stoptarief</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Stukstarief</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">BMLtarief</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">PBAtarief</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Collectietarief</th>
              <th className="text-right py-2 px-2 font-medium text-slate-600">Omzet</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-b hover:bg-slate-50">
                <td className="py-1.5 px-2 text-slate-700">{r.chauffeur}</td>
                <td className="py-1.5 px-2 text-slate-500">{r.kenteken || '-'}</td>
                <td className="py-1.5 px-2 text-slate-700">{r.route}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{r.succesvolleStops || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{r.stuksGeleverd || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{r.bml || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{r.pbaBezorgd || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{r.collectie || 0}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{fmt(r.stoptarief)}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{fmt(r.stukstarief)}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{fmt(r.bmlTarief)}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{fmt(r.pbaTarief)}</td>
                <td className="py-1.5 px-2 text-right text-slate-700">{fmt(r.collectTarief)}</td>
                <td className="py-1.5 px-2 text-right font-semibold text-slate-900">{fmt(r.omzet)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr>
              <td className="py-2 px-2 text-slate-700" colSpan={3}>Totaal {dayLabel}</td>
              <td className="py-2 px-2 text-right text-slate-700">{totals.succesvolleStops}</td>
              <td className="py-2 px-2 text-right text-slate-700">{totals.stuksGeleverd}</td>
              <td className="py-2 px-2 text-right text-slate-700">{totals.bml}</td>
              <td className="py-2 px-2 text-right text-slate-700">{totals.pbaBezorgd}</td>
              <td className="py-2 px-2 text-right text-slate-700">{totals.collectie}</td>
              <td className="py-2 px-2 text-right text-slate-700">{fmt(totals.stoptarief)}</td>
              <td className="py-2 px-2 text-right text-slate-700">{fmt(totals.stukstarief)}</td>
              <td className="py-2 px-2 text-right text-slate-700">{fmt(totals.bmlTarief)}</td>
              <td className="py-2 px-2 text-right text-slate-700">{fmt(totals.pbaTarief)}</td>
              <td className="py-2 px-2 text-right text-slate-700">{fmt(totals.collectTarief)}</td>
              <td className="py-2 px-2 text-right font-bold text-slate-900">{fmt(totals.omzet)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}