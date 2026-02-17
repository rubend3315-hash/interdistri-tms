import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Building2, AlertCircle } from "lucide-react";

export default function DepartmentTab() {
  const queryClient = useQueryClient();
  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list('sort_order')
  });

  const [showDialog, setShowDialog] = useState(false);
  const [selected, setSelected] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Department.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setShowDialog(false);
      setSelected(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Department.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setShowDialog(false);
      setSelected(null);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Afdelingen</h3>
          <p className="text-sm text-slate-500">Beheer de afdelingen die beschikbaar zijn in de app</p>
        </div>
        <Button size="sm" className="bg-blue-900" onClick={() => { setSelected(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nieuwe Afdeling
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          Let op: de "Naam (technisch)" moet exact overeenkomen met de bestaande waarden in medewerkersrecords (bijv. "PakketDistributie"). Wijzig deze niet tenzij je weet wat je doet.
        </p>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Laden...</p>
      ) : departments.length === 0 ? (
        <p className="text-slate-500">Geen afdelingen beschikbaar</p>
      ) : (
        <div className="grid gap-1">
          {departments.map((dept) => (
            <div key={dept.id} className="px-3 py-2 border rounded hover:bg-slate-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">{dept.label}</span>
                  <span className="text-xs text-slate-400 font-mono">({dept.name})</span>
                  {dept.description && <span className="text-xs text-slate-400">{dept.description}</span>}
                  {dept.status === 'Inactief' && <Badge className="bg-slate-100 text-slate-600 text-xs">Inactief</Badge>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelected(dept); setShowDialog(true); }}>
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
            <DialogTitle>{selected ? 'Afdeling bewerken' : 'Nieuwe Afdeling'}</DialogTitle>
          </DialogHeader>
          <DepartmentForm
            department={selected}
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

function DepartmentForm({ department, onSubmit, isSubmitting, onCancel }) {
  const [formData, setFormData] = useState(department || {
    name: '',
    label: '',
    description: '',
    sort_order: 0,
    status: 'Actief'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Naam (technisch) *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="bijv. PakketDistributie"
        />
        <p className="text-xs text-slate-500">Moet overeenkomen met de waarde in Employee.department</p>
      </div>
      <div className="space-y-2">
        <Label>Weergavenaam *</Label>
        <Input
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          required
          placeholder="bijv. Pakket Distributie"
        />
      </div>
      <div className="space-y-2">
        <Label>Omschrijving</Label>
        <Input
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optionele omschrijving"
        />
      </div>
      <div className="space-y-2">
        <Label>Sorteervolgorde</Label>
        <Input
          type="number"
          value={formData.sort_order || 0}
          onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Actief">Actief</SelectItem>
            <SelectItem value="Inactief">Inactief</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Annuleren</Button>
        <Button type="submit" className="flex-1 bg-blue-900" disabled={isSubmitting}>Opslaan</Button>
      </div>
    </form>
  );
}