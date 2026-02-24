import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WeekNavigator({
  weekNumber,
  rangeLabel,
  isCurrent,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className={cn(
          "p-2 -ml-2 rounded-full transition-colors",
          hasPrev ? "active:bg-slate-100 text-slate-600" : "text-slate-200"
        )}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex flex-col items-center select-none">
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-semibold text-slate-900">
            Week {weekNumber}
          </span>
          {isCurrent && (
            <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              Nu
            </span>
          )}
        </div>
        <span className="text-[12px] text-slate-400 mt-0.5">{rangeLabel}</span>
      </div>

      <button
        onClick={onNext}
        disabled={!hasNext}
        className={cn(
          "p-2 -mr-2 rounded-full transition-colors",
          hasNext ? "active:bg-slate-100 text-slate-600" : "text-slate-200"
        )}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}