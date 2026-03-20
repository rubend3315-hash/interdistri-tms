import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { name: '', type: 'standplaats', address: '', lat: '', lon: '', radius_m: 500, is_active: true };

export default function GpsLocationDialog({ open, onOpenChange, location, onSuccess }) {
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();
  const isEdit = location?.id;

  useEffect(() => {
    if (open && location) {
      setForm({
        name: location.name || '',
        type: location.type || 'standplaats',
        address: location.address || '',
        lat: location.lat ?? '',
        lon: location.lon ?? '',
        radius_m: location.radius_m ?? 500,
        is_active: location.is_active !== false,
      });
    } else if (open) {
      setForm(EMPTY);
    }
  }, [open, location]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, lat: Number(data.lat), lon: Number(data.lon), radius_m: Number(data.radius_m) };
      return isEdit
        ? base44.entities.GpsLocation.update(location.id, payload)
        : base44.entities.GpsLocation.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gpsLocations'] });
      toast.success(isEdit ? 'Locatie bijgewerkt' : 'Locatie toegevoegd');
      onSuccess();
    },
    onError: (err) => toast.error(`Fout: ${err.message}`),
  });

  const valid = form.name && form.lat && form.lon && !isNaN(form.lat) && !isNaN(form.lon);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Locatie bewerken' : 'Locatie toevoegen'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-slate-500">Naam *</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Bijv. PostNL Sorteercentrum Goes" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Adres (optioneel)</Label>
            <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Bijv. Verrijn Stuartweg 5, Goes" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Breedtegraad (lat) *</Label>
              <Input type="number" step="any" value={form.lat} onChange={(e) => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="51.4943" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Lengtegraad (lon) *</Label>
              <Input type="number" step="any" value={form.lon} onChange={(e) => setForm(f => ({ ...f, lon: e.target.value }))} placeholder="3.8778" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Radius (meters)</Label>
            <Input type="number" value={form.radius_m} onChange={(e) => setForm(f => ({ ...f, radius_m: e.target.value }))} className="mt-1" />
            <p className="text-xs text-slate-400 mt-1">Standplaats: 500m aanbevolen · Depot: 300m aanbevolen</p>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-500">Actief</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button onClick={() => mutation.mutate(form)} disabled={!valid || mutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {isEdit ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}