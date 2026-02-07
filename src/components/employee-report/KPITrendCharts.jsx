import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const KPI_FIELDS = [
  { key: "hitrate", label: "Hitrate", color: "#2563eb", bg: "#dbeafe", threshold: 0.95 },
  { key: "tvi_dag", label: "TVI Dag", color: "#16a34a", bg: "#dcfce7", threshold: 0.95 },
  { key: "tvi_avond", label: "TVI Avond", color: "#7c3aed", bg: "#ede9fe", threshold: 0.95 },
  { key: "scankwaliteit", label: "Scankwaliteit", color: "#0891b2", bg: "#cffafe", threshold: 0.95 },
  { key: "uitreiklocatie", label: "Uitreiklocatie", color: "#ea580c", bg: "#ffedd5", threshold: 0.95 },
  { key: "pba_bezorgers", label: "PBA Bezorgers", color: "#dc2626", bg: "#fee2e2", threshold: 0.95 },
  { key: "vr_distributie", label: "Vr Distributie", color: "#ca8a04", bg: "#fef9c3", threshold: 0.01 },
];

function pct(val) {
  if (val == null || val === "") return "-";
  return `${(val * 100).toFixed(1)}%`;
}

function SingleKPITooltip({ active, payload, label, kpiLabel, color }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="text-slate-500 text-xs mb-0.5">Week {label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="font-semibold" style={{ color }}>{pct(payload[0]?.value)}</span>
      </div>
    </div>
  );
}

function KPIMiniCard({ field, data, showAll }) {
  const vals = data.map(d => d[field.key]).filter(v => v != null);
  if (vals.length === 0) return null;

  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const last = vals[vals.length - 1];
  const first = vals[0];
  const change = vals.length >= 2 ? last - first : 0;
  const trend = change > 0.005 ? "up" : change < -0.005 ? "down" : "stable";

  // Dynamic Y domain: zoom in around actual values
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const padding = Math.max(0.03, (maxVal - minVal) * 0.2);
  const yMin = Math.max(0, Math.floor((minVal - padding) * 100) / 100);
  const yMax = Math.min(1, Math.ceil((maxVal + padding) * 100) / 100);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{field.label}</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold" style={{ color: field.color }}>{pct(last)}</span>
            <span className="text-xs text-slate-400">huidig</span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            {trend === "up" ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : trend === "down" ? (
              <TrendingDown className="w-4 h-4 text-red-600" />
            ) : (
              <Minus className="w-4 h-4 text-slate-400" />
            )}
            <span className={`text-sm font-semibold ${
              trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-slate-500"
            }`}>
              {change !== 0 ? `${change > 0 ? '+' : ''}${(change * 100).toFixed(1)}%` : "0%"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">gem. {pct(avg)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-32 px-2 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${field.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={field.color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={field.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<SingleKPITooltip kpiLabel={field.label} color={field.color} />} />
            {field.threshold > 0.5 && (
              <ReferenceLine
                y={field.threshold}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}
            <Area
              type="monotone"
              dataKey={field.key}
              stroke={field.color}
              strokeWidth={2.5}
              fill={`url(#grad-${field.key})`}
              dot={{ r: 2.5, fill: field.color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: field.color, stroke: "#fff", strokeWidth: 2 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ComparisonTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm max-h-64 overflow-y-auto">
      <p className="font-semibold text-slate-800 mb-2 border-b pb-1">Week {label}</p>
      {sorted.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-slate-600 text-xs truncate max-w-[120px]">{entry.name}</span>
          </div>
          <span className="font-medium text-xs">{pct(entry.value)}</span>
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

  const employeeComparisonData = useMemo(() => {
    if (!showAll || allKpi.length === 0) return { data: [], names: [] };
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  const chartData = showAll ? teamTrendData : employeeTrendData;

  if (chartData.length === 0 && employeeComparisonData?.data?.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen KPI data beschikbaar voor trendanalyse in {yearNum}.</p>;
  }

  const EMPLOYEE_COLORS = [
    "#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#7c3aed",
    "#0891b2", "#ea580c", "#be185d", "#4f46e5", "#059669",
    "#d97706", "#9333ea", "#0284c7", "#e11d48",
  ];

  const selectedField = KPI_FIELDS.find(f => f.key === selectedKPI);

  return (
    <div className="space-y-8">
      {/* Section title */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs font-normal">
          {showAll ? "Team gemiddelde" : employeeName}
        </Badge>
        <span className="text-xs text-slate-400">•</span>
        <span className="text-xs text-slate-400">{chartData.length} weken data</span>
      </div>

      {/* KPI Mini Cards Grid */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {KPI_FIELDS.map((field) => (
            <KPIMiniCard key={field.key} field={field} data={chartData} showAll={showAll} />
          ))}
        </div>
      )}

      {/* Employee Comparison Chart */}
      {showAll && employeeComparisonData?.data?.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-700">Vergelijking per medewerker</h3>
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
          <div className="h-80 bg-white border border-slate-200 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={employeeComparisonData.data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Week", position: "insideBottom", offset: -5, fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  domain={[
                    (dataMin) => Math.max(0, Math.floor((dataMin - 0.03) * 100) / 100),
                    (dataMax) => Math.min(1, Math.ceil((dataMax + 0.03) * 100) / 100),
                  ]}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ComparisonTooltip />} />
                {selectedField?.threshold > 0.5 && (
                  <ReferenceLine y={selectedField.threshold} stroke="#cbd5e1" strokeDasharray="4 4" />
                )}
                {employeeComparisonData.names.map((name, idx) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    name={name}
                    stroke={EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
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