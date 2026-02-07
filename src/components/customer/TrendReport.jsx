import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, ReferenceLine } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseTimeToHours } from "./BesteltijdReport";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function getWeekNumber(datumStr) {
  if (!datumStr) return null;
  const parts = datumStr.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!parts) return null;
  const d = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
  const tmp = new Date(d.valueOf());
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  return 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

const fmt = (v) => v != null && v > 0 ? `€${v.toFixed(2)}` : "-";
const fmtPct = (v) => v != null && v > 0 ? `${(v * 100).toFixed(1)}%` : "-";
const fmtNum = (v, dec = 1) => v != null && v > 0 ? v.toFixed(dec) : "-";

function TrendCard({ title, value, prevValue, format: formatFn, color }) {
  const trend = (value && prevValue && prevValue > 0) ? ((value - prevValue) / prevValue) * 100 : null;
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <p className="text-xs text-slate-500 mb-1">{title}</p>
      <div className="flex items-end gap-2">
        <span className={`text-2xl font-bold ${color || "text-slate-900"}`}>{formatFn(value)}</span>
        {trend !== null && (
          <span className={`text-xs flex items-center gap-0.5 mb-1 ${trend > 0 ? "text-green-600" : trend < 0 ? "text-red-500" : "text-slate-400"}`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default function TrendReport({ rows, tiModelRoutes = [] }) {
  const [filterType, setFilterType] = useState("all"); // "all", "chauffeur", "route"
  const [filterValue, setFilterValue] = useState("all");

  const findTiRoute = (routeName) => {
    if (!routeName || routeName === '-') return null;
    const match = routeName.trim().match(/^(\d+)/);
    if (!match) return null;
    const normalized = match[1].replace(/^0+/, '');
    return tiModelRoutes.find(r => r.route_code && r.route_code.trim().replace(/^0+/, '') === normalized) || null;
  };

  // Get unique chauffeurs and routes
  const chauffeurs = useMemo(() => {
    if (!rows) return [];
    return [...new Set(rows.map(r => r.chauffeur).filter(Boolean))].sort();
  }, [rows]);

  const routes = useMemo(() => {
    if (!rows) return [];
    return [...new Set(rows.map(r => r.route).filter(r => r && r !== '-'))].sort();
  }, [rows]);

  const handleFilterTypeChange = (type) => {
    setFilterType(type);
    setFilterValue("all");
  };

  // Group rows by week and calculate averages
  const weeklyData = useMemo(() => {
    if (!rows || rows.length === 0) return [];

    let filtered = rows;
    if (filterType === "chauffeur" && filterValue !== "all") {
      filtered = rows.filter(r => r.chauffeur === filterValue);
    } else if (filterType === "route" && filterValue !== "all") {
      filtered = rows.filter(r => r.route === filterValue);
    }
    const weekMap = {};

    filtered.forEach(r => {
      const wk = getWeekNumber(r.datum);
      if (!wk) return;
      if (!weekMap[wk]) weekMap[wk] = [];
      weekMap[wk].push(r);
    });

    return Object.entries(weekMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([wk, weekRows]) => {
        let totaalRitUren = 0, stops = 0, stuks = 0, omzet = 0, succesvolleStops = 0;
        let besteltijdNetto = 0, besteltijdCount = 0;
        const count = weekRows.length;

        weekRows.forEach(r => {
          let ritUren = r.totaalRitUren || parseTimeToHours(r.totaalRit) || 0;
          if (ritUren <= 0) {
            const tiRoute = findTiRoute(r.route);
            if (tiRoute?.total_time_hours > 0) ritUren = tiRoute.total_time_hours;
          }
          totaalRitUren += ritUren;
          stops += r.aantalRouteStops || 0;
          stuks += r.aantalRouteStuks || 0;
          succesvolleStops += r.succesvolleStops || 0;
          omzet += r.omzet || 0;
          const bn = parseTimeToHours(r.besteltijdNetto);
          if (bn > 0) { besteltijdNetto += bn; besteltijdCount++; }
        });

        const gemUren = count > 0 ? totaalRitUren / count : 0;
        const gemOmzet = count > 0 ? omzet / count : 0;
        const uurtarief = totaalRitUren > 0 ? omzet / totaalRitUren : 0;
        const hitrate = stops > 0 ? succesvolleStops / stops : 0;
        const gemStops = count > 0 ? stops / count : 0;
        const gemStuks = count > 0 ? stuks / count : 0;
        const gemBesteltijd = besteltijdCount > 0 ? besteltijdNetto / besteltijdCount : 0;

        return {
          week: `Wk ${wk}`,
          weekNum: Number(wk),
          ritten: count,
          gemUren: Math.round(gemUren * 100) / 100,
          gemOmzet: Math.round(gemOmzet * 100) / 100,
          totaalOmzet: Math.round(omzet * 100) / 100,
          uurtarief: Math.round(uurtarief * 100) / 100,
          hitrate: Math.round(hitrate * 1000) / 1000,
          gemStops: Math.round(gemStops * 10) / 10,
          gemStuks: Math.round(gemStuks * 10) / 10,
          gemBesteltijd: Math.round(gemBesteltijd * 100) / 100,
          totaalUren: Math.round(totaalRitUren * 100) / 100,
        };
      });
  }, [rows, filterType, filterValue, tiModelRoutes]);

  const latestWeek = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1] : null;
  const prevWeek = weeklyData.length > 1 ? weeklyData[weeklyData.length - 2] : null;

  if (!rows || rows.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen data beschikbaar voor trends.</p>;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-slate-800 mb-1">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-medium">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <span className="text-sm font-medium text-slate-700">Filter per:</span>
        <Select value={filterType} onValueChange={handleFilterTypeChange}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alles</SelectItem>
            <SelectItem value="chauffeur">Chauffeur</SelectItem>
            <SelectItem value="route">Route</SelectItem>
          </SelectContent>
        </Select>
        {filterType !== "all" && (
          <Select value={filterValue} onValueChange={setFilterValue}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle {filterType === "chauffeur" ? "chauffeurs" : "routes"}</SelectItem>
              {(filterType === "chauffeur" ? chauffeurs : routes).map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* KPI Cards */}
      {latestWeek && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <TrendCard title="Gem. Rit Uren" value={latestWeek.gemUren} prevValue={prevWeek?.gemUren} format={v => fmtNum(v)} />
          <TrendCard title="Gem. Omzet" value={latestWeek.gemOmzet} prevValue={prevWeek?.gemOmzet} format={fmt} color="text-blue-700" />
          <TrendCard title="Uurtarief" value={latestWeek.uurtarief} prevValue={prevWeek?.uurtarief} format={fmt} color={latestWeek.uurtarief >= 45 ? "text-green-700" : "text-red-600"} />
          <TrendCard title="Hitrate" value={latestWeek.hitrate} prevValue={prevWeek?.hitrate} format={fmtPct} />
          <TrendCard title="Gem. Stops" value={latestWeek.gemStops} prevValue={prevWeek?.gemStops} format={v => fmtNum(v, 0)} />
          <TrendCard title="Ritten" value={latestWeek.ritten} prevValue={prevWeek?.ritten} format={v => fmtNum(v, 0)} />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Omzet & Uurtarief */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Gem. Omzet & Uurtarief per week</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "€45", fontSize: 10, fill: "#ef4444" }} />
                <Line type="monotone" dataKey="gemOmzet" name="Gem. Omzet (€)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="uurtarief" name="Uurtarief (€)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Uren & Besteltijd */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Gem. Rit Uren & Besteltijd Netto per week</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="gemUren" name="Gem. Rit Uren" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="gemBesteltijd" name="Gem. Besteltijd Netto" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stops & Stuks */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Gem. Stops & Stuks per week</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="gemStops" name="Gem. Stops" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="gemStuks" name="Gem. Stuks" fill="#93c5fd" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hitrate */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Hitrate & Ritten per week</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="hitrate" name="Hitrate" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="ritten" name="Ritten" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Totaal Omzet & Uren */}
        <Card className="xl:col-span-2">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Totaal Omzet & Uren per week</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="totaalOmzet" name="Totaal Omzet (€)" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="right" dataKey="totaalUren" name="Totaal Uren" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}