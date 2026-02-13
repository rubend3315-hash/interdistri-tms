import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, FileText, CheckCircle2, Loader2, Eye, AlertCircle, Star
} from "lucide-react";
import { format } from "date-fns";

const CONTRACT_TYPES = ["Vast", "Vast Nul Uren", "Tijdelijk", "Tijdelijk Nul Uren"];
const PROEFTIJD_OPTIONS = ["Geen proeftijd", "1 maand proeftijd"];

export default function Step4Contract({ employeeData, onboardingData, onChange, onNext, onBack }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [contractType, setContractType] = useState(employeeData.contract_type === "Oproep" ? "Tijdelijk Nul Uren" : (employeeData.contract_type || "Tijdelijk"));
  const [startDate, setStartDate] = useState(employeeData.in_service_since || "");
  const [endDate, setEndDate] = useState("");
  const [proeftijd, setProeftijd] = useState("Geen proeftijd");
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [error, setError] = useState(null);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['contractTemplates_onboarding'],
    queryFn: () => base44.entities.ContractTemplate.filter({ status: "Actief" }),
  });

  // Filter templates by selected contract type
  const filteredTemplates = templates.filter(t => t.contract_type === contractType);

  // Auto-select default template when contract type changes
  useEffect(() => {
    const defaultTpl = filteredTemplates.find(t => t.is_default);
    if (defaultTpl) {
      setSelectedTemplateId(defaultTpl.id);
    } else if (filteredTemplates.length > 0) {
      setSelectedTemplateId(filteredTemplates[0].id);
    } else {
      setSelectedTemplateId("");
    }
  }, [contractType, templates.length]);

  const handlePreview = async () => {
    if (!onboardingData._temp_employee_id) {
      setError("Genereer eerst een preview — de medewerker wordt pas aangemaakt bij afronden.");
    }
    setGenerating(true);
    setError(null);
    setPreviewHtml(null);

    // We need a temp employee to generate preview. 
    // Create a temporary one, get preview, then delete it.
    let tempEmpId = onboardingData._temp_employee_id;

    if (!tempEmpId) {
      const empPayload = buildEmployeePayload();
      const tempEmp = await base44.entities.Employee.create(empPayload);
      tempEmpId = tempEmp.id;
      onChange({ ...onboardingData, _temp_employee_id: tempEmpId });
    }

    const res = await base44.functions.invoke('generateContract', {
      employee_id: tempEmpId,
      contract_type: contractType,
      start_date: startDate,
      end_date: endDate || undefined,
      hours_per_week: employeeData.contract_hours || 40,
      proeftijd,
      preview_only: true,
      template_id: selectedTemplateId || undefined,
    });

    if (res.data?.preview_html) {
      setPreviewHtml(res.data.preview_html);
    } else {
      setError(res.data?.error || "Kon geen preview genereren.");
    }
    setGenerating(false);
  };

  const buildEmployeePayload = () => {
    const empPayload = { ...employeeData };
    if (typeof empPayload.drivers_license_categories === 'string' && empPayload.drivers_license_categories.trim()) {
      empPayload.drivers_license_categories = empPayload.drivers_license_categories.split(',').map(s => s.trim());
    } else {
      empPayload.drivers_license_categories = null;
    }
    delete empPayload.id_document_number;
    delete empPayload.lkv_uitkering;
    delete empPayload.financiele_situatie;
    Object.keys(empPayload).forEach(k => {
      if (empPayload[k] === '' || empPayload[k] === undefined) empPayload[k] = null;
    });
    return empPayload;
  };

  const handleConfirm = () => {
    onChange({
      ...onboardingData,
      contract_generated: true,
      contract_settings: {
        template_id: selectedTemplateId,
        contract_type: contractType,
        start_date: startDate,
        end_date: endDate,
        proeftijd,
      }
    });
    onNext();
  };

  const handleSkip = () => {
    onChange({ ...onboardingData, contract_generated: false, contract_settings: null });
    onNext();
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-6">
      {/* Contract settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Arbeidsovereenkomst
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Employee summary */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm text-slate-700 mb-2">Medewerkergegevens (uit stap 1)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div><span className="text-slate-500">Naam:</span> {employeeData.first_name} {employeeData.prefix ? employeeData.prefix + ' ' : ''}{employeeData.last_name}</div>
              <div><span className="text-slate-500">Afdeling:</span> {employeeData.department}</div>
              <div><span className="text-slate-500">Functie:</span> {employeeData.function || '—'}</div>
              <div><span className="text-slate-500">Uurloon:</span> {employeeData.hourly_rate ? `€ ${Number(employeeData.hourly_rate).toFixed(2)}` : '—'}</div>
              <div><span className="text-slate-500">Loonschaal:</span> {employeeData.salary_scale || '—'}</div>
              <div><span className="text-slate-500">Uren/week:</span> {employeeData.contract_hours || '—'}</div>
            </div>
          </div>

          {/* Contract type & dates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Contracttype</Label>
              <Select value={contractType} onValueChange={setContractType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Startdatum</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Einddatum</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={contractType === "Vast" || contractType === "Vast Nul Uren"} />
            </div>
            <div className="space-y-2">
              <Label>Proeftijd</Label>
              <Select value={proeftijd} onValueChange={setProeftijd}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROEFTIJD_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Template selection */}
          <div className="border-t pt-4">
            <Label className="mb-2 block">Contractsjabloon</Label>
            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Sjablonen laden...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Geen sjablonen beschikbaar voor type "{contractType}". Er wordt een standaard sjabloon gebruikt.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredTemplates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${selectedTemplateId === tpl.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className={`w-4 h-4 ${selectedTemplateId === tpl.id ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="font-medium text-sm">{tpl.name}</span>
                      {tpl.is_default && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    </div>
                    {tpl.description && <p className="text-xs text-slate-500 mt-1 ml-6">{tpl.description}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview button */}
          <div className="flex items-center gap-3 border-t pt-4">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={generating || !startDate}
            >
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
              Preview Genereren
            </Button>
            {onboardingData.contract_generated && (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Contractinstellingen opgeslagen
              </Badge>
            )}
          </div>

          {error && (
            <div className="bg-red-50 p-3 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {previewHtml && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              Contract Preview
              {selectedTemplate && <Badge variant="outline" className="text-xs font-normal">{selectedTemplate.name}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none border rounded-lg p-6 bg-white max-h-[500px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Vorige
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Overslaan
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!startDate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Opslaan & Volgende <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}