import React from "react";
import { Truck, Package, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DienstRegelRow({ regel, customers, hasOverlap, onTap, onDelete }) {
  const isRit = regel.type === "rit";
  const isOpen = isRit && regel.openRit && !regel.end_time;
  const timeLabel = isOpen
    ? `${regel.start_time || '—'} – ⏳`
    : `${regel.start_time || '—'} – ${regel.end_time || '—'}`;

  const customer = regel.customer_id ? customers.find(c => c.id === regel.customer_id) : null;
  const subtitle = isRit
    ? (customer?.company_name || regel.route_name || "Geen klant")
    : (customer?.company_name || regel.custom_activity || "Standplaatswerk");

  return (
    <div className={cn(
      "flex items-center gap-3 bg-white px-4 h-[56px]",
      hasOverlap && "bg-red-50"
    )}>
      {/* Tap area */}
      <div
        className="flex items-center gap-3 flex-1 min-w-0 h-full"
        onClick={onTap}
      >
        {/* Color indicator */}
        <div className={cn(
          "w-1 h-7 rounded-full flex-shrink-0",
          hasOverlap ? "bg-red-400" : isRit ? "bg-blue-500" : "bg-amber-500"
        )} />

        {/* Time + type badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-slate-900 tabular-nums">{timeLabel}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              isOpen ? "bg-amber-50 text-amber-600" : isRit ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
            )}>
              {isOpen ? "Open rit" : isRit ? "Rit" : "Standplaats"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
        </div>
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-2 -mr-1 rounded-lg active:bg-red-50 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
      >
        <Trash2 className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}