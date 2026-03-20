import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

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

export default function KmDieselPriceChart({ dieselData, dieselLoading, dieselError }) {
  if (dieselLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Prijsgegevens laden...</span>
        </CardContent>
      </Card>
    );
  }

  if (dieselError || !dieselData?.recent?.length) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-amber-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">Prijsgrafiek niet beschikbaar</span>
        </CardContent>
      </Card>
    );
  }

  // Recent prices are newest-first from API, reverse for chart (oldest left)
  const chartData = [...dieselData.recent].reverse();
  const latestPrice = dieselData.latest.price;
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length;

  // Trend: compare latest vs 7 days ago
  const weekAgoPrice = chartData.length >= 7 ? chartData[chartData.length - 7]?.price : null;
  const trend = weekAgoPrice ? latestPrice - weekAgoPrice : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Dieselprijs verloop
          <Badge variant="outline" className="text-[10px] font-normal">
            excl. BTW · TLN Brandstofmonitor
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
          <span>
            Actueel: <strong className="text-lg text-slate-900">€ {latestPrice.toFixed(4)}</strong>
          </span>
          {trend !== null && (
            <span className={`flex items-center gap-0.5 ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {trend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {trend > 0 ? '+' : ''}{trend.toFixed(4)} vs 7d geleden
            </span>
          )}
          <span>Gem: € {avgPrice.toFixed(4)}</span>
          <span>Min: € {minPrice.toFixed(4)}</span>
          <span>Max: € {maxPrice.toFixed(4)}</span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-52">
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
                tickFormatter={(d) => format(parseISO(d), 'd MMM')}
                interval="preserveStartEnd"
                minTickGap={40}
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
          Bron: TLN Brandstofmonitor · Laatste {chartData.length} dagen
        </p>
      </CardContent>
    </Card>
  );
}