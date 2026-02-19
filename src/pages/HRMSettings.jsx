import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit } from "lucide-react";
import DepartmentTab from "../components/settings/DepartmentTab";
import FunctionTab from "../components/settings/FunctionTab";
import ActiviteitTab from "../components/settings/ActiviteitTab";
import PayrollSettingsTab from "../components/settings/PayrollSettingsTab";

export default function HRMSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">HRM-instellingen</h1>
        <p className="text-slate-500 mt-1">Beheer afdelingen, functies, urensoorten en uurcodes</p>
      </div>

      <Tabs defaultValue="afdelingen" className="w-full">
        <TabsList>
          <TabsTrigger value="afdelingen">Afdelingen</TabsTrigger>
          <TabsTrigger value="functies">Functies</TabsTrigger>
          <TabsTrigger value="uurcode">Uurcode</TabsTrigger>
          <TabsTrigger value="urensoort">Urensoort</TabsTrigger>
          <TabsTrigger value="activiteiten">Activiteiten</TabsTrigger>
          <TabsTrigger value="loonadmin">Loonadministratie</TabsTrigger>
        </TabsList>

        <TabsContent value="afdelingen" className="mt-6">
          <DepartmentTab />
        </TabsContent>

        <TabsContent value="functies" className="mt-6">
          <FunctionTab />
        </TabsContent>

        <TabsContent value="uurcode" className="mt-6">
          <UurcodeTab />
        </TabsContent>

        <TabsContent value="urensoort" className="mt-6">
          <UrensoortTab />
        </TabsContent>

        <TabsContent value="activiteiten" className="mt-6">
          <ActiviteitTab />
        </TabsContent>

        <TabsContent value="loonadmin" className="mt-6">
          <PayrollSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UrensoortTab() {
  const { data: urensoorten = [], isLoading } = useQuery({
    queryKey: ['urensoorten'],
    queryFn: () => base44.entities.Urensoort.list()
  });

  const [showDialog, setShowDialog] = useState(false);
  const [selectedUrensoort, setSelectedUrensoort] = useState(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Urensoort.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urensoorten'] });
      setShowDialog(false);
      setSelectedUrensoort(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Urensoort.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urensoorten'] });
      setShowDialog(false);
      setSelectedUrensoort(null);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Urensoorten</h3>
        <Button 
          size="sm" 
          className="bg-blue-900"
          onClick={() => {
            setSelectedUrensoort(null);
            setShowDialog(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Nieuwe Urensoort
        </Button>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Laden...</p>
      ) : urensoorten.length === 0 ? (
        <p className="text-slate-500">Geen urensoorten beschikbaar</p>
      ) : (
        <div className="grid gap-1">
          {urensoorten.map((item) => (
            <div key={item.id} className="px-3 py-1.5 border rounded hover:bg-slate-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium text-slate-700">{item.code}</span>
                  <span className="text-slate-600">{item.name}</span>
                  {item.toeslag_percentage && <span className="text-xs text-slate-400">({item.toeslag_percentage}%)</span>}
                  {item.description && <span className="text-xs text-slate-400">{item.description}</span>}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setSelectedUrensoort(item);
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
            <DialogTitle>{selectedUrensoort ? 'Urensoort bewerken' : 'Nieuwe Urensoort'}</DialogTitle>
          </DialogHeader>
          <UrensoortForm
            urensoort={selectedUrensoort}
            onSubmit={(data) => {
              if (selectedUrensoort) {
                updateMutation.mutate({ id: selectedUrensoort.id, data });
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

function UrensoortForm({ urensoort, onSubmit, isSubmitting, onCancel }) {
  const { data: allUrensoorten = [] } = useQuery({
    queryKey: ['urensoorten'],
    queryFn: () => base44.entities.Urensoort.list()
  });

  const [formData, setFormData] = useState(() => {
    if (urensoort) {
      return urensoort;
    }
    const nextCode = `URS-${String(allUrensoorten.length + 1).padStart(3, '0')}`;
    return {
      code: nextCode,
      name: '',
      description: '',
      toeslag_percentage: '',
      status: 'Actief'
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Code</Label>
        <Input
          value={formData.code}
          disabled
          className="bg-slate-100"
        />
        <p className="text-xs text-slate-500">Automatisch gegenereerd</p>
      </div>
      <div className="space-y-2">
        <Label>Naam *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="bijv. Regelmatig"
        />
      </div>
      <div className="space-y-2">
        <Label>Omschrijving</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optionele omschrijving"
        />
      </div>
      <div className="space-y-2">
        <Label>Toeslag Percentage (%)</Label>
        <Input
          type="number"
          value={formData.toeslag_percentage}
          onChange={(e) => setFormData({ ...formData, toeslag_percentage: e.target.value })}
          placeholder="bijv. 25"
        />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
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

function UurcodeTab() {
  const { data: uuercodes = [], isLoading: isLoadingUurcodes } = useQuery({
    queryKey: ['uuercodes'],
    queryFn: () => base44.entities.Uurcode.list()
  });

  const { data: urensoorten = [] } = useQuery({
    queryKey: ['urensoorten'],
    queryFn: () => base44.entities.Urensoort.list()
  });

  const [showDialog, setShowDialog] = useState(false);
  const [selectedUurcode, setSelectedUurcode] = useState(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Uurcode.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uuercodes'] });
      setShowDialog(false);
      setSelectedUurcode(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Uurcode.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uuercodes'] });
      setShowDialog(false);
      setSelectedUurcode(null);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Uurcodes</h3>
        <Button 
          size="sm" 
          className="bg-blue-900"
          onClick={() => {
            setSelectedUurcode(null);
            setShowDialog(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Nieuwe Uurcode
        </Button>
      </div>

      {isLoadingUurcodes ? (
        <p className="text-slate-500">Laden...</p>
      ) : uuercodes.length === 0 ? (
        <p className="text-slate-500">Geen uurcodes beschikbaar</p>
      ) : (
        <div className="grid gap-1">
          {uuercodes.sort((a, b) => a.code.localeCompare(b.code)).map((item) => {
            const urensoort = urensoorten.find(u => u.id === item.urensoort_id);
            return (
              <div key={item.id} className="px-3 py-1.5 border rounded hover:bg-slate-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-slate-700">{item.code}</span>
                    <span className="text-slate-600">{item.name}</span>
                    {urensoort && <span className="text-xs text-slate-400">({urensoort.name})</span>}
                    {item.description && <span className="text-xs text-slate-400">{item.description}</span>}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setSelectedUurcode(item);
                      setShowDialog(true);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUurcode ? 'Uurcode bewerken' : 'Nieuwe Uurcode'}</DialogTitle>
          </DialogHeader>
          <UurcodeForm
            uurcode={selectedUurcode}
            urensoorten={urensoorten}
            onSubmit={(data) => {
              if (selectedUurcode) {
                updateMutation.mutate({ id: selectedUurcode.id, data });
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

function UurcodeForm({ uurcode, urensoorten, onSubmit, isSubmitting, onCancel }) {
  const { data: allUurcodes = [] } = useQuery({
    queryKey: ['uuercodes'],
    queryFn: () => base44.entities.Uurcode.list()
  });

  const [formData, setFormData] = useState(() => {
    if (uurcode) {
      return uurcode;
    }
    const nextCode = `URC-${String(allUurcodes.length + 1).padStart(3, '0')}`;
    return {
      code: nextCode,
      name: '',
      urensoort_id: '',
      description: '',
      status: 'Actief'
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Code</Label>
        <Input
          value={formData.code}
          disabled
          className="bg-slate-100"
        />
        <p className="text-xs text-slate-500">Automatisch gegenereerd</p>
      </div>
      <div className="space-y-2">
        <Label>Naam *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="bijv. Normale uren"
        />
      </div>

      <div className="space-y-2">
        <Label>Omschrijving</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optionele omschrijving"
        />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
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