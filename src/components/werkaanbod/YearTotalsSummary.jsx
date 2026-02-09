import React, { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, MapPin, Package, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function YearTotalsSummary({ data, selectedYears }) {
  // Date range filter state (MM-DD format, applied across all years)
  const [startMMDD, setStartMMDD] = useState("01-01");
  const [endMMDD, setEndMMDD] = useState("12-31");

  // Filter data based on selected date range (month-day only)
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const mm = String(d.date.getMonth() + 1).padStart(2, '0');
      const dd = String(d.date.getDate()).padStart(2, '0');
      const mmdd = `${mm}-${dd}`;
      return mmdd >= startMMDD && mmdd <= endMMDD;
    });
  }, [data, startMMDD, endMMDD]);

  const yearTotals = useMemo(() => {
    const totals = {};
    filteredData.forEach(d => {
      if (!totals[d.year]) totals[d.year] = { stops: 0, stuks: 0 };
      totals[d.year].stops += d.stops;
      totals[d.year].stuks += d.stuks;
    });
    return totals;
  }, [filteredData]);

  // Helper to convert MM-DD to readable date
  const formatMMDD = (mmdd) => {
    const [mm, dd] = mmdd.split('-');
    const months = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
    return `${parseInt(dd)} ${months[parseInt(mm) - 1]}`;
  };

  // Calculate year-over-year changes for each consecutive pair
  const comparisons = useMemo(() => {
    if (selectedYears.length < 2) return [];
    const sorted = [...selectedYears].sort((a, b) => b - a);
    const results = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const prev = sorted[i + 1];
      const ct = yearTotals[current] || { stops: 0, stuks: 0 };
      const pt = yearTotals[prev] || { stops: 0, stuks: 0 };
      const stopsPct = pt.stops > 0 ? ((ct.stops - pt.stops) / pt.stops) * 100 : null;
      const stuksPct = pt.stuks > 0 ? ((ct.stuks - pt.stuks) / pt.stuks) * 100 : null;
      results.push({ current, prev, ct, pt, stopsPct, stuksPct });
    }
    return results;
  }, [selectedYears, yearTotals]);

  const renderChange = (pct) => {
    if (pct === null) return <span className="text-slate-400 text-xs">n.v.t.</span>;
    const isUp = pct > 0;
    const isDown = pct < 0;
    const isFlat = Math.abs(pct) < 0.5;
    return (
      <span className={`inline-flex items-center gap-1 text-sm font-semibold ${
        isFlat ? "text-slate-500" : isUp ? "text-emerald-600" : "text-red-600"
      }`}>
        {isFlat ? <Minus className="w-3.5 h-3.5" /> : isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {isUp ? "+" : ""}{pct.toFixed(1)}%
      </span>
    );
  };

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jaartotalen & Ontwikkeling</p>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-slate-500 whitespace-nowrap">Van</Label>
                <Input
                  type="date"
                  value={`2000-${startMMDD}`}
                  onChange={e => {
                    const v = e.target.value;
                    if (v) setStartMMDD(v.slice(5));
                  }}
                  className="h-7 w-36 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-slate-500 whitespace-nowrap">t/m</Label>
                <Input
                  type="date"
                  value={`2000-${endMMDD}`}
                  onChange={e => {
                    const v = e.target.value;
                    if (v) setEndMMDD(v.slice(5));
                  }}
                  className="h-7 w-36 text-xs"
                />
              </div>
            </div>
            {(startMMDD !== "01-01" || endMMDD !== "12-31") && (
              <span className="text-xs text-blue-600 font-medium">
                Periode: {formatMMDD(startMMDD)} – {formatMMDD(endMMDD)}
              </span>
            )}
          </div>
        </div>
        
        {/* Year totals table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500">Jaar</th>
                <th className="text-right py-2 px-4 text-xs font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-blue-600" /> Stops</span>
                </th>
                <th className="text-right py-2 px-4 text-xs font-medium text-slate-500">Δ Stops</th>
                <th className="text-right py-2 px-4 text-xs font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1"><Package className="w-3 h-3 text-emerald-600" /> Stuks</span>
                </th>
                <th className="text-right py-2 pl-4 text-xs font-medium text-slate-500">Δ Stuks</th>
              </tr>
            </thead>
            <tbody>
              {[...selectedYears].sort((a, b) => b - a).map((year, idx) => {
                const t = yearTotals[year] || { stops: 0, stuks: 0 };
                const comp = comparisons.find(c => c.current === year);
                return (
                  <tr key={year} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold text-slate-800">{year}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-900 tabular-nums">
                      {t.stops.toLocaleString('nl-NL')}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {comp ? renderChange(comp.stopsPct) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-900 tabular-nums">
                      {t.stuks.toLocaleString('nl-NL')}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      {comp ? renderChange(comp.stuksPct) : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Comparison summary badges */}
        {comparisons.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
            {comparisons.map(({ current, prev, ct, pt, stopsPct, stuksPct }) => (
              <div key={`${current}-${prev}`} className="flex flex-col gap-1 bg-slate-50 rounded-lg px-3 py-2 text-xs">
                <span className="font-semibold text-slate-700">{current} vs {prev}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">Stops: {renderChange(stopsPct)}</span>
                  <span className="text-slate-500">Stuks: {renderChange(stuksPct)}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Stops: {ct.stops.toLocaleString('nl-NL')} vs {pt.stops.toLocaleString('nl-NL')} · Stuks: {ct.stuks.toLocaleString('nl-NL')} vs {pt.stuks.toLocaleString('nl-NL')}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}