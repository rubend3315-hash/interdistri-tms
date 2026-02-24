import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Package, Plus, Trash2, Save, Clock, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import ProgressSteps from "@/components/mobile/ProgressSteps";
import AutoSaveIndicator from "@/components/mobile/AutoSaveIndicator";

const timeToMinutes = (time) => {
  if (!time || time.length < 5) return null;
  const [h, m] = time.split(':').map(Number);
  return (isNaN(h) || isNaN(m)) ? null : h * 60 + m;
};

function hasOverlap(newRule, existingRules, excludeId) {
  const newStart = timeToMinutes(newRule.start_time);
  const newEnd = timeToMinutes(newRule.end_time);
  if (newStart === null || newEnd === null) return false;
  // Normalize: if end <= start, treat as next-day
  const nEnd = newEnd <= newStart ? newEnd + 1440 : newEnd;

  return existingRules.some(rule => {
    if (rule.id === excludeId) return false;
    const rStart = timeToMinutes(rule.start_time);
    const rEnd = timeToMinutes(rule.end_time);
    if (rStart === null || rEnd === null) return false;
    const rEndN = rEnd <= rStart ? rEnd + 1440 : rEnd;
    return newStart < rEndN && nEnd > rStart;
  });
}

const EMPTY_TRIP = {
  start_time: "", end_time: "", departure_location: "Standplaats",
  vehicle_id: "", damage_occurred: "Nee",
  start_km: "", end_km: "", fuel_liters: "", adblue_liters: "",
  fuel_km: "", charging_kwh: "", customer_id: "", route_name: "",
  planned_stops: "", notes: ""
};

