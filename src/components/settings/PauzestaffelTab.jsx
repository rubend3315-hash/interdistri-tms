import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, AlertTriangle, Clock } from "lucide-react";

function hasOverlap(rules, current) {
  for (const r of rules) {
    if (current && r.id === current.id) continue;
    if (r.status !== "Actief") continue;
    const rMax = r.max_hours ?? Infinity;
    const cMax = current.max_hours ?? Infinity;
    if (current.min_hours < rMax && cMax > r.min_hours) return r;
  }
  return null;
}

export default function PauzestaffelTab() {
  const queryClient = useQueryClient();
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["breakSchedules"],
    queryFn: () => base44.entities.BreakSchedule.list(),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [selected, setSelected] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BreakSchedule.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["breakSchedules"] }),
  });

  const sorted = [...schedules].sort((a, b) => a.min_hours - b.min_hours);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Pauzestaffel (CAO BGV)</h3>
          <p className="text-sm text-slate-500">
            Configureer automatische pauzeberekening op basis van totale dienstduur.
          </p>
        </div>
        <Button size="sm" className="bg-blue-900" onClick={() => { setSelected(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nieuwe staffel
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
        <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Werking</p>
          <p className="text-xs mt-0.5">
            Bij het invullen van start- en eindtijd wordt de pauze automatisch berekend op basis van de totale dienstduur (eindtijd − starttijd). 
            Medewerkers kunnen handmatig overriden via de &quot;Handmatig&quot; optie in de mobiele app.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Laden...</p>
      ) : sorted.length === 0 ? (
        <p className="text-slate-500">Geen staffelregels geconfigureerd</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Van (uren)</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Tot (uren)</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Pauze</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-2 font-medium text-slate-600">Acties</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2">{s.min_hours} uur</td>
                  <td className="px-4 py-2">{s.max_hours != null ? `${s.max_hours} uur` : "∞ (open eind)"}</td>
                  <td className="px-4 py-2 font-semibold">{s.break_minutes} min</td>
                  <td className="px-4 py-2">
                    <Badge className={s.status === "Actief" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelected(s); setShowDialog(true); }}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => { if (confirm(`Staffelregel "${s.description}" verwijderen?`)) deleteMutation.mutate(s.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Test scenarios */}
      <div className="bg-slate-50 border rounded-lg p-3">
        <p className="text-sm font-medium text-slate-700 mb-2">Testscenario&apos;s</p>
        <div className="grid gap-1 text-xs text-slate-600">
          {[
            { label: "8:45 dienst", expected: 60 },
            { label: "11:00 dienst", expected: 90 },
            { label: "17:00 dienst", expected: 150 },
            { label: "4:00 dienst", expected: 0 },
          ].map(({ label, expected }) => {
            const hrs = parseFloat(label);
            const match = sorted.find(s => s.status === "Actief" && hrs >= s.min_hours && (s.max_hours == null || hrs < s.max_hours));
            const actual = match ? match.break_minutes : 0;
            const ok = actual === expected;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className={ok ? "text-green-600" : "text-red-600"}>{ok ? "✓" : "✗"}</span>
                <span>{label} → verwacht {expected} min, berekend {actual} min</span>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? "Staffelregel bewerken" : "Nieuwe staffelregel"}</DialogTitle>
          </DialogHeader>
          <StaffelForm
            schedule={selected}
            allSchedules={schedules}
            onClose={() => setShowDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StaffelForm({ schedule, allSchedules, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => schedule ? {
    min_hours: schedule.min_hours,
    max_hours: schedule.max_hours ?? "",
    break_minutes: schedule.break_minutes,
    description: schedule.description,
    status: schedule.status,
  } : {
    min_hours: "",
    max_hours: "",
    break_minutes: "",
    description: "",
    status: "Actief",
  });
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BreakSchedule.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["breakSchedules"] }); onClose(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BreakSchedule.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["breakSchedules"] }); onClose(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const minH = parseFloat(form.min_hours);
    const maxH = form.max_hours === "" || form.max_hours === null ? null : parseFloat(form.max_hours);
    const brkMin = parseInt(form.break_minutes, 10);

    if (isNaN(minH) || minH < 0) { setError("Vul een geldig 'van' uren in"); return; }
    if (maxH !== null && (isNaN(maxH) || maxH <= minH)) { setError("'Tot' uren moet groter zijn dan 'van' uren"); return; }
    if (isNaN(brkMin) || brkMin < 0) { setError("Vul geldige pauzeminuten in"); return; }
    if (!form.description.trim()) { setError("Beschrijving is verplicht"); return; }

    const candidate = { min_hours: minH, max_hours: maxH, id: schedule?.id, status: form.status };
    const overlap = hasOverlap(allSchedules, candidate);
    if (overlap) { setError(`Overlapt met bestaande staffel: ${overlap.description}`); return; }

    const data = {
      min_hours: minH,
      max_hours: maxH,
      break_minutes: brkMin,
      description: form.description.trim(),
      status: form.status,
    };

    if (schedule) {
      updateMutation.mutate({ id: schedule.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Van (uren) *</Label>
          <Input type="number" step="0.5" value={form.min_hours} onChange={(e) => setForm({ ...form, min_hours: e.target.value })} placeholder="4.5" />
        </div>
        <div>
          <Label>Tot (uren)</Label>
          <Input type="number" step="0.5" value={form.max_hours} onChange={(e) => setForm({ ...form, max_hours: e.target.value })} placeholder="Leeg = open eind" />
          <p className="text-xs text-slate-400 mt-0.5">Leeg laten voor ≥ (open eind)</p>
        </div>
      </div>
      <div>
        <Label>Pauze (minuten) *</Label>
        <Input type="number" value={form.break_minutes} onChange={(e) => setForm({ ...form, break_minutes: e.target.value })} placeholder="30" />
      </div>
      <div>
        <Label>Beschrijving *</Label>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="bijv. 4,5 uur tot 7,5 uur" />
      </div>
      <div>
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Actief">Actief</SelectItem>
            <SelectItem value="Inactief">Inactief</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annuleren</Button>
        <Button type="submit" className="flex-1 bg-blue-900" disabled={createMutation.isPending || updateMutation.isPending}>Opslaan</Button>
      </div>
    </form>
  );
}