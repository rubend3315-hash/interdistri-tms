import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function WeekSelector({
  weekLabel,
  rangeLabel,
  isCurrentWeek,
  onPrev,
  onNext,
  onDragEnd,
}) {
  return (
    <motion.div
      className="flex items-center justify-between px-2 py-3"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragEnd={(e, info) => {
        if (info.offset.x < -60 && info.velocity.x < -200) onDragEnd?.("left");
        if (info.offset.x > 60 && info.velocity.x > 200) onDragEnd?.("right");
      }}
    >
      <button
        onClick={onPrev}
        className="p-2 -ml-2 rounded-full active:bg-slate-100 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-slate-500" />
      </button>

      <div className="flex items-center gap-2 select-none">
        <span className="text-[16px] font-semibold text-slate-900">
          {weekLabel}
        </span>
        <span className="text-[13px] text-slate-400">•</span>
        <span className="text-[13px] text-slate-500">{rangeLabel}</span>
        {isCurrentWeek && (
          <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-1">
            Nu
          </span>
        )}
      </div>

      <button
        onClick={onNext}
        className="p-2 -mr-2 rounded-full active:bg-slate-100 transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-slate-500" />
      </button>
    </motion.div>
  );
}