import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarDays, Plus, Clock, CheckCircle, XCircle, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const LEAVE_TYPES = [
  "Vakantie", "Ziekte", "Bijzonder verlof", "Onbetaald verlof", "ATV",
  "Doktersbezoek", "Calamiteitenverlof", "Kortdurend zorgverlof",
  "Langdurend zorgverlof", "Zwangerschapsverlof", "Geboorteverlof",
  "Ouderschapsverlof", "Rouwverlof"
];

const STATUS_STYLES = {
  Aangevraagd: "bg-amber-100 text-amber-700",
  Goedgekeurd: "bg-emerald-100 text-emerald-700",
  Afgekeurd: "bg-red-100 text-red-700",
  Geannuleerd: "bg-slate-100 text-slate-500",
};

function calcWorkDays(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function MobileLeaveTab({ currentEmployee }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leave_type: "", start_date: "", end_date: "", reason: "" });
  const queryClient = useQueryClient();

  const employeeId = currentEmployee?.id;

  const { data: myRequests = [], isLoading } = useQuery({
    queryKey: ["myLeaveRequests", employeeId],
    queryFn: () => base44.entities.LeaveRequest.filter({ employee_id: employeeId }, "-created_date", 50),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaveRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myLeaveRequests"] });
      toast.success("Verlofaanvraag ingediend");
      setShowForm(false);
      setForm({ leave_type: "", start_date: "", end_date: "", reason: "" });
    },
    onError: (err) => toast.error("Fout: " + err.message),
  });

  const totalDays = useMemo(() => calcWorkDays(form.start_date, form.end_date), [form.start_date, form.end_date]);
  const canSubmit = form.leave_type && form.start_date && form.end_date && totalDays > 0;

  const handleSubmit = () => {
    createMutation.mutate({
      employee_id: employeeId,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      total_days: totalDays,
      reason: form.reason,
      status: "Aangevraagd",
    });
  };

  const fmtDate = (d) => {
    try { return format(new Date(d), "d MMM yyyy", { locale: nl }); }
    catch { return d; }
  };

  const pending = myRequests.filter(r => r.status === "Aangevraagd");
  const handled = myRequests.filter(r => r.status !== "Aangevraagd");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Verlof & Ziekte</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Aanvragen
        </Button>
      </div>

      {/* New request form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-blue-900">Nieuwe aanvraag</h3>

          <div className="space-y-1.5">
            <Label className="text-xs">Type verlof</Label>
            <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
              <SelectTrigger className="bg-white h-10 text-[16px]"><SelectValue placeholder="Selecteer type" /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Van</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="bg-white h-10 text-[16px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tot en met</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="bg-white h-10 text-[16px]" />
            </div>
          </div>

          {totalDays > 0 && (
            <p className="text-xs text-blue-700 font-medium">{totalDays} werkdag{totalDays !== 1 ? "en" : ""}</p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Reden (optioneel)</Label>
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Toelichting..." rows={2} className="bg-white text-[16px]" />
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => setShowForm(false)}>Annuleren</Button>
            <Button size="sm" className="flex-1 h-9" onClick={handleSubmit} disabled={!canSubmit || createMutation.isPending}>
              Indienen
            </Button>
          </div>
        </div>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Openstaand ({pending.length})
          </h3>
          {pending.map(r => (
            <RequestCard key={r.id} request={r} fmtDate={fmtDate} />
          ))}
        </div>
      )}

      {/* Handled requests */}
      {handled.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Verwerkt</h3>
          {handled.map(r => (
            <RequestCard key={r.id} request={r} fmtDate={fmtDate} />
          ))}
        </div>
      )}

      {!isLoading && myRequests.length === 0 && !showForm && (
        <div className="text-center py-8">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nog geen verlofaanvragen</p>
          <p className="text-xs text-slate-400 mt-1">Tik op "Aanvragen" om verlof aan te vragen</p>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function RequestCard({ request, fmtDate }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-slate-900">{request.leave_type}</span>
            <Badge className={`text-[10px] px-1.5 py-0 leading-4 ${STATUS_STYLES[request.status] || "bg-slate-100 text-slate-600"}`}>
              {request.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            {fmtDate(request.start_date)} – {fmtDate(request.end_date)}
            {request.total_days > 0 && ` · ${request.total_days}d`}
          </p>
          {request.reason && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{request.reason}</p>
          )}
          {request.rejection_reason && (
            <p className="text-xs text-red-500 mt-0.5 truncate">Afkeuring: {request.rejection_reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}