import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Printer, Send, Loader2, Save, AlertCircle } from "lucide-react";
import SignatureCanvas from "../contracts/SignatureCanvas";
import { getFullName } from "@/components/utils/employeeUtils";
import { buildStamkaartEmailHtml } from "@/components/utils/stamkaartEmailHtml";

export const STAMKAART_REQUIRED_FIELDS = [
  { key: "first_name", label: "Voornaam" },
  { key: "last_name", label: "Achternaam" },
  { key: "date_of_birth", label: "Geboortedatum" },
  { key: "bsn", label: "BSN" },
  { key: "address", label: "Adres" },
  { key: "postal_code", label: "Postcode" },
  { key: "city", label: "Woonplaats" },
  { key: "email", label: "E-mail" },
  { key: "bank_account", label: "IBAN" },
  { key: "department", label: "Afdeling" },
  { key: "id_document_number", label: "Nummer ID-kaart/paspoort" },
  { key: "id_document_expiry", label: "Geldigheid ID-kaart/paspoort" },
];

// ── Shared sub-components (also exported for print view) ──
export function StamkaartRow({ label, required, children }) {
  return (
    <div className="grid items-center" style={{ gridTemplateColumns: "30% 70%", minHeight: 32, gap: 4 }}>
      <span className="text-xs text-slate-600 truncate">{label}{required && " *"}</span>
      <div className="min-h-[26px] flex items-center">{children}</div>
    </div>
  );
}

export function StamkaartSectionTitle({ title }) {
  return (
    <div className="border-b border-slate-300 pb-0 mt-2 mb-0.5">
      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
    </div>
  );
}

const inputCls = "h-7 text-xs px-2 py-0 border-slate-300";
const inputErr = "h-7 text-xs px-2 py-0 border-red-400";

/**
 * StamkaartForm — single source of truth for stamkaart layout
 * 
 * Props:
 * - employee: employee data object (required)
 * - mode: "standalone" (default, Stamkaart page) | "onboarding" (inside onboarding wizard)
 * 
 * Onboarding-specific props (only when mode="onboarding"):
 * - onChange: callback(updatedEmployeeData) — propagate changes to parent
 * - onboardingData: onboarding state object
 * - onOnboardingChange: callback(updatedOnboardingData)
 * - hideActions: boolean — hide save/print/send buttons
 */
