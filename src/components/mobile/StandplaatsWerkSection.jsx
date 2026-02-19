import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Package, ChevronDown, ChevronRight } from "lucide-react";

export default function StandplaatsWerkSection({
  standplaatsWerk,
  setStandplaatsWerk,
  customers,
  projects,
  activiteiten,
}) {
  const addRegel = () => {
    setStandplaatsWerk([
      ...standplaatsWerk,
      { customer_id: "", project_id: "", activity_id: "", notes: "" }
    ]);
  };

  const updateRegel = (index, field, value) => {
    const updated = [...standplaatsWerk];
    updated[index] = { ...updated[index], [field]: value };
    // Reset project wanneer klant wijzigt
    if (field === "customer_id") {
      updated[index].project_id = "";
    }
    setStandplaatsWerk(updated);
  };

  const removeRegel = (index) => {
    setStandplaatsWerk(standplaatsWerk.filter((_, i) => i !== index));
  };

  const [collapsedRegels, setCollapsedRegels] = useState({});
  const [manuallyExpanded, setManuallyExpanded] = useState({});
  const prevCompleteRef = useRef({});
  const activeActiviteiten = activiteiten.filter(a => a.status !== "Inactief");

  // Auto-collapse regels die net volledig zijn geworden
  useEffect(() => {
    const newCollapsed = { ...collapsedRegels };
    let changed = false;
    standplaatsWerk.forEach((regel, index) => {
      const wasComplete = prevCompleteRef.current[index];
      const nowComplete = isComplete(regel);
      if (nowComplete && !wasComplete && !manuallyExpanded[index]) {
        newCollapsed[index] = true;
        changed = true;
      }
      prevCompleteRef.current[index] = nowComplete;
    });
    if (changed) setCollapsedRegels(newCollapsed);
  }, [standplaatsWerk]);

  const toggleCollapse = (index) => {
    const willCollapse = !collapsedRegels[index];
    setCollapsedRegels(prev => ({ ...prev, [index]: willCollapse }));
    // Track als gebruiker handmatig uitklapt, zodat auto-collapse niet overruled
    if (!willCollapse) {
      setManuallyExpanded(prev => ({ ...prev, [index]: true }));
    } else {
      setManuallyExpanded(prev => ({ ...prev, [index]: false }));
    }
  };

  const isFilled = (regel) => {
    return regel.customer_id || regel.activity_id || regel.start_time || regel.notes;
  };

  const isComplete = (regel) => {
    const hasTime = regel.start_time && regel.end_time;
    const hasActivity = regel.activity_id || regel.custom_activity;
    if (regel.customer_id) {
      return hasTime && !!regel.project_id && hasActivity;
    }
    return hasTime && hasActivity;
  };

  const getRegelSummary = (regel) => {
    const parts = [];
    if (regel.start_time || regel.end_time) parts.push(`${regel.start_time || '?'} - ${regel.end_time || '?'}`);
    if (regel.customer_id) {
      const c = customers.find(c => c.id === regel.customer_id);
      if (c) parts.push(c.company_name);
    }
    if (regel.activity_id) {
      const a = activiteiten.find(a => a.id === regel.activity_id);
      if (a) parts.push(a.name);
    } else if (regel.custom_activity) {
      parts.push(regel.custom_activity);
    }
    return parts.length > 0 ? parts.join(' • ') : 'Niet ingevuld';
  };

  return (
    <div className="space-y-4">
      {/* Blauwe balk */}
      <Card className="bg-amber-700 text-white">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold">Standplaatswerk (Loodswerk)</p>
              <p className="text-xs text-amber-100">Werk uitgevoerd op de standplaats</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {standplaatsWerk.map((regel, index) => {
        const filteredProjects = regel.customer_id
          ? projects.filter(p => p.customer_id === regel.customer_id && p.status === "Actief")
          : [];
        const canCollapse = isFilled(regel);
        const isCollapsed = collapsedRegels[index] && canCollapse;

        return (
          <Card key={index} className={`border-2 ${isCollapsed ? 'border-amber-100 bg-amber-50/30' : 'border-amber-200'}`}>
            <CardContent className={isCollapsed ? "p-3" : "p-4 space-y-3"}>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleCollapse(index)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  {isCollapsed
                    ? <ChevronRight className="w-4 h-4 text-amber-600" />
                    : <ChevronDown className="w-4 h-4 text-amber-600" />
                  }
                  <h3 className="font-semibold text-slate-900 text-sm">Regel {index + 1}</h3>
                  {isCollapsed && (
                    <span className="text-xs text-slate-500 truncate ml-1">{getRegelSummary(regel)}</span>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  {isCollapsed && (
                    <Button variant="ghost" size="icon" onClick={() => toggleCollapse(index)}>
                      <Plus className="w-4 h-4 text-amber-600" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeRegel(index)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {!isCollapsed && (
              <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Begintijd</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength="5"
                    value={regel.start_time || ""}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9]/g, '');
                      if (value.length >= 3) value = value.slice(0, 2) + ':' + value.slice(2, 4);
                      updateRegel(index, "start_time", value);
                    }}
                    placeholder="08:00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Eindtijd</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength="5"
                    value={regel.end_time || ""}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9]/g, '');
                      if (value.length >= 3) value = value.slice(0, 2) + ':' + value.slice(2, 4);
                      updateRegel(index, "end_time", value);
                    }}
                    placeholder="16:00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Klant</Label>
                <Select
                  value={regel.customer_id || "none"}
                  onValueChange={(v) => updateRegel(index, "customer_id", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer klant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecteer klant</SelectItem>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredProjects.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Project</Label>
                  <Select
                    value={regel.project_id || "none"}
                    onValueChange={(v) => updateRegel(index, "project_id", v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecteer project</SelectItem>
                      {filteredProjects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Activiteit</Label>
                <Select
                  value={regel._showCustomActivity ? "__custom__" : (regel.activity_id || "none")}
                  onValueChange={(v) => {
                    const updated = [...standplaatsWerk];
                    if (v === "__custom__") {
                      updated[index] = { ...updated[index], activity_id: "", _showCustomActivity: true, custom_activity: "" };
                    } else {
                      updated[index] = { ...updated[index], activity_id: v === "none" ? "" : v, _showCustomActivity: false, custom_activity: "" };
                    }
                    setStandplaatsWerk(updated);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer activiteit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecteer activiteit</SelectItem>
                    {activeActiviteiten.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">✏️ Vrije invoer</SelectItem>
                  </SelectContent>
                </Select>
                {regel._showCustomActivity && (
                  <Input
                    className="mt-1"
                    value={regel.custom_activity || ""}
                    onChange={(e) => updateRegel(index, "custom_activity", e.target.value)}
                    placeholder="Typ activiteit..."
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Opmerkingen</Label>
                <Textarea
                  value={regel.notes || ""}
                  onChange={(e) => updateRegel(index, "notes", e.target.value)}
                  rows={2}
                  placeholder="Bijzonderheden..."
                />
              </div>
              </>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button
        variant="outline"
        className="w-full border-dashed border-2 border-amber-300 py-6"
        onClick={addRegel}
      >
        <Plus className="w-5 h-5 mr-2" />
        Standplaatswerk toevoegen
      </Button>
    </div>
  );
}