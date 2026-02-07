import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

const KPI_FIELDS = [
  { key: "tvi_dag", label: "TVI Dag", color: "#2563eb" },
  { key: "tvi_avond", label: "TVI Avond", color: "#7c3aed" },
  { key: "uitreiklocatie", label: "Uitreiklocatie", color: "#0891b2" },
  { key: "vr_distributie", label: "Vr Distributie", color: "#ca8a04" },
  { key: "scankwaliteit", label: "Scankwaliteit", color: "#16a34a" },
  { key: "pba_bezorgers", label: "PBA Bezorgers", color: "#dc2626" },
  { key: "hitrate", label: "Hitrate", color: "#ea580c" },
];

function pct(val) {
  if (val == null || val === "") return "-";
  return `${(val * 100).toFixed(1)}%`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-800 mb-1">Week {label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-600">{entry.name}:</span>
          <span className="font-medium">{pct(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function KPITrendCharts({ employeeName, year }) {
  const yearNum = parseInt(year);
  const showAll = !employeeName || employeeName === "all";
  const [selectedKPI, setSelectedKPI] = useState("hitrate");

  const { data: allKpi = [], isLoading } = useQuery({
    queryKey: ["employee-kpi-year", yearNum],
    queryFn: () => base44.entities.EmployeeKPI.filter({ year: yearNum }),
  });

  // Individual employee trend data
  const employeeTrendData = useMemo(() => {
    if (showAll || allKpi.length === 0) return [];
    return allKpi
      .filter((k) => k.medewerker_naam === employeeName)
      .sort((a, b) => a.week - b.week)
      .map((k) => ({
        week: k.week,
        ...KPI_FIELDS.reduce((acc, f) => {
          acc[f.key] = k[f.key] != null ? k[f.key] : null;
          return acc;
        }, {}),
      }));
  }, [allKpi, employeeName, showAll]);

  // Team average trend data (per week, average of all employees)
  const teamTrendData = useMemo(() => {
    if (allKpi.length === 0) return [];
    const byWeek = {};
    allKpi.forEach((k) => {
      if (!byWeek[k.week]) byWeek[k.week] = [];
      byWeek[k.week].push(k);
    });
    return Object.entries(byWeek)
      .map(([week, rows]) => {
        const entry = { week: parseInt(week) };
        KPI_FIELDS.forEach((f) => {
          const vals = rows.map((r) => r[f.key]).filter((v) => v != null);
          entry[f.key] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
        });
        return entry;
      })
      .sort((a, b) => a.week - b.week);
  }, [allKpi]);

  // Per-employee comparison on selected KPI
  const employeeComparisonData = useMemo(() => {
    if (!showAll || allKpi.length === 0) return [];
    const byWeek = {};
    const names = new Set();
    allKpi.forEach((k) => {
      if (!k.medewerker_naam || k[selectedKPI] == null) return;
      names.add(k.medewerker_naam);
      if (!byWeek[k.week]) byWeek[k.week] = {};
      byWeek[k.week][k.medewerker_naam] = k[selectedKPI];
    });
    const sortedWeeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);
    return {
      data: sortedWeeks.map((w) => ({ week: w, ...byWeek[w] })),
      names: [...names].sort(),
    };
  }, [allKpi, showAll, selectedKPI]);

  // Trend indicator
  const trendSummary = useMemo(() => {
    const data = showAll ? teamTrendData : employeeTrendData;
    if (data.length < 2) return [];
    return KPI_FIELDS.map((f) => {
      const vals = data.map((d) => d[f.key]).filter((v) => v != null);
      if (vals.length < 2) return { ...f, trend: null, change: null };
      const recent = vals.slice(-3);
      const early = vals.slice(0, 3);
      const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length;
      const avgEarly = early.reduce((s, v) => s + v, 0) / early.length;
      const change = avgRecent - avgEarly;
      return { ...f, trend: change > 0.005 ? "up" : change < -0.005 ? "down" : "stable", change };
    });
  }, [showAll, teamTrendData, employeeTrendData]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  const chartData = showAll ? teamTrendData : employeeTrendData;

  if (chartData.length === 0 && (!showAll || employeeComparisonData?.data?.length === 0)) {
    return <p className="text-slate-500 text-sm py-4">Geen KPI data beschikbaar voor trendanalyse in {yearNum}.</p>;
  }

  const EMPLOYEE_COLORS = [
    "#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#7c3aed",
    "#0891b2", "#ea580c", "#be185d", "#4f46e5", "#059669",
    "#d97706", "#9333ea", "#0284c7", "#e11d48",
  ];

  return (
    <div className="space-y-8">
      {/* Trend Indicators */}
      {trendSummary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {trendSummary.map((item) => (
            <div key={item.key} className="bg-white border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              {item.trend === null ? (
                <p className="text-slate-400 text-sm">-</p>
              ) : (
                <div className="flex items-center justify-center gap-1">
                  <span
                    className={`text-lg ${
                      item.trend === "up" ? "text-green-600" : item.trend === "down" ? "text-red-600" : "text-slate-500"
                    }`}
                  >
                    {item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "→"}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      item.trend === "up" ? "text-green-700" : item.trend === "down" ? "text-red-700" : "text-slate-600"
                    }`}
                  >
                    {item.change != null ? `${(item.change * 100).toFixed(1)}%` : ""}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main KPI Trend Chart */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          {showAll ? "Team Gemiddelde Trend" : `Trend ${employeeName}`} — {yearNum}
        </h3>
        <div className="h-80 bg-white border border-slate-200 rounded-lg p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} label={{ value: "Week", position: "insideBottom", offset: -5, fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                domain={[0, 1]}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={0.95} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: "95%", position: "right", fontSize: 10 }} />
              {KPI_FIELDS.map((f) => (
                <Line
                  key={f.key}
                  type="monotone"
                  dataKey={f.key}
                  name={f.label}
                  stroke={f.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employee Comparison Chart (only when all employees selected) */}
      {showAll && employeeComparisonData?.data?.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Vergelijking per medewerker</h3>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-500">KPI:</Label>
              <Select value={selectedKPI} onValueChange={setSelectedKPI}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KPI_FIELDS.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="h-80 bg-white border border-slate-200 rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={employeeComparisonData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} label={{ value: "Week", position: "insideBottom", offset: -5, fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  domain={[0, 1]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0.95} stroke="#94a3b8" strokeDasharray="5 5" />
                {employeeComparisonData.names.map((name, idx) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    name={name}
                    stroke={EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]}
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}