import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User, Calendar, CheckCircle, XCircle, Clock, Eye
} from "lucide-react";

const STATUS_STYLES = {
  Aangevraagd: "bg-amber-100 text-amber-700",
  Goedgekeurd: "bg-emerald-100 text-emerald-700",
  Afgekeurd: "bg-red-100 text-red-700",
  Geannuleerd: "bg-slate-100 text-slate-500",
};

const TYPE_STYLES = {
  Vakantie: "bg-blue-100 text-blue-700",
  Ziekte: "bg-red-100 text-red-700",
  "Bijzonder verlof": "bg-purple-100 text-purple-700",
  "Onbetaald verlof": "bg-slate-100 text-slate-600",
  ATV: "bg-teal-100 text-teal-700",
};

export default function LeaveRequestCard({
  request,
  employee,
  showActions = false,
  onApprove,
  onReject,
  onView,
  approvingId,
}) {
  const fmtDate = (d) => {
    try { return format(new Date(d), "EEE d MMM", { locale: nl }); }
    catch { return d; }
  };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-slate-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900 truncate">
                  {employee ? `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}` : "Onbekend"}
                </h3>
                <Badge className={TYPE_STYLES[request.leave_type] || "bg-slate-100 text-slate-600"}>
                  {request.leave_type}
                </Badge>
                <Badge className={STATUS_STYLES[request.status] || "bg-slate-100 text-slate-600"}>
                  {request.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {fmtDate(request.start_date)} – {fmtDate(request.end_date)}
                </span>
                {request.total_days > 0 && (
                  <span className="font-medium text-slate-700">
                    {request.total_days} {request.total_days === 1 ? 'dag' : 'dagen'}
                  </span>
                )}
                {request.approved_by && (
                  <span className="text-slate-400">door {request.approved_by}</span>
                )}
              </div>
              {(request.reason || request.rejection_reason) && (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {request.reason && (
                    <span className="text-[11px] text-slate-500 bg-slate-50 rounded px-1.5 py-0.5 truncate max-w-[300px]" title={request.reason}>
                      {request.reason}
                    </span>
                  )}
                  {request.rejection_reason && (
                    <span className="text-[11px] text-red-600 bg-red-50 rounded px-1.5 py-0.5 truncate max-w-[240px]" title={request.rejection_reason}>
                      Afkeuring: {request.rejection_reason}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" onClick={() => onView?.(request)}>
              <Eye className="w-3.5 h-3.5 mr-1" /> Bekijk
            </Button>
            {showActions && request.status === "Aangevraagd" && (
              <>
                <Button
                  size="sm"
                  className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => onApprove?.(request)}
                  disabled={approvingId === request.id}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Goed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => onReject?.(request)}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Afkeur
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}