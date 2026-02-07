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
  Car,
  Truck,
  Calendar,
  Gauge,
  Fuel,
  Trash2,
  FileText,
  AlertTriangle
} from "lucide-react";

const vehicleTypes = ["Vrachtwagen", "Bestelbus", "Personenauto", "Aanhanger"];
const fuelTypes = ["Diesel", "Benzine", "Elektrisch", "Hybride", "LNG", "CNG"];
const statuses = ["Beschikbaar", "In gebruik", "In onderhoud", "Defect", "Uit dienst"];

export default function Vehicles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const { data: niwoPermits = [] } = useQuery({
    queryKey: ['niwoPermits'],
    queryFn: () => base44.entities.NiwoPermit.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsDialogOpen(false);
      setSelectedVehicle(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsDialogOpen(false);
      setSelectedVehicle(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    }
  });

  const [formData, setFormData] = useState({
    license_plate: "",
    brand: "",
    model: "",
    type: "",
    fuel_type: "",
    year: "",
    apk_expiry: "",
    insurance_expiry: "",
    tachograph_calibration_date: "",
    current_mileage: "",
    niwo_permit_id: "",
    status: "Beschikbaar",
    max_weight: "",
    notes: ""
  });

  const resetForm = () => {
    setFormData({
      license_plate: "",
      brand: "",
      model: "",
      type: "",
      fuel_type: "",
      year: "",
      apk_expiry: "",
      insurance_expiry: "",
      tachograph_calibration_date: "",
      current_mileage: "",
      niwo_permit_id: "",
      status: "Beschikbaar",
      max_weight: "",
      notes: ""
    });
  };

  const openEditDialog = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      ...vehicle,
      year: vehicle.year || "",
      current_mileage: vehicle.current_mileage || "",
      max_weight: vehicle.max_weight || ""
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedVehicle(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    // Clean empty strings for enum/optional fields
    Object.keys(submitData).forEach(key => {
      if (typeof submitData[key] === 'string' && submitData[key].trim() === '') {
        submitData[key] = null;
      }
    });
    // Convert numeric fields
    submitData.year = formData.year ? Number(formData.year) : null;
    submitData.current_mileage = formData.current_mileage ? Number(formData.current_mileage) : null;
    submitData.max_weight = formData.max_weight ? Number(formData.max_weight) : null;

    if (selectedVehicle) {
      updateMutation.mutate({ id: selectedVehicle.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      v.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || v.type === filterType;
    const matchesStatus = filterStatus === "all" || v.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getExpiryBadge = (date, label) => {
    if (!date) return null;
    const daysUntil = differenceInDays(new Date(date), new Date());
    if (daysUntil < 0) return <Badge variant="destructive">{label} verlopen</Badge>;
    if (daysUntil <= 30) return <Badge className="bg-amber-500">{label} verloopt binnenkort</Badge>;
    return null;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Beschikbaar": return "bg-emerald-100 text-emerald-700";
      case "In gebruik": return "bg-blue-100 text-blue-700";
      case "In onderhoud": return "bg-amber-100 text-amber-700";
      case "Defect": return "bg-red-100 text-red-700";
      case "Uit dienst": return "bg-slate-100 text-slate-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getVehicleIcon = (type) => {
    if (type === "Vrachtwagen") return Truck;
    return Car;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Voertuigen</h1>
          <p className="text-slate-500 mt-1">{vehicles.length} voertuigen in het wagenpark</p>
        </div>
        <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuw Voertuig
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoek op kenteken, merk of model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Alle types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle types</SelectItem>
                {vehicleTypes.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Alle statussen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filteredVehicles.length === 0 ? (
        <Card className="p-12 text-center">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Geen voertuigen gevonden</h3>
          <p className="text-slate-500 mt-1">Pas je zoekcriteria aan of voeg een nieuw voertuig toe.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map(vehicle => {
            const VehicleIcon = getVehicleIcon(vehicle.type);
            const niwoPermit = niwoPermits.find(p => p.id === vehicle.niwo_permit_id);
            
            return (
              <Card 
                key={vehicle.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEditDialog(vehicle)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center">
                      <VehicleIcon className="w-7 h-7 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">
                            {vehicle.license_plate}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {vehicle.brand} {vehicle.model}
                          </p>
                        </div>
                        <Badge className={getStatusColor(vehicle.status)}>
                          {vehicle.status}
                        </Badge>
                      </div>
                      
                      <div className="mt-3 space-y-1.5">
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          <Fuel className="w-3.5 h-3.5" />
                          {vehicle.fuel_type || '-'}
                        </p>
                        {vehicle.current_mileage && (
                          <p className="text-xs text-slate-500 flex items-center gap-2">
                            <Gauge className="w-3.5 h-3.5" />
                            {vehicle.current_mileage.toLocaleString()} km
                          </p>
                        )}
                        {niwoPermit && (
                          <p className="text-xs text-slate-500 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            NIWO: {niwoPermit.permit_number}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {getExpiryBadge(vehicle.apk_expiry, "APK")}
                        {getExpiryBadge(vehicle.insurance_expiry, "Verzekering")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedVehicle ? 'Voertuig Bewerken' : 'Nieuw Voertuig'}</span>
              {selectedVehicle && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Weet je zeker dat je dit voertuig wilt verwijderen?')) {
                      deleteMutation.mutate(selectedVehicle.id);
                      setIsDialogOpen(false);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kenteken *</Label>
                <Input
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                  required
                  placeholder="AB-123-CD"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Merk *</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brandstof</Label>
                <Select 
                  value={formData.fuel_type} 
                  onValueChange={(v) => setFormData({ ...formData, fuel_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bouwjaar</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="2024"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kilometerstand</Label>
                <Input
                  type="number"
                  value={formData.current_mileage}
                  onChange={(e) => setFormData({ ...formData, current_mileage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max laadvermogen (kg)</Label>
                <Input
                  type="number"
                  value={formData.max_weight}
                  onChange={(e) => setFormData({ ...formData, max_weight: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>APK vervaldatum</Label>
                <Input
                  type="date"
                  value={formData.apk_expiry}
                  onChange={(e) => setFormData({ ...formData, apk_expiry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Verzekering vervalt</Label>
                <Input
                  type="date"
                  value={formData.insurance_expiry}
                  onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tachograaf ijkdatum</Label>
                <Input
                  type="date"
                  value={formData.tachograph_calibration_date}
                  onChange={(e) => setFormData({ ...formData, tachograph_calibration_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>NIWO Vergunning</Label>
              <Select 
                value={formData.niwo_permit_id || "none"} 
                onValueChange={(v) => setFormData({ ...formData, niwo_permit_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer vergunning" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen vergunning</SelectItem>
                  {niwoPermits
                    .filter(p => p.status === 'Beschikbaar' || p.id === formData.niwo_permit_id)
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.permit_number} - {p.status}
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}