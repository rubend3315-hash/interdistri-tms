import React from "react";
import { startOfISOWeek, addDays, addWeeks, subWeeks, format, getISOWeek, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export default function WeekHeader({ selectedDate, onSelectDate }) {
  const selected = new Date(selectedDate);
  const weekStart = startOfISOWeek(selected);
  const weekNumber = getISOWeek(selected);
  const year = selected.getFullYear();

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const goToPrevWeek = () => onSelectDate(format(subWeeks(selected, 1), 'yyyy-MM-dd'));
  const goToNextWeek = () => onSelectDate(format(addWeeks(selected, 1), 'yyyy-MM-dd'));

  return (
    <div className="bg-white border-b border-slate-100 px-4 py-2">
      {/* Week nav row */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button" onClick={goToPrevWeek}
          className="p-1.5 -ml-1.5 rounded-lg active:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <span className="text-[13px] font-semibold text-slate-900">
          Week {weekNumber}, {year}
        </span>
        <button
          type="button" onClick={goToNextWeek}
          className="p-1.5 -mr-1.5 rounded-lg active:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Day selector */}
      <div className="flex gap-1">
        {days.map((day, i) => {
          const isSelected = isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(format(day, 'yyyy-MM-dd'))}
              className={cn(
                "flex-1 flex flex-col items-center py-1.5 rounded-lg transition-colors",
                isSelected ? "bg-blue-600 text-white" :
                isToday ? "bg-blue-50 text-blue-700" :
                "text-slate-600 active:bg-slate-50"
              )}
            >
              <span className="text-[10px] font-medium leading-tight">{DAY_LABELS[i]}</span>
              <span className={cn(
                "text-[14px] font-semibold leading-tight mt-0.5",
                isSelected ? "text-white" : isToday ? "text-blue-700" : "text-slate-900"
              )}>
                {format(day, 'd')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}