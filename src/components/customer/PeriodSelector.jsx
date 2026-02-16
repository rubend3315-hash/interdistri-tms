import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { format, startOfWeek, endOfWeek, getISOWeek, getYear, parseISO, addWeeks, subWeeks } from "date-fns";
import { nl } from "date-fns/locale";

export default function PeriodSelector({ onPeriodChange, invoices = [] }) {
  const [mode, setMode] = useState("week"); // "week" or "free"
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activePeriod, setActivePeriod] = useState(null);

  // Derive available weeks from invoices
  const availableWeeks = useMemo(() => {
    const weeks = new Set();
    invoices.forEach(inv => {
      if (inv.description_period) {
        // Try to extract week info like "2026-07" => year 2026 week 07
        const match = inv.description_period.match(/(\d{4})-(\d{1,2})/);
        if (match) {
          weeks.add(`${match[1]}-W${match[2].padStart(2, "0")}`);
        }
      }
    });
    return Array.from(weeks).sort().reverse();
  }, [invoices]);

  const handleWeekSelect = () => {
    const d = parseISO(selectedDate);
    const ws = startOfWeek(d, { weekStartsOn: 1 });
    const we = endOfWeek(d, { weekStartsOn: 1 });
    const weekNum = getISOWeek(d);
    const year = getYear(ws);
    const period = {
      startDate: format(ws, "yyyy-MM-dd"),
      endDate: format(we, "yyyy-MM-dd"),
      label: `Week ${weekNum}, ${year}`,
      displayStart: format(ws, "dd-MM-yyyy"),
      displayEnd: format(we, "dd-MM-yyyy"),
    };
    setActivePeriod(period);
    onPeriodChange(period);
  };

  const handleWeekNav = (direction) => {
    const d = parseISO(selectedDate);
    const newDate = direction === "prev" ? subWeeks(d, 1) : addWeeks(d, 1);
    setSelectedDate(format(newDate, "yyyy-MM-dd"));
  };

  const handleFreeSelect = () => {
    if (!startDate || !endDate) return;
    const period = {
      startDate,
      endDate,
      label: "Vrije periode",
      displayStart: format(parseISO(startDate), "dd-MM-yyyy"),
      displayEnd: format(parseISO(endDate), "dd-MM-yyyy"),
    };
    setActivePeriod(period);
    onPeriodChange(period);
  };

  const handleClear = () => {
    setActivePeriod(null);
    onPeriodChange(null);
  };

  // Quick select a week from invoices
  const handleQuickWeek = (weekStr) => {
    const match = weekStr.match(/(\d{4})-W(\d{2})/);
    if (!match) return;
    const year = parseInt(match[1]);
    const week = parseInt(match[2]);
    // Calculate start of that week
    const jan4 = new Date(year, 0, 4);
    const ws = startOfWeek(jan4, { weekStartsOn: 1 });
    const target = addWeeks(ws, week - 1);
    const we = endOfWeek(target, { weekStartsOn: 1 });
    const period = {
      startDate: format(target, "yyyy-MM-dd"),
      endDate: format(we, "yyyy-MM-dd"),
      label: `Week ${week}, ${year}`,
      displayStart: format(target, "dd-MM-yyyy"),
      displayEnd: format(we, "dd-MM-yyyy"),
    };
    setActivePeriod(period);
    onPeriodChange(period);
  };

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        {/* Mode toggle */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => setMode("week")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === "week" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Week selectie
              </button>
              <button
                onClick={() => setMode("free")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === "free" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Vrije periode
              </button>
            </div>

            {activePeriod && (
              <button onClick={handleClear} className="text-xs text-slate-400 hover:text-red-500 ml-2">
                Wis filter
              </button>
            )}
          </div>

          {/* Week mode */}
          {mode === "week" && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <button onClick={() => handleWeekNav("prev")} className="px-2 py-1.5 rounded border hover:bg-slate-50 text-sm">←</button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 font-medium">Datum:</span>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-44 h-9"
                  />
                </div>
                <button onClick={() => handleWeekNav("next")} className="px-2 py-1.5 rounded border hover:bg-slate-50 text-sm">→</button>
              </div>
              <Button onClick={handleWeekSelect} className="bg-amber-500 hover:bg-amber-600 text-white h-9">
                Uitvoeren
              </Button>

              {activePeriod && (
                <span className="text-sm text-slate-500">
                  Periode: {activePeriod.displayStart} t/m {activePeriod.displayEnd}
                </span>
              )}

              {/* Quick week badges from invoices */}
              {availableWeeks.length > 0 && (
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-xs text-slate-400">Snel:</span>
                  {availableWeeks.slice(0, 6).map(w => (
                    <Badge
                      key={w}
                      variant="outline"
                      className="cursor-pointer hover:bg-blue-50 text-xs"
                      onClick={() => handleQuickWeek(w)}
                    >
                      {w}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Free period mode */}
          {mode === "free" && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 font-medium">Startdatum:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-44 h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 font-medium">Einddatum:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-44 h-9"
                />
              </div>
              <Button
                onClick={handleFreeSelect}
                disabled={!startDate || !endDate}
                className="bg-amber-500 hover:bg-amber-600 text-white h-9"
              >
                Uitvoeren
              </Button>

              {activePeriod && (
                <span className="text-sm text-slate-500">
                  Periode: {activePeriod.displayStart} t/m {activePeriod.displayEnd}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}