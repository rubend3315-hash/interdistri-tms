import React from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const statusConfig = {
  success: { icon: CheckCircle2, color: "bg-green-50 text-green-700 border-green-200", label: "Gelukt" },
  error: { icon: XCircle, color: "bg-red-50 text-red-700 border-red-200", label: "Fout" },
  partial: { icon: AlertTriangle, color: "bg-amber-50 text-amber-700 border-amber-200", label: "Deels" },
};

const typeLabels = {
  verlofdagen: "Verlofdagen",
  projecten: "Projecten",
  medewerkers: "Medewerkers",
  handmatig: "Handmatig",
};

export default function SyncLogTable({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        Nog geen synchronisaties uitgevoerd.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-2 px-3">Datum</th>
            <th className="py-2 px-3">Type</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3">Records</th>
            <th className="py-2 px-3">Bericht</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const status = statusConfig[log.status] || statusConfig.error;
            const StatusIcon = status.icon;
            return (
              <tr key={log.id} className="border-b hover:bg-slate-50">
                <td className="py-2 px-3 text-slate-600">
                  {format(new Date(log.created_date), "d MMM HH:mm", { locale: nl })}
                </td>
                <td className="py-2 px-3">
                  <Badge variant="outline">{typeLabels[log.sync_type] || log.sync_type}</Badge>
                </td>
                <td className="py-2 px-3">
                  <Badge variant="outline" className={status.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </td>
                <td className="py-2 px-3">
                  {log.records_synced || 0}
                  {log.records_failed > 0 && (
                    <span className="text-red-500 ml-1">({log.records_failed} mislukt)</span>
                  )}
                </td>
                <td className="py-2 px-3 text-slate-500 max-w-xs truncate">
                  {log.message || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}