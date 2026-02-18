import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Package } from "lucide-react";

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

  const activeActiviteiten = activiteiten.filter(a => a.status !== "Inactief");

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

        return (
          <Card key={index} className="border-2 border-amber-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-sm">Regel {index + 1}</h3>
                <Button variant="ghost" size="icon" onClick={() => removeRegel(index)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
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
                  value={regel.activity_id || "none"}
                  onValueChange={(v) => updateRegel(index, "activity_id", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer activiteit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecteer activiteit</SelectItem>
                    {activeActiviteiten.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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