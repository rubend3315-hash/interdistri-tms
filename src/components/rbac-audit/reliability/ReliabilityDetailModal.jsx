import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

const FILTER_LABELS = {
  all: "Alle Submissions",
  success: "Succesvolle Submissions",
  errors: "Error Submissions",
  timeouts: "Timeout Events (>15s)",
  deployment: "Deployment Errors",
  safari: "Safari Errors",
  android: "Android Errors",
};

function filterLogs(logs, type) {
  switch (type) {
    case "success":
      return logs.filter(l => l.status === "RESPONSE_OK" || l.status === "SUCCESS");
    case "errors":
      return logs.filter(l => l.status === "RESPONSE_ERROR" || l.status === "FAILED");
    case "timeouts":
      return logs.filter(l => (l.response_time_ms || l.latency_ms || 0) > 15000);
    case "deployment":
      return logs.filter(l => 
        (l.error_message || "").toLowerCase().includes("not deployed") ||
        (l.error_code || "").includes("DEPLOYMENT")
      );
    case "safari":
      return logs.filter(l => 
        (l.browser || l.user_agent || "").includes("Safari") &&
        !(l.browser || l.user_agent || "").includes("Chrome") &&
        (l.status === "RESPONSE_ERROR" || l.status === "FAILED" || l.status === "ABORTED")
      );
    case "android":
      return logs.filter(l => 
        (l.user_agent || "").match(/Android/i) &&
        (l.status === "RESPONSE_ERROR" || l.status === "FAILED" || l.status === "ABORTED")
      );
    default:
      return logs;
  }
}

export default function ReliabilityDetailModal({ open, onClose, filterType, logs }) {
  const filtered = useMemo(() => 
    filterLogs(logs, filterType).slice(0, 50),
    [logs, filterType]
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            {FILTER_LABELS[filterType] || "Detail"} ({filtered.length} van max 50)
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">Geen entries gevonden</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Tijd</th>
                  <th className="text-left p-2 font-semibold">Status</th>
                  <th className="text-left p-2 font-semibold">Email</th>
                  <th className="text-right p-2 font-semibold">Response ms</th>
                  <th className="text-right p-2 font-semibold">Payload KB</th>
                  <th className="text-right p-2 font-semibold">Sig KB</th>
                  <th className="text-right p-2 font-semibold">Retries</th>
                  <th className="text-left p-2 font-semibold">Error</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const ts = log.clicked_at || log.timestamp_received || log.created_date;
                  const ms = log.response_time_ms || log.latency_ms || 0;
                  return (
                    <tr key={log.id} className="border-b hover:bg-slate-50">
                      <td className="p-2 whitespace-nowrap">
                        {ts ? format(parseISO(ts), "dd-MM HH:mm:ss") : "-"}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]">
                          {log.status}
                        </Badge>
                      </td>
                      <td className="p-2 truncate max-w-[140px]" title={log.user_email || log.email}>
                        {log.user_email || log.email || "-"}
                      </td>
                      <td className={`p-2 text-right font-mono ${ms > 15000 ? "text-red-600 font-bold" : ms > 5000 ? "text-amber-600" : ""}`}>
                        {ms > 0 ? Math.round(ms) : "-"}
                      </td>
                      <td className="p-2 text-right">
                        {log.payload_size_kb?.toFixed(1) || "-"}
                      </td>
                      <td className="p-2 text-right">
                        {log.signature_size_kb?.toFixed(1) || "-"}
                      </td>
                      <td className="p-2 text-right">
                        <span className={(log.retry_count || 0) > 0 ? "text-orange-600 font-medium" : ""}>
                          {log.retry_count || 0}
                        </span>
                      </td>
                      <td className="p-2 text-red-600 truncate max-w-[220px]" title={log.error_message}>
                        {log.error_message || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}