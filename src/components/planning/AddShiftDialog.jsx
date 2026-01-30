import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function AddShiftDialog({ 
  open, 
  onOpenChange, 
  employee, 
  date, 
  uurcodes = [],
  routes = [],
  vehicles = [],
  customers = [],
  onSave 
}) {
  const [formData, setFormData] = useState({
    uurcode: "",
    route_id: "",
    start_time: "",
    end_time: "",
    vehicle_id: "",
    customer_id: "",
    notes: "",
    departure_location: "",
    expected_return_time: ""
  });

  const handleSave = () => {
    onSave(formData);
    setFormData({
      uurcode: "",
      route_id: "",
      start_time: "",
      end_time: "",
      vehicle_id: "",
      customer_id: "",
      notes: "",
      departure_location: "",
      expected_return_time: ""
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe Dienst</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Medewerker en Datum */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Medewerker *</Label>
              <Input 
                value={employee ? `${employee.first_name} ${employee.last_name}` : ""} 
                disabled 
                className="bg-slate-50"
              />
            </div>
            <div>
              <Label>Datum *</Label>
              <Input 
                value={date ? format(new Date(date), "dd-MM-yyyy", { locale: nl }) : ""} 
                disabled 
                className="bg-slate-50"
              />
            </div>
          </div>

          {/* Starttijd en Eindtijd */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Starttijd</Label>
              <Input 
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label>Eindtijd</Label>
              <Input 
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          {/* Shift (Uurcode) */}
          <div>
            <Label>Shift</Label>
            <Select value={formData.uurcode} onValueChange={(v) => setFormData({ ...formData, uurcode: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer shift" />
              </SelectTrigger>
              <SelectContent>
                {uurcodes.map(code => (
                  <SelectItem key={code.id} value={code.code}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{code.code}</span>
                      <span className="text-xs text-slate-500">{code.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Route */}
          <div>
            <Label>Route</Label>
            <Input 
              placeholder="bijv. Route A1, Gebied Noord"
              value={formData.route_id}
              onChange={(e) => setFormData({ ...formData, route_id: e.target.value })}
            />
          </div>

          {/* Voertuig */}
          <div>
            <Label>Voertuig</Label>
            <Select value={formData.vehicle_id} onValueChange={(v) => setFormData({ ...formData, vehicle_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer voertuig" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.license_plate} - {vehicle.brand} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Klant */}
          <div>
            <Label>Klant</Label>
            <Input 
              placeholder="bijv. PostNL, DPG Media"
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
            />
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select defaultValue="Gepland">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gepland">Gepland</SelectItem>
                <SelectItem value="Bevestigd">Bevestigd</SelectItem>
                <SelectItem value="Geannuleerd">Geannuleerd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Opslaan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}