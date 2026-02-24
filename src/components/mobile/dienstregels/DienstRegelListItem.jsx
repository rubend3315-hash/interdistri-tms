import React, { useState, useRef } from "react";
import { Truck, Package, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DienstRegelListItem({ regel, customers, hasOverlap, onTap, onDelete }) {
  const isRit = regel.type === "rit";
  const timeLabel = `${regel.start_time || '—'} – ${regel.end_time || '—'}`;

  const customer = regel.customer_id
    ? customers.find(c => c.id === regel.customer_id)
    : null;
  const subtitle = isRit
    ? (customer?.company_name || regel.route_name || "Geen klant")
    : (customer?.company_name || regel.custom_activity || "Standplaatswerk");

  // Swipe-to-delete state
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef(null);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (isHorizontal.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }
    if (!isHorizontal.current) return;
    if (dx < 0) setOffsetX(Math.max(dx, -100));
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    isHorizontal.current = null;
    if (offsetX < -60) {
      onDelete();
    }
    setOffsetX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete background */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4 rounded-lg">
        <Trash2 className="w-5 h-5 text-white" />
      </div>

      {/* Card */}
      <div
        className={cn(
          "relative flex items-center gap-2.5 bg-white pl-3 pr-1.5 py-2 rounded-lg border transition-transform",
          hasOverlap ? "border-red-400 bg-red-50" : isRit ? "border-blue-100" : "border-amber-100"
        )}
        style={{ transform: `translateX(${offsetX}px)`, transition: swiping ? 'none' : 'transform 200ms ease' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Tappable area */}
        <div
          className="flex items-center gap-2.5 flex-1 min-w-0"
          onClick={() => { if (Math.abs(offsetX) < 5) onTap(); }}
        >
          {/* Icon */}
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            isRit ? "bg-blue-100" : "bg-amber-100"
          )}>
            {isRit
              ? <Truck className="w-4 h-4 text-blue-600" />
              : <Package className="w-4 h-4 text-amber-600" />
            }
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{timeLabel}</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                isRit ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
              )}>
                {isRit ? "Rit" : "Standplaats"}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
          </div>

          {/* Chevron */}
          <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 rounded-lg hover:bg-red-50 active:bg-red-100 flex-shrink-0 transition"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
}