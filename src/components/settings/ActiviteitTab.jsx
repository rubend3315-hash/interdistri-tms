import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, GripVertical } from "lucide-react";

export default function ActiviteitTab() {
  const { data: activiteiten = [], isLoading } = useQuery({
    queryKey: ["activiteiten"],
    queryFn: () => base44.entities.Activiteit.list(),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Activiteit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activiteiten"] });
      setShowDialog(false);
      setSelected(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Activiteit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activiteiten"] });
      setShowDialog(false);
      setSelected(null);
    },
  });

  const sorted = [...activiteiten].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Activiteiten (Standplaatswerk)</h3>
        <Button
          size="sm"
          className="bg-blue-900"
          onClick={() => {
            setSelected(null);
            setShowDialog(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Nieuwe Activiteit
        </Button>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Laden...</p>
      ) : sorted.length === 0 ? (
        <p className="text-slate-500">Geen activiteiten beschikbaar. Voeg er een toe om de dropdown in Standplaatswerk te vullen.</p>
      ) : (
        <div className="grid gap-1">
          {sorted.map((item) => (
            <div key={item.id} className="px-3 py-1.5 border rounded hover:bg-slate-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 text-sm">
                  <GripVertical className="w-4 h-4 text-slate-300" />
                  <span className="font-medium text-slate-700">{item.name}</span>
                  {item.description && (
                    <span className="text-xs text-slate-400">{item.description}</span>
                  )}
                  <Badge
                    className={
                      item.status === "Actief"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }
                  >
                    {item.status || "Actief"}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setSelected(item);
                    setShowDialog(true);
                  }}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? "Activiteit bewerken" : "Nieuwe Activiteit"}</DialogTitle>
          </DialogHeader>
          <ActiviteitForm
            activiteit={selected}
            onSubmit={(data) => {
              if (selected) {
                updateMutation.mutate({ id: selected.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            onCancel={() => setShowDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActiviteitForm({ activiteit, onSubmit, isSubmitting, onCancel }) {
  const [formData, setFormData] = useState(
    activiteit || {
      name: "",
      description: "",
      sort_order: 0,
      status: "Actief",
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      sort_order: Number(formData.sort_order) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Naam *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="bijv. Laden/Lossen"
        />
      </div>
      <div className="space-y-2">
        <Label>Omschrijving</Label>
        <Input
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optionele omschrijving"
        />
      </div>
      <div className="space-y-2">
        <Label>Sorteervolgorde</Label>
        <Input
          type="number"
          value={formData.sort_order}
          onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status || "Actief"}
          onValueChange={(v) => setFormData({ ...formData, status: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Actief">Actief</SelectItem>
            <SelectItem value="Inactief">Inactief</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Annuleren
        </Button>
        <Button type="submit" className="flex-1 bg-blue-900" disabled={isSubmitting}>
          Opslaan
        </Button>
      </div>
    </form>
  );
}