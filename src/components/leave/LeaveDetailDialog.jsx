import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const STATUS_STYLES = {
  Aangevraagd: "bg-amber-100 text-amber-700",
  Goedgekeurd: "bg-emerald-100 text-emerald-700",
  Afgekeurd: "bg-red-100 text-red-700",
  Geannuleerd: "bg-slate-100 text-slate-500",
};

export default function LeaveDetailDialog({ open, onOpenChange, request, employee }) {
  if (!request) return null;

  const fmtDate = (d) => {
    try { return format(new Date(d), "EEEE d MMMM yyyy", { locale: nl }); }
    catch { return d || "-"; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Verlofaanvraag Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Medewerker</Label>
              <p className="font-medium">
                {employee ? `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}` : "Onbekend"}
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Status</Label>
              <Badge className={STATUS_STYLES[request.status]}>{request.status}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Type verlof</Label>
              <p className="font-medium">{request.leave_type}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Aantal dagen</Label>
              <p className="font-medium">{request.total_days || "-"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Van</Label>
              <p className="font-medium">{fmtDate(request.start_date)}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Tot en met</Label>
              <p className="font-medium">{fmtDate(request.end_date)}</p>
            </div>
          </div>
          {request.reason && (
            <div>
              <Label className="text-xs text-slate-500">Reden / toelichting</Label>
              <p className="text-sm bg-slate-50 p-3 rounded-lg mt-1">{request.reason}</p>
            </div>
          )}
          {request.rejection_reason && (
            <div className="p-3 bg-red-50 rounded-lg">
              <Label className="text-xs text-red-600">Reden afkeuring</Label>
              <p className="text-sm text-red-700 mt-1">{request.rejection_reason}</p>
            </div>
          )}
          {request.approved_by && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Behandeld door</Label>
                <p className="text-sm">{request.approved_by}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Behandeld op</Label>
                <p className="text-sm">
                  {request.approved_date ? format(new Date(request.approved_date), "d MMM yyyy HH:mm", { locale: nl }) : "-"}
                </p>
              </div>
            </div>
          )}
          {request.notes && (
            <div>
              <Label className="text-xs text-slate-500">Opmerkingen</Label>
              <p className="text-sm bg-slate-50 p-3 rounded-lg mt-1">{request.notes}</p>
            </div>
          )}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Sluiten</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}