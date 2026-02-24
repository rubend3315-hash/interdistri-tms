import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Save, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import ProgressSteps from "@/components/mobile/ProgressSteps";
import AutoSaveIndicator from "@/components/mobile/AutoSaveIndicator";
import { validateDienstRegels, findOverlaps, timeToMinutes } from "@/components/utils/mobile/dienstRegelValidation";
import DienstRegelListItem from "@/components/mobile/dienstregels/DienstRegelListItem";
import DienstRegelDrawer from "@/components/mobile/dienstregels/DienstRegelDrawer";

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

/**
 * Compute prefill times for a new regel based on existing ones.
 * start = lastRegel.end_time, end = start + 1h
 */
function getPrefillTimes(dienstRegels, dienstStartTime) {
  const sorted = [...dienstRegels]
    .map(r => ({ ...r, _min: timeToMinutes(r.end_time) }))
    .filter(r => r._min !== null)
    .sort((a, b) => a._min - b._min);

  let startMin = null;
  if (sorted.length > 0) {
    startMin = sorted[sorted.length - 1]._min;
  } else if (dienstStartTime) {
    startMin = timeToMinutes(dienstStartTime);
  }

  if (startMin === null) return { start_time: "", end_time: "" };

  const endMin = startMin + 60;
  const fmt = (m) => {
    const h = Math.floor(m / 60) % 24;
    const mm = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };
  return { start_time: fmt(startMin), end_time: fmt(endMin) };
}

export default function DienstRegelsTab({
  dienstRegels, setDienstRegels,
  vehicles, customers, routes, tiModelRoutes, projects, activiteiten,
  progressStep, lastSavedAt, isSaving, isSubmitting,
  storageKey, onSaveDraft, setActiveTab,
  formData
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRegel, setEditingRegel] = useState(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // Real-time validation
  const isSingleDay = !formData?.end_date || formData.end_date === formData.date;
  const validation = useMemo(() =>
    validateDienstRegels(dienstRegels, formData?.start_time, formData?.end_time, isSingleDay),
    [dienstRegels, formData?.start_time, formData?.end_time, isSingleDay]
  );
  const hasValidationErrors = validation.hasOverlap || validation.hasGap;

  // Overlap set for highlighting
  const overlapSet = useMemo(() => {
    const set = new Set();
    const pairs = findOverlaps(dienstRegels);
    pairs.forEach(({ i, j }) => {
      if (dienstRegels[i]) set.add(dienstRegels[i].id);
      if (dienstRegels[j]) set.add(dienstRegels[j].id);
    });
    return set;
  }, [dienstRegels]);

  const sorted = useMemo(() =>
    [...dienstRegels].sort((a, b) => {
      const aMin = timeToMinutes(a.start_time) ?? 9999;
      const bMin = timeToMinutes(b.start_time) ?? 9999;
      return aMin - bMin;
    }),
    [dienstRegels]
  );

  const addRegel = (type) => {
    const prefill = getPrefillTimes(dienstRegels, formData?.start_time);
    const newRegel = {
      id: generateId(),
      type,
      ...(type === "rit" ? { ...EMPTY_TRIP } : { ...EMPTY_STANDPLAATS }),
      ...prefill,
    };
    setDienstRegels(prev => [...prev, newRegel]);
    setEditingRegel(newRegel);
    setDrawerOpen(true);
    setAddMenuOpen(false);
  };

  const handleTap = (regel) => {
    setEditingRegel(regel);
    setDrawerOpen(true);
  };

  const handleSaveRegel = (updatedRegel) => {
    setDienstRegels(prev => prev.map(r => r.id === updatedRegel.id ? updatedRegel : r));
  };

  const removeRegel = async (id) => {
    const regel = dienstRegels.find(r => r.id === id);
    if (regel?._existingId && regel.type === "standplaats") {
      try { await (await import("@/api/base44Client")).base44.entities.StandplaatsWerk.delete(regel._existingId); } catch {}
    }
    setDienstRegels(prev => prev.filter(r => r.id !== id));
  };

  const hasAnyRegels = dienstRegels.length > 0;

  return (
    <div className="space-y-3">
      <ProgressSteps steps={["Start dienst", "Dienstregels", "Eindtijd", "Indienen"]} currentStep={progressStep} />
      <AutoSaveIndicator lastSavedAt={lastSavedAt} isSaving={isSaving} />

      {/* Validation banner */}
      {hasValidationErrors && (
        <div className="p-2.5 bg-red-50 border border-red-300 rounded-lg space-y-1">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-xs">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Corrigeer de volgende problemen:</span>
          </div>
          {[...validation.overlaps, ...validation.gaps].map((msg, i) => (
            <p key={i} className="text-[11px] text-red-600 ml-5">• {msg}</p>
          ))}
        </div>
      )}

      {/* Header */}
      <Card className="bg-slate-800 text-white">
        <CardContent className="p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <div>
                <p className="text-sm font-semibold">Dienstregels</p>
                <p className="text-[11px] text-slate-300">{dienstRegels.length} regel{dienstRegels.length !== 1 ? 's' : ''} · Tik om te bewerken, veeg om te verwijderen</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">Nog geen regels toegevoegd</p>
          <p className="text-xs mt-1">Tik op '+ Regel toevoegen' hieronder</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((regel) => (
            <DienstRegelListItem
              key={regel.id}
              regel={regel}
              customers={customers}
              hasOverlap={overlapSet.has(regel.id)}
              onTap={() => handleTap(regel)}
              onDelete={() => removeRegel(regel.id)}
            />
          ))}
        </div>
      )}

      {/* Add button */}
      <div className="relative">
        {addMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg border shadow-lg p-2 space-y-1 z-10">
            <button
              type="button"
              onClick={() => addRegel("rit")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition text-left"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-base">🚛</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Rit</p>
                <p className="text-[11px] text-slate-500">Transport / bezorging</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => addRegel("standplaats")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-50 transition text-left"
            >
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-base">📦</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Standplaats</p>
                <p className="text-[11px] text-slate-500">Werk op locatie</p>
              </div>
            </button>
          </div>
        )}
        <Button
          variant="outline"
          className="w-full py-3 border-dashed border-2 border-slate-300 text-slate-600"
          onClick={() => setAddMenuOpen(prev => !prev)}
        >
          <Plus className="w-4 h-4 mr-2" /> Regel toevoegen
        </Button>
      </div>

      {/* Bottom actions */}
      {hasAnyRegels && (
        <div className="space-y-2 pt-3 border-t">
          <Button variant="outline" className="w-full py-2.5 border-emerald-300 bg-emerald-50 text-sm" onClick={onSaveDraft} disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" /> Opslaan & Terug
          </Button>
          <Button
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-sm"
            onClick={async () => { await onSaveDraft(); setActiveTab("dienst"); }}
            disabled={isSubmitting || hasValidationErrors}
          >
            <Clock className="w-4 h-4 mr-2" /> Volgende → Eindtijd invoeren
          </Button>
        </div>
      )}

      {/* Drawer */}
      <DienstRegelDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        regel={editingRegel}
        allRegels={dienstRegels}
        onSave={handleSaveRegel}
        vehicles={vehicles}
        customers={customers}
        routes={routes}
        tiModelRoutes={tiModelRoutes}
        projects={projects}
        activiteiten={activiteiten}
      />
    </div>
  );
}