import React, { useState } from "react";
import { format, isToday } from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

function formatHours(h) {
  if (!h || h === 0) return "0u";
  const rounded = Math.round(h * 10) / 10;
  return rounded % 1 === 0 ? `${Math.round(rounded)}u` : `${rounded}u`;
}

function DotBar({ days }) {
  return (
    <div className="flex gap-1.5 mt-2">
      {DAY_LABELS.map((label, i) => {
        const day = days[i];
        return (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              day?.hours > 0 ? "bg-blue-500" : "bg-slate-200"
            )}
            title={`${label}: ${day?.hours ? formatHours(day.hours) : "—"}`}
          />
        );
      })}
    </div>
  );
}

export default function WeekCard({ week, isCurrentWeek, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const totalHours = week.days.reduce((sum, d) => sum + (d.hours || 0), 0);

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden transition-colors",
        isCurrentWeek
          ? "bg-blue-50/60 border border-blue-100"
          : "bg-white border border-slate-100"
      )}
    >
      {/* Card header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-semibold text-slate-900">
              Week {week.weekNumber}
            </span>
            {isCurrentWeek && (
              <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Deze week
              </span>
            )}
          </div>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {week.rangeLabel}
          </p>
          <DotBar days={week.days} />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className="text-[22px] font-bold text-slate-900 tabular-nums">
            {formatHours(totalHours)}
          </span>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5 text-slate-400" />
          </motion.div>
        </div>
      </button>

      {/* Days accordion */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}