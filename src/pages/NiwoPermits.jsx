import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  FileText,
  Car,
  Calendar,
  Trash2,
  AlertTriangle
} from "lucide-react";

const statuses = ["Beschikbaar", "Toegewezen", "Verlopen"];

export default function NiwoPermits() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState(null);
  const queryClient = useQueryClient();

  const { data: permits = [], isLoading } = useQuery({
    queryKey: ['niwoPermits'],
    queryFn: () => base44.entities.NiwoPermit.list()
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.NiwoPermit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niwoPermits'] });
      setIsDialogOpen(false);
      setSelectedPermit(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.NiwoPermit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niwoPermits'] });
      setIsDialogOpen(false);
      setSelectedPermit(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NiwoPermit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niwoPermits'] });
    }
  });

  const [formData, setFormData] = useState({
    permit_number: "",
    validity_date: "",
    assigned_vehicle_id: "",
    status: "Beschikbaar",
    notes: ""
  });

  const resetForm = () => {
    setFormData({
      permit_number: "",
      validity_date: "",
      assigned_vehicle_id: "",
      status: "Beschikbaar",
      notes: ""
    });
  };

  const openEditDialog = (permit) => {
    setSelectedPermit(permit);
    setFormData({
      permit_number: permit.permit_number,
      validity_date: permit.validity_date,
      assigned_vehicle_id: permit.assigned_vehicle_id || "",
      status: permit.status,
      notes: permit.notes || ""
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedPermit(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      status: formData.assigned_vehicle_id ? "Toegewezen" : "Beschikbaar"
    };

    if (selectedPermit) {
      updateMutation.mutate({ id: selectedPermit.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const filteredPermits = permits.filter(p =>
    p.permit_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status, validityDate) => {
    if (validityDate) {
      const daysUntil = differenceInDays(new Date(validityDate), new Date());
      if (daysUntil < 0) return "bg-red-100 text-red-700";
      if (daysUntil <= 30) return "bg-amber-100 text-amber-700";
    }
    switch (status) {
      case "Beschikbaar": return "bg-emerald-100 text-emerald-700";
      case "Toegewezen": return "bg-blue-100 text-blue-700";
      case "Verlopen": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getVehicle = (id) => vehicles.find(v => v.id === id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">NIWO Vergunningen</h1>
          <p className="text-slate-500 mt-1">{permits.length} vergunningen geregistreerd</p>
        </div>
        <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Vergunning
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Zoek op vergunningsnummer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Permits List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filteredPermits.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Geen vergunningen gevonden</h3>
          <p className="text-slate-500 mt-1">Voeg een nieuwe vergunning toe.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPermits.map(permit => {
            const vehicle = getVehicle(permit.assigned_vehicle_id);
            const daysUntil = permit.validity_date 
              ? differenceInDays(new Date(permit.validity_date), new Date()) 
              : null;
            
            return (
              <Card 
                key={permit.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEditDialog(permit)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">
                          {permit.permit_number}
                        </h3>
                        <Badge className={getStatusColor(permit.status, permit.validity_date)}>
                          {permit.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Geldig tot: {permit.validity_date 
                        ? format(new Date(permit.validity_date), "d MMM yyyy", { locale: nl })
                        : '-'}
                    </div>
                    
                    {vehicle && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Car className="w-4 h-4 text-slate-400" />
                        {vehicle.license_plate} - {vehicle.brand}
                      </div>
                    )}

                    {daysUntil !== null && daysUntil <= 30 && daysUntil >= 0 && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                        Verloopt over {daysUntil} dagen
                      </div>
                    )}

                    {daysUntil !== null && daysUntil < 0 && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                        Verlopen
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedPermit ? 'Vergunning Bewerken' : 'Nieuwe Vergunning'}</span>
              {selectedPermit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Weet je zeker dat je deze vergunning wilt verwijderen?')) {
                      deleteMutation.mutate(selectedPermit.id);
                      setIsDialogOpen(false);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Vergunningsnummer *</Label>
              <Input
                value={formData.permit_number}
                onChange={(e) => setFormData({ ...formData, permit_number: e.target.value })}
                required
                placeholder="bijv. NL-2024-12345"
              />
            </div>

            <div className="space-y-2">
              <Label>Geldigheidsdatum *</Label>
              <Input
                type="date"
                value={formData.validity_date}
                onChange={(e) => setFormData({ ...formData, validity_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Toegewezen aan voertuig</Label>
              <Select 
                value={formData.assigned_vehicle_id || "none"} 
                onValueChange={(v) => setFormData({ ...formData, assigned_vehicle_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer voertuig" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Niet toegewezen</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.license_plate} - {v.brand} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Opmerkingen</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Opslaan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}