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
  tiModelRoutes = [],
  vehicles = [],
  customers = [],
  departments = [],
  onSave,
  existingSchedules = []
}) {
  const [formData, setFormData] = useState({
    planned_department: "",
    pakket_shift: "",
    is_standby: false,
    is_training: false,
    route_id: "",
    time_block_day: false,
    time_block_evening: false,
    time_block_night: false,
    vehicle_id: "",
    notes_1: "",
    notes_2: "",
    copy_to_days: []
  });
  const [validationError, setValidationError] = useState("");

  React.useEffect(() => {
    if (open && employee) {
      const dept = employee.department || "";
      setFormData(prev => ({
        ...prev,
        planned_department: dept === "PakketDistributie" ? "PakketDistributie" : dept,
        pakket_shift: dept === "PakketDistributie" ? "Shift3" : ""
      }));
    }
  }, [open, employee]);

  const validateShift = () => {
    const dayIndex = new Date(date).getDay();
    const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayIndex];
    const scheduleForDay = existingSchedules[0];
    
    if (!scheduleForDay) return true;

    // Controleer dubbele medewerker op dezelfde afdeling
    if (scheduleForDay[dayKey] && scheduleForDay[dayKey] !== '-' && scheduleForDay[`${dayKey}_planned_department`] === formData.planned_department) {
      setValidationError(`Deze medewerker is al ingepland op afdeling "${formData.planned_department}" op deze dag.`);
      return false;
    }

    // Controleer dubbele voertuig op dezelfde afdeling
    if (formData.vehicle_id) {
      const vehicleAlreadyScheduled = existingSchedules.some(schedule => {
        const existingVehicleId = schedule[`${dayKey}_vehicle_id`];
        const existingDept = schedule[`${dayKey}_planned_department`];
        return existingVehicleId === formData.vehicle_id && existingDept === formData.planned_department;
      });
      if (vehicleAlreadyScheduled) {
        setValidationError(`Dit voertuig is al ingepland op afdeling "${formData.planned_department}" op deze dag.`);
        return false;
      }
    }

    // Controleer dubbele route op dezelfde afdeling
    if (formData.route_id) {
      const routeAlreadyScheduled = existingSchedules.some(schedule => {
        const existingRouteId = schedule[`${dayKey}_route_id`];
        const existingDept = schedule[`${dayKey}_planned_department`];
        return existingRouteId === formData.route_id && existingDept === formData.planned_department;
      });
      if (routeAlreadyScheduled) {
        setValidationError(`Deze route is al ingepland op afdeling "${formData.planned_department}" op deze dag.`);
        return false;
      }
    }

    setValidationError("");
    return true;
  };

  const getEffectiveDepartment = () => {
    if (formData.planned_department === "PakketDistributie" && formData.pakket_shift) {
      return `PakketDistributie_${formData.pakket_shift}`;
    }
    return formData.planned_department;
  };

  const handleSave = () => {
    if (!validateShift()) {
      return;
    }
    const saveData = {
      ...formData,
      planned_department: getEffectiveDepartment()
    };
    onSave(saveData);
    onOpenChange(false);
  };

  const handleClose = () => {
    const dept = employee?.department || "";
    setFormData({
      planned_department: dept === "PakketDistributie" ? "PakketDistributie" : dept,
      pakket_shift: dept === "PakketDistributie" ? "Shift3" : "",
      is_standby: false,
      is_training: false,
      route_id: "",
      time_block_day: false,
      time_block_evening: false,
      time_block_night: false,
      vehicle_id: "",
      notes_1: "",
      notes_2: "",
      copy_to_days: []
    });
    onOpenChange(false);
  };

  const toggleCopyDay = (day) => {
    setFormData(prev => ({
      ...prev,
      copy_to_days: prev.copy_to_days.includes(day)
        ? prev.copy_to_days.filter(d => d !== day)
        : [...prev.copy_to_days, day]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe Dienst</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
           {/* Validatie Fout */}
           {validationError && (
             <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
               <p className="text-sm text-red-700 font-medium">{validationError}</p>
             </div>
           )}

           {/* Datum */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <Label>Datum:</Label>
            <Input 
              value={date ? format(new Date(date), "dd-MM-yyyy", { locale: nl }) : ""} 
              disabled 
              className="bg-slate-100"
            />
          </div>

          {/* Medewerker */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <Label>Medewerker:</Label>
            <Input 
              value={employee ? `(${employee.employee_number || 'R.J.'}) ${employee.first_name} ${employee.last_name}` : ""} 
              disabled 
              className="bg-slate-100"
            />
          </div>

          {/* Medewerker afdeling */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <Label>Medewerker afdeling:</Label>
            <Input 
              value={employee?.department || ""} 
              disabled 
              className="bg-slate-100"
            />
          </div>

          {/* Geplande afdeling */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <Label>Geplande afdeling:</Label>
            <Select value={formData.planned_department} onValueChange={(v) => setFormData({ ...formData, planned_department: v, pakket_shift: v === "PakketDistributie" ? "Shift3" : "" })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer afdeling" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Management">Management</SelectItem>
                <SelectItem value="Transport">Transport</SelectItem>
                <SelectItem value="PakketDistributie">PakketDistributie</SelectItem>
                <SelectItem value="Charters">Charters</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shift keuze (alleen bij PakketDistributie) */}
          {formData.planned_department === "PakketDistributie" && (
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <Label>Shift:</Label>
              <Select value={formData.pakket_shift} onValueChange={(v) => setFormData({ ...formData, pakket_shift: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shift3">Shift 3</SelectItem>
                  <SelectItem value="Shift4">Shift 4</SelectItem>
                  <SelectItem value="Shift5">Shift 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Aangepaste dienst */}
          <div className="grid grid-cols-[120px_1fr] items-start gap-4">
            <Label className="pt-2">Aangepaste dienst:</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="standby"
                  checked={formData.is_standby}
                  onChange={(e) => setFormData({ ...formData, is_standby: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="standby" className="font-normal cursor-pointer">Stand-by</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="training"
                  checked={formData.is_training}
                  onChange={(e) => setFormData({ ...formData, is_training: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="training" className="font-normal cursor-pointer">Opleiding</Label>
              </div>
            </div>
          </div>

          {/* Route */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <Label>Route:</Label>
            <Select value={formData.route_id} onValueChange={(v) => setFormData({ ...formData, route_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Maak een keuze ..." />
              </SelectTrigger>
              <SelectContent>
                {formData.planned_department === "PakketDistributie"
                  ? tiModelRoutes.map(route => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.route_code} - {route.route_name}
                      </SelectItem>
                    ))
                  : routes.map(route => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.route_code} - {route.route_name}
                      </SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
          </div>

          {/* Tijdblokken */}
          <div className="grid grid-cols-[120px_1fr] items-start gap-4">
            <Label className="pt-2">Tijdblokken:</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="time_day"
                  checked={formData.time_block_day}
                  onChange={(e) => setFormData({ ...formData, time_block_day: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="time_day" className="font-normal cursor-pointer">Dag</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="time_evening"
                  checked={formData.time_block_evening}
                  onChange={(e) => setFormData({ ...formData, time_block_evening: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
                <Label htmlFor="time_evening" className="font-normal cursor-pointer">Avond</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="time_night"
                  checked={formData.time_block_night}
                  onChange={(e) => setFormData({ ...formData, time_block_night: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
                <Label htmlFor="time_night" className="font-normal cursor-pointer">Nacht</Label>
              </div>
            </div>
          </div>

          {/* Voertuig */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <Label>Voertuig:</Label>
            <Select value={formData.vehicle_id} onValueChange={(v) => setFormData({ ...formData, vehicle_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Maak een keuze ..." />
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

          {/* Opmerking 1 */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <Label>Opmerking 1:</Label>
            <Input 
              value={formData.notes_1}
              onChange={(e) => setFormData({ ...formData, notes_1: e.target.value })}
            />
          </div>

          {/* Opmerking 2 */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <Label>Opmerking 2:</Label>
            <Input 
              value={formData.notes_2}
              onChange={(e) => setFormData({ ...formData, notes_2: e.target.value })}
            />
          </div>

          {/* Kopieer naar */}
          <div className="grid grid-cols-[120px_1fr] items-start gap-4">
            <Label className="pt-2">Kopieer naar:</Label>
            <div className="flex gap-3 flex-wrap">
              {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day, idx) => (
                <div key={day} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    id={`copy_${day}`}
                    checked={formData.copy_to_days.includes(idx)}
                    onChange={() => toggleCopyDay(idx)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor={`copy_${day}`} className="font-normal cursor-pointer">{day}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
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