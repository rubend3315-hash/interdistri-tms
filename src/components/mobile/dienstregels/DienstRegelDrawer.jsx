import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Package, MapPin, Check } from "lucide-react";
import { toast } from "sonner";
import { findOverlaps } from "@/components/utils/mobile/dienstRegelValidation";

const timeInput = (value, onChange, placeholder) => (
  <Input
    type="text" inputMode="numeric" maxLength="5" value={value}
    onChange={(e) => {
      let v = e.target.value.replace(/[^0-9]/g, '');
      if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
      onChange(v);
    }}
    placeholder={placeholder}
    className="text-base h-11"
  />
);

export default function DienstRegelDrawer({
  open, onOpenChange, regel, allRegels,
  onSave, vehicles, customers, routes, tiModelRoutes, projects, activiteiten
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
    // Check overlap before saving
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
    // Keep times, reset type-specific fields
    setDraft(prev => ({
      id: prev.id,
      type: newType,
      start_time: prev.start_time,
      end_time: prev.end_time,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base">{isRit ? "Rit bewerken" : "Standplaats bewerken"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeSwitch("rit")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition ${
                isRit ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-500"
              }`}
            >
              <Truck className="w-4 h-4" /> Rit
            </button>
            <button
              type="button"
              onClick={() => handleTypeSwitch("standplaats")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition ${
                !isRit ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-500"
              }`}
            >
              <Package className="w-4 h-4" /> Standplaats
            </button>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Starttijd *</Label>
              {timeInput(draft.start_time, (v) => update('start_time', v), "09:00")}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Eindtijd *</Label>
              {timeInput(draft.end_time, (v) => update('end_time', v), "15:00")}
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
          <div className="space-y-1">
            <Label className="text-xs">Opmerkingen</Label>
            <Textarea value={draft.notes || ""} onChange={(e) => update('notes', e.target.value)} rows={2} placeholder="Bijzonderheden..." />
          </div>

          {/* Save */}
          <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-base" onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" /> Opslaan
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Rit fields (drawer) ── */
function RitDrawerFields({ draft, update, setDraft, vehicles, customers, routes, tiModelRoutes }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Vertreklocatie</Label>
        <Input value={draft.departure_location || ""} onChange={(e) => update('departure_location', e.target.value)} placeholder="bijv. Standplaats" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Kenteken *</Label>
        <Select value={draft.vehicle_id || ""} onValueChange={(v) => update('vehicle_id', v)}>
          <SelectTrigger><SelectValue placeholder="Selecteer voertuig" /></SelectTrigger>
          <SelectContent>{(vehicles || []).map(v => <SelectItem key={v.id} value={v.id}>{v.license_plate}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Schade gereden?</Label>
        <Select value={draft.damage_occurred || "Nee"} onValueChange={(v) => update('damage_occurred', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Nee">Nee</SelectItem>
            <SelectItem value="Ja">Ja</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Begin km *</Label>
          <Input type="number" value={draft.start_km || ""} onChange={(e) => update('start_km', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Eind km</Label>
          <Input type="number" value={draft.end_km || ""} onChange={(e) => update('end_km', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Brandstof (L)</Label>
          <Input type="number" step="0.01" value={draft.fuel_liters || ""} onChange={(e) => update('fuel_liters', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">AdBlue (L)</Label>
          <Input type="number" step="0.01" value={draft.adblue_liters || ""} onChange={(e) => update('adblue_liters', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Km bij tanken</Label>
          <Input type="number" value={draft.fuel_km || ""} onChange={(e) => update('fuel_km', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">E-laden (kWh)</Label>
          <Input type="number" step="0.01" value={draft.charging_kwh || ""} onChange={(e) => update('charging_kwh', e.target.value)} />
        </div>
      </div>

      {/* Route details */}
      <div className="pt-2 border-t space-y-3">
        <div className="flex items-center gap-2 text-emerald-700">
          <MapPin className="w-4 h-4" /><span className="text-xs font-semibold">Route Details</span>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Klant</Label>
          <Select value={draft.customer_id || "none"} onValueChange={(v) => update('customer_id', v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecteer klant</SelectItem>
              {(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Route</Label>
            <Select value={draft.route_name || "none"} onValueChange={(v) => {
              setDraft(prev => {
                if (v === "__custom__") return { ...prev, route_name: "", _showCustomRoute: true };
                return { ...prev, route_name: v === "none" ? "" : v, _showCustomRoute: false };
              });
            }}>
              <SelectTrigger><SelectValue placeholder="Route" /></SelectTrigger>
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
              <Input className="mt-1" value={draft.route_name || ""}
                onChange={(e) => setDraft(prev => ({ ...prev, route_name: e.target.value }))}
                placeholder="Typ routenaam..." autoFocus />
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bestelde stops</Label>
            <Input type="number" value={draft.planned_stops || ""} onChange={(e) => update('planned_stops', e.target.value)} placeholder="85" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Standplaats fields (drawer) ── */
function StandplaatsDrawerFields({ draft, update, setDraft, customers, projects, activiteiten }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Klant</Label>
        <Select value={draft.customer_id || "none"} onValueChange={(v) => update('customer_id', v === "none" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecteer klant</SelectItem>
            {(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {projects.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">Project</Label>
          <Select value={draft.project_id || "none"} onValueChange={(v) => update('project_id', v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecteer project</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Activiteit</Label>
        <Select
          value={draft._showCustomActivity ? "__custom__" : (draft.activity_id || "none")}
          onValueChange={(v) => {
            setDraft(prev => {
              if (v === "__custom__") return { ...prev, activity_id: "", _showCustomActivity: true, custom_activity: "" };
              return { ...prev, activity_id: v === "none" ? "" : v, _showCustomActivity: false, custom_activity: "" };
            });
          }}
        >
          <SelectTrigger><SelectValue placeholder="Activiteit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecteer activiteit</SelectItem>
            {(activiteiten || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            <SelectItem value="__custom__">✏️ Vrije invoer</SelectItem>
          </SelectContent>
        </Select>
        {draft._showCustomActivity && (
          <Input className="mt-1" value={draft.custom_activity || ""}
            onChange={(e) => update("custom_activity", e.target.value)}
            placeholder="Typ activiteit..." autoFocus />
        )}
      </div>
    </div>
  );
}