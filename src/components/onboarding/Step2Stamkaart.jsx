import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, ChevronLeft, ChevronRight, Printer, Send, Loader2 } from "lucide-react";

export default function Step2Stamkaart({ employeeData, onboardingData, onOnboardingChange, onChange, onNext, onBack }) {
  const update = (field, value) => {
    onChange({ ...employeeData, [field]: value });
  };

  const { data: salaryTables = [], isLoading: loadingSalary } = useQuery({
    queryKey: ['salaryTables_active'],
    queryFn: () => base44.entities.SalaryTable.filter({ status: "Actief" }),
  });

  // Group salary tables by scale, picking unique scale+step combos
  const scaleOptions = useMemo(() => {
    const map = new Map();
    salaryTables.forEach(st => {
      const key = `${st.scale}|${st.step}`;
      if (!map.has(key)) {
        map.set(key, st);
      }
    });
    // Sort by scale then step
    return Array.from(map.values()).sort((a, b) => {
      if (a.scale < b.scale) return -1;
      if (a.scale > b.scale) return 1;
      return (a.step || 0) - (b.step || 0);
    });
  }, [salaryTables]);

  const handleScaleChange = (val) => {
    // val = "scale|step"
    const [scale, step] = val.split('|');
    const match = salaryTables.find(st => st.scale === scale && String(st.step) === step);
    update("salary_scale", `${scale} trede ${step}`);
    if (match) {
      onChange({ ...employeeData, salary_scale: `${scale} trede ${step}`, hourly_rate: match.hourly_rate });
    }
  };

  const currentScaleKey = useMemo(() => {
    // Try to find matching scale key from current employeeData
    const match = scaleOptions.find(st => {
      const label = `${st.scale} trede ${st.step}`;
      return label === employeeData.salary_scale;
    });
    return match ? `${match.scale}|${match.step}` : "";
  }, [employeeData.salary_scale, scaleOptions]);

  const [sendingEmail, setSendingEmail] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleSendToPayroll = async () => {
    setSendingEmail(true);
    const fullName = `${employeeData.first_name} ${employeeData.prefix ? employeeData.prefix + ' ' : ''}${employeeData.last_name}`;
    const body = `
      <h2>Stamkaart - ${fullName}</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">Naam</td><td style="padding:4px;border:1px solid #ddd;">${fullName}</td></tr>
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">Geboortedatum</td><td style="padding:4px;border:1px solid #ddd;">${employeeData.date_of_birth || '—'}</td></tr>
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">BSN</td><td style="padding:4px;border:1px solid #ddd;">${employeeData.bsn || '—'}</td></tr>
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">Adres</td><td style="padding:4px;border:1px solid #ddd;">${employeeData.address || '—'}, ${employeeData.postal_code || ''} ${employeeData.city || ''}</td></tr>
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">IBAN</td><td style="padding:4px;border:1px solid #ddd;">${employeeData.bank_account || '—'}</td></tr>
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">Afdeling</td><td style="padding:4px;border:1px solid #ddd;">${employeeData.department || '—'}</td></tr>
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">Functie</td><td style="padding:4px;border:1px solid #ddd;">${employeeData.function || '—'}</td></tr>
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">Contract type</td><td style="padding:4px;border:1px solid #ddd;">${employeeData.contract_type || '—'}</td></tr>
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">Uren/week</td><td style="padding:4px;border:1px solid #ddd;">${employeeData.contract_hours || '—'}</td></tr>
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">Loonschaal</td><td style="padding:4px;border:1px solid #ddd;">${employeeData.salary_scale || '—'}</td></tr>
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">Uurloon</td><td style="padding:4px;border:1px solid #ddd;">€ ${employeeData.hourly_rate || '—'}</td></tr>
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">Loonheffingsverklaring</td><td style="padding:4px;border:1px solid #ddd;">${onboardingData?.loonheffing_akkoord ? 'Ja' : 'Nee'}</td></tr>
        <tr><td style="padding:4px;border:1px solid #ddd;font-weight:bold;">LKV uitkering</td><td style="padding:4px;border:1px solid #ddd;">${employeeData.lkv_uitkering === 'ja' ? 'Ja' : 'Nee'}</td></tr>
      </table>
    `;
    const user = await base44.auth.me();
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: `Stamkaart - ${fullName}`,
      body,
    });
    setSendingEmail(false);
    alert("Stamkaart verzonden naar " + user.email);
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
                <Label>Loonschaal (uit loontabellen)</Label>
                {loadingSalary ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 h-9"><Loader2 className="w-4 h-4 animate-spin" /> Laden...</div>
                ) : (
                  <Select value={currentScaleKey} onValueChange={handleScaleChange}>
                    <SelectTrigger><SelectValue placeholder="Kies loonschaal" /></SelectTrigger>
                    <SelectContent className="max-h-64">
                      {scaleOptions.map(st => {
                        const key = `${st.scale}|${st.step}`;
                        const label = `${st.scale} trede ${st.step}${st.name ? ` — ${st.name}` : ''} (€${st.hourly_rate?.toFixed(2)})`;
                        return <SelectItem key={key} value={key}>{label}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Bruto uurloon (€)</Label>
                <Input type="number" step="0.01" value={employeeData.hourly_rate || ""} onChange={(e) => update("hourly_rate", Number(e.target.value))} />
                {employeeData.hourly_rate > 0 && (
                  <p className="text-xs text-slate-500">Automatisch ingevuld vanuit loontabel. Handmatig aanpasbaar.</p>
                )}
              </div>
            </div>
          </div>

          {/* Loonheffingsverklaring */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Loonheffingsverklaring</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-slate-700">
                Heeft de werknemer de loonheffingsverklaring ingevuld en ondertekend?
              </p>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={onboardingData?.loonheffing_akkoord === true}
                    onCheckedChange={(checked) => onOnboardingChange({ ...onboardingData, loonheffing_akkoord: checked ? true : false })}
                  />
                  <span className="text-sm font-medium">Ja, loonheffingsverklaring ontvangen en ondertekend</span>
                </label>
              </div>
              {onboardingData?.loonheffing_akkoord === false && (
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                  Let op: zonder loonheffingsverklaring moet het anoniementarief worden toegepast.
                </p>
              )}
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

      {/* Print / Send */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Stamkaart Printen
          </Button>
          <Button variant="outline" onClick={handleSendToPayroll} disabled={sendingEmail}>
            {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Versturen naar Loonadministratie
          </Button>
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