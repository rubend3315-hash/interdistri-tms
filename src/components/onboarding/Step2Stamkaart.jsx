import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronLeft, ChevronRight, Printer, Send, Loader2, AlertTriangle } from "lucide-react";
import SignatureCanvas from "../contracts/SignatureCanvas";
import { buildStamkaartEmailHtml } from "@/components/utils/stamkaartEmailHtml";
import OnboardingPrintView from "./OnboardingPrintView";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

export default function Step2Stamkaart({ employeeData, onboardingData, onOnboardingChange, onChange, onNext, onBack }) {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [pendingSend, setPendingSend] = useState(false);

  const update = (field, value) => {
    onChange({ ...employeeData, [field]: value });
  };

  const { data: salaryTables = [], isLoading: loadingSalary } = useQuery({
    queryKey: ['salaryTables_active'],
    queryFn: () => base44.entities.SalaryTable.filter({ status: "Actief" }),
  });

  const scaleOptions = useMemo(() => {
    const map = new Map();
    salaryTables.forEach(st => {
      const key = `${st.scale}|${st.step}`;
      if (!map.has(key)) map.set(key, st);
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.scale < b.scale) return -1;
      if (a.scale > b.scale) return 1;
      return (a.step || 0) - (b.step || 0);
    });
  }, [salaryTables]);

  const handleScaleChange = (val) => {
    const [scale, step] = val.split('|');
    const match = salaryTables.find(st => st.scale === scale && String(st.step) === step);
    update("salary_scale", `${scale} trede ${step}`);
    if (match) {
      onChange({ ...employeeData, salary_scale: `${scale} trede ${step}`, hourly_rate: match.hourly_rate });
    }
  };

  const currentScaleKey = useMemo(() => {
    const match = scaleOptions.find(st => `${st.scale} trede ${st.step}` === employeeData.salary_scale);
    return match ? `${match.scale}|${match.step}` : "";
  }, [employeeData.salary_scale, scaleOptions]);

  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const payrollConfig = payrollSettings[0] || null;

  // Validation for send
  const signaturePresent = !!(onboardingData?.loonheffing_handtekening_url || onboardingData?.employee_signature_url);
  const loonheffingChosen = !!onboardingData?.loonheffing_toepassen;
  const idValid = !!employeeData.id_document_expiry;
  const ibanFilled = !!employeeData.bank_account;
  const canSend = signaturePresent && loonheffingChosen && idValid && ibanFilled;

  const missingFields = [];
  if (!signaturePresent) missingFields.push("Handtekening");
  if (!loonheffingChosen) missingFields.push("Loonheffingskorting keuze");
  if (!idValid) missingFields.push("ID geldig tot");
  if (!ibanFilled) missingFields.push("IBAN");

  const handleSendToPayroll = async () => {
    if (!payrollConfig?.payroll_email) {
      alert("Stel eerst het e-mailadres van de loonadministratie in via HRM-instellingen → Loonadministratie.");
      return;
    }
    setSendingEmail(true);
    const currentUser = await base44.auth.me();
    const managerName = currentUser?.full_name || '';
    const fullName = `${employeeData.first_name} ${employeeData.prefix ? employeeData.prefix + ' ' : ''}${employeeData.last_name}`;
    const lhLabel = onboardingData?.loonheffing_toepassen === "ja" ? "Ja" : onboardingData?.loonheffing_toepassen === "nee" ? "Nee" : "Niet ingevuld";
    const body = buildStamkaartEmailHtml({
      fullName, data: employeeData, lhLabel,
      lhDatum: onboardingData?.loonheffing_datum || '—',
      signatureUrl: onboardingData?.loonheffing_handtekening_url || null,
      managerName,
    });
    const subjectBase = payrollConfig.payroll_subject || "Vertrouwelijk, onboarding en HR gegevens";
    const subject = `${subjectBase} - ${fullName}`;
    await base44.functions.invoke('sendStamkaartEmail', {
      to: payrollConfig.payroll_email,
      cc: payrollConfig.payroll_cc_email || "",
      subject, body,
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
        manager_naam: managerName,
      },
    });
    setSendingEmail(false);
    setShowPrintPreview(false);
    setPendingSend(false);
    alert("Stamkaart verzonden naar " + payrollConfig.payroll_email + (payrollConfig.payroll_cc_email ? ` (CC: ${payrollConfig.payroll_cc_email})` : ""));
  };

  const handleSendClick = () => {
    setPendingSend(true);
    setShowPrintPreview(true);
  };

  return (
    <div className="max-w-[880px] mx-auto space-y-3">
      {/* Print view (hidden on screen) */}
      <OnboardingPrintView employeeData={employeeData} onboardingData={onboardingData} />

      {/* Werknemer gegevens samenvatting */}
      <section className="border rounded-lg p-3 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Werknemer gegevens (overgenomen)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 text-sm text-slate-600">
          <div><span className="text-slate-400">Naam:</span> {employeeData.first_name} {employeeData.prefix ? employeeData.prefix + ' ' : ''}{employeeData.last_name}</div>
          <div><span className="text-slate-400">Email:</span> {employeeData.email}</div>
          <div><span className="text-slate-400">Telefoon:</span> {employeeData.phone || '—'}</div>
        </div>
      </section>

      {/* Rijbewijs & Certificaten */}
      <section className="border rounded-lg p-3 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Rijbewijs & Certificaten</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Rijbewijsnummer</Label>
            <Input className="h-9" value={employeeData.drivers_license_number || ""} onChange={(e) => update("drivers_license_number", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rijbewijscategorieën</Label>
            <Input className="h-9" value={employeeData.drivers_license_categories || ""} onChange={(e) => update("drivers_license_categories", e.target.value)} placeholder="B, C, CE" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rijbewijs vervaldatum</Label>
            <Input className="h-9" type="date" value={employeeData.drivers_license_expiry || ""} onChange={(e) => update("drivers_license_expiry", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Code 95 vervaldatum</Label>
            <Input className="h-9" type="date" value={employeeData.code95_expiry || ""} onChange={(e) => update("code95_expiry", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nr. ID-kaart/paspoort *</Label>
            <Input className={`h-9 ${!employeeData.id_document_number ? "border-amber-300" : ""}`} value={employeeData.id_document_number || ""} onChange={(e) => update("id_document_number", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Geldig tot (ID) *</Label>
            <Input className={`h-9 ${!employeeData.id_document_expiry ? "border-amber-300" : ""}`} type="date" value={employeeData.id_document_expiry || ""} onChange={(e) => update("id_document_expiry", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Dienstverband */}
      <section className="border rounded-lg p-3 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Gegevens dienstverband</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Contract type</Label>
            <Select value={employeeData.contract_type || "Tijdelijk"} onValueChange={(v) => update("contract_type", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Vast">Onbepaalde tijd</SelectItem>
                <SelectItem value="Tijdelijk">Bepaalde tijd</SelectItem>
                <SelectItem value="Oproep">Oproep / 0-uren</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contracturen per week</Label>
            <Input className="h-9" type="number" value={employeeData.contract_hours || ""} onChange={(e) => update("contract_hours", Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Loonschaal</Label>
            {loadingSalary ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 h-9"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Laden...</div>
            ) : (
              <Select value={currentScaleKey} onValueChange={handleScaleChange}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Kies loonschaal" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {scaleOptions.map(st => {
                    const key = `${st.scale}|${st.step}`;
                    return <SelectItem key={key} value={key}>{st.scale} trede {st.step} (€{st.hourly_rate?.toFixed(2)})</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bruto uurloon (€)</Label>
            <Input className="h-9" type="number" step="0.01" value={employeeData.hourly_rate || ""} onChange={(e) => update("hourly_rate", Number(e.target.value))} />
          </div>
        </div>
      </section>

      {/* Loonheffingskorting */}
      <section className="border rounded-lg p-3 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Loonheffingskorting</h3>
        <p className="text-xs text-slate-500 mb-2">Wilt u dat uw werkgever rekening houdt met de loonheffingskorting? (slechts 1 werkgever tegelijk)</p>

        <RadioGroup
          value={onboardingData?.loonheffing_toepassen || ""}
          onValueChange={(val) => onOnboardingChange({ ...onboardingData, loonheffing_toepassen: val })}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <RadioGroupItem value="ja" id="lh_ja" />
            <Label htmlFor="lh_ja" className="text-sm cursor-pointer">Ja, vanaf</Label>
            <Input type="date" className="w-40 h-9 text-sm" value={onboardingData?.loonheffing_ja_datum || ""} onChange={(e) => onOnboardingChange({ ...onboardingData, loonheffing_ja_datum: e.target.value })} disabled={onboardingData?.loonheffing_toepassen !== "ja"} />
          </div>
          <div className="flex items-center gap-3">
            <RadioGroupItem value="nee" id="lh_nee" />
            <Label htmlFor="lh_nee" className="text-sm cursor-pointer">Nee, vanaf</Label>
            <Input type="date" className="w-40 h-9 text-sm" value={onboardingData?.loonheffing_nee_datum || ""} onChange={(e) => onOnboardingChange({ ...onboardingData, loonheffing_nee_datum: e.target.value })} disabled={onboardingData?.loonheffing_toepassen !== "nee"} />
          </div>
        </RadioGroup>

        {!onboardingData?.loonheffing_toepassen && (
          <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-3">Zonder keuze wordt het anoniementarief toegepast.</p>
        )}
      </section>

      {/* Ondertekening – single signature */}
      <section className="border rounded-lg p-3 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Ondertekening</h3>
        <p className="text-xs text-slate-500 mb-2">Eénmalige elektronische handtekening voor alle stamkaartgegevens.</p>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="space-y-1">
            <Label className="text-xs">Datum</Label>
            <Input type="date" className="h-9" value={onboardingData?.loonheffing_datum || ""} onChange={(e) => onOnboardingChange({ ...onboardingData, loonheffing_datum: e.target.value })} />
          </div>
        </div>

        {onboardingData?.loonheffing_handtekening_url ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <span className="font-medium">Handtekening opgeslagen</span>
            </div>
            <img src={onboardingData.loonheffing_handtekening_url} alt="Handtekening" className="border rounded max-h-[100px]" />
            <Button variant="outline" size="sm" onClick={() => onOnboardingChange({ ...onboardingData, loonheffing_handtekening_url: "" })}>Opnieuw tekenen</Button>
          </div>
        ) : (
          <div style={{ maxWidth: 400 }}>
            <SignatureCanvas
              onSign={async (dataUrl) => {
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const file = new File([blob], "handtekening_lh_onboarding.jpg", { type: "image/jpeg" });
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                onOnboardingChange({
                  ...onboardingData,
                  loonheffing_handtekening_url: file_url,
                  loonheffing_datum: onboardingData.loonheffing_datum || new Date().toISOString().split('T')[0],
                });
              }}
            />
          </div>
        )}
      </section>

      {/* LKV & Financieel */}
      <section className="border rounded-lg p-3 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">LKV & Financiële situatie</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Komt werknemer uit uitkeringssituatie (WW, WAO, WIA)?</Label>
            <Select value={employeeData.lkv_uitkering || "nee"} onValueChange={(v) => update("lkv_uitkering", v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ja">Ja, doelgroep verklaring aanvragen</SelectItem>
                <SelectItem value="nee">Nee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Financiële situatie / bijzonderheden</Label>
            <Textarea value={employeeData.financiele_situatie || ""} onChange={(e) => update("financiele_situatie", e.target.value)} rows={2} placeholder="Eventuele bijzonderheden..." />
          </div>
        </div>
      </section>

      {/* Acties */}
      <section className="border rounded-lg p-3 bg-white flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1.5" /> Printen
        </Button>
        <div className="relative">
          <Button variant="outline" size="sm" onClick={handleSendClick} disabled={sendingEmail || !canSend}>
            {sendingEmail ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
            Versturen naar Loonadministratie
          </Button>
        </div>
        {!canSend && missingFields.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
            <AlertTriangle className="w-3.5 h-3.5" />
            Ontbreekt: {missingFields.join(", ")}
          </div>
        )}
      </section>

      {/* Print Preview / Send Confirmation Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print Preview – Stamkaart</DialogTitle>
            <DialogDescription>Controleer de gegevens voordat u verstuurt naar de loonadministratie.</DialogDescription>
          </DialogHeader>
          <div className="border rounded p-4 text-sm space-y-3 bg-white">
            <PreviewSection label="Persoonlijk" items={[
              ["Naam", `${employeeData.first_name} ${employeeData.prefix || ""} ${employeeData.last_name}`],
              ["Geboortedatum", employeeData.date_of_birth],
              ["BSN", employeeData.bsn],
              ["IBAN", employeeData.bank_account],
              ["Adres", `${employeeData.address || "—"}, ${employeeData.postal_code || ""} ${employeeData.city || ""}`],
            ]} />
            <PreviewSection label="Dienstverband" items={[
              ["Afdeling", employeeData.department],
              ["Functie", employeeData.function],
              ["Contracttype", employeeData.contract_type],
              ["Uren/week", employeeData.contract_hours],
              ["Uurloon", employeeData.hourly_rate ? `€ ${Number(employeeData.hourly_rate).toFixed(2)}` : "—"],
            ]} />
            <PreviewSection label="Loonheffingskorting" items={[
              ["Keuze", onboardingData?.loonheffing_toepassen === "ja" ? "Ja" : "Nee"],
            ]} />
            {onboardingData?.loonheffing_handtekening_url && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Handtekening:</p>
                <img src={onboardingData.loonheffing_handtekening_url} alt="Handtekening" className="max-h-16 border rounded" />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowPrintPreview(false); setPendingSend(false); }}>Annuleren</Button>
            {pendingSend && (
              <Button onClick={handleSendToPayroll} disabled={sendingEmail} className="bg-blue-600 hover:bg-blue-700">
                {sendingEmail ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                Bevestig & Verstuur
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Navigation */}
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

function PreviewSection({ label, items }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">{label}</h4>
      {items.map(([k, v], i) => (
        <div key={i} className="flex py-0.5">
          <span className="w-36 text-slate-400 shrink-0">{k}</span>
          <span className="text-slate-700">{v || "—"}</span>
        </div>
      ))}
    </div>
  );
}