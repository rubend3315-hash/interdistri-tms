import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ReiskostenDialog({ open, onOpenChange, reiskosten, employee, onSave }) {
  const [formData, setFormData] = useState(reiskosten || {
    startdatum: '', einddatum: '', afstand_km: 0, vergoeding_per_dag: 0, status: 'Actief'
  });
  const [berekendBedrag, setBerekendBedrag] = useState(0);

  useEffect(() => {
    if (reiskosten) {
      setFormData(reiskosten);
      setBerekendBedrag(Number((Number(reiskosten.afstand_km || 0) * 0.23).toFixed(2)));
    } else if (open) {
      setFormData({ startdatum: '', einddatum: '', afstand_km: 0, vergoeding_per_dag: 0, status: 'Actief' });
      setBerekendBedrag(0);
    }
  }, [reiskosten, open]);

  const berekenVergoeding = () => {
    const berekend = Number((Number(formData.afstand_km || 0) * 0.23).toFixed(2));
    setBerekendBedrag(berekend);
    setFormData({ ...formData, vergoeding_per_dag: berekend });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{reiskosten ? 'Reiskostenregel bewerken' : 'Nieuwe Reiskostenregel'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg space-y-1">
            <p className="text-sm font-medium">Standplaats</p>
            <p className="text-sm text-slate-600">Fleerbosseweg 19, 4421 RR Kapelle</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg space-y-1">
            <p className="text-sm font-medium">Woonadres medewerker</p>
            <p className="text-sm text-slate-600">
              {employee?.address && employee?.postal_code && employee?.city
                ? `${employee.address}, ${employee.postal_code} ${employee.city}`
                : 'Geen adres ingevuld'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Startdatum *</Label>
              <Input type="date" value={formData.startdatum} onChange={(e) => setFormData({ ...formData, startdatum: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Einddatum</Label>
              <Input type="date" value={formData.einddatum} onChange={(e) => setFormData({ ...formData, einddatum: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Afstand enkele reis (km)</Label>
              <Button variant="outline" size="sm" onClick={berekenVergoeding}>Bereken</Button>
            </div>
            <Input type="number" step="0.1" value={formData.afstand_km} onChange={(e) => setFormData({ ...formData, afstand_km: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Berekende vergoeding (afstand × €0,23)</Label>
            <Input type="number" step="0.01" value={berekendBedrag} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed" />
            <p className="text-xs text-slate-500">Read-only — wijzigt alleen wanneer je op "Bereken" klikt</p>
          </div>
          <div className="space-y-2">
            <Label>Vergoeding enkele reis (handmatig aanpasbaar)</Label>
            <Input type="number" step="0.01" value={formData.vergoeding_per_dag} onChange={(e) => setFormData({ ...formData, vergoeding_per_dag: Number(e.target.value) })} />
            <p className="text-xs text-slate-500">Dit is de eindvergoeding die gebruikt wordt voor uitbetaling</p>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status || 'Actief'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Actief">Actief</SelectItem>
                <SelectItem value="Inactief">Inactief</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button className="flex-1 bg-blue-900" onClick={() => onSave(formData)} disabled={!formData.startdatum}>Opslaan</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}