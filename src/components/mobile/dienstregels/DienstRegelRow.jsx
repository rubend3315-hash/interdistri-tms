import React from "react";
import { Truck, Package, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DienstRegelRow({ regel, customers, hasOverlap, onTap, onDelete }) {
  const isRit = regel.type === "rit";
  const isOpen = isRit && regel.openRit && !regel.end_time;
  const timeLabel = isOpen
    ? `${regel.start_time || '—'} – ...`
    : `${regel.start_time || '—'} – ${regel.end_time || '—'}`;

  const customer = regel.customer_id ? customers.find(c => c.id === regel.customer_id) : null;
  const subtitle = isRit
    ? (customer?.company_name || regel.route_name || "Geen klant")
    : (customer?.company_name || regel.custom_activity || "Standplaatswerk");

  return (
    <div className={cn(
      "flex items-center gap-2 bg-white px-3",
      isOpen ? "py-2" : "h-[48px]",
      hasOverlap && "bg-red-50",
      isOpen && "bg-amber-50/50"
    )}>
      {/* Tap area */}
      <div
        className="flex items-center gap-3 flex-1 min-w-0 h-full"
        onClick={onTap}
      >
        {/* Color indicator */}
        <div className={cn(
          "w-1 rounded-full flex-shrink-0",
          isOpen ? "h-10 bg-amber-400" : "h-7",
          !isOpen && (hasOverlap ? "bg-red-400" : isRit ? "bg-blue-500" : "bg-amber-500")
        )} />

        {/* Time + type badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-slate-900 tabular-nums">{timeLabel}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              isOpen ? "bg-amber-100 text-amber-700" : isRit ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
            )}>
              {isOpen ? "🟡 Open rit" : isRit ? "Rit" : "Standplaats"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
          {isOpen && (
            <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Nog niet afgesloten — tik om af te sluiten
            </p>
          )}
        </div>
      </div>

      {/* Delete button — clean icon, no overlay */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1.5 rounded-lg active:bg-red-50 flex items-center justify-center flex-shrink-0"
      >
        <Trash2 className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.5} />
      </button>
    </div>
  );
}