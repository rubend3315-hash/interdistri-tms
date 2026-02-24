import React from "react";
import { format, isToday } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

function formatHours(h) {
  if (!h || h === 0) return "0u";
  const rounded = Math.round(h * 10) / 10;
  return rounded % 1 === 0 ? `${Math.round(rounded)}u` : `${rounded}u`;
}

export default function WeekCard({ week, isCurrentWeek }) {
  const totalHours = week.days.reduce((sum, d) => sum + (d.hours || 0), 0);

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden",
        isCurrentWeek
          ? "bg-blue-50/60 border border-blue-100"
          : "bg-white border border-slate-100"
      )}
    >
      {/* Summary header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[13px] text-slate-500">Totaal</span>
        <span className="text-[22px] font-bold text-slate-900 tabular-nums">
          {formatHours(totalHours)}
        </span>
      </div>

      {/* Day rows */}
      <div className="px-4 pb-3">
        <div className="border-t border-slate-200/60 pt-2">
          {week.days.map((day, i) => {
            const isCurrentDay = day.date && isToday(new Date(day.date));
            const hasHours = day.hours > 0;

            return (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between py-2",
                  i < week.days.length - 1 && "border-b border-slate-100/80"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {isCurrentDay && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                  <div className={cn(!isCurrentDay && "ml-4")}>
                    <span className={cn(
                      "text-[15px] font-semibold",
                      hasHours ? "text-slate-900" : "text-slate-400"
                    )}>
                      {DAY_LABELS[i]}
                    </span>
                    {day.date && (
                      <span className={cn(
                        "text-[13px] ml-1.5",
                        hasHours ? "text-slate-500" : "text-slate-300"
                      )}>
                        {format(new Date(day.date), "d MMM", { locale: nl })}
                      </span>
                    )}
                  </div>
                </div>

                <span className={cn(
                  "text-[16px] font-bold tabular-nums",
                  hasHours ? "text-slate-900" : "text-slate-300"
                )}>
                  {hasHours ? formatHours(day.hours) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}