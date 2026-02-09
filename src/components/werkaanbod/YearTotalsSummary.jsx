import React, { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, MapPin, Package, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const MONTHS = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maart" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Augustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function YearTotalsSummary({ data, selectedYears }) {
  const [startMonth, setStartMonth] = useState("01");
  const [endMonth, setEndMonth] = useState("12");

  // Filter data based on selected month range
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const mm = String(d.date.getMonth() + 1).padStart(2, '0');
      return mm >= startMonth && mm <= endMonth;
    });
  }, [data, startMonth, endMonth]);

  const yearTotals = useMemo(() => {
    const totals = {};
    filteredData.forEach(d => {
      if (!totals[d.year]) totals[d.year] = { stops: 0, stuks: 0 };
      totals[d.year].stops += d.stops;
      totals[d.year].stuks += d.stuks;
    });
    return totals;
  }, [filteredData]);

  const getMonthLabel = (mm) => MONTHS.find(m => m.value === mm)?.label || mm;
  const isFiltered = startMonth !== "01" || endMonth !== "12";

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
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <Label className="text-xs text-slate-500 whitespace-nowrap">Van</Label>
              <Select value={startMonth} onValueChange={setStartMonth}>
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-xs text-slate-500 whitespace-nowrap">t/m</Label>
              <Select value={endMonth} onValueChange={setEndMonth}>
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isFiltered && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600 font-medium">
                  Periode: {getMonthLabel(startMonth)} – {getMonthLabel(endMonth)}
                </span>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400 px-2" onClick={() => { setStartMonth("01"); setEndMonth("12"); }}>
                  Reset
                </Button>
              </div>
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