import React from "react";

function pct(val) {
  if (val == null || val === '') return '';
  return `${(val * 100).toFixed(2)}%`;
}

function pctColor(val, threshold = 0.95) {
  if (val == null) return 'text-slate-400';
  if (val >= threshold) return 'text-green-700 font-medium';
  if (val >= 0.9) return 'text-orange-600 font-medium';
  return 'text-red-600 font-medium';
}

export default function KPITable({ kpiData }) {
  if (!kpiData || kpiData.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen KPI data beschikbaar voor deze week.</p>;
  }

  const sorted = [...kpiData].sort((a, b) => (a.medewerker_naam || '').localeCompare(b.medewerker_naam || ''));

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-[#2c3e6b] text-white">
          <tr>
            <th className="text-left py-2.5 px-3 font-medium">Medewerker</th>
            <th className="text-center py-2.5 px-3 font-medium">Week</th>
            <th className="text-right py-2.5 px-3 font-medium">TVI Dag</th>
            <th className="text-right py-2.5 px-3 font-medium">TVI Avond</th>
            <th className="text-right py-2.5 px-3 font-medium">Uitreiklocatie</th>
            <th className="text-right py-2.5 px-3 font-medium">Vr Distributie</th>
            <th className="text-right py-2.5 px-3 font-medium">Scankwaliteit</th>
            <th className="text-right py-2.5 px-3 font-medium">PBA bezorgers</th>
            <th className="text-right py-2.5 px-3 font-medium">Hitrate</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => (
            <tr key={row.id || idx} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
              <td className="py-2 px-3 font-medium text-slate-800">{row.medewerker_naam}</td>
              <td className="py-2 px-3 text-center text-slate-600">{String(row.week).padStart(2, '0')}</td>
              <td className={`py-2 px-3 text-right ${pctColor(row.tvi_dag)}`}>{pct(row.tvi_dag)}</td>
              <td className={`py-2 px-3 text-right ${pctColor(row.tvi_avond)}`}>{pct(row.tvi_avond)}</td>
              <td className={`py-2 px-3 text-right ${pctColor(row.uitreiklocatie)}`}>{pct(row.uitreiklocatie)}</td>
              <td className={`py-2 px-3 text-right ${pctColor(row.vr_distributie, 0.01)}`}>{pct(row.vr_distributie)}</td>
              <td className={`py-2 px-3 text-right ${pctColor(row.scankwaliteit)}`}>{pct(row.scankwaliteit)}</td>
              <td className={`py-2 px-3 text-right ${pctColor(row.pba_bezorgers)}`}>{pct(row.pba_bezorgers)}</td>
              <td className={`py-2 px-3 text-right ${pctColor(row.hitrate)}`}>{pct(row.hitrate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}