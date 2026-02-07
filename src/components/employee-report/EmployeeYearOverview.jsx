import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

function pct(val) {
  if (val == null || val === '') return '-';
  return `${(val * 100).toFixed(2)}%`;
}

function pctColor(val, threshold = 0.95) {
  if (val == null) return 'text-slate-400';
  if (val >= threshold) return 'text-green-700 font-medium';
  if (val >= 0.9) return 'text-orange-600 font-medium';
  return 'text-red-600 font-medium';
}

export default function EmployeeYearOverview({ employeeName, year }) {
  const yearNum = parseInt(year);
  const showAll = !employeeName || employeeName === 'all';

  const { data: allKpi = [], isLoading } = useQuery({
    queryKey: ['employee-kpi-year', yearNum],
    queryFn: () => base44.entities.EmployeeKPI.filter({ year: yearNum }),
  });

  // Filter for selected employee
  const employeeKpi = useMemo(() => {
    if (showAll) return [];
    return allKpi
      .filter(k => k.medewerker_naam === employeeName)
      .sort((a, b) => a.week - b.week);
  }, [allKpi, employeeName, showAll]);

  // All-employees summary: per employee, calculate averages across all weeks
  const allEmployeeSummary = useMemo(() => {
    if (!showAll || allKpi.length === 0) return [];
    const grouped = {};
    allKpi.forEach(k => {
      const name = k.medewerker_naam;
      if (!name) return;
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(k);
    });

    const fields = ['tvi_dag', 'tvi_avond', 'uitreiklocatie', 'vr_distributie', 'scankwaliteit', 'pba_bezorgers', 'hitrate'];
    return Object.entries(grouped).map(([name, rows]) => {
      const avgs = {};
      fields.forEach(f => {
        const vals = rows.map(r => r[f]).filter(v => v != null);
        avgs[f] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
      });
      return { name, weeks: rows.length, ...avgs };
    }).sort((a, b) => (b.hitrate ?? 0) - (a.hitrate ?? 0));
  }, [allKpi, showAll]);

  // Calculate averages for single employee
  const averages = useMemo(() => {
    if (employeeKpi.length === 0) return null;
    const fields = ['tvi_dag', 'tvi_avond', 'uitreiklocatie', 'vr_distributie', 'scankwaliteit', 'pba_bezorgers', 'hitrate'];
    const result = {};
    fields.forEach(f => {
      const vals = employeeKpi.map(k => k[f]).filter(v => v != null);
      result[f] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    });
    return result;
  }, [employeeKpi]);

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>;
  }

  // All employees overview
  if (showAll) {
    if (allEmployeeSummary.length === 0) {
      return <p className="text-slate-500 text-sm py-4">Geen KPI data beschikbaar voor {yearNum}.</p>;
    }
    return (
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-[#2c3e6b] text-white">
            <tr>
              <th className="text-left py-2.5 px-3 font-medium">Medewerker</th>
              <th className="text-center py-2.5 px-3 font-medium">Weken</th>
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
            {allEmployeeSummary.map((row, idx) => (
              <tr key={row.name} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                <td className="py-2 px-3 font-medium text-slate-800">{row.name}</td>
                <td className="py-2 px-3 text-center text-slate-600">{row.weeks}</td>
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

  // Single employee view
  if (employeeKpi.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen KPI data beschikbaar voor {employeeName} in {yearNum}.</p>;
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-[#2c3e6b] text-white">
          <tr>
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
          {employeeKpi.map((row, idx) => (
            <tr key={row.id || idx} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
              <td className="py-2 px-3 text-center font-medium text-slate-800">{String(row.week).padStart(2, '0')}</td>
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
        <tfoot>
          <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
            <td className="py-2.5 px-3 text-center text-slate-800">Gemiddelde ({employeeKpi.length} weken)</td>
            <td className={`py-2.5 px-3 text-right ${pctColor(averages?.tvi_dag)}`}>{pct(averages?.tvi_dag)}</td>
            <td className={`py-2.5 px-3 text-right ${pctColor(averages?.tvi_avond)}`}>{pct(averages?.tvi_avond)}</td>
            <td className={`py-2.5 px-3 text-right ${pctColor(averages?.uitreiklocatie)}`}>{pct(averages?.uitreiklocatie)}</td>
            <td className={`py-2.5 px-3 text-right ${pctColor(averages?.vr_distributie, 0.01)}`}>{pct(averages?.vr_distributie)}</td>
            <td className={`py-2.5 px-3 text-right ${pctColor(averages?.scankwaliteit)}`}>{pct(averages?.scankwaliteit)}</td>
            <td className={`py-2.5 px-3 text-right ${pctColor(averages?.pba_bezorgers)}`}>{pct(averages?.pba_bezorgers)}</td>
            <td className={`py-2.5 px-3 text-right ${pctColor(averages?.hitrate)}`}>{pct(averages?.hitrate)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}