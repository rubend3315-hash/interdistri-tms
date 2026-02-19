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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, ChevronLeft, ChevronRight, Printer, Send, Loader2 } from "lucide-react";
import SignatureCanvas from "../contracts/SignatureCanvas";

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

  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const payrollConfig = payrollSettings[0] || null;

  const handleSendToPayroll = async () => {
    if (!payrollConfig?.payroll_email) {
      alert("Stel eerst het e-mailadres van de loonadministratie in via HRM-instellingen → Loonadministratie.");
      return;
    }
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
    const subjectBase = payrollConfig.payroll_subject || "Vertrouwelijk, onboarding en HR gegevens";
    const subject = `${subjectBase} - ${fullName}`;
    await base44.functions.invoke('sendStamkaartEmail', {
      to: payrollConfig.payroll_email,
      cc: payrollConfig.payroll_cc_email || "",
      subject,
      body,
      template_key: "stamkaart",
      placeholders: {
        naam: fullName,
        geboortedatum: employeeData.date_of_birth || '—',
        bsn: employeeData.bsn || '—',
        adres: `${employeeData.address || '—'}, ${employeeData.postal_code || ''} ${employeeData.city || ''}`,
        iban: employeeData.bank_account || '—',
        afdeling: employeeData.department || '—',
        functie: employeeData.function || '—',
        contract_type: employeeData.contract_type || '—',
        uren_per_week: String(employeeData.contract_hours || '—'),
        loonschaal: employeeData.salary_scale || '—',
        uurloon: `€ ${employeeData.hourly_rate || '—'}`,
        loonheffingskorting: onboardingData?.loonheffing_akkoord ? 'Ja' : 'Nee',
        id_document_nummer: employeeData.id_document_number || '—',
        id_document_geldig: employeeData.id_document_expiry || '—',
      },
    });
    setSendingEmail(false);
    alert("Stamkaart verzonden naar " + payrollConfig.payroll_email + (payrollConfig.payroll_cc_email ? ` (CC: ${payrollConfig.payroll_cc_email})` : ""));
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
                <Label>Nummer ID-kaart of paspoort *</Label>
                <Input value={employeeData.id_document_number || ""} onChange={(e) => update("id_document_number", e.target.value)} className={!employeeData.id_document_number ? "border-amber-300" : ""} />
              </div>
              <div className="space-y-2">
                <Label>Geldig tot (ID-kaart/paspoort) *</Label>
                <Input type="date" value={employeeData.id_document_expiry || ""} onChange={(e) => update("id_document_expiry", e.target.value)} className={!employeeData.id_document_expiry ? "border-amber-300" : ""} />
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

          {/* Loonheffingskorting toepassen */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-slate-800 text-white text-xs font-bold w-6 h-6 rounded flex items-center justify-center">2</span>
              <h4 className="font-semibold">Loonheffingskorting toepassen</h4>
            </div>

            <div className="border rounded-lg p-4 space-y-4 bg-white">
              <div>
                <p className="text-sm text-slate-700 mb-1"><strong>2a</strong>&nbsp; Wilt u dat uw werkgever of uitkeringsinstantie rekening houdt met de loonheffingskorting?</p>
                <p className="text-xs text-slate-500 italic mb-3">U kunt de loonheffingskorting maar door 1 werkgever of uitkeringsinstantie tegelijkertijd laten toepassen.</p>

                <RadioGroup
                  value={onboardingData?.loonheffing_toepassen || ""}
                  onValueChange={(val) => onOnboardingChange({ ...onboardingData, loonheffing_toepassen: val })}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="ja" id="lh_ja" />
                    <Label htmlFor="lh_ja" className="font-medium text-sm cursor-pointer">Ja, vanaf</Label>
                    <Input
                      type="date"
                      className="w-40 h-8 text-sm"
                      value={onboardingData?.loonheffing_ja_datum || ""}
                      onChange={(e) => onOnboardingChange({ ...onboardingData, loonheffing_ja_datum: e.target.value })}
                      disabled={onboardingData?.loonheffing_toepassen !== "ja"}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="nee" id="lh_nee" />
                    <Label htmlFor="lh_nee" className="font-medium text-sm cursor-pointer">Nee, vanaf</Label>
                    <Input
                      type="date"
                      className="w-40 h-8 text-sm"
                      value={onboardingData?.loonheffing_nee_datum || ""}
                      onChange={(e) => onOnboardingChange({ ...onboardingData, loonheffing_nee_datum: e.target.value })}
                      disabled={onboardingData?.loonheffing_toepassen !== "nee"}
                    />
                  </div>
                </RadioGroup>

                {!onboardingData?.loonheffing_toepassen && (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-3">
                    Let op: zonder keuze moet het anoniementarief worden toegepast.
                  </p>
                )}
              </div>

              {/* Ondertekening */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-slate-800 text-white text-xs font-bold w-6 h-6 rounded flex items-center justify-center">3</span>
                  <h4 className="font-semibold">Ondertekening</h4>
                </div>
                <p className="text-xs text-slate-500 italic mb-3">Lever dit formulier na ondertekening in bij uw werkgever of uitkeringsinstantie.</p>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Datum</Label>
                    <Input
                      type="date"
                      value={onboardingData?.loonheffing_datum || ""}
                      onChange={(e) => onOnboardingChange({ ...onboardingData, loonheffing_datum: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Handtekening</Label>
                  <p className="text-xs text-slate-500 mb-1">Schrijf binnen het vak.</p>
                  <div className="border rounded-lg bg-slate-50 p-1" style={{ maxWidth: 400 }}>
                    <SignatureCanvas
                      onSave={(sigUrl) => onOnboardingChange({ ...onboardingData, loonheffing_handtekening_url: sigUrl })}
                    />
                  </div>
                  {onboardingData?.loonheffing_handtekening_url && (
                    <div className="mt-2">
                      <img src={onboardingData.loonheffing_handtekening_url} alt="Handtekening" className="h-12 border rounded" />
                    </div>
                  )}
                </div>
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
        <Button
          onClick={() => {
            const missing = [];
            if (!employeeData.first_name) missing.push("Voornaam");
            if (!employeeData.last_name) missing.push("Achternaam");
            if (!employeeData.date_of_birth) missing.push("Geboortedatum");
            if (!employeeData.bsn) missing.push("BSN");
            if (!employeeData.email) missing.push("E-mail");
            if (!employeeData.address) missing.push("Adres");
            if (!employeeData.bank_account) missing.push("IBAN");
            if (!employeeData.id_document_number) missing.push("Nr. ID-kaart/paspoort");
            if (!employeeData.id_document_expiry) missing.push("Geldigheid ID-kaart/paspoort");
            if (missing.length > 0) {
              alert("Vul de volgende verplichte velden in:\n\n• " + missing.join("\n• "));
              return;
            }
            onNext();
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Volgende: Verklaringen <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}