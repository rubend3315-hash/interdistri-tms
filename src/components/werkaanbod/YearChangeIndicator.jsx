import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Shows percentage change between current year and previous years.
 * Props:
 *  - data: parsed import data array
 *  - selectedYears: array of years (first = current)
 *  - metric: "stops" or "stuks"
 *  - filterWeek: optional week number to filter on (for daily view)
 */
export default function YearChangeIndicator({ data, selectedYears, metric, filterWeek }) {
  const changes = useMemo(() => {
    if (selectedYears.length < 2) return [];

    const getTotal = (year) => {
      let filtered = data.filter(d => d.year === year);
      if (filterWeek) filtered = filtered.filter(d => d.week === filterWeek);
      return filtered.reduce((sum, d) => sum + d[metric], 0);
    };

    const currentYear = selectedYears[0];
    const currentTotal = getTotal(currentYear);

    return selectedYears.slice(1).map(prevYear => {
      const prevTotal = getTotal(prevYear);
      const pctChange = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : null;
      return {
        currentYear,
        prevYear,
        currentTotal,
        prevTotal,
        pctChange,
      };
    });
  }, [data, selectedYears, metric, filterWeek]);

  if (changes.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap mb-2">
      {changes.map(({ currentYear, prevYear, currentTotal, prevTotal, pctChange }) => {
        if (pctChange === null || (currentTotal === 0 && prevTotal === 0)) return null;

        const isUp = pctChange > 0;
        const isDown = pctChange < 0;
        const isFlat = Math.abs(pctChange) < 0.5;

        return (
          <div
            key={`${currentYear}-${prevYear}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              isFlat
                ? "bg-slate-100 text-slate-600"
                : isUp
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {isFlat ? (
              <Minus className="w-3.5 h-3.5" />
            ) : isUp ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>
              {currentYear} vs {prevYear}:{" "}
              <strong>{isUp ? "+" : ""}{pctChange.toFixed(1)}%</strong>
            </span>
            <span className="text-[10px] opacity-70">
              ({currentTotal.toLocaleString('nl-NL')} vs {prevTotal.toLocaleString('nl-NL')})
            </span>
          </div>
        );
      })}
    </div>
  );
}