import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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
  Truck,
  User,
  Calendar,
  MapPin,
  Gauge,
  Fuel,
  Package,
  Trash2
} from "lucide-react";

const statuses = ["Gepland", "Onderweg", "Voltooid", "Geannuleerd"];

export default function Trips() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const queryClient = useQueryClient();

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => base44.entities.Trip.list('-date', 100)
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Trip.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsDialogOpen(false);
      setSelectedTrip(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Trip.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsDialogOpen(false);
      setSelectedTrip(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Trip.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    }
  });

  const [formData, setFormData] = useState({
    employee_id: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    vehicle_id: "",
    customer_id: "",
    route_name: "",
    planned_stops: "",
    completed_stops: "",
    start_km: "",
    end_km: "",
    fuel_liters: "",
    fuel_cost: "",
    cargo_description: "",
    cargo_weight: "",
    departure_time: "",
    arrival_time: "",
    status: "Gepland",
    notes: ""
  });

  const resetForm = () => {
    setFormData({
      employee_id: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      vehicle_id: "",
      customer_id: "",
      route_name: "",
      planned_stops: "",
      completed_stops: "",
      start_km: "",
      end_km: "",
      fuel_liters: "",
      fuel_cost: "",
      cargo_description: "",
      cargo_weight: "",
      departure_time: "",
      arrival_time: "",
      status: "Gepland",
      notes: ""
    });
  };

  const openEditDialog = (trip) => {
    setSelectedTrip(trip);
    setFormData({
      ...trip,
      planned_stops: trip.planned_stops || "",
      completed_stops: trip.completed_stops || "",
      start_km: trip.start_km || "",
      end_km: trip.end_km || "",
      fuel_liters: trip.fuel_liters || "",
      fuel_cost: trip.fuel_cost || "",
      cargo_weight: trip.cargo_weight || ""
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedTrip(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      planned_stops: formData.planned_stops ? Number(formData.planned_stops) : null,
      completed_stops: formData.completed_stops ? Number(formData.completed_stops) : null,
      start_km: formData.start_km ? Number(formData.start_km) : null,
      end_km: formData.end_km ? Number(formData.end_km) : null,
      total_km: formData.start_km && formData.end_km ? Number(formData.end_km) - Number(formData.start_km) : null,
      fuel_liters: formData.fuel_liters ? Number(formData.fuel_liters) : null,
      fuel_cost: formData.fuel_cost ? Number(formData.fuel_cost) : null,
      cargo_weight: formData.cargo_weight ? Number(formData.cargo_weight) : null
    };

    if (selectedTrip) {
      updateMutation.mutate({ id: selectedTrip.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const getEmployee = (id) => employees.find(e => e.id === id);
  const getVehicle = (id) => vehicles.find(v => v.id === id);
  const getCustomer = (id) => customers.find(c => c.id === id);

  const filteredTrips = trips.filter(t => {
    const matchesDate = !filterDate || t.date === filterDate;
    const employee = getEmployee(t.employee_id);
    const vehicle = getVehicle(t.vehicle_id);
    const matchesSearch = 
      t.route_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle?.license_plate?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Gepland": return "bg-blue-100 text-blue-700";
      case "Onderweg": return "bg-amber-100 text-amber-700";
      case "Voltooid": return "bg-emerald-100 text-emerald-700";
      case "Geannuleerd": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ritten</h1>
          <p className="text-slate-500 mt-1">Registratie van ritten, km-standen en brandstof</p>
        </div>
        <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Rit
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoek op route, chauffeur of kenteken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full md:w-44"
            />
            <Button 
              variant="outline" 
              onClick={() => setFilterDate("")}
            >
              Alle data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trips List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        <Card className="p-12 text-center">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Geen ritten gevonden</h3>
          <p className="text-slate-500 mt-1">Voeg een nieuwe rit toe of pas de filters aan.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTrips.map(trip => {
            const employee = getEmployee(trip.employee_id);
            const vehicle = getVehicle(trip.vehicle_id);
            const customer = getCustomer(trip.customer_id);
            
            return (
              <Card 
                key={trip.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEditDialog(trip)}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Truck className="w-7 h-7 text-slate-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">
                            {trip.route_name || 'Rit'}
                          </h3>
                          <Badge className={getStatusColor(trip.status)}>
                            {trip.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                           <span className="flex items-center gap-1">
                             <Calendar className="w-4 h-4 text-slate-400" />
                             {trip.date && format(new Date(trip.date), "d MMM yyyy", { locale: nl })}
                           </span>
                          {employee && (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4 text-slate-400" />
                              {employee.first_name} {employee.last_name}
                            </span>
                          )}
                          {vehicle && (
                            <span className="flex items-center gap-1">
                              <Truck className="w-4 h-4 text-slate-400" />
                              {vehicle.license_plate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      {trip.total_km && (
                        <div className="text-center">
                          <p className="text-slate-500">Kilometers</p>
                          <p className="font-semibold text-slate-900">{trip.total_km} km</p>
                        </div>
                      )}
                      {trip.planned_stops && (
                        <div className="text-center">
                          <p className="text-slate-500">Stops</p>
                          <p className="font-semibold text-slate-900">
                            {trip.completed_stops || 0}/{trip.planned_stops}
                          </p>
                        </div>
                      )}
                      {trip.departure_time && (
                        <div className="text-center">
                          <p className="text-slate-500">Vertrek</p>
                          <p className="font-semibold text-slate-900">{trip.departure_time}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedTrip ? 'Rit Bewerken' : 'Nieuwe Rit'}</span>
              {selectedTrip && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Weet je zeker dat je deze rit wilt verwijderen?')) {
                      deleteMutation.mutate(selectedTrip.id);
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Chauffeur *</Label>
                <Select 
                  value={formData.employee_id} 
                  onValueChange={(v) => setFormData({ ...formData, employee_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.status === 'Actief').map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Voertuig *</Label>
                <Select 
                  value={formData.vehicle_id} 
                  onValueChange={(v) => setFormData({ ...formData, vehicle_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.license_plate} - {v.brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Datum *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
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
                <Label>Route naam</Label>
                <Input
                  value={formData.route_name}
                  onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Klant</Label>
                <Select 
                  value={formData.customer_id || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, customer_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen</SelectItem>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Geplande stops</Label>
                <Input
                  type="number"
                  value={formData.planned_stops}
                  onChange={(e) => setFormData({ ...formData, planned_stops: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Afgeronde stops</Label>
                <Input
                  type="number"
                  value={formData.completed_stops}
                  onChange={(e) => setFormData({ ...formData, completed_stops: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Begin km-stand</Label>
                <Input
                  type="number"
                  value={formData.start_km}
                  onChange={(e) => setFormData({ ...formData, start_km: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Eind km-stand</Label>
                <Input
                  type="number"
                  value={formData.end_km}
                  onChange={(e) => setFormData({ ...formData, end_km: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vertrektijd</Label>
                <Input
                  type="time"
                  value={formData.departure_time}
                  onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Aankomsttijd</Label>
                <Input
                  type="time"
                  value={formData.arrival_time}
                  onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Getankte liters</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fuel_liters}
                  onChange={(e) => setFormData({ ...formData, fuel_liters: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Brandstofkosten (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fuel_cost}
                  onChange={(e) => setFormData({ ...formData, fuel_cost: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lading omschrijving</Label>
                <Input
                  value={formData.cargo_description}
                  onChange={(e) => setFormData({ ...formData, cargo_description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ladinggewicht (kg)</Label>
                <Input
                  type="number"
                  value={formData.cargo_weight}
                  onChange={(e) => setFormData({ ...formData, cargo_weight: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opmerkingen</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
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