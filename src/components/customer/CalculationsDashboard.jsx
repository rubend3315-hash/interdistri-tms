import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area } from "recharts";
import { TrendingUp, TrendingDown, Minus, Clock, DollarSign, Truck, Users } from "lucide-react";

function parseDatum(datumStr) {
  if (!datumStr) return null;
  const parts = String(datumStr).split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseTimeToHours(timeStr) {
  if (!timeStr || timeStr === '-' || timeStr === '') return 0;
  const str = String(timeStr).trim();
  const partsHMS = str.match(/^(\d+):(\d+):(\d+)$/);
  if (partsHMS) return parseInt(partsHMS[1]) + parseInt(partsHMS[2]) / 60 + parseInt(partsHMS[3]) / 3600;
  const partsHM = str.match(/^(\d+):(\d+)$/);
  if (partsHM) return parseInt(partsHM[1]) + parseInt(partsHM[2]) / 60;
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const DAY_NAMES_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

function StatCard({ title, value, subtitle, icon: Icon, trend, trendLabel, color = "blue" }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trend > 0 ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : trend < 0 ? <TrendingDown className="w-3 h-3 text-red-600" /> : <Minus className="w-3 h-3 text-slate-400" />}
            <span className={`text-xs font-medium ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-slate-500'}`}>
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </span>
            {trendLabel && <span className="text-xs text-slate-400 ml-1">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const fmtEuro = (v) => v != null && v > 0 ? `€${v.toFixed(0)}` : '-';
const fmtTime = (h) => {
  if (!h || h <= 0) return '-';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}:${String(mins).padStart(2, '0')}`;
};

export default function CalculationsDashboard({ importResults, articlePrices, buildReportRows }) {
  const [compareMode, setCompareMode] = useState("vorige_week");

  // Parse all import data into flat rows
  const allRows = useMemo(() => {
    if (!importResults || importResults.length === 0) return [];
    const rows = [];
    const seen = new Set();
    importResults.forEach(item => {
      if (!item?.data) return;
      const innerData = item.data.data || item.data;
      if (!innerData || typeof innerData !== 'object') return;
      const datum = parseDatum(innerData['Datum']);
      if (!datum) return;
      const key = `${innerData['Datum']}_${innerData['Chauffeur']}_${innerData['Ritnaam']}`;
      if (seen.has(key)) return;
      seen.add(key);
      const weekNum = getISOWeek(datum);
      const year = datum.getFullYear();
      rows.push({
        ...innerData,
        _date: datum,
        _week: weekNum,
        _year: year,
        _dayOfWeek: datum.getDay(),
        _dayName: DAY_NAMES_SHORT[datum.getDay()],
        _monthKey: `${year}-${String(datum.getMonth() + 1).padStart(2, '0')}`,
        _weekKey: `${year}-W${String(weekNum).padStart(2, '0')}`,
      });
    });
    return rows.sort((a, b) => a._date - b._date);
  }, [importResults]);

  // Get unique weeks sorted
  const weekKeys = useMemo(() => {
    const keys = [...new Set(allRows.map(r => r._weekKey))];
    return keys.sort();
  }, [allRows]);

  // 1. Gemiddelde besteltijd per week
  const besteltijdPerWeek = useMemo(() => {
    const weekMap = {};
    allRows.forEach(r => {
      const key = r._weekKey;
      if (!weekMap[key]) weekMap[key] = { norm: [], bruto: [], netto: [] };
      const norm = parseTimeToHours(r['Besteltijd Norm']);
      const bruto = parseTimeToHours(r['Besteltijd Bruto']);
      const netto = parseTimeToHours(r['Besteltijd Netto']);
      if (norm > 0) weekMap[key].norm.push(norm);
      if (bruto > 0) weekMap[key].bruto.push(bruto);
      if (netto > 0) weekMap[key].netto.push(netto);
    });
    return weekKeys.map(key => {
      const d = weekMap[key] || { norm: [], bruto: [], netto: [] };
      const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
      return {
        week: key.split('-W')[1],
        weekKey: key,
        gemNorm: +(avg(d.norm) * 60).toFixed(1),
        gemBruto: +(avg(d.bruto) * 60).toFixed(1),
        gemNetto: +(avg(d.netto) * 60).toFixed(1),
      };
    }).slice(-26); // Last 26 weeks
  }, [allRows, weekKeys]);

  // 2. Omzet per week (using stops * price as proxy)
  const omzetPerWeek = useMemo(() => {
    const weekMap = {};
    allRows.forEach(r => {
      const key = r._weekKey;
      if (!weekMap[key]) weekMap[key] = { stops: 0, stuks: 0, ritten: 0, omzet: 0 };
      const stops = Number(r['Aantal afgeleverd - stops']) || 0;
      const stuks = Number(r['Aantal afgeleverd - stuks']) || 0;
      const isMonday = r._dayOfWeek === 1;
      const stopPrice = isMonday
        ? (articlePrices?.['Aantal afgeleverd - Stops Maandagtarief'] || articlePrices?.['ART-004'] || 0)
        : (articlePrices?.['Aantal afgeleverd - Stops'] || articlePrices?.['ART-001'] || 0);
      const stuksPrice = articlePrices?.['Aantal afgeleverd - Stuks'] || articlePrices?.['ART-002'] || 0;
      const pbaPrice = articlePrices?.['PBA - Bezorgd'] || articlePrices?.['ART-003'] || 0;
      const pba = Number(r['Aantal PBA-pakketten bezorgd']) || 0;
      const omzet = (stops * stopPrice) + (stuks * stuksPrice) + (pba * pbaPrice);
      weekMap[key].stops += stops;
      weekMap[key].stuks += stuks;
      weekMap[key].ritten += 1;
      weekMap[key].omzet += omzet;
    });
    return weekKeys.map(key => ({
      week: key.split('-W')[1],
      weekKey: key,
      omzet: +(weekMap[key]?.omzet || 0).toFixed(2),
      ritten: weekMap[key]?.ritten || 0,
      stops: weekMap[key]?.stops || 0,
      gemOmzetPerRit: weekMap[key]?.ritten > 0 ? +((weekMap[key]?.omzet || 0) / weekMap[key].ritten).toFixed(2) : 0,
    })).slice(-26);
  }, [allRows, weekKeys, articlePrices]);

  // 3. Ritten per chauffeur (top 15)
  const rittenPerChauffeur = useMemo(() => {
    const chMap = {};
    allRows.forEach(r => {
      const ch = r['Chauffeur'] || 'Onbekend';
      if (!chMap[ch]) chMap[ch] = { ritten: 0, stops: 0, stuks: 0 };
      chMap[ch].ritten += 1;
      chMap[ch].stops += Number(r['Aantal afgeleverd - stops']) || 0;
      chMap[ch].stuks += Number(r['Aantal afgeleverd - stuks']) || 0;
    });
    return Object.entries(chMap)
      .map(([name, data]) => ({ chauffeur: name, fullName: name, ...data, gemStops: data.ritten > 0 ? Math.round(data.stops / data.ritten) : 0 }))
      .sort((a, b) => b.ritten - a.ritten)
      .slice(0, 15);
  }, [allRows]);

  // 4. Ritten per dag van de week
  const rittenPerDag = useMemo(() => {
    const dayMap = { 1: { label: 'Ma', ritten: 0, stops: 0 }, 2: { label: 'Di', ritten: 0, stops: 0 }, 3: { label: 'Wo', ritten: 0, stops: 0 }, 4: { label: 'Do', ritten: 0, stops: 0 }, 5: { label: 'Vr', ritten: 0, stops: 0 }, 6: { label: 'Za', ritten: 0, stops: 0 }, 0: { label: 'Zo', ritten: 0, stops: 0 } };
    allRows.forEach(r => {
      const d = r._dayOfWeek;
      if (dayMap[d]) {
        dayMap[d].ritten += 1;
        dayMap[d].stops += Number(r['Aantal afgeleverd - stops']) || 0;
      }
    });
    return [1, 2, 3, 4, 5, 6, 0].map(d => ({ ...dayMap[d], gemStops: dayMap[d].ritten > 0 ? Math.round(dayMap[d].stops / dayMap[d].ritten) : 0 }));
  }, [allRows]);

  // 5. Periodenvergelijking
  const comparison = useMemo(() => {
    if (weekKeys.length < 2) return null;
    const lastWeekKey = weekKeys[weekKeys.length - 1];
    let prevWeekKey;
    if (compareMode === "vorige_week") {
      prevWeekKey = weekKeys.length >= 2 ? weekKeys[weekKeys.length - 2] : null;
    } else {
      // Zelfde week vorig jaar
      const parts = lastWeekKey.split('-W');
      const prevYearKey = `${parseInt(parts[0]) - 1}-W${parts[1]}`;
      prevWeekKey = weekKeys.includes(prevYearKey) ? prevYearKey : null;
    }
    if (!prevWeekKey) return null;

    const calcWeek = (key) => {
      const rows = allRows.filter(r => r._weekKey === key);
      let omzet = 0;
      rows.forEach(r => {
        const stops = Number(r['Aantal afgeleverd - stops']) || 0;
        const stuks = Number(r['Aantal afgeleverd - stuks']) || 0;
        const isMonday = r._dayOfWeek === 1;
        const stopPrice = isMonday
          ? (articlePrices?.['Aantal afgeleverd - Stops Maandagtarief'] || articlePrices?.['ART-004'] || 0)
          : (articlePrices?.['Aantal afgeleverd - Stops'] || articlePrices?.['ART-001'] || 0);
        const stuksPrice = articlePrices?.['Aantal afgeleverd - Stuks'] || articlePrices?.['ART-002'] || 0;
        omzet += (stops * stopPrice) + (stuks * stuksPrice);
      });
      const totalStops = rows.reduce((s, r) => s + (Number(r['Aantal afgeleverd - stops']) || 0), 0);
      const besteltijdArr = rows.map(r => parseTimeToHours(r['Besteltijd Netto'])).filter(v => v > 0);
      const gemBesteltijd = besteltijdArr.length > 0 ? besteltijdArr.reduce((s, v) => s + v, 0) / besteltijdArr.length : 0;
      return { ritten: rows.length, stops: totalStops, omzet, gemBesteltijd };
    };

    const current = calcWeek(lastWeekKey);
    const prev = calcWeek(prevWeekKey);
    const pct = (c, p) => p > 0 ? ((c - p) / p) * 100 : 0;

    return {
      currentLabel: `W${lastWeekKey.split('-W')[1]} '${lastWeekKey.split('-W')[0].slice(2)}`,
      prevLabel: `W${prevWeekKey.split('-W')[1]} '${prevWeekKey.split('-W')[0].slice(2)}`,
      current,
      prev,
      rittenChange: pct(current.ritten, prev.ritten),
      stopsChange: pct(current.stops, prev.stops),
      omzetChange: pct(current.omzet, prev.omzet),
      besteltijdChange: pct(current.gemBesteltijd, prev.gemBesteltijd),
    };
  }, [allRows, weekKeys, compareMode, articlePrices]);

  // KPIs
  const kpis = useMemo(() => {
    if (allRows.length === 0) return null;
    const lastWeekKey = weekKeys[weekKeys.length - 1];
    const lastWeekRows = allRows.filter(r => r._weekKey === lastWeekKey);
    let omzet = 0;
    lastWeekRows.forEach(r => {
      const stops = Number(r['Aantal afgeleverd - stops']) || 0;
      const stuks = Number(r['Aantal afgeleverd - stuks']) || 0;
      const isMonday = r._dayOfWeek === 1;
      const stopPrice = isMonday
        ? (articlePrices?.['Aantal afgeleverd - Stops Maandagtarief'] || articlePrices?.['ART-004'] || 0)
        : (articlePrices?.['Aantal afgeleverd - Stops'] || articlePrices?.['ART-001'] || 0);
      const stuksPrice = articlePrices?.['Aantal afgeleverd - Stuks'] || articlePrices?.['ART-002'] || 0;
      omzet += (stops * stopPrice) + (stuks * stuksPrice);
    });
    const totalStops = lastWeekRows.reduce((s, r) => s + (Number(r['Aantal afgeleverd - stops']) || 0), 0);
    const besteltijdArr = lastWeekRows.map(r => parseTimeToHours(r['Besteltijd Netto'])).filter(v => v > 0);
    const gemBesteltijd = besteltijdArr.length > 0 ? besteltijdArr.reduce((s, v) => s + v, 0) / besteltijdArr.length : 0;
    const chauffeurs = new Set(lastWeekRows.map(r => r['Chauffeur']).filter(Boolean));

    return {
      weekLabel: `W${lastWeekKey?.split('-W')[1] || '?'}`,
      ritten: lastWeekRows.length,
      stops: totalStops,
      omzet,
      gemBesteltijd,
      chauffeurs: chauffeurs.size,
      omzetTrend: comparison?.omzetChange,
      rittenTrend: comparison?.rittenChange,
    };
  }, [allRows, weekKeys, articlePrices, comparison]);

  if (allRows.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">Geen data beschikbaar voor het dashboard.</p>
        <p className="text-xs mt-1">Importeer eerst data via het Imports tabblad.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title={`Ritten ${kpis.weekLabel}`} value={kpis.ritten} subtitle={`${kpis.chauffeurs} chauffeurs`} icon={Truck} trend={kpis.rittenTrend} trendLabel="vs vorige week" color="blue" />
          <StatCard title={`Stops ${kpis.weekLabel}`} value={kpis.stops.toLocaleString()} subtitle={`${kpis.ritten > 0 ? Math.round(kpis.stops / kpis.ritten) : 0} gem/rit`} icon={Users} trend={comparison?.stopsChange} trendLabel="vs vorige week" color="green" />
          <StatCard title={`Omzet ${kpis.weekLabel}`} value={`€${kpis.omzet.toFixed(0)}`} subtitle={kpis.ritten > 0 ? `€${(kpis.omzet / kpis.ritten).toFixed(0)} gem/rit` : '-'} icon={DollarSign} trend={kpis.omzetTrend} trendLabel="vs vorige week" color="orange" />
          <StatCard title={`Gem. besteltijd ${kpis.weekLabel}`} value={fmtTime(kpis.gemBesteltijd)} subtitle="netto per rit" icon={Clock} trend={comparison?.besteltijdChange} trendLabel="vs vorige week" color="purple" />
        </div>
      )}

      {/* Omzetontwikkeling per week */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Omzetontwikkeling per week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={omzetPerWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} label={{ value: 'Week', position: 'insideBottomRight', offset: -5, fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => `€${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val, name) => [name === 'omzet' ? `€${val.toFixed(2)}` : val, name === 'omzet' ? 'Omzet' : name === 'ritten' ? 'Ritten' : name]} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="omzet" fill="#dbeafe" stroke="#3b82f6" fillOpacity={0.3} name="Omzet" />
                <Line yAxisId="right" type="monotone" dataKey="ritten" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Ritten" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gemiddelde besteltijd per week */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Gem. besteltijd per week (minuten)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={besteltijdPerWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val, name) => [`${val} min`, name === 'gemNorm' ? 'Norm' : name === 'gemBruto' ? 'Bruto' : 'Netto']} />
                  <Legend />
                  <Line type="monotone" dataKey="gemNorm" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Norm" />
                  <Line type="monotone" dataKey="gemBruto" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} name="Bruto" />
                  <Line type="monotone" dataKey="gemNetto" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="Netto" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Ritten per dag */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Verdeling per weekdag (totaal)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rittenPerDag}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="ritten" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ritten" />
                  <Bar yAxisId="right" dataKey="gemStops" fill="#10b981" radius={[4, 4, 0, 0]} name="Gem. stops/rit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ritten per chauffeur */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Ritten per chauffeur (top 15)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rittenPerChauffeur} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="chauffeur" type="category" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(val, name) => [val, name === 'ritten' ? 'Ritten' : 'Gem. stops/rit']} />
                <Legend />
                <Bar dataKey="ritten" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Ritten" />
                <Bar dataKey="gemStops" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Gem. stops/rit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Periodenvergelijking */}
      {comparison && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Periodenvergelijking</CardTitle>
              <Select value={compareMode} onValueChange={setCompareMode}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vorige_week">vs Vorige week</SelectItem>
                  <SelectItem value="vorig_jaar">vs Zelfde week vorig jaar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Ritten', current: comparison.current.ritten, prev: comparison.prev.ritten, change: comparison.rittenChange },
                { label: 'Stops', current: comparison.current.stops, prev: comparison.prev.stops, change: comparison.stopsChange },
                { label: 'Omzet', current: comparison.current.omzet, prev: comparison.prev.omzet, change: comparison.omzetChange, fmt: v => `€${v.toFixed(0)}` },
                { label: 'Gem. besteltijd', current: comparison.current.gemBesteltijd, prev: comparison.prev.gemBesteltijd, change: comparison.besteltijdChange, fmt: fmtTime },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 font-medium">{item.label}</p>
                  <div className="flex items-end gap-3 mt-2">
                    <div>
                      <p className="text-xs text-slate-400">{comparison.currentLabel}</p>
                      <p className="text-lg font-bold text-slate-900">{item.fmt ? item.fmt(item.current) : item.current}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{comparison.prevLabel}</p>
                      <p className="text-lg font-semibold text-slate-500">{item.fmt ? item.fmt(item.prev) : item.prev}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {item.change > 0 ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : item.change < 0 ? <TrendingDown className="w-3 h-3 text-red-600" /> : <Minus className="w-3 h-3 text-slate-400" />}
                    <Badge variant="outline" className={`text-xs ${item.change > 0 ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : item.change < 0 ? 'text-red-700 border-red-200 bg-red-50' : ''}`}>
                      {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}