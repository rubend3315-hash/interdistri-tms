import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Car, MapPin, Pencil, Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export default function VehicleHomeBaseList() {
  const [editVehicle, setEditVehicle] = useState(null);
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles-all'],
    queryFn: () => base44.entities.Vehicle.filter({}),
    staleTime: 5 * 60 * 1000,
  });

  const withHomeBase = vehicles.filter(v => v.home_base_lat && v.home_base_lon);
  const withoutHomeBase = vehicles.filter(v => !v.home_base_lat || !v.home_base_lon).filter(v => v.status !== 'Uit dienst');

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Voertuig-thuisbases</h3>
            <p className="text-xs text-slate-500">Voor voertuigen die bij een chauffeur thuis staan i.p.v. op de standplaats</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-16 rounded-lg" />
      ) : (
        <div className="space-y-2">
          {withHomeBase.map(v => (
            <Card key={v.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Car className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{v.license_plate}</span>
                    <span className="text-xs text-slate-500">{v.brand} {v.model}</span>
                    <Badge className="text-[10px] bg-emerald-50 text-emerald-600">{v.home_base_radius_m || 500}m radius</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Thuisbasis: {v.home_base_lat?.toFixed(4)}, {v.home_base_lon?.toFixed(4)}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600" onClick={() => setEditVehicle(v)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}

          {withoutHomeBase.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-slate-400 mb-2">{withoutHomeBase.length} voertuigen zonder thuisbasis — klik om toe te voegen:</p>
              <div className="flex flex-wrap gap-1.5">
                {withoutHomeBase.slice(0, 20).map(v => (
                  <button
                    key={v.id}
                    onClick={() => setEditVehicle(v)}
                    className="text-xs px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors border border-slate-200"
                  >
                    {v.license_plate}
                  </button>
                ))}
                {withoutHomeBase.length > 20 && <span className="text-xs text-slate-400 py-1">+{withoutHomeBase.length - 20} meer</span>}
              </div>
            </div>
          )}
        </div>
      )}

      <VehicleHomeBaseDialog
        vehicle={editVehicle}
        open={!!editVehicle}
        onOpenChange={(open) => { if (!open) setEditVehicle(null); }}
        onSuccess={() => setEditVehicle(null)}
      />
    </div>
  );
}

function VehicleHomeBaseDialog({ vehicle, open, onOpenChange, onSuccess }) {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [radius, setRadius] = useState(500);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && vehicle) {
      setLat(vehicle.home_base_lat ?? '');
      setLon(vehicle.home_base_lon ?? '');
      setRadius(vehicle.home_base_radius_m ?? 500);
    }
  }, [open, vehicle]);

  const mutation = useMutation({
    mutationFn: () => base44.entities.Vehicle.update(vehicle.id, {
      home_base_lat: lat ? Number(lat) : null,
      home_base_lon: lon ? Number(lon) : null,
      home_base_radius_m: Number(radius),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles-all'] });
      toast.success(`Thuisbasis ${lat ? 'ingesteld' : 'verwijderd'} voor ${vehicle.license_plate}`);
      onSuccess();
    },
  });

  if (!vehicle) return null;

  const valid = (!lat && !lon) || (lat && lon && !isNaN(lat) && !isNaN(lon));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Thuisbasis {vehicle.license_plate}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model}</p>
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Breedtegraad</Label>
              <Input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="51.4799" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Lengtegraad</Label>
              <Input type="number" step="any" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="3.9498" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Radius (m)</Label>
            <Input type="number" value={radius} onChange={(e) => setRadius(e.target.value)} className="mt-1" />
          </div>
          {(vehicle.home_base_lat || vehicle.home_base_lon) && (
            <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700 h-8 px-2" onClick={() => { setLat(''); setLon(''); }}>
              <X className="w-3.5 h-3.5 mr-1" /> Thuisbasis verwijderen
            </Button>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Opslaan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}