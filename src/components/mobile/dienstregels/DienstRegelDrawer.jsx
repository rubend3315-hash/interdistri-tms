import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Package, Check, ChevronLeft, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { findOverlaps } from "@/components/utils/mobile/dienstRegelValidation";

const TimeInput = ({ value, onChange, placeholder, autoFocus }) => {
  const ref = useRef(null);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
  return (
    <Input
      ref={ref} type="text" inputMode="numeric" maxLength="5" value={value}
      onChange={(e) => {
        let v = e.target.value.replace(/[^0-9]/g, '');
        if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
        onChange(v);
      }}
      placeholder={placeholder}
      className="text-[15px] h-[44px] bg-white"
    />
  );
};

export default function DienstRegelDrawer({
  open, onOpenChange, regel, allRegels,
  onSave, onDelete, vehicles, customers, routes, tiModelRoutes, projects, activiteiten
}) {
  const [draft, setDraft] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { if (open && regel) setDraft({ ...regel }); }, [open, regel?.id]);
  if (!draft) return null;

  const isRit = draft.type === "rit";
  const activeActiviteiten = (activiteiten || []).filter(a => a.status !== "Inactief");
  const filteredProjects = draft.customer_id
    ? (projects || []).filter(p => p.customer_id === draft.customer_id && p.status === "Actief")
    : [];

  const update = (field, value) => {
    setDraft(prev => {
      const n = { ...prev, [field]: value };
      if (field === "customer_id") n.project_id = "";
      return n;
    });
  };

  const handleSave = () => {
    const otherRegels = allRegels.filter(r => r.id !== draft.id);
    const overlaps = findOverlaps([...otherRegels, draft]);
    if (overlaps.length > 0) { toast.error("Tijden overlappen. Pas aan."); return; }
    onSave(draft);
    onOpenChange(false);
  };

  const handleTypeSwitch = (newType) => {
    if (newType === draft.type) return;
    setDraft(prev => ({
      id: prev.id, type: newType, start_time: prev.start_time, end_time: prev.end_time,
      ...(newType === "rit" ? {
        departure_location: "Standplaats", vehicle_id: "", damage_occurred: "Nee",
        start_km: "", end_km: "", fuel_liters: "", adblue_liters: "",
        fuel_km: "", charging_kwh: "", customer_id: "", route_name: "",
        planned_stops: "", notes: ""
      } : {
        customer_id: "", project_id: "", activity_id: "", custom_activity: "", notes: ""
      })
    }));
  };

  const handleDelete = () => { setShowDeleteConfirm(true); };
  const confirmDelete = () => { onDelete?.(draft.id); setShowDeleteConfirm(false); onOpenChange(false); };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[100dvh] max-h-[100dvh] p-0 flex flex-col rounded-none">
        {/* Native-style header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white">
          <button type="button" onClick={() => onOpenChange(false)} className="flex items-center gap-0.5 text-[13px] text-blue-600 font-medium min-w-[60px]">
            <ChevronLeft className="w-4 h-4" /> Terug
          </button>
          <span className="text-[13px] font-semibold text-slate-900">
            {isRit ? "Rit" : "Standplaats"}
          </span>
          <button type="button" onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 active:bg-red-100 min-w-[60px] flex justify-end">
            <Trash2 className="w-4 h-4 text-[#D32F2F]" />
          </button>
        </div>

        {/* Delete confirm overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
            <div className="bg-white rounded-2xl p-5 w-full max-w-[320px] shadow-xl">
              <h3 className="text-[15px] font-semibold text-slate-900">Regel verwijderen?</h3>
              <p className="text-[13px] text-slate-500 mt-1">Weet je zeker dat je deze regel wilt verwijderen?</p>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-[44px] rounded-xl border border-slate-200 text-[13px] font-medium text-slate-700 active:bg-slate-50">
                  Annuleren
                </button>
                <button type="button" onClick={confirmDelete}
                  className="flex-1 h-[44px] rounded-xl bg-[#D32F2F] text-white text-[13px] font-semibold active:bg-red-800">
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-white">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => handleTypeSwitch("rit")}
              className={`flex items-center justify-center gap-1.5 h-[40px] rounded-lg border text-[12px] font-medium transition ${
                isRit ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-500"
              }`}>
              <Truck className="w-3.5 h-3.5" /> Rit
            </button>
            <button type="button" onClick={() => handleTypeSwitch("standplaats")}
              className={`flex items-center justify-center gap-1.5 h-[40px] rounded-lg border text-[12px] font-medium transition ${
                !isRit ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-500"
              }`}>
              <Package className="w-3.5 h-3.5" /> Standplaats
            </button>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-slate-500">Starttijd *</Label>
              <TimeInput value={draft.start_time} onChange={(v) => update('start_time', v)} placeholder="09:00" autoFocus />
            </div>
            <div>
              <Label className="text-[11px] text-slate-500">Eindtijd *</Label>
              <TimeInput value={draft.end_time} onChange={(v) => update('end_time', v)} placeholder="15:00" />
            </div>
          </div>

          {/* Type-specific fields */}
          {isRit ? (
            <RitFields draft={draft} update={update} setDraft={setDraft}
              vehicles={vehicles} customers={customers} routes={routes} tiModelRoutes={tiModelRoutes} />
          ) : (
            <StandplaatsFields draft={draft} update={update} setDraft={setDraft}
              customers={customers} projects={filteredProjects} activiteiten={activeActiviteiten} />
          )}

          {/* Notes */}
          <div>
            <Label className="text-[11px] text-slate-500">Opmerkingen</Label>
            <Textarea value={draft.notes || ""} onChange={(e) => update('notes', e.target.value)} rows={2} placeholder="Bijzonderheden..." className="text-sm bg-white" />
          </div>
        </div>

        {/* Sticky save */}
        <div className="px-4 py-2.5 border-t bg-white">
          <button type="button" onClick={handleSave}
            className="w-full h-[48px] rounded-lg bg-blue-600 text-white text-[14px] font-semibold flex items-center justify-center gap-2 active:bg-blue-700">
            <Check className="w-4 h-4" /> Opslaan
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Rit fields ── */
function RitFields({ draft, update, setDraft, vehicles, customers, routes, tiModelRoutes }) {
  const [showExtra, setShowExtra] = useState(false);
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-[11px] text-slate-500">Kenteken *</Label>
        <Select value={draft.vehicle_id || ""} onValueChange={(v) => update('vehicle_id', v)}>
          <SelectTrigger className="h-[44px] bg-white"><SelectValue placeholder="Selecteer voertuig" /></SelectTrigger>
          <SelectContent>{(vehicles || []).map(v => <SelectItem key={v.id} value={v.id}>{v.license_plate}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-slate-500">Begin km *</Label>
          <Input type="number" className="h-[44px] bg-white" value={draft.start_km || ""} onChange={(e) => update('start_km', e.target.value)} />
        </div>
        <div>
          <Label className="text-[11px] text-slate-500">Eind km</Label>
          <Input type="number" className="h-[44px] bg-white" value={draft.end_km || ""} onChange={(e) => update('end_km', e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-[11px] text-slate-500">Schade gereden?</Label>
        <Select value={draft.damage_occurred || "Nee"} onValueChange={(v) => update('damage_occurred', v)}>
          <SelectTrigger className="h-[44px] bg-white"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="Nee">Nee</SelectItem><SelectItem value="Ja">Ja</SelectItem></SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[11px] text-slate-500">Klant</Label>
        <Select value={draft.customer_id || "none"} onValueChange={(v) => update('customer_id', v === "none" ? "" : v)}>
          <SelectTrigger className="h-[44px] bg-white"><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecteer klant</SelectItem>
            {(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-slate-500">Route</Label>
          <Select value={draft.route_name || "none"} onValueChange={(v) => {
            setDraft(prev => v === "__custom__" ? { ...prev, route_name: "", _showCustomRoute: true } : { ...prev, route_name: v === "none" ? "" : v, _showCustomRoute: false });
          }}>
            <SelectTrigger className="h-[44px] bg-white"><SelectValue placeholder="Route" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecteer route</SelectItem>
              {[...(tiModelRoutes || [])].filter(r => !draft.customer_id || r.customer_id === draft.customer_id)
                .sort((a, b) => (a.route_code || '').localeCompare(b.route_code || '', undefined, { numeric: true }))
                .map(r => <SelectItem key={`ti-${r.id}`} value={r.route_code || r.route_name}>{r.route_code} - {r.route_name}</SelectItem>)}
              <SelectItem value="__custom__">✏️ Vrije invoer</SelectItem>
              {[...(routes || [])].filter(r => !draft.customer_id || r.customer_id === draft.customer_id)
                .sort((a, b) => (a.route_code || '').localeCompare(b.route_code || '', undefined, { numeric: true }))
                .map(r => <SelectItem key={`rt-${r.id}`} value={r.route_code || r.route_name}>{r.route_code} - {r.route_name}</SelectItem>)}
            </SelectContent>
          </Select>
          {draft._showCustomRoute && (
            <Input className="mt-1 h-[44px] bg-white" value={draft.route_name || ""}
              onChange={(e) => setDraft(prev => ({ ...prev, route_name: e.target.value }))}
              placeholder="Typ routenaam..." autoFocus />
          )}
        </div>
        <div>
          <Label className="text-[11px] text-slate-500">Bestelde stops</Label>
          <Input type="number" className="h-[44px] bg-white" value={draft.planned_stops || ""} onChange={(e) => update('planned_stops', e.target.value)} placeholder="85" />
        </div>
      </div>

      {/* Collapsible extra */}
      <button type="button" onClick={() => setShowExtra(!showExtra)}
        className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-700 w-full pt-1">
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExtra ? 'rotate-180' : ''}`} />
        {showExtra ? 'Minder velden' : 'Meer velden (brandstof, vertrek)'}
      </button>

      {showExtra && (
        <div className="space-y-2">
          <div>
            <Label className="text-[11px] text-slate-500">Vertreklocatie</Label>
            <Input className="h-[44px] bg-white" value={draft.departure_location || ""} onChange={(e) => update('departure_location', e.target.value)} placeholder="Standplaats" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-slate-500">Brandstof (L)</Label>
              <Input type="number" step="0.01" className="h-[44px] bg-white" value={draft.fuel_liters || ""} onChange={(e) => update('fuel_liters', e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] text-slate-500">AdBlue (L)</Label>
              <Input type="number" step="0.01" className="h-[44px] bg-white" value={draft.adblue_liters || ""} onChange={(e) => update('adblue_liters', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-slate-500">Km bij tanken</Label>
              <Input type="number" className="h-[44px] bg-white" value={draft.fuel_km || ""} onChange={(e) => update('fuel_km', e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] text-slate-500">E-laden (kWh)</Label>
              <Input type="number" step="0.01" className="h-[44px] bg-white" value={draft.charging_kwh || ""} onChange={(e) => update('charging_kwh', e.target.value)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Standplaats fields ── */
function StandplaatsFields({ draft, update, setDraft, customers, projects, activiteiten }) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-[11px] text-slate-500">Klant</Label>
        <Select value={draft.customer_id || "none"} onValueChange={(v) => update('customer_id', v === "none" ? "" : v)}>
          <SelectTrigger className="h-[44px] bg-white"><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecteer klant</SelectItem>
            {(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {projects.length > 0 && (
        <div>
          <Label className="text-[11px] text-slate-500">Project</Label>
          <Select value={draft.project_id || "none"} onValueChange={(v) => update('project_id', v === "none" ? "" : v)}>
            <SelectTrigger className="h-[44px] bg-white"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecteer project</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label className="text-[11px] text-slate-500">Activiteit</Label>
        <Select
          value={draft._showCustomActivity ? "__custom__" : (draft.activity_id || "none")}
          onValueChange={(v) => {
            setDraft(prev => v === "__custom__"
              ? { ...prev, activity_id: "", _showCustomActivity: true, custom_activity: "" }
              : { ...prev, activity_id: v === "none" ? "" : v, _showCustomActivity: false, custom_activity: "" });
          }}
        >
          <SelectTrigger className="h-[44px] bg-white"><SelectValue placeholder="Activiteit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecteer activiteit</SelectItem>
            {(activiteiten || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            <SelectItem value="__custom__">✏️ Vrije invoer</SelectItem>
          </SelectContent>
        </Select>
        {draft._showCustomActivity && (
          <Input className="mt-1 h-[44px] bg-white" value={draft.custom_activity || ""}
            onChange={(e) => update("custom_activity", e.target.value)}
            placeholder="Typ activiteit..." autoFocus />
        )}
      </div>
    </div>
  );
}