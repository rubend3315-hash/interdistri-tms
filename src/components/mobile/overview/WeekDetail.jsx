import React from "react";
import { format, isToday } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

function fmtH(h) {
  if (!h || h === 0) return "0,0000u";
  return new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(h) + "u";
}

function getNormStatus(totalHours, norm, isPastWeek) {
  const diff = Math.round((totalHours - norm) * 10) / 10;
  if (diff === 0) return { status: "exact", diff, color: "bg-emerald-500", text: "text-emerald-600", label: "Contracturen behaald" };
  if (diff > 0) return { status: "over", diff, color: "bg-orange-500", text: "text-orange-600", label: `+${fmtH(diff)} overwerk` };
  if (isPastWeek) return { status: "past_under", diff, color: "bg-red-500", text: "text-red-600", label: `${fmtH(Math.abs(diff))} onder contract` };
  return { status: "under", diff, color: "bg-blue-500", text: "text-blue-600", label: `${fmtH(Math.abs(diff))} onder contract` };
}

export default function WeekDetail({ week, norm }) {
  const { totalHours, days, isCurrent, isPast: weekIsPast } = week;
  const pct = Math.min((totalHours / norm) * 100, 100);
  const normInfo = getNormStatus(totalHours, norm, weekIsPast);

  return (
    <div className={cn(
      "rounded-2xl overflow-hidden",
      isCurrent ? "bg-blue-50/60 border border-blue-100" : "bg-white border border-slate-100"
    )}>
      {/* Progress section */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-end justify-between mb-2">
          <span className="text-[28px] font-bold text-slate-900 tabular-nums leading-none">
            {fmtH(totalHours)}
          </span>
          <span className="text-[12px] text-slate-400 mb-0.5">/ {norm}u norm</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-200 ease-in-out", normInfo.color)}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Status label */}
        <p className={cn("text-[12px] font-medium mt-1.5", normInfo.text)}>
          {normInfo.label}
        </p>
      </div>

      {/* Day rows */}
      <div className="px-4 pb-3">
        <div className="border-t border-slate-200/60 pt-1">
          {days.map((day, i) => {
            const isCurrentDay = day.date && isToday(new Date(day.date));
            const hasHours = day.hours > 0;

            return (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between py-2",
                  i < days.length - 1 && "border-b border-slate-100/80"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {isCurrentDay ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  ) : (
                    <div className="w-1.5 flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-[14px] font-medium w-6",
                    hasHours ? "text-slate-900" : "text-slate-400"
                  )}>
                    {DAY_LABELS[i]}
                  </span>
                  {day.date && (
                    <span className={cn(
                      "text-[12px]",
                      hasHours ? "text-slate-500" : "text-slate-300"
                    )}>
                      {format(new Date(day.date), "d MMM", { locale: nl })}
                    </span>
                  )}
                </div>

                <span className={cn(
                  "text-[15px] font-semibold tabular-nums",
                  hasHours ? "text-slate-900" : "text-slate-300"
                )}>
                  {hasHours ? fmtH(day.hours) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}