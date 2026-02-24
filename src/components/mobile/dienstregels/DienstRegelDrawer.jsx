import React, { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Package, MapPin, Check, X, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { findOverlaps } from "@/components/utils/mobile/dienstRegelValidation";

const TimeInput = ({ value, onChange, placeholder, autoFocus }) => {
  const ref = useRef(null);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
  return (
    <Input
      ref={ref}
      type="text" inputMode="numeric" maxLength="5" value={value}
      onChange={(e) => {
        let v = e.target.value.replace(/[^0-9]/g, '');
        if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
        onChange(v);
      }}
      placeholder={placeholder}
      className="text-base h-10"
    />
  );
};

export default function DienstRegelDrawer({
  open, onOpenChange, regel, allRegels,
  onSave, onDelete, vehicles, customers, routes, tiModelRoutes, projects, activiteiten
}) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (open && regel) setDraft({ ...regel });
  }, [open, regel?.id]);

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
    const testList = [...otherRegels, draft];
    const overlaps = findOverlaps(testList);
    if (overlaps.length > 0) {
      toast.error("Tijden overlappen. Pas de tijden aan.");
      return;
    }
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

  const handleDelete = () => {
    onDelete?.(draft.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl p-0 flex flex-col">
        {/* Sticky header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-white sticky top-0 z-10 rounded-t-2xl">
          <button type="button" onClick={() => onOpenChange(false)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
          <span className="text-sm font-semibold text-slate-900">
            {isRit ? "Rit bewerken" : "Standplaats bewerken"}
          </span>
          <button type="button" onClick={handleDelete} className="p-1.5 -mr-1.5 rounded-lg hover:bg-red-50">
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => handleTypeSwitch("rit")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                isRit ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-500"
              }`}>
              <Truck className="w-3.5 h-3.5" /> Rit
            </button>
            <button type="button" onClick={() => handleTypeSwitch("standplaats")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                !isRit ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-500"
              }`}>
              <Package className="w-3.5 h-3.5" /> Standplaats
            </button>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[11px]">Starttijd *</Label>
              <TimeInput value={draft.start_time} onChange={(v) => update('start_time', v)} placeholder="09:00" autoFocus />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[11px]">Eindtijd *</Label>
              <TimeInput value={draft.end_time} onChange={(v) => update('end_time', v)} placeholder="15:00" />
            </div>
          </div>

          {/* Type-specific fields */}
          {isRit ? (
            <RitDrawerFields draft={draft} update={update} setDraft={setDraft}
              vehicles={vehicles} customers={customers} routes={routes} tiModelRoutes={tiModelRoutes} />
          ) : (
            <StandplaatsDrawerFields draft={draft} update={update} setDraft={setDraft}
              customers={customers} projects={filteredProjects} activiteiten={activeActiviteiten} />
          )}

          {/* Notes */}
          <div className="space-y-0.5">
            <Label className="text-[11px]">Opmerkingen</Label>
            <Textarea value={draft.notes || ""} onChange={(e) => update('notes', e.target.value)} rows={2} placeholder="Bijzonderheden..." className="text-sm" />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="px-3 py-2.5 border-t bg-white sticky bottom-0">
          <Button className="w-full h-[44px] bg-blue-600 hover:bg-blue-700 text-[13px] font-semibold" onClick={handleSave}>
            <Check className="w-4 h-4 mr-1.5" /> Opslaan
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Rit fields ── */
function RitDrawerFields({ draft, update, setDraft, vehicles, customers, routes, tiModelRoutes }) {
  const [showExtra, setShowExtra] = useState(false);

  return (
    <div className="space-y-2.5">
      {/* Core fields */}
      <div className="space-y-0.5">
        <Label className="text-[11px]">Kenteken *</Label>
        <Select value={draft.vehicle_id || ""} onValueChange={(v) => update('vehicle_id', v)}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Selecteer voertuig" /></SelectTrigger>
          <SelectContent>{(vehicles || []).map(v => <SelectItem key={v.id} value={v.id}>{v.license_plate}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <Label className="text-[11px]">Begin km *</Label>
          <Input type="number" className="h-10" value={draft.start_km || ""} onChange={(e) => update('start_km', e.target.value)} />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[11px]">Eind km</Label>
          <Input type="number" className="h-10" value={draft.end_km || ""} onChange={(e) => update('end_km', e.target.value)} />
        </div>
      </div>
      <div className="space-y-0.5">
        <Label className="text-[11px]">Schade gereden?</Label>
        <Select value={draft.damage_occurred || "Nee"} onValueChange={(v) => update('damage_occurred', v)}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Nee">Nee</SelectItem>
            <SelectItem value="Ja">Ja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Klant + Route (core) */}
      <div className="space-y-0.5">
        <Label className="text-[11px]">Klant</Label>
        <Select value={draft.customer_id || "none"} onValueChange={(v) => update('customer_id', v === "none" ? "" : v)}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecteer klant</SelectItem>
            {(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <Label className="text-[11px]">Route</Label>
          <Select value={draft.route_name || "none"} onValueChange={(v) => {
            setDraft(prev => {
              if (v === "__custom__") return { ...prev, route_name: "", _showCustomRoute: true };
              return { ...prev, route_name: v === "none" ? "" : v, _showCustomRoute: false };
            });
          }}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Route" /></SelectTrigger>
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
            <Input className="mt-1 h-10" value={draft.route_name || ""}
              onChange={(e) => setDraft(prev => ({ ...prev, route_name: e.target.value }))}
              placeholder="Typ routenaam..." autoFocus />
          )}
        </div>
        <div className="space-y-0.5">
          <Label className="text-[11px]">Bestelde stops</Label>
          <Input type="number" className="h-10" value={draft.planned_stops || ""} onChange={(e) => update('planned_stops', e.target.value)} placeholder="85" />
        </div>
      </div>

      {/* Collapsible extra fields */}
      <button type="button" onClick={() => setShowExtra(!showExtra)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition w-full pt-1">
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExtra ? 'rotate-180' : ''}`} />
        <span>{showExtra ? 'Minder velden' : 'Meer velden'} (brandstof, vertrek, e-laden)</span>
      </button>

      {showExtra && (
        <div className="space-y-2.5 pt-1">
          <div className="space-y-0.5">
            <Label className="text-[11px]">Vertreklocatie</Label>
            <Input className="h-10" value={draft.departure_location || ""} onChange={(e) => update('departure_location', e.target.value)} placeholder="bijv. Standplaats" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[11px]">Brandstof (L)</Label>
              <Input type="number" step="0.01" className="h-10" value={draft.fuel_liters || ""} onChange={(e) => update('fuel_liters', e.target.value)} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[11px]">AdBlue (L)</Label>
              <Input type="number" step="0.01" className="h-10" value={draft.adblue_liters || ""} onChange={(e) => update('adblue_liters', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[11px]">Km bij tanken</Label>
              <Input type="number" className="h-10" value={draft.fuel_km || ""} onChange={(e) => update('fuel_km', e.target.value)} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[11px]">E-laden (kWh)</Label>
              <Input type="number" step="0.01" className="h-10" value={draft.charging_kwh || ""} onChange={(e) => update('charging_kwh', e.target.value)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Standplaats fields ── */
function StandplaatsDrawerFields({ draft, update, setDraft, customers, projects, activiteiten }) {
  return (
    <div className="space-y-2.5">
      <div className="space-y-0.5">
        <Label className="text-[11px]">Klant</Label>
        <Select value={draft.customer_id || "none"} onValueChange={(v) => update('customer_id', v === "none" ? "" : v)}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecteer klant</SelectItem>
            {(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {projects.length > 0 && (
        <div className="space-y-0.5">
          <Label className="text-[11px]">Project</Label>
          <Select value={draft.project_id || "none"} onValueChange={(v) => update('project_id', v === "none" ? "" : v)}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecteer project</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-0.5">
        <Label className="text-[11px]">Activiteit</Label>
        <Select
          value={draft._showCustomActivity ? "__custom__" : (draft.activity_id || "none")}
          onValueChange={(v) => {
            setDraft(prev => {
              if (v === "__custom__") return { ...prev, activity_id: "", _showCustomActivity: true, custom_activity: "" };
              return { ...prev, activity_id: v === "none" ? "" : v, _showCustomActivity: false, custom_activity: "" };
            });
          }}
        >
          <SelectTrigger className="h-10"><SelectValue placeholder="Activiteit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecteer activiteit</SelectItem>
            {(activiteiten || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            <SelectItem value="__custom__">✏️ Vrije invoer</SelectItem>
          </SelectContent>
        </Select>
        {draft._showCustomActivity && (
          <Input className="mt-1 h-10" value={draft.custom_activity || ""}
            onChange={(e) => update("custom_activity", e.target.value)}
            placeholder="Typ activiteit..." autoFocus />
        )}
      </div>
    </div>
  );
}