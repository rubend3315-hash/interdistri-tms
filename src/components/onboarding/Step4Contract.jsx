import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, FileText, CheckCircle2, Loader2, Eye, AlertCircle, Star
} from "lucide-react";

const CONTRACT_TYPES = ["Vast", "Vast Nul Uren", "Tijdelijk", "Tijdelijk Nul Uren"];
const PROEFTIJD_OPTIONS = ["Geen proeftijd", "1 maand proeftijd"];

export default function Step4Contract({ employeeData, onboardingData, onChange, onNext, onBack }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  // Derive initial contract type from active contractregel or employeeData.contract_type
  const deriveContractType = () => {
    const activeRegel = (employeeData.contractregels || [])
      .filter(r => r.status !== 'Inactief' && r.status !== 'Beëindigd')
      .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0];
    if (activeRegel) {
      const tc = (activeRegel.type_contract || "").toLowerCase();
      if (tc.includes("oproep") || tc.includes("nul uren")) return "Tijdelijk Nul Uren";
      if (tc.includes("vast")) return "Vast";
      return "Tijdelijk";
    }
    return employeeData.contract_type || "Tijdelijk";
  };
  const deriveHoursPerWeek = () => {
    const activeRegel = (employeeData.contractregels || [])
      .filter(r => r.status !== 'Inactief' && r.status !== 'Beëindigd')
      .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0];
    return activeRegel?.uren_per_week ?? employeeData.contract_hours ?? 40;
  };
  const [contractType, setContractType] = useState(deriveContractType());
  const [startDate, setStartDate] = useState(employeeData.in_service_since || "");
  const [endDate, setEndDate] = useState("");
  const [proeftijd, setProeftijd] = useState("Geen proeftijd");
  const [hoursPerWeek, setHoursPerWeek] = useState(deriveHoursPerWeek());
  const isNulUren = contractType === "Tijdelijk Nul Uren" || contractType === "Vast Nul Uren";
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [error, setError] = useState(null);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['contractTemplates_onboarding'],
    queryFn: () => base44.entities.ContractTemplate.filter({ status: "Actief" }),
  });

  const filteredTemplates = templates.filter(t => t.contract_type === contractType);

  useEffect(() => {
    const defaultTpl = filteredTemplates.find(t => t.is_default);
    if (defaultTpl) setSelectedTemplateId(defaultTpl.id);
    else if (filteredTemplates.length > 0) setSelectedTemplateId(filteredTemplates[0].id);
    else setSelectedTemplateId("");
  }, [contractType, templates.length]);

  const handlePreview = async () => {
    setGenerating(true);
    setError(null);
    setPreviewHtml(null);

    let tempEmpId = onboardingData._temp_employee_id;
    if (!tempEmpId) {
      const empPayload = buildEmployeePayload();
      empPayload.status = "concept";
      const tempEmp = await base44.entities.Employee.create(empPayload);
      tempEmpId = tempEmp.id;
      onChange({ ...onboardingData, _temp_employee_id: tempEmpId });
    } else {
      // Update temp employee with latest data
      const empPayload = buildEmployeePayload();
      empPayload.status = "concept";
      await base44.entities.Employee.update(tempEmpId, empPayload);
    }

    const res = await base44.functions.invoke('generateContract', {
      employee_id: tempEmpId,
      contract_type: contractType,
      start_date: startDate,
      end_date: endDate || undefined,
      hours_per_week: isNulUren ? 0 : hoursPerWeek,
      proeftijd,
      preview_only: true,
      template_id: selectedTemplateId || undefined,
    });

    if (res.data?.preview_html) setPreviewHtml(res.data.preview_html);
    else setError(res.data?.error || "Kon geen preview genereren.");
    setGenerating(false);
  };

  const buildEmployeePayload = () => {
    const empPayload = { ...employeeData };
    if (typeof empPayload.drivers_license_categories === 'string' && empPayload.drivers_license_categories.trim()) {
      empPayload.drivers_license_categories = empPayload.drivers_license_categories.split(',').map(s => s.trim());
    } else {
      empPayload.drivers_license_categories = null;
    }
    delete empPayload.lkv_uitkering;
    delete empPayload.financiele_situatie;
    const requiredStringFields = ['first_name', 'last_name', 'department'];
    Object.keys(empPayload).forEach(k => {
      if (requiredStringFields.includes(k)) return;
      if (empPayload[k] === '' || empPayload[k] === undefined) empPayload[k] = null;
    });
    return empPayload;
  };

  const handleConfirm = () => {
    onChange({
      ...onboardingData,
      contract_generated: true,
      contract_settings: { template_id: selectedTemplateId, contract_type: contractType, start_date: startDate, end_date: endDate, proeftijd, hours_per_week: isNulUren ? 0 : hoursPerWeek }
    });
    onNext();
  };

  const handleSkip = () => {
    onChange({ ...onboardingData, contract_generated: false, contract_settings: null });
    onNext();
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="max-w-[880px] mx-auto space-y-3">
      {/* Contract settings */}
      <section className="border rounded-lg p-4 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" /> Arbeidsovereenkomst
        </h3>

        {/* Employee summary - compact */}
        <div className="bg-slate-50 p-3 rounded mb-4 text-xs text-slate-600">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
            <span><b>Naam:</b> {employeeData.first_name} {employeeData.prefix ? employeeData.prefix + ' ' : ''}{employeeData.last_name}</span>
            <span><b>Afdeling:</b> {employeeData.department}</span>
            <span><b>Uurloon:</b> {employeeData.hourly_rate ? `€ ${Number(employeeData.hourly_rate).toFixed(2)}` : '—'}</span>
            <span><b>Functie:</b> {employeeData.function || '—'}</span>
            <span><b>Loonschaal:</b> {employeeData.salary_scale || '—'}</span>
            <span><b>Uren/week:</b> {isNulUren ? '0 (nul uren)' : hoursPerWeek}</span>
          </div>
        </div>

        {/* Contract type & dates – single row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Contracttype</Label>
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Startdatum</Label>
            <Input className="h-10" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Einddatum</Label>
            <Input className="h-10" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={contractType === "Vast" || contractType === "Vast Nul Uren"} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Proeftijd</Label>
            <Select value={proeftijd} onValueChange={setProeftijd}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROEFTIJD_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Template selection – compact list */}
        <div className="mt-4">
          <Label className="text-xs mb-2 block">Contractsjabloon</Label>
          {loadingTemplates ? (
            <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Laden...</div>
          ) : filteredTemplates.length === 0 ? (
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Geen sjablonen voor "{contractType}". Standaard wordt gebruikt.
            </p>
          ) : (
            <div className="space-y-1">
              {filteredTemplates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`w-full text-left px-3 py-2 rounded border text-sm flex items-center gap-2 transition-colors ${
                    selectedTemplateId === tpl.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${selectedTemplateId === tpl.id ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="font-medium text-sm">{tpl.name}</span>
                  {tpl.is_default && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                  {tpl.description && <span className="text-xs text-slate-400 ml-auto truncate max-w-[200px]">{tpl.description}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview button – prominent */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t">
          <Button onClick={handlePreview} disabled={generating || !startDate}>
            {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Eye className="w-4 h-4 mr-1.5" />}
            Preview Genereren
          </Button>
          {onboardingData.contract_generated && (
            <Badge className="bg-green-100 text-green-700 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Opgeslagen
            </Badge>
          )}
        </div>

        {error && (
          <div className="mt-3 bg-red-50 p-2 rounded text-xs text-red-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
          </div>
        )}
      </section>

      {/* Preview */}
      {previewHtml && (
        <section className="border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Contract Preview</h3>
            {selectedTemplate && <Badge variant="outline" className="text-xs">{selectedTemplate.name}</Badge>}
          </div>
          <div
            className="prose prose-sm max-w-none border rounded p-4 bg-white max-h-[400px] overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </section>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Vorige
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>Overslaan</Button>
          <Button onClick={handleConfirm} disabled={!startDate} className="bg-blue-600 hover:bg-blue-700">
            Opslaan & Volgende <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}