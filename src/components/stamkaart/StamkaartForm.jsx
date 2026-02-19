import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Printer, Send, Loader2, Save, AlertCircle } from "lucide-react";
import SignatureCanvas from "../contracts/SignatureCanvas";
import { getFullName } from "@/components/utils/employeeUtils";
import { buildStamkaartEmailHtml } from "@/components/utils/stamkaartEmailHtml";

function DepartmentSelect({ value, onChange, hasError }) {
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.filter({ status: 'Actief' }, 'sort_order')
  });
  return (
    <div className="space-y-1">
      <Label>Afdeling *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={hasError ? "border-red-400" : ""}><SelectValue /></SelectTrigger>
        <SelectContent>
          {departments.map(dept => (
            <SelectItem key={dept.id} value={dept.name}>{dept.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FunctionSelect({ value, onChange }) {
  const { data: functions = [] } = useQuery({
    queryKey: ['functions_list'],
    queryFn: () => base44.entities.Function.filter({ status: 'Actief' }, 'sort_order')
  });
  return (
    <div className="space-y-1">
      <Label>Functie</Label>
      <Select value={value || '_none'} onValueChange={(v) => onChange(v === '_none' ? '' : v)}>
        <SelectTrigger><SelectValue placeholder="Selecteer functie" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_none" disabled>Selecteer functie</SelectItem>
          {functions.map(func => (
            <SelectItem key={func.id} value={func.name}>{func.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const REQUIRED_FIELDS = [
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

export default function StamkaartForm({ employee }) {
  const [data, setData] = useState({ ...employee });
  const [lhData, setLhData] = useState({
    loonheffing_toepassen: employee.loonheffing_toepassen || "",
    loonheffing_datum: employee.loonheffing_datum || "",
    loonheffing_handtekening_url: employee.loonheffing_handtekening_url || "",
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const queryClient = useQueryClient();

  const update = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const { data: salaryTables = [], isLoading: loadingSalary } = useQuery({
    queryKey: ['salaryTables_active_stamkaart'],
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

  const currentScaleKey = useMemo(() => {
    const match = scaleOptions.find(st => `${st.scale} trede ${st.step}` === data.salary_scale);
    return match ? `${match.scale}|${match.step}` : "";
  }, [data.salary_scale, scaleOptions]);

  const handleScaleChange = (val) => {
    const [scale, step] = val.split('|');
    const match = salaryTables.find(st => st.scale === scale && String(st.step) === step);
    setData(prev => ({
      ...prev,
      salary_scale: `${scale} trede ${step}`,
      hourly_rate: match?.hourly_rate || prev.hourly_rate
    }));
  };

  const missingFields = REQUIRED_FIELDS.filter(f => !data[f.key] || String(data[f.key]).trim() === "");

  const saveMutation = useMutation({
    mutationFn: () => {
      const saveData = {
        ...data,
        loonheffing_toepassen: lhData.loonheffing_toepassen,
        loonheffing_datum: lhData.loonheffing_datum,
        loonheffing_handtekening_url: lhData.loonheffing_handtekening_url,
      };
      // remove built-in fields
      delete saveData.id;
      delete saveData.created_date;
      delete saveData.updated_date;
      delete saveData.created_by;
      return base44.entities.Employee.update(employee.id, saveData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees_stamkaart'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  });

  const handleSave = () => {
    if (missingFields.length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    saveMutation.mutate();
  };

  const handlePrint = () => window.print();

  const { data: payrollSettings = [] } = useQuery({
    queryKey: ['payrollSettings'],
    queryFn: () => base44.entities.PayrollSettings.list(),
  });
  const payrollConfig = payrollSettings[0] || null;

  const handleSendToPayroll = async () => {
    if (missingFields.length > 0) {
      setShowErrors(true);
      return;
    }
    if (!payrollConfig?.payroll_email) {
      alert("Stel eerst het e-mailadres van de loonadministratie in via HRM-instellingen → Loonadministratie.");
      return;
    }
    setSendingEmail(true);
    const fullName = getFullName(data);
    const lhLabel = lhData.loonheffing_toepassen === "ja" ? "Ja" : lhData.loonheffing_toepassen === "nee" ? "Nee" : "Niet ingevuld";
    const defaultBody = buildStamkaartEmailHtml({
      fullName,
      data,
      lhLabel,
      lhDatum: lhData.loonheffing_datum || '—',
      signatureUrl: lhData.loonheffing_handtekening_url || null,
    });
    const subjectBase = payrollConfig.payroll_subject || "Vertrouwelijk, onboarding en HR gegevens";
    const subject = `${subjectBase} - ${fullName}`;
    await base44.functions.invoke('sendStamkaartEmail', {
      to: payrollConfig.payroll_email,
      cc: payrollConfig.payroll_cc_email || "",
      subject,
      body: defaultBody,
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
      },
    });
    setSendingEmail(false);
    alert("Stamkaart verzonden naar " + payrollConfig.payroll_email + (payrollConfig.payroll_cc_email ? ` (CC: ${payrollConfig.payroll_cc_email})` : ""));
  };

  const fieldError = (key) => showErrors && (!data[key] || String(data[key]).trim() === "");

  return (
    <div className="space-y-6">
      {/* Validation summary */}
      {showErrors && missingFields.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">De volgende verplichte velden zijn niet ingevuld:</p>
            <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
              {missingFields.map(f => <li key={f.key}>{f.label}</li>)}
            </ul>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Stamkaart — {getFullName(data)}
          </CardTitle>
          <p className="text-sm text-slate-500">Gegevens conform de stamkaart van Interdistri. Velden met * zijn verplicht.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Persoongegevens */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm text-slate-700">Persoonlijke gegevens</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Voornaam *</Label>
                <Input value={data.first_name || ""} onChange={(e) => update("first_name", e.target.value)} className={fieldError("first_name") ? "border-red-400" : ""} />
              </div>
              <div className="space-y-1">
                <Label>Achternaam *</Label>
                <Input value={data.last_name || ""} onChange={(e) => update("last_name", e.target.value)} className={fieldError("last_name") ? "border-red-400" : ""} />
              </div>
              <div className="space-y-1">
                <Label>Geboortedatum *</Label>
                <Input type="date" value={data.date_of_birth || ""} onChange={(e) => update("date_of_birth", e.target.value)} className={fieldError("date_of_birth") ? "border-red-400" : ""} />
              </div>
              <div className="space-y-1">
                <Label>BSN *</Label>
                <Input value={data.bsn || ""} onChange={(e) => update("bsn", e.target.value)} className={fieldError("bsn") ? "border-red-400" : ""} />
              </div>
              <div className="space-y-1">
                <Label>E-mail *</Label>
                <Input type="email" value={data.email || ""} onChange={(e) => update("email", e.target.value)} className={fieldError("email") ? "border-red-400" : ""} />
              </div>
              <div className="space-y-1">
                <Label>Telefoon</Label>
                <Input value={data.phone || ""} onChange={(e) => update("phone", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Adres *</Label>
                <Input value={data.address || ""} onChange={(e) => update("address", e.target.value)} className={fieldError("address") ? "border-red-400" : ""} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Postcode *</Label>
                  <Input value={data.postal_code || ""} onChange={(e) => update("postal_code", e.target.value)} className={fieldError("postal_code") ? "border-red-400" : ""} />
                </div>
                <div className="space-y-1">
                  <Label>Woonplaats *</Label>
                  <Input value={data.city || ""} onChange={(e) => update("city", e.target.value)} className={fieldError("city") ? "border-red-400" : ""} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>IBAN *</Label>
                <Input value={data.bank_account || ""} onChange={(e) => update("bank_account", e.target.value)} className={fieldError("bank_account") ? "border-red-400" : ""} />
              </div>
            </div>
          </div>

          {/* Identificatie & Rijbewijs */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Identificatie & Rijbewijs</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nummer ID-kaart of paspoort *</Label>
                <Input value={data.id_document_number || ""} onChange={(e) => update("id_document_number", e.target.value)} className={fieldError("id_document_number") ? "border-red-400" : ""} />
              </div>
              <div className="space-y-1">
                <Label>Geldig tot (ID-kaart/paspoort) *</Label>
                <Input type="date" value={data.id_document_expiry || ""} onChange={(e) => update("id_document_expiry", e.target.value)} className={fieldError("id_document_expiry") ? "border-red-400" : ""} />
              </div>
              <div className="space-y-1">
                <Label>Rijbewijsnummer</Label>
                <Input value={data.drivers_license_number || ""} onChange={(e) => update("drivers_license_number", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Rijbewijscategorieën</Label>
                <Input value={data.drivers_license_categories || ""} onChange={(e) => update("drivers_license_categories", e.target.value)} placeholder="B, C, CE" />
              </div>
              <div className="space-y-1">
                <Label>Rijbewijs vervaldatum</Label>
                <Input type="date" value={data.drivers_license_expiry || ""} onChange={(e) => update("drivers_license_expiry", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Code 95 vervaldatum</Label>
                <Input type="date" value={data.code95_expiry || ""} onChange={(e) => update("code95_expiry", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Dienstverband */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Gegevens dienstverband</h4>
            <div className="grid grid-cols-2 gap-4">
              <DepartmentSelect value={data.department || ""} onChange={(v) => update("department", v)} hasError={fieldError("department")} />
              <FunctionSelect value={data.function || ""} onChange={(v) => update("function", v)} />
              <div className="space-y-1">
                <Label>Contract type</Label>
                <Select value={data.contract_type || "Tijdelijk"} onValueChange={(v) => update("contract_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vast">Onbepaalde tijd</SelectItem>
                    <SelectItem value="Tijdelijk">Bepaalde tijd</SelectItem>
                    <SelectItem value="Oproep">Oproep / 0-uren</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Contracturen per week</Label>
                <Input type="number" value={data.contract_hours || ""} onChange={(e) => update("contract_hours", Number(e.target.value))} />
              </div>
              <div className="space-y-1">
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
              <div className="space-y-1">
                <Label>Bruto uurloon (€)</Label>
                <Input type="number" step="0.01" value={data.hourly_rate || ""} onChange={(e) => update("hourly_rate", Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Loonheffingskorting */}
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
                  value={lhData.loonheffing_toepassen}
                  onValueChange={(val) => setLhData(prev => ({ ...prev, loonheffing_toepassen: val }))}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="ja" id="sk_lh_ja" />
                    <Label htmlFor="sk_lh_ja" className="font-medium text-sm cursor-pointer">Ja, vanaf</Label>
                    <Input
                      type="date"
                      className="w-40 h-8 text-sm"
                      value={lhData.loonheffing_toepassen === "ja" ? (lhData.loonheffing_datum || "") : ""}
                      onChange={(e) => setLhData(prev => ({ ...prev, loonheffing_datum: e.target.value }))}
                      disabled={lhData.loonheffing_toepassen !== "ja"}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="nee" id="sk_lh_nee" />
                    <Label htmlFor="sk_lh_nee" className="font-medium text-sm cursor-pointer">Nee, vanaf</Label>
                    <Input
                      type="date"
                      className="w-40 h-8 text-sm"
                      value={lhData.loonheffing_toepassen === "nee" ? (lhData.loonheffing_datum || "") : ""}
                      onChange={(e) => setLhData(prev => ({ ...prev, loonheffing_datum: e.target.value }))}
                      disabled={lhData.loonheffing_toepassen !== "nee"}
                    />
                  </div>
                </RadioGroup>
                {!lhData.loonheffing_toepassen && (
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
                <div className="space-y-1">
                  <Label className="text-sm">Handtekening</Label>
                  <p className="text-xs text-slate-500 mb-1">Schrijf binnen het vak.</p>
                  <div className="border rounded-lg bg-slate-50 p-1" style={{ maxWidth: 400 }}>
                    <SignatureCanvas
                      onSign={async (dataUrl) => {
                        // Upload de handtekening als bestand
                        const res = await fetch(dataUrl);
                        const blob = await res.blob();
                        const file = new File([blob], "handtekening_lh.jpg", { type: "image/jpeg" });
                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                        setLhData(prev => ({ ...prev, loonheffing_handtekening_url: file_url }));
                      }}
                    />
                  </div>
                  {lhData.loonheffing_handtekening_url && (
                    <div className="mt-2">
                      <img src={lhData.loonheffing_handtekening_url} alt="Handtekening" className="h-12 border rounded" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* LKV */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Beoordeling LKV & Financiële situatie</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <Label>Komt werknemer uit uitkeringssituatie (WW, WAO, WIA)?</Label>
                <Select value={data.lkv_uitkering || "nee"} onValueChange={(v) => update("lkv_uitkering", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">Ja, doelgroep verklaring aanvragen</SelectItem>
                    <SelectItem value="nee">Nee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Financiële situatie / bijzonderheden</Label>
                <Textarea value={data.financiele_situatie || ""} onChange={(e) => update("financiele_situatie", e.target.value)} rows={2} placeholder="Eventuele bijzonderheden..." />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saved ? "Opgeslagen ✓" : "Stamkaart Opslaan"}
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Printen
          </Button>
          <Button variant="outline" onClick={handleSendToPayroll} disabled={sendingEmail}>
            {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Versturen naar Loonadministratie
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}