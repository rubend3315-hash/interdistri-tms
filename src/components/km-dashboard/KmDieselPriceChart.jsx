import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { format, parseISO, subDays, subMonths, subYears } from "date-fns";
import { nl } from "date-fns/locale";

const PERIODS = [
  { key: "7d", label: "7 dagen", days: 7 },
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
      <p className="font-medium text-slate-900">
        {format(parseISO(d.date), "EEEE d MMM yyyy", { locale: nl })}
      </p>
      <p className="text-amber-700 font-bold mt-0.5">
        € {d.price.toFixed(4)} / liter
      </p>
    </div>
  );
};

export default function KmDieselPriceChart({ allPrices, pricesLoading }) {
  const [period, setPeriod] = useState("6m");

  const chartData = useMemo(() => {
    if (!allPrices?.length) return [];
    const sorted = [...allPrices].sort((a, b) => a.date.localeCompare(b.date));
    const config = PERIODS.find(p => p.key === period);
    if (!config?.days) return sorted;
    const cutoff = format(subDays(new Date(), config.days), 'yyyy-MM-dd');
    return sorted.filter(d => d.date >= cutoff);
  }, [allPrices, period]);

  if (pricesLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Prijsgegevens laden...</span>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-amber-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">Geen prijsdata beschikbaar</span>
        </CardContent>
      </Card>
    );
  }

  const latestPrice = chartData[chartData.length - 1]?.price || 0;
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length;

  // Trend: latest vs 7 days ago
  const weekAgoIdx = Math.max(0, chartData.length - 8);
  const weekAgoPrice = chartData[weekAgoIdx]?.price;
  const trend = weekAgoPrice ? latestPrice - weekAgoPrice : null;

  // Determine tick format based on period
  const tickFormat = (d) => {
    if (period === "7d") return format(parseISO(d), "d MMM");
    if (period === "30d") return format(parseISO(d), "d MMM");
    if (period === "90d") return format(parseISO(d), "d MMM");
    return format(parseISO(d), "MMM yyyy");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            Dieselprijs verloop
            <Badge variant="outline" className="text-[10px] font-normal">
              excl. BTW · TLN Brandstofmonitor
            </Badge>
          </CardTitle>
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <Button
                key={p.key}
                variant={period === p.key ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
          <span>
            Actueel: <strong className="text-lg text-slate-900">€ {latestPrice.toFixed(4)}</strong>
          </span>
          {trend !== null && (
            <span className={`flex items-center gap-0.5 ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {trend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {trend > 0 ? '+' : ''}{trend.toFixed(4)} vs 7d
            </span>
          )}
          <span>Gem: € {avgPrice.toFixed(4)}</span>
          <span>Min: € {minPrice.toFixed(4)}</span>
          <span>Max: € {maxPrice.toFixed(4)}</span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="dieselGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={tickFormat}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                domain={[
                  (min) => Math.floor(min * 100) / 100 - 0.02,
                  (max) => Math.ceil(max * 100) / 100 + 0.02,
                ]}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(v) => `€${v.toFixed(2)}`}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={avgPrice}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#dieselGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-slate-400 text-right mt-1">
          Bron: TLN Brandstofmonitor · {chartData.length} datapunten
        </p>
      </CardContent>
    </Card>
  );
}