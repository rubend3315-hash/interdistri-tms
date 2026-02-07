import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const METRICS = [
  { key: "gemUren", label: "Gem. Uren", color: "#3b82f6", format: (v) => v?.toFixed(1) || '-', unit: "uur" },
  { key: "omzet", label: "Tot. Omzet", color: "#10b981", format: (v) => v > 0 ? `€${v.toFixed(0)}` : '-', unit: "€" },
  { key: "gemOmzet", label: "Gem. Omzet", color: "#14b8a6", format: (v) => v > 0 ? `€${v.toFixed(0)}` : '-', unit: "€" },
  { key: "uurtarief", label: "Uurtarief", color: "#8b5cf6", format: (v) => v > 0 ? `€${v.toFixed(2)}` : '-', unit: "€", refLine: 45 },
  { key: "hitrate", label: "Hitrate %", color: "#f59e0b", format: (v) => v > 0 ? `${(v * 100).toFixed(1)}%` : '-', unit: "%", multiplier: 100, refLine: 95 },
  { key: "gemStops", label: "Gem. Stops", color: "#6366f1", format: (v) => v?.toFixed(0) || '-', unit: "" },
  { key: "gemStuks", label: "Gem. Stuks", color: "#ec4899", format: (v) => v?.toFixed(0) || '-', unit: "" },
  { key: "aantalGeenScan", label: "X Geen Scan", color: "#ef4444", format: (v) => v || '-', unit: "" },
];

function ChartTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  const m = METRICS.find(m => m.key === metric);
  const val = payload[0]?.value;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="text-slate-600">{m?.label}: <span className="font-medium text-slate-900">{m?.format(m?.multiplier ? val / (m.multiplier) : val) || val}</span></p>
    </div>
  );
}

export default function RouteOverviewCharts({ routeStats }) {
  const [metric, setMetric] = useState("uurtarief");

  const chartData = useMemo(() => {
    if (!routeStats || routeStats.length === 0) return [];
    const m = METRICS.find(m => m.key === metric);
    return routeStats
      .map(s => ({
        route: s.route?.length > 15 ? s.route.substring(0, 15) + '…' : s.route,
        fullRoute: s.route,
        value: m?.multiplier ? (s[metric] || 0) * m.multiplier : (s[metric] || 0),
        raw: s[metric] || 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [routeStats, metric]);

  const m = METRICS.find(m => m.key === metric);

  if (!routeStats || routeStats.length === 0) return null;

  const getBarColor = (value) => {
    if (!m?.refLine) return m?.color || '#3b82f6';
    if (metric === 'hitrate') {
      return value >= m.refLine ? '#10b981' : value >= 90 ? '#f59e0b' : '#ef4444';
    }
    if (metric === 'uurtarief') {
      return value >= m.refLine ? '#10b981' : '#ef4444';
    }
    return m?.color || '#3b82f6';
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-700">Route Vergelijking</h4>
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRICS.map(m => (
              <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 28 + 40)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="route" width={120} tick={{ fontSize: 10, fill: '#334155' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip metric={metric} />} />
            {m?.refLine && (
              <ReferenceLine x={m.refLine} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${m.refLine}`, position: 'top', fontSize: 10, fill: '#64748b' }} />
            )}
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry.value)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}