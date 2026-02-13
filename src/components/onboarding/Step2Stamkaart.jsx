import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

export default function Step2Stamkaart({ employeeData, onChange, onNext, onBack }) {
  const update = (field, value) => {
    onChange({ ...employeeData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Stamkaart Werknemer
          </CardTitle>
          <p className="text-sm text-slate-500">Gegevens conform de stamkaart van Interdistri</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Samenvatting persoongegevens */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm text-slate-700">Werknemer gegevens (overgenomen)</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><span className="text-slate-500">Naam:</span> {employeeData.first_name} {employeeData.prefix ? employeeData.prefix + ' ' : ''}{employeeData.last_name}</div>
              <div><span className="text-slate-500">Email:</span> {employeeData.email}</div>
              <div><span className="text-slate-500">Telefoon:</span> {employeeData.phone || '—'}</div>
            </div>
          </div>

          {/* Rijbewijs */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Rijbewijs & Certificaten</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rijbewijsnummer</Label>
                <Input value={employeeData.drivers_license_number || ""} onChange={(e) => update("drivers_license_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rijbewijscategorieën</Label>
                <Input value={employeeData.drivers_license_categories || ""} onChange={(e) => update("drivers_license_categories", e.target.value)} placeholder="B, C, CE" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label>Rijbewijs vervaldatum</Label>
                <Input type="date" value={employeeData.drivers_license_expiry || ""} onChange={(e) => update("drivers_license_expiry", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Code 95 vervaldatum</Label>
                <Input type="date" value={employeeData.code95_expiry || ""} onChange={(e) => update("code95_expiry", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label>Nummer ID-kaart of paspoort</Label>
                <Input value={employeeData.id_document_number || ""} onChange={(e) => update("id_document_number", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contract info */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Gegevens dienstverband</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract type</Label>
                <Select value={employeeData.contract_type || "Tijdelijk"} onValueChange={(v) => update("contract_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vast">Onbepaalde tijd</SelectItem>
                    <SelectItem value="Tijdelijk">Bepaalde tijd</SelectItem>
                    <SelectItem value="Oproep">Oproep / 0-uren</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contracturen per week</Label>
                <Input type="number" value={employeeData.contract_hours || ""} onChange={(e) => update("contract_hours", Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label>Loonschaal</Label>
                <Input value={employeeData.salary_scale || ""} onChange={(e) => update("salary_scale", e.target.value)} placeholder="bijv. C trede 1" />
              </div>
              <div className="space-y-2">
                <Label>Bruto uurloon (€)</Label>
                <Input type="number" step="0.01" value={employeeData.hourly_rate || ""} onChange={(e) => update("hourly_rate", Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* LKV en financiële situatie */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Beoordeling LKV & Financiële situatie</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Komt werknemer uit uitkeringssituatie (WW, WAO, WIA)?</Label>
                <Select value={employeeData.lkv_uitkering || "nee"} onValueChange={(v) => update("lkv_uitkering", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">Ja, doelgroep verklaring aanvragen</SelectItem>
                    <SelectItem value="nee">Nee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Financiële situatie / bijzonderheden</Label>
                <Textarea value={employeeData.financiele_situatie || ""} onChange={(e) => update("financiele_situatie", e.target.value)} rows={2} placeholder="Eventuele bijzonderheden..." />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Vorige
        </Button>
        <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700">
          Volgende: Verklaringen <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}