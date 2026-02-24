import React, { useState, useRef } from "react";
import { Truck, Package, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DienstRegelRow({ regel, customers, hasOverlap, onTap, onDelete }) {
  const isRit = regel.type === "rit";
  const timeLabel = `${regel.start_time || '—'} – ${regel.end_time || '—'}`;

  const customer = regel.customer_id ? customers.find(c => c.id === regel.customer_id) : null;
  const subtitle = isRit
    ? (customer?.company_name || regel.route_name || "Geen klant")
    : (customer?.company_name || regel.custom_activity || "Standplaatswerk");

  // Swipe state
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHoriz = useRef(null);

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHoriz.current = null;
    setSwiping(true);
  };
  const onTouchMove = (e) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (isHoriz.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) isHoriz.current = Math.abs(dx) > Math.abs(dy);
    if (!isHoriz.current) return;
    if (dx < 0) setOffsetX(Math.max(dx, -90));
  };
  const onTouchEnd = () => {
    setSwiping(false);
    isHoriz.current = null;
    if (offsetX < -50) onDelete();
    setOffsetX(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Swipe reveal */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4">
        <Trash2 className="w-5 h-5 text-white" />
      </div>

      <div
        className={cn(
          "relative flex items-center gap-3 bg-white px-3 py-2.5",
          hasOverlap && "bg-red-50"
        )}
        style={{ transform: `translateX(${offsetX}px)`, transition: swiping ? 'none' : 'transform 200ms ease' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Tap area */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0"
          onClick={() => { if (Math.abs(offsetX) < 5) onTap(); }}
        >
          {/* Color indicator */}
          <div className={cn(
            "w-1 h-8 rounded-full flex-shrink-0",
            hasOverlap ? "bg-red-400" : isRit ? "bg-blue-500" : "bg-amber-500"
          )} />

          {/* Time + type badge */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-slate-900 tabular-nums">{timeLabel}</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                isRit ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
              )}>
                {isRit ? "Rit" : "Standplaats"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}