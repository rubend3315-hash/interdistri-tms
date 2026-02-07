import React, { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";

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

function matchesPD(name, pdEmployees) {
  if (!pdEmployees || pdEmployees.length === 0) return true; // no validation data
  const n = (name || '').toLowerCase().trim();
  return pdEmployees.some(e => {
    const last = (e.last_name || '').trim().toLowerCase();
    const first = (e.first_name || '').trim().toLowerCase();
    const prefix = (e.prefix || '').trim().toLowerCase();
    const initial = first ? first.charAt(0) + '.' : '';
    const fullLast = prefix ? `${prefix} ${last}` : last;
    const variations = [
      `${fullLast}, ${initial}`.trim(),
      `${fullLast} ${initial}`.trim(),
      `${initial} ${fullLast}`.trim(),
      `${fullLast} ${first}`.trim(),
      `${first} ${fullLast}`.trim(),
      `${last}, ${initial}`.trim(),
      `${last} ${initial}`.trim(),
      `${initial} ${last}`.trim(),
      `${last} ${first}`.trim(),
      `${first} ${last}`.trim(),
      fullLast,
      last,
    ];
    return variations.some(v => v === n || n.includes(v) || v.includes(n));
  });
}

export default function KPITable({ kpiData, pdEmployees = [] }) {
  if (!kpiData || kpiData.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen KPI data beschikbaar voor deze week.</p>;
  }

  const sorted = [...kpiData].sort((a, b) => (b.hitrate || 0) - (a.hitrate || 0));

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
              <td className="py-2 px-3 font-medium text-slate-800">
                <span className="flex items-center gap-1.5">
                  {row.medewerker_naam}
                  {!matchesPD(row.medewerker_naam, pdEmployees) && pdEmployees.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">Niet gevonden in afdeling PakketDistributie</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </span>
              </td>
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