import React from "react";
import { Truck, Package } from "lucide-react";

/**
 * Read-only chronological timeline of activities (trips + standplaatswerk).
 * Receives dienstRegels as prop — no form binding, no autosave interaction.
 */
export default function ActivityTimelinePanel({ dienstRegels = [], customers = [], activiteiten = [] }) {
  if (dienstRegels.length === 0) {
    return (
      <div className="mx-4 px-3 py-2 bg-slate-50 rounded-xl">
        <p className="text-[11px] text-slate-400 text-center">Nog geen ritten of standplaatswerk ingevoerd</p>
      </div>
    );
  }

  const getCustomerName = (id) => customers.find(c => c?.id === id)?.company_name;
  const getActiviteitName = (id) => activiteiten.find(a => a?.id === id)?.name;

  const sorted = [...dienstRegels].sort((a, b) => {
    const tA = a.start_time || "99:99";
    const tB = b.start_time || "99:99";
    return tA.localeCompare(tB);
  });

  return (
    <div className="mx-4 px-3 py-2 bg-slate-50/80 rounded-xl space-y-0">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Activiteiten tijdlijn</p>
      {sorted.map((regel, idx) => {
        const isRit = regel.type === "rit";
        const isLast = idx === sorted.length - 1;
        const label = isRit
          ? (regel.route_name || getCustomerName(regel.customer_id) || "Rit")
          : (getActiviteitName(regel.activity_id) || getCustomerName(regel.customer_id) || "Standplaatswerk");
        const timeLabel = regel.start_time
          ? `${regel.start_time}${regel.end_time ? ` – ${regel.end_time}` : " – ⏳"}`
          : "Geen tijd";

        return (
          <div key={regel.id || idx} className="flex items-start gap-2.5">
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center pt-0.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                isRit ? "bg-blue-100" : "bg-amber-100"
              }`}>
                {isRit
                  ? <Truck className="w-2.5 h-2.5 text-blue-600" />
                  : <Package className="w-2.5 h-2.5 text-amber-600" />
                }
              </div>
              {!isLast && <div className="w-px flex-1 min-h-[16px] bg-slate-200 mt-0.5" />}
            </div>
            {/* Content */}
            <div className={`pb-2 min-w-0 flex-1 ${isLast ? "" : ""}`}>
              <p className="text-[12px] font-medium text-slate-800 truncate leading-tight">{label}</p>
              <p className="text-[11px] text-slate-500 leading-tight">{timeLabel}</p>
              {regel.openRit && !regel.end_time && (
                <p className="text-[10px] text-amber-600 font-medium">Open rit</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}