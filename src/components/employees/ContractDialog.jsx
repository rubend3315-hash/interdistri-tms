import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function ContractDialog({ open, onOpenChange, contract, onSave, preFilledData, contractList = [] }) {
  const { data: salaryTables = [] } = useQuery({
    queryKey: ['salaryTables'],
    queryFn: () => base44.entities.SalaryTable.list(),
    enabled: open
  });

  const [formData, setFormData] = useState(contract || {
    startdatum: '',
    einddatum: '',
    type_contract: 'Vast Contract',
    loonschaal: '',
    uren_per_week: 0,
    week1: { maandag: true, dinsdag: true, woensdag: true, donderdag: true, vrijdag: true, zaterdag: false, zondag: false },
    week2: { maandag: true, dinsdag: true, woensdag: true, donderdag: true, vrijdag: true, zaterdag: false, zondag: false },
    reiskostenvergoeding: 'Woon-werkverkeer',
    status: 'Actief'
  });

  useEffect(() => {
    if (contract) {
      setFormData(contract);
    } else if (open && preFilledData?.startdatum) {
      setFormData(prev => ({ ...prev, startdatum: preFilledData.startdatum }));
    }
  }, [contract, open, preFilledData]);

  const uniqueScales = salaryTables
    .filter(t => t.status === 'Actief')
    .reduce((acc, table) => {
      const key = `${table.scale}${table.step != null ? ` Trede ${table.step}` : ''}`;
      if (!acc.find(item => item.key === key)) {
        acc.push({ key, scale: table.scale, step: table.step, table_type: table.table_type });
      }
      return acc;
    }, [])
    .sort((a, b) => {
      if (a.scale !== b.scale) return a.scale.localeCompare(b.scale);
      return (a.step || 0) - (b.step || 0);
    });

  const [overlapError, setOverlapError] = useState('');

  const checkOverlap = (newContract) => {
    const newStart = new Date(newContract.startdatum);
    const newEnd = newContract.einddatum ? new Date(newContract.einddatum) : new Date('2999-12-31');
    const otherContracts = contractList.filter((c, i) => {
      if (contract?.index !== undefined && i === contract.index) return false;
      if (c.status === 'Inactief' || c.status === 'Beëindigd') return false;
      return true;
    });
    for (const other of otherContracts) {
      const otherStart = new Date(other.startdatum);
      const otherEnd = other.einddatum ? new Date(other.einddatum) : new Date('2999-12-31');
      if (newStart <= otherEnd && newEnd >= otherStart) {
        const otherLabel = `${format(otherStart, 'dd-MM-yyyy')} - ${other.einddatum ? format(otherEnd, 'dd-MM-yyyy') : 'doorlopend'}`;
        return `Deze contractregel overlapt met een bestaande actieve contractregel (${otherLabel}). Pas de datums aan of beëindig eerst de andere regel.`;
      }
    }
    return '';
  };

  const handleSaveWithValidation = () => {
    const error = checkOverlap(formData);
    if (error) { setOverlapError(error); return; }
    setOverlapError('');
    onSave(formData);
  };

  const calculateHoursPerDayWeek = (week) => {
    const daysChecked = Object.values(week).filter(Boolean).length;
    return daysChecked > 0 ? (formData.uren_per_week / daysChecked).toFixed(4) : 0;
  };

  const calculateWeekTotal = (week) => {
    const daysChecked = Object.values(week).filter(Boolean).length;
    if (daysChecked === 0) return '0';
    return formData.uren_per_week;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe Contractregel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Startdatum *</Label>
              <Input type="date" value={formData.startdatum} onChange={(e) => setFormData({ ...formData, startdatum: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Einddatum</Label>
              <Input type="date" value={formData.einddatum} onChange={(e) => setFormData({ ...formData, einddatum: e.target.value })} />
              <p className="text-xs text-slate-500">Leeg laten voor doorlopend contract</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type Contract *</Label>
              <Select value={formData.type_contract} onValueChange={(v) => setFormData({ ...formData, type_contract: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vast Contract">Vast Contract</SelectItem>
                  <SelectItem value="Tijdelijk Contract">Tijdelijk Contract</SelectItem>
                  <SelectItem value="Oproepcontract">Oproepcontract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loonschaal CAO *</Label>
              <Select value={formData.loonschaal} onValueChange={(v) => setFormData({ ...formData, loonschaal: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer loonschaal" /></SelectTrigger>
                <SelectContent>
                  {uniqueScales.length === 0 ? (
                    <SelectItem value={null} disabled>Geen loonschalen beschikbaar</SelectItem>
                  ) : (
                    uniqueScales.map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.table_type === 'Bijzondere loontabel' && '⭐ '}{item.key}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contractuele Uren per Week</Label>
            <Input type="number" value={formData.uren_per_week} onChange={(e) => setFormData({ ...formData, uren_per_week: Number(e.target.value) })} />
          </div>

          <div className="space-y-4">
            <div>
              <Label>Weekrooster (verdeling van uren per week)</Label>
              <p className="text-xs text-slate-500 mt-1">De uren worden automatisch verdeeld over de aangevinkte werkdagen per week</p>
            </div>

            {[{ weekKey: 'week1', label: 'Week 1 (Oneven weken)' }, { weekKey: 'week2', label: 'Week 2 (Even weken)' }].map(({ weekKey, label }) => (
              <Card key={weekKey}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{label} - {calculateHoursPerDayWeek(formData[weekKey])}u per werkdag</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day, i) => {
                      const key = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'][i];
                      const hoursPerDay = calculateHoursPerDayWeek(formData[weekKey]);
                      return (
                        <div key={i} className="space-y-1">
                          <Label className="text-xs">{day}</Label>
                          <div className={`h-8 flex items-center justify-center rounded border-2 ${formData[weekKey][key] ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                            {formData[weekKey][key] ? hoursPerDay : '-'}
                          </div>
                          <label className="flex items-center justify-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={formData[weekKey][key]} onChange={() => setFormData({ ...formData, [weekKey]: { ...formData[weekKey], [key]: !formData[weekKey][key] } })} className="w-3 h-3" />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Totaal {weekKey === 'week1' ? 'week 1' : 'week 2'}: <strong>{calculateWeekTotal(formData[weekKey])}u</strong></p>
                </CardContent>
              </Card>
            ))}

            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm text-slate-600">Totale contractuele uren per week: <strong>{formData.uren_per_week}u</strong></p>
              <p className="text-xs text-slate-500 mt-1">Week 1 en Week 2 kunnen verschillende verdelingen hebben</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reiskostenvergoeding</Label>
            <Select value={formData.reiskostenvergoeding} onValueChange={(v) => setFormData({ ...formData, reiskostenvergoeding: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Woon-werkverkeer">Woon-werkverkeer</SelectItem>
                <SelectItem value="Geen">Geen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status || 'Actief'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Actief">Actief</SelectItem>
                <SelectItem value="Beëindigd">Beëindigd</SelectItem>
                <SelectItem value="Inactief">Inactief</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {overlapError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{overlapError}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button className="flex-1 bg-blue-900" onClick={handleSaveWithValidation} disabled={!formData.startdatum || !formData.type_contract}>Opslaan</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}