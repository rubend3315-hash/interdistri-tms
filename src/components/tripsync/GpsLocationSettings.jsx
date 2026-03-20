import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Plus, Trash2, Pencil, Building2, Package, Loader2, Car } from "lucide-react";
import { toast } from "sonner";
import GpsLocationDialog from "./GpsLocationDialog";
import VehicleHomeBaseList from "./VehicleHomeBaseList";

export default function GpsLocationSettings() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['gpsLocations'],
    queryFn: () => base44.entities.GpsLocation.filter({}, 'type'),
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GpsLocation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gpsLocations'] });
      toast.success('Locatie verwijderd');
    },
  });

  const standplaatsen = locations.filter(l => l.type === 'standplaats');
  const depots = locations.filter(l => l.type === 'depot');

  const handleEdit = (loc) => {
    setEditingLocation(loc);
    setDialogOpen(true);
  };

  const handleAdd = (type) => {
    setEditingLocation({ type });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Standplaats */}
      <LocationSection
        title="Standplaats"
        subtitle="Thuisbasis van het bedrijf — ritten worden gegroepeerd op basis van vertrek/aankomst bij deze locatie(s)"
        icon={Building2}
        iconColor="text-blue-600"
        locations={standplaatsen}
        isLoading={isLoading}
        onAdd={() => handleAdd('standplaats')}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        deleting={deleteMutation.isPending}
      />

      {/* Depots */}
      <LocationSection
        title="Depot-locaties"
        subtitle="PostNL depots en andere vaste laad/loslocaties — stops hier worden apart geteld in de ritanalyse"
        icon={Package}
        iconColor="text-amber-600"
        locations={depots}
        isLoading={isLoading}
        onAdd={() => handleAdd('depot')}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        deleting={deleteMutation.isPending}
      />

      {/* Vehicle Home Bases */}
      <VehicleHomeBaseList />

      {/* Dialog */}
      <GpsLocationDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingLocation(null); } }}
        location={editingLocation}
        onSuccess={() => { setDialogOpen(false); setEditingLocation(null); }}
      />
    </div>
  );
}

function LocationSection({ title, subtitle, icon: Icon, iconColor, locations, isLoading, onAdd, onEdit, onDelete, deleting }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Toevoegen
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      ) : locations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="px-4 py-6 text-center">
            <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Geen {title.toLowerCase()} geconfigureerd</p>
            <Button size="sm" variant="ghost" className="mt-2 text-xs text-blue-600" onClick={onAdd}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Eerste toevoegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {locations.map(loc => (
            <Card key={loc.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{loc.name}</span>
                    {!loc.is_active && <Badge className="text-[10px] bg-slate-100 text-slate-500">Inactief</Badge>}
                    <Badge className="text-[10px] bg-slate-50 text-slate-400">{loc.radius_m || 500}m radius</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {loc.address && <span>{loc.address} · </span>}
                    <span>{loc.lat?.toFixed(4)}, {loc.lon?.toFixed(4)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600" onClick={() => onEdit(loc)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600" onClick={() => onDelete(loc.id)} disabled={deleting}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}