import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, getWeek, getYear, eachDayOfInterval, isSameWeek, isPast } from "date-fns";
import { nl } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle } from "lucide-react";
import WeekNavigator from "../overview/WeekNavigator";
import WeekDetail from "../overview/WeekDetail";

const WEEKS_BACK = 7;
const WEEKS_FORWARD = 1;
const STORAGE_KEY = "mobile_active_week_idx";

function buildTimeline(entries) {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });

  const hoursByDate = new Map();
  for (const entry of entries) {
    if (!entry.date) continue;
    hoursByDate.set(entry.date, (hoursByDate.get(entry.date) || 0) + (entry.total_hours || 0));
  }

  const timeline = [];
  for (let offset = -WEEKS_BACK; offset <= WEEKS_FORWARD; offset++) {
    const wStart = addWeeks(thisWeekStart, offset);
    const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: wStart, end: wEnd }).map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      return { date: dateStr, hours: hoursByDate.get(dateStr) || 0 };
    });
    const totalHours = days.reduce((s, d) => s + d.hours, 0);
    const isCurrent = isSameWeek(wStart, now, { weekStartsOn: 1 });
    const weekIsPast = !isCurrent && isPast(wEnd);

    timeline.push({
      weekNumber: getWeek(wStart, { weekStartsOn: 1 }),
      year: getYear(wStart),
      weekStart: wStart,
      rangeLabel: `${format(wStart, "d MMM", { locale: nl })} – ${format(wEnd, "d MMM", { locale: nl })}`,
      days,
      totalHours,
      isCurrent,
      isPast: weekIsPast,
    });
  }

  return timeline; // oldest first, index 0 = oldest
}

function getWeekNorm(employee) {
  const regels = employee?.contractregels;
  if (!Array.isArray(regels) || regels.length === 0) return 40;
  const actief = regels.find(r => r.status === "Actief");
  const regel = actief || regels[regels.length - 1];
  return regel?.uren_per_week || employee?.contract_hours || 40;
}

export default function MobileOverviewTab({ approvedEntries, loadingEntries }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: currentEmployee } = useQuery({
    queryKey: ['overviewEmployee', user?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: user.email });
      return emps[0] ?? null;
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const timeline = useMemo(() => buildTimeline(approvedEntries), [approvedEntries]);
  const weekNorm = useMemo(() => getWeekNorm(currentEmployee), [currentEmployee]);

  const currentIdx = useMemo(() => {
    const idx = timeline.findIndex(w => w.isCurrent);
    return idx >= 0 ? idx : timeline.length - 1;
  }, [timeline]);

  // Restore from localStorage or default to current week
  const [activeIdx, setActiveIdx] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const n = parseInt(stored, 10);
      if (!isNaN(n) && n >= 0 && n < (WEEKS_BACK + WEEKS_FORWARD + 1)) return n;
    }
    return WEEKS_BACK; // current week offset
  });

  // Clamp if timeline changes
  useEffect(() => {
    if (activeIdx >= timeline.length) setActiveIdx(timeline.length - 1);
  }, [timeline.length, activeIdx]);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(activeIdx));
  }, [activeIdx]);

  const activeWeek = timeline[activeIdx] || null;

  const goPrev = useCallback(() => {
    setActiveIdx(i => Math.max(i - 1, 0));
  }, []);

  const goNext = useCallback(() => {
    setActiveIdx(i => Math.min(i + 1, timeline.length - 1));
  }, [timeline.length]);

  // Touch swipe
  const touchRef = useRef(null);
  const onTouchStart = useCallback((e) => {
    touchRef.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback((e) => {
    if (touchRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchRef.current;
    touchRef.current = null;
    if (diff > 40) goPrev();
    else if (diff < -40) goNext();
  }, [goPrev, goNext]);

  return (
    <div className="-mx-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Section header */}
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
      ) : activeWeek ? (
        <div className="px-4 pb-4">
          <WeekNavigator
            weekNumber={activeWeek.weekNumber}
            rangeLabel={activeWeek.rangeLabel}
            isCurrent={activeWeek.isCurrent}
            hasPrev={activeIdx > 0}
            hasNext={activeIdx < timeline.length - 1}
            onPrev={goPrev}
            onNext={goNext}
          />
          <WeekDetail
            week={activeWeek}
            norm={weekNorm}
          />
        </div>
      ) : null}
    </div>
  );
}