export default function StamkaartForm({ 
  employee, 
  mode = "standalone",
  onChange: externalOnChange,
  onboardingData,
  onOnboardingChange,
  hideActions = false,
}) {
  const isOnboarding = mode === "onboarding";

  const [data, setData] = useState({ ...employee });
  
  // In standalone mode, loonheffing lives on the employee object
  // In onboarding mode, it lives in onboardingData
  const lhToepassen = isOnboarding 
    ? (onboardingData?.loonheffing_toepassen || "") 
    : (data.loonheffing_toepassen || "");
  const lhDatum = isOnboarding 
    ? (onboardingData?.loonheffing_datum || "") 
    : (data.loonheffing_datum || "");
  const lhSignatureUrl = isOnboarding 
    ? (onboardingData?.loonheffing_handtekening_url || "") 
    : (data.loonheffing_handtekening_url || "");

  const [sendingEmail, setSendingEmail] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const queryClient = useQueryClient();

  const update = (field, value) => {
    const updated = { ...data, [field]: value };
    setData(updated);
    if (isOnboarding && externalOnChange) externalOnChange(updated);
  };

  const setLh = (key, value) => {
    if (isOnboarding && onOnboardingChange) {
      onOnboardingChange({ ...onboardingData, [key]: value });
    } else {
      setData(prev => ({ ...prev, [key]: value }));
    }
  };

  const fieldError = (key) => showErrors && (!data[key] || String(data[key]).trim() === "");
  const missingFields = STAMKAART_REQUIRED_FIELDS.filter(f => !data[f.key] || String(data[f.key]).trim() === "");

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.filter({ status: 'Actief' }, 'sort_order'),
  });
  const { data: functions = [] } = useQuery({
    queryKey: ['functions_list'],
    queryFn: () => base44.entities.Function.filter({ status: 'Actief' }, 'sort_order'),
  });
  const { data: salaryTables = [], isLoading: loadingSalary } = useQuery({
    queryKey: ['salaryTables_active_stamkaart'],
    queryFn: () => base44.entities.SalaryTable.filter({ status: "Actief" }),
  });
  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const payrollConfig = payrollSettings[0] || null;

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

  const currentScaleKey = useMemo(() => {
    const match = scaleOptions.find(st => `${st.scale} trede ${st.step}` === data.salary_scale);
    return match ? `${match.scale}|${match.step}` : "";
  }, [data.salary_scale, scaleOptions]);

  const handleScaleChange = (val) => {
    const [scale, step] = val.split('|');
    const match = salaryTables.find(st => st.scale === scale && String(st.step) === step);
    const updated = {
      ...data,
      salary_scale: `${scale} trede ${step}`,
      hourly_rate: match?.hourly_rate || data.hourly_rate,
    };
    setData(updated);
    if (isOnboarding && externalOnChange) externalOnChange(updated);
  };

  // ── Standalone-only: save & send ──
  const saveMutation = useMutation({
    mutationFn: () => {
      const saveData = { ...data, loonheffing_toepassen: lhToepassen, loonheffing_datum: lhDatum, loonheffing_handtekening_url: lhSignatureUrl };
      delete saveData.id; delete saveData.created_date; delete saveData.updated_date; delete saveData.created_by;
      return base44.entities.Employee.update(employee.id, saveData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees_stamkaart'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  });

  const handleSave = () => {
    if (missingFields.length > 0) { setShowErrors(true); return; }
    setShowErrors(false);
    saveMutation.mutate();
  };

  const handleSendToPayroll = async () => {
    if (missingFields.length > 0) { setShowErrors(true); return; }
    if (!payrollConfig?.payroll_email) {
      alert("Stel eerst het e-mailadres van de loonadministratie in via HRM-instellingen → Loonadministratie.");
      return;
    }
    setSendingEmail(true);
    const currentUser = await base44.auth.me();
    const managerName = currentUser?.full_name || '';
    const fullName = getFullName(data);
    const lhLabel = lhToepassen === "ja" ? "Ja" : lhToepassen === "nee" ? "Nee" : "Niet ingevuld";
    const defaultBody = buildStamkaartEmailHtml({
      fullName, data, lhLabel,
      lhDatum: lhDatum || '—',
      signatureUrl: lhSignatureUrl || null,
      managerName,
    });
    const subjectBase = payrollConfig.payroll_subject || "Vertrouwelijk, onboarding en HR gegevens";
    const subject = `${subjectBase} - ${fullName}`;
    await base44.functions.invoke('sendStamkaartEmail', {
      to: payrollConfig.payroll_email,
      cc: payrollConfig.payroll_cc_email || "",
      subject, body: defaultBody,
      template_key: "stamkaart",
      placeholders: {
        naam: fullName,
        geboortedatum: data.date_of_birth || '—',
        bsn: data.bsn || '—',
        adres: `${data.address || '—'}, ${data.postal_code || ''} ${data.city || ''}`,
        iban: data.bank_account || '—',
        afdeling: data.department || '—',
        functie: data.function || '—',
        contract_type: data.contract_type || '—',
        uren_per_week: String(data.contract_hours || '—'),
        loonschaal: data.salary_scale || '—',
        uurloon: `€ ${data.hourly_rate || '—'}`,
        loonheffingskorting: lhLabel,
        id_document_nummer: data.id_document_number || '—',
        id_document_geldig: data.id_document_expiry || '—',
        manager_naam: managerName,
      },
    });
    setSendingEmail(false);
    alert("Stamkaart verzonden naar " + payrollConfig.payroll_email + (payrollConfig.payroll_cc_email ? ` (CC: ${payrollConfig.payroll_cc_email})` : ""));
  };

  const handleSignature = async (dataUrl) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], "handtekening_stamkaart.jpg", { type: "image/jpeg" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLh("loonheffing_handtekening_url", file_url);
  };

  const fullName = isOnboarding
    ? `${data.first_name || ''} ${data.prefix ? data.prefix + ' ' : ''}${data.last_name || ''}`.trim()
    : getFullName(data);

  return (
    <div className="mx-auto" style={{ maxWidth: 880 }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1 mb-2">
        <span className="text-sm font-bold text-slate-800">Stamkaart werknemers — {fullName || '(nieuw)'}</span>
        <span className="text-xs text-slate-500">Nr. {data.employee_number || '—'}</span>
      </div>

      {/* Validation */}
      {showErrors && missingFields.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 mb-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Verplichte velden ontbreken: {missingFields.map(f => f.label).join(', ')}</span>
        </div>
      )}

      {/* ═══ WERKNEMER GEGEVENS ═══ */}
      <StamkaartSectionTitle title="Werknemer gegevens" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <StamkaartRow label="Voorletters / voornaam" required>
          <Input className={fieldError("first_name") ? inputErr : inputCls} value={data.first_name || ""} onChange={e => update("first_name", e.target.value)} />
        </StamkaartRow>
        <StamkaartRow label="Achternaam" required>
          <Input className={fieldError("last_name") ? inputErr : inputCls} value={data.last_name || ""} onChange={e => update("last_name", e.target.value)} />
        </StamkaartRow>
        <StamkaartRow label="Geboortedatum" required>
          <Input type="date" className={fieldError("date_of_birth") ? inputErr : inputCls} value={data.date_of_birth || ""} onChange={e => update("date_of_birth", e.target.value)} />
        </StamkaartRow>
        <StamkaartRow label="Burger Service Nummer" required>
          <Input className={fieldError("bsn") ? inputErr : inputCls} value={data.bsn || ""} onChange={e => update("bsn", e.target.value)} />
        </StamkaartRow>
        <StamkaartRow label="Adres" required>
          <Input className={fieldError("address") ? inputErr : inputCls} value={data.address || ""} onChange={e => update("address", e.target.value)} />
        </StamkaartRow>
        <StamkaartRow label="Postcode en woonplaats" required>
          <div className="flex gap-1 w-full">
            <Input className={fieldError("postal_code") ? inputErr : inputCls} style={{ width: '35%' }} value={data.postal_code || ""} onChange={e => update("postal_code", e.target.value)} placeholder="Postcode" />
            <Input className={fieldError("city") ? inputErr : inputCls} style={{ width: '65%' }} value={data.city || ""} onChange={e => update("city", e.target.value)} placeholder="Woonplaats" />
          </div>
        </StamkaartRow>
        <StamkaartRow label="E-mailadres" required>
          <Input type="email" className={fieldError("email") ? inputErr : inputCls} value={data.email || ""} onChange={e => update("email", e.target.value)} />
        </StamkaartRow>
        <StamkaartRow label="IBAN / Telefoon" required>
          <div className="flex gap-1 w-full">
            <Input className={fieldError("bank_account") ? inputErr : inputCls} style={{ width: '55%' }} value={data.bank_account || ""} onChange={e => update("bank_account", e.target.value)} placeholder="IBAN *" />
            <Input className={inputCls} style={{ width: '45%' }} value={data.phone || ""} onChange={e => update("phone", e.target.value)} placeholder="Telefoon" />
          </div>
        </StamkaartRow>
        <StamkaartRow label="Nummer ID-kaart / paspoort" required>
          <Input className={fieldError("id_document_number") ? inputErr : inputCls} value={data.id_document_number || ""} onChange={e => update("id_document_number", e.target.value)} />
        </StamkaartRow>
        <StamkaartRow label="Geldig ID / Rijbewijs verval" required>
          <div className="flex gap-1 w-full">
            <Input type="date" className={fieldError("id_document_expiry") ? inputErr : inputCls} style={{ width: '50%' }} value={data.id_document_expiry || ""} onChange={e => update("id_document_expiry", e.target.value)} />
            <Input type="date" className={inputCls} style={{ width: '50%' }} value={data.drivers_license_expiry || ""} onChange={e => update("drivers_license_expiry", e.target.value)} />
          </div>
        </StamkaartRow>
        <StamkaartRow label="Rijbewijsnr / categorieën">
          <div className="flex gap-1 w-full">
            <Input className={inputCls} style={{ width: '50%' }} value={data.drivers_license_number || ""} onChange={e => update("drivers_license_number", e.target.value)} placeholder="Nummer" />
            <Input className={inputCls} style={{ width: '50%' }} value={data.drivers_license_categories || ""} onChange={e => update("drivers_license_categories", e.target.value)} placeholder="B, C, CE" />
          </div>
        </StamkaartRow>
        <StamkaartRow label="Code 95 vervaldatum">
          <Input type="date" className={inputCls} value={data.code95_expiry || ""} onChange={e => update("code95_expiry", e.target.value)} />
        </StamkaartRow>
        <StamkaartRow label="Noodcontact (naam / telefoon)">
          <div className="flex gap-1 w-full">
            <Input className={inputCls} style={{ width: '50%' }} value={data.emergency_contact_name || ""} onChange={e => update("emergency_contact_name", e.target.value)} placeholder="Naam" />
            <Input className={inputCls} style={{ width: '50%' }} value={data.emergency_contact_phone || ""} onChange={e => update("emergency_contact_phone", e.target.value)} placeholder="Telefoon" />
          </div>
        </StamkaartRow>
      </div>

      {/* ═══ DIENSTVERBAND ═══ */}
      <StamkaartSectionTitle title="Gegevens dienstverband" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <StamkaartRow label="Datum in dienst">
          <Input type="date" className={inputCls} value={data.in_service_since || ""} onChange={e => update("in_service_since", e.target.value)} />
        </StamkaartRow>
        <StamkaartRow label="Afdeling" required>
          <Select value={data.department || ""} onValueChange={v => update("department", v)}>
            <SelectTrigger className={`h-7 text-xs ${fieldError("department") ? "border-red-400" : "border-slate-300"}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </StamkaartRow>
        <StamkaartRow label="Functie">
          <Select value={data.function || '_none'} onValueChange={v => update("function", v === '_none' ? '' : v)}>
            <SelectTrigger className="h-7 text-xs border-slate-300"><SelectValue placeholder="Selecteer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none" disabled>Selecteer</SelectItem>
              {functions.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </StamkaartRow>
        <StamkaartRow label="Contract type">
          <Select value={data.contract_type || "Tijdelijk"} onValueChange={v => update("contract_type", v)}>
            <SelectTrigger className="h-7 text-xs border-slate-300"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Vast">Onbepaalde tijd</SelectItem>
              <SelectItem value="Tijdelijk">Bepaalde tijd</SelectItem>
              <SelectItem value="Oproep">Oproep / 0-uren</SelectItem>
            </SelectContent>
          </Select>
        </StamkaartRow>
        <StamkaartRow label="Contracturen per week">
          <Input type="number" className={inputCls} value={data.contract_hours || ""} onChange={e => update("contract_hours", Number(e.target.value))} />
        </StamkaartRow>
        <StamkaartRow label="Loonschaal">
          {loadingSalary ? (
            <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Laden...</span>
          ) : (
            <Select value={currentScaleKey} onValueChange={handleScaleChange}>
              <SelectTrigger className="h-7 text-xs border-slate-300"><SelectValue placeholder="Kies" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {scaleOptions.map(st => {
                  const key = `${st.scale}|${st.step}`;
                  return <SelectItem key={key} value={key}>{st.scale} trede {st.step} (€{st.hourly_rate?.toFixed(2)})</SelectItem>;
                })}
              </SelectContent>
            </Select>
          )}
        </StamkaartRow>
        <StamkaartRow label="Bruto uurloon (€)">
          <Input type="number" step="0.01" className={inputCls} value={data.hourly_rate || ""} onChange={e => update("hourly_rate", Number(e.target.value))} />
        </StamkaartRow>
      </div>

      {/* ═══ LOONHEFFINGSKORTING ═══ */}
      <StamkaartSectionTitle title="Loonheffingskorting" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <StamkaartRow label="Loonheffingskorting toepassen?">
          <RadioGroup
            value={lhToepassen}
            onValueChange={val => setLh("loonheffing_toepassen", val)}
            className="flex items-center gap-4"
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="ja" id="sk_lh_ja" className="w-3.5 h-3.5" />
              <Label htmlFor="sk_lh_ja" className="text-xs cursor-pointer">Ja</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="nee" id="sk_lh_nee" className="w-3.5 h-3.5" />
              <Label htmlFor="sk_lh_nee" className="text-xs cursor-pointer">Nee</Label>
            </div>
            {!lhToepassen && (
              <span className="text-xs text-amber-600 ml-2">⚠ Geen keuze</span>
            )}
          </RadioGroup>
        </StamkaartRow>
        {lhToepassen && (
          <StamkaartRow label="Vanaf datum">
            <Input type="date" className={inputCls} value={lhDatum} onChange={e => setLh("loonheffing_datum", e.target.value)} />
          </StamkaartRow>
        )}
      </div>

      {/* ═══ FINANCIËLE SITUATIE ═══ */}
      <StamkaartSectionTitle title="Financiële situatie" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <StamkaartRow label="LKV (WW, WAO, WIA)?">
          <Select value={data.lkv_uitkering || "nee"} onValueChange={v => update("lkv_uitkering", v)}>
            <SelectTrigger className="h-7 text-xs border-slate-300"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ja">Ja, doelgroep verklaring aanvragen</SelectItem>
              <SelectItem value="nee">Nee</SelectItem>
            </SelectContent>
          </Select>
        </StamkaartRow>
        <StamkaartRow label="Bijzonderheden">
          <Input className={inputCls} value={data.financiele_situatie || ""} onChange={e => update("financiele_situatie", e.target.value)} placeholder="Eventuele bijzonderheden..." />
        </StamkaartRow>
      </div>

      {/* ═══ HANDTEKENING ═══ */}
      <StamkaartSectionTitle title="Ondertekening" />
      <div className="mt-1">
        <div className="flex items-end gap-4 mb-1">
          <span className="text-xs text-slate-600">Handtekening werknemer</span>
          <span className="text-xs text-slate-600">Datum: <span className="text-slate-800">{new Date().toLocaleDateString('nl-NL')}</span></span>
        </div>
        {lhSignatureUrl ? (
          <div className="flex items-center gap-3">
            <img src={lhSignatureUrl} alt="Handtekening" className="border" style={{ height: 110 }} />
            <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setLh("loonheffing_handtekening_url", "")}>Opnieuw tekenen</Button>
          </div>
        ) : (
          <div className="border border-slate-300 bg-white" style={{ height: 110 }}>
            <SignatureCanvas onSign={handleSignature} />
          </div>
        )}
      </div>

      {/* ═══ ACTIES ═══ */}
      {!hideActions && (
        <div className="flex items-center gap-2 border-t border-slate-300 mt-3 pt-2">
          {!isOnboarding && (
            <>
              <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 h-7 text-xs px-3" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                {saved ? "Opgeslagen ✓" : "Opslaan"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()} className="h-7 text-xs px-3">
                <Printer className="w-3 h-3 mr-1" /> Printen
              </Button>
              <Button size="sm" variant="outline" onClick={handleSendToPayroll} disabled={sendingEmail} className="h-7 text-xs px-3">
                {sendingEmail ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                Versturen naar Loonadministratie
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}