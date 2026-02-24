import React, { useState, useMemo, useCallback, useEffect } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, getWeek, getYear, eachDayOfInterval, isSameWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle } from "lucide-react";
import WeekSelector from "../overview/WeekSelector";
import WeekCard from "../overview/WeekCard";

const WEEKS_BACK = 12;
const WEEKS_FORWARD = 4;
const STORAGE_KEY = "mobile_active_week_key";

/** Build a fixed calendar timeline of weeks (-12 to +4 from now), with entry data merged in. */
function buildTimeline(entries) {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });

  // Index entry hours by date for fast lookup
  const hoursByDate = new Map();
  for (const entry of entries) {
    if (!entry.date) continue;
    hoursByDate.set(entry.date, (hoursByDate.get(entry.date) || 0) + (entry.total_hours || 0));
  }

  const timeline = [];
  for (let offset = -WEEKS_BACK; offset <= WEEKS_FORWARD; offset++) {
    const wStart = addWeeks(thisWeekStart, offset);
    const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: wStart, end: wEnd });
    const days = allDays.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      return { date: dateStr, hours: hoursByDate.get(dateStr) || 0 };
    });
    const totalHours = days.reduce((s, d) => s + d.hours, 0);

    timeline.push({
      key: format(wStart, "yyyy-ww"),
      weekNumber: getWeek(wStart, { weekStartsOn: 1 }),
      year: getYear(wStart),
      weekStart: wStart,
      rangeLabel: `${format(wStart, "d MMM", { locale: nl })} – ${format(wEnd, "d MMM", { locale: nl })}`,
      days,
      totalHours,
    });
  }

  // Sorted newest first (consistent with previous behavior)
  return timeline.reverse();
}

export default function MobileOverviewTab({ approvedEntries, loadingEntries }) {
  const timeline = useMemo(() => buildTimeline(approvedEntries), [approvedEntries]);
  const now = new Date();

  // Current calendar week key (always exists in timeline)
  const currentWeekKey = useMemo(() => {
    const w = timeline.find(w => isSameWeek(w.weekStart, now, { weekStartsOn: 1 }));
    return w?.key || timeline[0]?.key;
  }, [timeline, now]);

  // Single source of truth: activeWeekKey
  const [activeWeekKey, setActiveWeekKey] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || null;
  });

  // On mount / timeline change: validate stored key, fallback to current week
  useEffect(() => {
    if (timeline.length === 0) return;
    const exists = timeline.some(w => w.key === activeWeekKey);
    if (!exists) {
      setActiveWeekKey(currentWeekKey);
    }
  }, [timeline, activeWeekKey, currentWeekKey]);

  // Persist to localStorage
  useEffect(() => {
    if (activeWeekKey) {
      localStorage.setItem(STORAGE_KEY, activeWeekKey);
    }
  }, [activeWeekKey]);

  // Derived
  const activeIdx = useMemo(() => {
    const idx = timeline.findIndex(w => w.key === activeWeekKey);
    return idx >= 0 ? idx : 0;
  }, [timeline, activeWeekKey]);
  const activeWeek = timeline[activeIdx] || null;

  // Older = higher index (timeline is newest-first)
  const goPrev = useCallback(() => {
    const newIdx = Math.min(activeIdx + 1, timeline.length - 1);
    setActiveWeekKey(timeline[newIdx].key);
  }, [activeIdx, timeline]);

  const goNext = useCallback(() => {
    const newIdx = Math.max(activeIdx - 1, 0);
    setActiveWeekKey(timeline[newIdx].key);
  }, [activeIdx, timeline]);

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
          {activeWeek && (
            <div className="px-4">
              <WeekSelector
                weekLabel={`Week ${activeWeek.weekNumber}`}
                rangeLabel={activeWeek.rangeLabel}
                isCurrentWeek={activeWeekKey === currentWeekKey}
                onPrev={goPrev}
                onNext={goNext}
                onDragEnd={handleSwipe}
              />
            </div>
          )}

          {/* Week cards */}
          <div className="px-4 pb-4 space-y-3">
            {weeks.map((week) => (
              <WeekCard
                key={week.key}
                week={week}
                isCurrentWeek={week.key === currentWeekKey}
                defaultOpen={week.key === activeWeekKey}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}