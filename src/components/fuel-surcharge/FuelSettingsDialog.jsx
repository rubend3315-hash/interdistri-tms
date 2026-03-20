import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FuelSettingsDialog({ open, onClose, settings, onSave, customers }) {
  const [form, setForm] = useState({
    customer_id: '',
    vehicle_type: '',
    base_fuel_price: '',
    calculation_method: 'km',
    fuel_consumption_per_km: '0.143',
    fuel_consumption_per_hour: '2.5',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        customer_id: settings.customer_id || '',
        vehicle_type: settings.vehicle_type || '',
        base_fuel_price: String(settings.base_fuel_price || ''),
        calculation_method: settings.calculation_method || 'km',
        fuel_consumption_per_km: String(settings.fuel_consumption_per_km || '0.143'),
        fuel_consumption_per_hour: String(settings.fuel_consumption_per_hour || '2.5'),
      });
    } else {
      setForm({
        customer_id: '',
        vehicle_type: '',
        base_fuel_price: '',
        calculation_method: 'km',
        fuel_consumption_per_km: '0.143',
        fuel_consumption_per_hour: '2.5',
      });
    }
  }, [settings, open]);

  const handleSave = () => {
    onSave({
      ...form,
      base_fuel_price: parseFloat(form.base_fuel_price) || 0,
      fuel_consumption_per_km: parseFloat(form.fuel_consumption_per_km) || 0.143,
      fuel_consumption_per_hour: parseFloat(form.fuel_consumption_per_hour) || 2.5,
      is_active: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{settings ? 'Instellingen bewerken' : 'Nieuwe klant-instellingen'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Klant</Label>
            <Select value={form.customer_id} onValueChange={(v) => setForm(f => ({ ...f, customer_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Voertuigtype</Label>
            <Select value={form.vehicle_type} onValueChange={(v) => setForm(f => ({ ...f, vehicle_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecteer voertuigtype" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Bestelbus">Bestelbus</SelectItem>
                <SelectItem value="Vrachtwagen">Vrachtwagen</SelectItem>
                <SelectItem value="Kleine vrachtwagen">Kleine vrachtwagen</SelectItem>
                <SelectItem value="Kleine bestelbus">Kleine bestelbus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Basisprijs brandstof (€/liter excl. BTW)</Label>
            <Input
              type="number" step="0.0001"
              value={form.base_fuel_price}
              onChange={(e) => setForm(f => ({ ...f, base_fuel_price: e.target.value }))}
              placeholder="bijv. 1.2500"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Berekeningswijze</Label>
            <Select value={form.calculation_method} onValueChange={(v) => setForm(f => ({ ...f, calculation_method: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="km">Per kilometer</SelectItem>
                <SelectItem value="hour">Per uur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.calculation_method === 'km' && (
            <div className="space-y-1.5">
              <Label>Verbruik per km (liter/km)</Label>
              <Input
                type="number" step="0.01"
                value={form.fuel_consumption_per_km}
                onChange={(e) => setForm(f => ({ ...f, fuel_consumption_per_km: e.target.value }))}
                placeholder="bijv. 0.10 (= 1 op 10)"
              />
              <p className="text-xs text-slate-500">0.10 = 1 op 10 | 0.20 = 1 op 5</p>
            </div>
          )}

          {form.calculation_method === 'hour' && (
            <div className="space-y-1.5">
              <Label>Verbruik per uur (liter/uur)</Label>
              <Input
                type="number" step="0.1"
                value={form.fuel_consumption_per_hour}
                onChange={(e) => setForm(f => ({ ...f, fuel_consumption_per_hour: e.target.value }))}
                placeholder="bijv. 2.5"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuleren</Button>
          <Button onClick={handleSave} disabled={!form.customer_id || !form.vehicle_type || !form.base_fuel_price}>Opslaan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}