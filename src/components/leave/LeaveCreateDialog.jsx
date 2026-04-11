import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LEAVE_TYPES = [
  "Vakantie", "Ziekte", "Bijzonder verlof", "Onbetaald verlof", "ATV",
  "Doktersbezoek", "Calamiteitenverlof", "Kortdurend zorgverlof",
  "Langdurend zorgverlof", "Zwangerschapsverlof", "Geboorteverlof",
  "Ouderschapsverlof", "Rouwverlof"
];

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

export default function LeaveCreateDialog({ open, onOpenChange, employees, onSubmit, isPending, forEmployeeId }) {
  const [form, setForm] = useState({
    employee_id: forEmployeeId || "",
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const totalDays = useMemo(() => calcWorkDays(form.start_date, form.end_date), [form.start_date, form.end_date]);

  const handleSubmit = () => {
    onSubmit({ ...form, total_days: totalDays });
    setForm({ employee_id: forEmployeeId || "", leave_type: "", start_date: "", end_date: "", reason: "" });
  };

  const canSubmit = form.employee_id && form.leave_type && form.start_date && form.end_date && totalDays > 0;

  const activeEmployees = useMemo(() =>
    (employees || []).filter(e => e.status === "Actief").sort((a, b) => a.last_name.localeCompare(b.last_name)),
    [employees]
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setForm({ employee_id: forEmployeeId || "", leave_type: "", start_date: "", end_date: "", reason: "" }); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuwe Verlofaanvraag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!forEmployeeId && (
            <div className="space-y-2">
              <Label>Medewerker</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer medewerker" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.prefix ? emp.prefix + ' ' : ''}{emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Type verlof</Label>
            <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
              <SelectTrigger><SelectValue placeholder="Selecteer type" /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Startdatum</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Einddatum</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          {totalDays > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Totaal:</strong> {totalDays} werkdag{totalDays !== 1 ? 'en' : ''}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Reden / toelichting</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Optioneel..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
              Indienen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}