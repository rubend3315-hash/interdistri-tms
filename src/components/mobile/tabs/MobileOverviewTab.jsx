import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle } from "lucide-react";

export default function MobileOverviewTab({ approvedEntries, loadingEntries }) {
  return (
    <div className="-mx-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          Goedgekeurde diensten
        </h2>
      </div>

      {loadingEntries ? (
        <div className="px-4 py-3 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : approvedEntries.length === 0 ? (
        <p className="text-[13px] text-slate-500 text-center py-10">Nog geen goedgekeurde diensten</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {approvedEntries.slice(0, 10).map(entry => (
            <div key={entry.id} className="flex items-center justify-between px-4 py-3 bg-white">
              <div>
                <p className="text-[13px] font-medium text-slate-900">
                  {entry.date && format(new Date(entry.date), "d MMM yyyy", { locale: nl })}
                </p>
                <p className="text-[11px] text-slate-500">{entry.start_time} – {entry.end_time}</p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 text-[12px]">{entry.total_hours}u</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}