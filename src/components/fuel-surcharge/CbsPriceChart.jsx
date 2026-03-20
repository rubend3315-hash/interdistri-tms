import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { nl } from "date-fns/locale";

const PERIODS = [
  { key: "30d", label: "30 dagen", days: 30 },
  { key: "90d", label: "3 maanden", days: 90 },
  { key: "6m", label: "6 maanden", days: 183 },
  { key: "1y", label: "1 jaar", days: 365 },
  { key: "all", label: "Alles", days: null },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-slate-900">{format(parseISO(d.date), "EEEE d MMM yyyy", { locale: nl })}</p>
      <p className="text-blue-700 font-bold mt-0.5">€ {d.price_incl_btw?.toFixed(3)} incl. BTW</p>
      <p className="text-slate-500 text-xs">€ {d.price_excl_btw?.toFixed(4)} excl. BTW</p>
    </div>
  );
};

export default function CbsPriceChart({ cbsPrices, loading }) {
  const [period, setPeriod] = useState("6m");

  const chartData = useMemo(() => {
    if (!cbsPrices?.length) return [];
    const sorted = [...cbsPrices].sort((a, b) => a.date.localeCompare(b.date));
    const config = PERIODS.find(p => p.key === period);
    if (!config?.days) return sorted;
    const cutoff = format(subDays(new Date(), config.days), 'yyyy-MM-dd');
    return sorted.filter(d => d.date >= cutoff);
  }, [cbsPrices, period]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>CBS prijsdata laden...</span>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-amber-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">Geen CBS prijsdata beschikbaar. Klik op "CBS Sync" om data op te halen.</span>
        </CardContent>
      </Card>
    );
  }

  const latestPrice = chartData[chartData.length - 1];
  const prices = chartData.map(d => d.price_incl_btw);
  const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length;

  // Trend: latest vs 7 days ago
  const weekAgoIdx = Math.max(0, chartData.length - 8);
  const weekAgoPrice = chartData[weekAgoIdx]?.price_incl_btw;
  const trend = weekAgoPrice ? latestPrice.price_incl_btw - weekAgoPrice : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            CBS Pompprijs diesel
            <Badge variant="outline" className="text-[10px] font-normal">incl. BTW · CBS/Travelcard</Badge>
          </CardTitle>
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <Button key={p.key} variant={period === p.key ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setPeriod(p.key)}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
          <span>
            Laatste: <strong className="text-lg text-slate-900">€ {latestPrice.price_incl_btw?.toFixed(3)}</strong>
            <span className="text-slate-400 ml-1">(excl. BTW: € {latestPrice.price_excl_btw?.toFixed(4)})</span>
          </span>
          {trend !== null && (
            <span className={`flex items-center gap-0.5 ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {trend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {trend > 0 ? '+' : ''}{trend.toFixed(3)} vs 7d
            </span>
          )}
          <span>Gem: € {avgPrice.toFixed(3)}</span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="cbsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(d) => format(parseISO(d), period === "30d" ? "d MMM" : "MMM yyyy")}
                interval="preserveStartEnd" minTickGap={50} />
              <YAxis domain={[(min) => Math.floor(min * 100) / 100 - 0.05, (max) => Math.ceil(max * 100) / 100 + 0.05]}
                tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `€${v.toFixed(2)}`} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={avgPrice} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1} />
              <Area type="monotone" dataKey="price_incl_btw" stroke="#3b82f6" strokeWidth={2} fill="url(#cbsGradient)"
                dot={false} activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-slate-400 text-right mt-1">
          Bron: CBS Open Data (80416ENG) · {chartData.length} datapunten
        </p>
      </CardContent>
    </Card>
  );
}