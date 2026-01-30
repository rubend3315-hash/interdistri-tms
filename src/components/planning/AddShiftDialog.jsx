import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function AddShiftDialog({ 
  open, 
  onOpenChange, 
  employees, 
  uurcodes, 
  routes, 
  vehicles,
  customers,
  onSave 
}) {
  const [formData, setFormData] = useState({
    employee_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "",
    end_time: "",
    shift: "",
    route_id: "",
    vehicle_id: "",
    customer_id: "",
    status: "Gepland"
  });

  const handleSave = () => {
    if (!formData.employee_id || !formData.date) {
      return;
    }
    onSave(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      employee_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      start_time: "",
      end_time: "",
      shift: "",
      route_id: "",
      vehicle_id: "",
      customer_id: "",
      status: "Gepland"
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe Dienst</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Medewerker *</Label>
            <Select value={formData.employee_id} onValueChange={(v) => setFormData({...formData, employee_id: v})}>
              <SelectTrigger id="employee">
                <SelectValue placeholder="Selecteer medewerker" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Datum *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">Starttijd</Label>
            <Input
              id="start_time"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({...formData, start_time: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_time">Eindtijd</Label>
            <Input
              id="end_time"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({...formData, end_time: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift">Shift</Label>
            <Select value={formData.shift} onValueChange={(v) => setFormData({...formData, shift: v})}>
              <SelectTrigger id="shift">
                <SelectValue placeholder="Selecteer shift" />
              </SelectTrigger>
              <SelectContent>
                {uurcodes.map(code => (
                  <SelectItem key={code.id} value={code.code}>
                    {code.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="route">Route</Label>
            <Select value={formData.route_id} onValueChange={(v) => setFormData({...formData, route_id: v})}>
              <SelectTrigger id="route">
                <SelectValue placeholder="Selecteer route" />
              </SelectTrigger>
              <SelectContent>
                {routes.map(route => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.route_code} - {route.route_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle">Voertuig</Label>
            <Select value={formData.vehicle_id} onValueChange={(v) => setFormData({...formData, vehicle_id: v})}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="Selecteer voertuig" />
              </SelectTrigger>
              <SelectContent>
                {vehicles?.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.license_plate} - {vehicle.brand} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer">Klant</Label>
            <Select value={formData.customer_id} onValueChange={(v) => setFormData({...formData, customer_id: v})}>
              <SelectTrigger id="customer">
                <SelectValue placeholder="Selecteer klant" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gepland">Gepland</SelectItem>
                <SelectItem value="Bevestigd">Bevestigd</SelectItem>
                <SelectItem value="Onderweg">Onderweg</SelectItem>
                <SelectItem value="Voltooid">Voltooid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!formData.employee_id || !formData.date}>
            Opslaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}