const EMPTY_STANDPLAATS = {
  start_time: "", end_time: "", customer_id: "", project_id: "",
  activity_id: "", custom_activity: "", notes: ""
};

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export default function DienstRegelsTab({
  dienstRegels, setDienstRegels,
  vehicles, customers, routes, tiModelRoutes, projects, activiteiten,
  progressStep, lastSavedAt, isSaving, isSubmitting,
  storageKey, onSaveDraft, setActiveTab
}) {
  const [collapsed, setCollapsed] = useState({});

  const activeActiviteiten = (activiteiten || []).filter(a => a.status !== "Inactief");

  const addRegel = (type) => {
    const newRegel = {
      id: generateId(),
      type,
      ...(type === "rit" ? { ...EMPTY_TRIP } : { ...EMPTY_STANDPLAATS }),
    };
    setDienstRegels([...dienstRegels, newRegel]);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  const updateRegel = (id, field, value) => {
    setDienstRegels(prev => {
      const updated = prev.map(r => {
        if (r.id !== id) return r;
        const newR = { ...r, [field]: value };
        if (field === "customer_id") newR.project_id = "";
        return newR;
      });

      // Check overlap on time field changes
      if (field === "start_time" || field === "end_time") {
        const changed = updated.find(r => r.id === id);
        if (changed?.start_time && changed?.end_time && hasOverlap(changed, updated, id)) {
          toast.error("Tijden overlappen. Je kunt geen rit en standplaats tegelijk registreren.");
        }
      }
      return updated;
    });
  };

  const removeRegel = async (id) => {
    const regel = dienstRegels.find(r => r.id === id);
    if (regel?._existingId && regel.type === "standplaats") {
      try { await (await import("@/api/base44Client")).base44.entities.StandplaatsWerk.delete(regel._existingId); } catch {}
    }
    setDienstRegels(prev => prev.filter(r => r.id !== id));
  };

  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const sorted = [...dienstRegels].sort((a, b) => {
    const aMin = timeToMinutes(a.start_time) ?? 9999;
    const bMin = timeToMinutes(b.start_time) ?? 9999;
    return aMin - bMin;
  });

  const timeInput = (value, onChange, placeholder) => (
    <Input
      type="text" inputMode="numeric" maxLength="5" value={value}
      onChange={(e) => {
        let v = e.target.value.replace(/[^0-9]/g, '');
        if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2, 4);
        onChange(v);
      }}
      placeholder={placeholder}
    />
  );

  const hasAnyRegels = dienstRegels.length > 0;
  const hasTrips = dienstRegels.some(r => r.type === "rit");

  return (
    <div className="space-y-4">
      <ProgressSteps steps={["Start dienst", "Dienstregels", "Eindtijd", "Indienen"]} currentStep={progressStep} />
      <AutoSaveIndicator lastSavedAt={lastSavedAt} isSaving={isSaving} />

      <Card className="bg-slate-800 text-white">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold">Dienstregels</p>
              <p className="text-xs text-slate-300">Voeg ritten en/of standplaatswerk toe</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {sorted.map((regel) => {
        const isRit = regel.type === "rit";
        const isCol = collapsed[regel.id];
        const borderColor = isRit ? "border-blue-200" : "border-amber-200";
        const bgCollapsed = isRit ? "bg-blue-50/30" : "bg-amber-50/30";

        return (
          <Card key={regel.id} className={`border-2 ${isCol ? borderColor + ' ' + bgCollapsed : borderColor}`}>
            <CardContent className={isCol ? "p-3" : "p-4 space-y-3"}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => toggleCollapse(regel.id)} className="flex items-center gap-2 flex-1 text-left">
                  {isCol ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isRit
                    ? <Truck className="w-4 h-4 text-blue-600" />
                    : <Package className="w-4 h-4 text-amber-600" />
                  }
                  <span className="font-semibold text-sm text-slate-900">
                    {isRit ? "Rit" : "Standplaats"}
                  </span>
                  {isCol && (
                    <span className="text-xs text-slate-500 truncate ml-1">
                      {regel.start_time || '?'} – {regel.end_time || '?'}
                    </span>
                  )}
                </button>
                <Button variant="ghost" size="icon" onClick={() => removeRegel(regel.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>

              {/* Expanded content */}
              {!isCol && (
                <>
                  {/* Time fields (shared) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{isRit ? "Start Rit" : "Begintijd"}</Label>
                      {timeInput(regel.start_time, (v) => updateRegel(regel.id, 'start_time', v), "09:00")}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{isRit ? "Einde Rit" : "Eindtijd"}</Label>
                      {timeInput(regel.end_time, (v) => updateRegel(regel.id, 'end_time', v), "15:00")}
                    </div>
                  </div>

                  {/* Rit-specific fields */}
                  {isRit && <RitFields regel={regel} updateRegel={updateRegel} vehicles={vehicles} customers={customers} routes={routes} tiModelRoutes={tiModelRoutes} dienstRegels={dienstRegels} setDienstRegels={setDienstRegels} timeInput={timeInput} />}

                  {/* Standplaats-specific fields */}
                  {!isRit && <StandplaatsFields regel={regel} updateRegel={updateRegel} customers={customers} projects={projects} activiteiten={activeActiviteiten} dienstRegels={dienstRegels} setDienstRegels={setDienstRegels} />}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Add buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="border-dashed border-2 border-blue-300 py-6 flex flex-col gap-1" onClick={() => addRegel("rit")}>
          <Truck className="w-5 h-5 text-blue-600" />
          <span className="text-xs">+ Rit</span>
        </Button>
        <Button variant="outline" className="border-dashed border-2 border-amber-300 py-6 flex flex-col gap-1" onClick={() => addRegel("standplaats")}>
          <Package className="w-5 h-5 text-amber-600" />
          <span className="text-xs">+ Standplaats</span>
        </Button>
      </div>

      {hasAnyRegels && (
        <div className="space-y-2 pt-4 border-t mt-4">
          <Button variant="outline" className="w-full py-3 border-emerald-300 bg-emerald-50" onClick={onSaveDraft} disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" /> Tussentijds Opslaan & Terug naar Home
          </Button>
          {hasTrips && (
            <Button className="w-full py-3 bg-blue-600 hover:bg-blue-700" onClick={async () => { await onSaveDraft(); setActiveTab("dienst"); }} disabled={isSubmitting}>
              <Clock className="w-4 h-4 mr-2" /> Volgende → Einde diensttijd invoeren
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Rit-specific fields ── */
function RitFields({ regel, updateRegel, vehicles, customers, routes, tiModelRoutes, dienstRegels, setDienstRegels }) {
  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs">Vertreklocatie</Label>
        <Input value={regel.departure_location} onChange={(e) => updateRegel(regel.id, 'departure_location', e.target.value)} placeholder="bijv. Standplaats" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Kenteken *</Label>
        <Select value={regel.vehicle_id} onValueChange={(v) => updateRegel(regel.id, 'vehicle_id', v)}>
          <SelectTrigger><SelectValue placeholder="Selecteer voertuig" /></SelectTrigger>
          <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.license_plate}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Schade gereden?</Label>
        <Select value={regel.damage_occurred || "Nee"} onValueChange={(v) => updateRegel(regel.id, 'damage_occurred', v)}>
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
          <Input type="number" value={regel.start_km} onChange={(e) => updateRegel(regel.id, 'start_km', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Eind km</Label>
          <Input type="number" value={regel.end_km} onChange={(e) => updateRegel(regel.id, 'end_km', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Brandstof (liter)</Label>
          <Input type="number" step="0.01" value={regel.fuel_liters || ""} onChange={(e) => updateRegel(regel.id, 'fuel_liters', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">AdBlue (liter)</Label>
          <Input type="number" step="0.01" value={regel.adblue_liters || ""} onChange={(e) => updateRegel(regel.id, 'adblue_liters', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Km-stand van tanken</Label>
          <Input type="number" value={regel.fuel_km || ""} onChange={(e) => updateRegel(regel.id, 'fuel_km', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">E-laden (kWh)</Label>
          <Input type="number" step="0.01" value={regel.charging_kwh || ""} onChange={(e) => updateRegel(regel.id, 'charging_kwh', e.target.value)} placeholder="Als aan laadpaal" />
        </div>
      </div>

      <div className="pt-3 border-t">
        <div className="bg-emerald-600 text-white p-2 rounded-lg mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" /><span className="text-sm font-semibold">Route Details</span>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Klant (verplicht om te voltooien)</Label>
            <Select value={regel.customer_id || "none"} onValueChange={(v) => updateRegel(regel.id, 'customer_id', v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecteer klant</SelectItem>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Selecteer route</Label>
              <Select value={regel.route_name || "none"} onValueChange={(v) => {
                setDienstRegels(prev => prev.map(r => {
                  if (r.id !== regel.id) return r;
                  if (v === "__custom__") return { ...r, route_name: "", _showCustomRoute: true };
                  return { ...r, route_name: v === "none" ? "" : v, _showCustomRoute: false };
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecteer route" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecteer route</SelectItem>
                  {[...tiModelRoutes].filter(r => !regel.customer_id || r.customer_id === regel.customer_id)
                    .sort((a, b) => (a.route_code || '').localeCompare(b.route_code || '', undefined, { numeric: true }))
                    .map(r => <SelectItem key={`ti-${r.id}`} value={r.route_code || r.route_name}>{r.route_code} - {r.route_name}</SelectItem>)}
                  <SelectItem value="__custom__">✏️ Vrije invoer</SelectItem>
                  {[...routes].filter(r => !regel.customer_id || r.customer_id === regel.customer_id)
                    .sort((a, b) => (a.route_code || '').localeCompare(b.route_code || '', undefined, { numeric: true }))
                    .map(r => <SelectItem key={`rt-${r.id}`} value={r.route_code || r.route_name}>{r.route_code} - {r.route_name}</SelectItem>)}
                </SelectContent>
              </Select>
              {regel._showCustomRoute && (
                <Input className="mt-1" value={regel.route_name}
                  onChange={(e) => setDienstRegels(prev => prev.map(r => r.id !== regel.id ? r : { ...r, route_name: e.target.value, _showCustomRoute: true }))}
                  placeholder="Typ routenaam..." autoFocus />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bestelde stops</Label>
              <Input type="number" value={regel.planned_stops} onChange={(e) => updateRegel(regel.id, 'planned_stops', e.target.value)} placeholder="bijv. 85" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Opmerkingen</Label>
            <Textarea value={regel.notes} onChange={(e) => updateRegel(regel.id, 'notes', e.target.value)} rows={2} placeholder="Bijzonderheden..." />
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Standplaats-specific fields ── */
function StandplaatsFields({ regel, updateRegel, customers, projects, activiteiten, dienstRegels, setDienstRegels }) {
  const filteredProjects = regel.customer_id
    ? projects.filter(p => p.customer_id === regel.customer_id && p.status === "Actief")
    : [];

  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs">Klant</Label>
        <Select value={regel.customer_id || "none"} onValueChange={(v) => updateRegel(regel.id, 'customer_id', v === "none" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecteer klant</SelectItem>
            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {filteredProjects.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">Project</Label>
          <Select value={regel.project_id || "none"} onValueChange={(v) => updateRegel(regel.id, 'project_id', v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Selecteer project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecteer project</SelectItem>
              {filteredProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Activiteit</Label>
        <Select
          value={regel._showCustomActivity ? "__custom__" : (regel.activity_id || "none")}
          onValueChange={(v) => {
            setDienstRegels(prev => prev.map(r => {
              if (r.id !== regel.id) return r;
              if (v === "__custom__") return { ...r, activity_id: "", _showCustomActivity: true, custom_activity: "" };
              return { ...r, activity_id: v === "none" ? "" : v, _showCustomActivity: false, custom_activity: "" };
            }));
          }}
        >
          <SelectTrigger><SelectValue placeholder="Selecteer activiteit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecteer activiteit</SelectItem>
            {activiteiten.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            <SelectItem value="__custom__">✏️ Vrije invoer</SelectItem>
          </SelectContent>
        </Select>
        {regel._showCustomActivity && (
          <Input className="mt-1" value={regel.custom_activity || ""}
            onChange={(e) => updateRegel(regel.id, "custom_activity", e.target.value)}
            placeholder="Typ activiteit..." autoFocus />
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Opmerkingen</Label>
        <Textarea value={regel.notes || ""} onChange={(e) => updateRegel(regel.id, 'notes', e.target.value)} rows={2} placeholder="Bijzonderheden..." />
      </div>
    </>
  );
}