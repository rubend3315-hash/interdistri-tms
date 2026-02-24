import React, { useState, useMemo, useCallback } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, getWeek, getYear, eachDayOfInterval, isSameWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle } from "lucide-react";
import WeekSelector from "../overview/WeekSelector";
import WeekCard from "../overview/WeekCard";

function buildWeeks(entries) {
  if (!entries.length) return [];

  const weekMap = new Map();

  for (const entry of entries) {
    if (!entry.date) continue;
    const d = new Date(entry.date + "T12:00:00");
    const wStart = startOfWeek(d, { weekStartsOn: 1 });
    const key = format(wStart, "yyyy-ww");

    if (!weekMap.has(key)) {
      const wEnd = endOfWeek(d, { weekStartsOn: 1 });
      const allDays = eachDayOfInterval({ start: wStart, end: wEnd });
      weekMap.set(key, {
        key,
        weekNumber: getWeek(d, { weekStartsOn: 1 }),
        year: getYear(d),
        weekStart: wStart,
        rangeLabel: `${format(wStart, "d MMM", { locale: nl })} – ${format(wEnd, "d MMM", { locale: nl })}`,
        days: allDays.map(day => ({
          date: format(day, "yyyy-MM-dd"),
          hours: 0,
        })),
      });
    }

    const week = weekMap.get(key);
    const dayIdx = week.days.findIndex(day => day.date === entry.date);
    if (dayIdx !== -1) {
      week.days[dayIdx].hours += (entry.total_hours || 0);
    }
  }

  return Array.from(weekMap.values()).sort((a, b) => b.weekStart - a.weekStart);
}

export default function MobileOverviewTab({ approvedEntries, loadingEntries }) {
  const weeks = useMemo(() => buildWeeks(approvedEntries), [approvedEntries]);
  const now = new Date();

  // Find index of current week in weeks array
  const currentWeekIdx = useMemo(() => {
    const idx = weeks.findIndex(w => isSameWeek(w.weekStart, now, { weekStartsOn: 1 }));
    return idx >= 0 ? idx : 0;
  }, [weeks, now]);

  const [focusIdx, setFocusIdx] = useState(0);
  const focusWeek = weeks[focusIdx] || null;

  const goPrev = useCallback(() => setFocusIdx(i => Math.min(i + 1, weeks.length - 1)), [weeks.length]);
  const goNext = useCallback(() => setFocusIdx(i => Math.max(i - 1, 0)), []);

  const handleSwipe = useCallback((dir) => {
    if (dir === "left") goPrev();
    if (dir === "right") goNext();
  }, [goPrev, goNext]);

  return (
    <div className="-mx-4">
      {/* Header */}
      <div className="px-4 pt-1 pb-1">
        <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          Goedgekeurde diensten
        </h2>
      </div>

      {loadingEntries ? (
        <div className="px-4 py-3 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : weeks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-[14px] text-slate-400 text-center">
            Nog geen goedgekeurde diensten
          </p>
        </div>
      ) : (
        <>
          {/* Week selector header */}
          {focusWeek && (
            <div className="px-4">
              <WeekSelector
                weekLabel={`Week ${focusWeek.weekNumber}`}
                rangeLabel={focusWeek.rangeLabel}
                isCurrentWeek={focusIdx === currentWeekIdx}
                onPrev={goPrev}
                onNext={goNext}
                onDragEnd={handleSwipe}
              />
            </div>
          )}

          {/* Week cards */}
          <div className="px-4 pb-4 space-y-3">
            {weeks.map((week, idx) => (
              <WeekCard
                key={week.key}
                week={week}
                isCurrentWeek={idx === currentWeekIdx}
                defaultOpen={idx === currentWeekIdx}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}