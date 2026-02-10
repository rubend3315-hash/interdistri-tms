import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText, Save, Pencil, Eye, Shield, BookOpen, Sparkles, X, Loader2, TableProperties
} from "lucide-react";
import ReactQuill from "react-quill";
import ConflictAnalysisPanel from "./ConflictAnalysisPanel";
import ClauseSummaryPanel from "./ClauseSummaryPanel";

const STATUS_CONFIG = {
  'Concept': { bg: 'bg-slate-100', text: 'text-slate-700' },
  'TerOndertekening': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'Ondertekend': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Actief': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'Verlopen': { bg: 'bg-red-100', text: 'text-red-700' },
  'Beëindigd': { bg: 'bg-slate-100', text: 'text-slate-700' }
};

function plainTextToHtml(text) {
  if (!text) return "";
  if (text.includes("<p>") || text.includes("<br") || text.includes("<div")) return text;
  return text
    .split(/\n\n+/)
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^Artikel \d+/.test(trimmed) || /^ARBEIDSOVEREENKOMST/.test(trimmed)) {
        return `<h3>${trimmed}</h3>`;
      }
      const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
      return lines.map(l => `<p>${l}</p>`).join('');
    })
    .join('');
}

export default function ContractEditDialog({
  open,
  onOpenChange,
  contract,
  employee,
  isAdmin,
  onSave,
  saving,
  onAnalyze,
  conflictAnalysis,
  clauseSummary,
  loadingConflicts,
  loadingSummary
}) {
  const [viewTab, setViewTab] = useState("contract");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editFields, setEditFields] = useState({});
  const [selectedScale, setSelectedScale] = useState("");
  const [selectedStep, setSelectedStep] = useState("");

  const { data: salaryTables = [] } = useQuery({
    queryKey: ['salaryTables'],
    queryFn: () => base44.entities.SalaryTable.filter({ status: 'Actief' }),
  });

  // Get unique scales
  const scales = useMemo(() => {
    const scaleSet = new Set(salaryTables.map(t => t.scale));
    return [...scaleSet].sort();
  }, [salaryTables]);

  // Get steps for selected scale
  const stepsForScale = useMemo(() => {
    if (!selectedScale) return [];
    return salaryTables
      .filter(t => t.scale === selectedScale)
      .sort((a, b) => a.step - b.step);
  }, [salaryTables, selectedScale]);

  // When scale+step selected, apply rate
  const handleScaleStepSelect = (scale, step) => {
    const entry = salaryTables.find(t => t.scale === scale && t.step === Number(step));
    if (entry) {
      const label = step == -1 ? `${scale} Min` : `${scale} trede ${step}`;
      setEditFields(prev => ({
        ...prev,
        salary_scale: label,
        hourly_rate: entry.hourly_rate
      }));
    }
  };

  useEffect(() => {
    if (contract) {
      setEditContent(plainTextToHtml(contract.contract_content || ""));
      setEditFields({
        hourly_rate: contract.hourly_rate || "",
        salary_scale: contract.salary_scale || "",
        hours_per_week: contract.hours_per_week ?? "",
        function_title: contract.function_title || "",
        start_date: contract.start_date || "",
        end_date: contract.end_date || "",
        status: contract.status || "Concept",
        is_verlenging: contract.is_verlenging || false,
        oorspronkelijke_indienst_datum: contract.oorspronkelijke_indienst_datum || "",
        verlenging_nummer: contract.verlenging_nummer || "",
        proeftijd: contract.proeftijd || "1 maand proeftijd",
      });
      setIsEditing(false);
      setViewTab("contract");
      setSelectedScale("");
      setSelectedStep("");
    }
  }, [contract]);

  if (!contract) return null;

  const applyFieldsToContent = (content) => {
    let updated = content;
    // Replace [NOG IN TE VULLEN] placeholders based on context
    if (editFields.salary_scale) {
      // Replace salary scale placeholders like "functiegroep C trede [NOG IN TE VULLEN]"
      updated = updated.replace(
        /functiegroep\s+\w+\s+trede\s+\[NOG IN TE VULLEN\]/gi,
        `functiegroep ${editFields.salary_scale}`
      );
      // Also replace standalone loonschaal placeholder
      updated = updated.replace(
        /loonschaal\s+\[NOG IN TE VULLEN\]/gi,
        `loonschaal ${editFields.salary_scale}`
      );
    }
    if (editFields.hourly_rate) {
      updated = updated.replace(
        /uurloon[:\s]*\[NOG IN TE VULLEN\]/gi,
        `uurloon €${Number(editFields.hourly_rate).toFixed(2)}`
      );
      // Also handle "bruto uurloon" pattern
      updated = updated.replace(
        /bruto\s+uurloon[:\s]*\[NOG IN TE VULLEN\]/gi,
        `bruto uurloon €${Number(editFields.hourly_rate).toFixed(2)}`
      );
    }
    if (editFields.hours_per_week !== "" && editFields.hours_per_week !== null) {
      updated = updated.replace(
        /uren per week[:\s]*\[NOG IN TE VULLEN\]/gi,
        `uren per week ${editFields.hours_per_week}`
      );
      updated = updated.replace(
        /arbeidsomvang[:\s]*\[NOG IN TE VULLEN\]/gi,
        `arbeidsomvang ${editFields.hours_per_week} uur per week`
      );
    }
    if (editFields.function_title) {
      updated = updated.replace(
        /functie van\s+\[NOG IN TE VULLEN\]/gi,
        `functie van ${editFields.function_title}`
      );
      updated = updated.replace(
        /functie[:\s]*\[NOG IN TE VULLEN\]/gi,
        `functie ${editFields.function_title}`
      );
    }
    // Proeftijd replacement
    if (editFields.is_verlenging) {
      // Remove proeftijd clause or replace with "geen proeftijd"
      updated = updated.replace(
        /proeftijd[:\s]*\[NOG IN TE VULLEN\]/gi,
        `geen proeftijd (verlenging)`
      );
      updated = updated.replace(
        /De\s+proeftijd\s+bedraagt\s+\[NOG IN TE VULLEN\]/gi,
        `Er is geen proeftijd van toepassing (${editFields.verlenging_nummer || 'verlenging'})`
      );
    } else {
      updated = updated.replace(
        /proeftijd[:\s]*\[NOG IN TE VULLEN\]/gi,
        `proeftijd 1 maand`
      );
      updated = updated.replace(
        /De\s+proeftijd\s+bedraagt\s+\[NOG IN TE VULLEN\]/gi,
        `De proeftijd bedraagt 1 maand`
      );
    }
    return updated;
  };

  const handleSave = () => {
    const updatedContent = applyFieldsToContent(editContent);
    setEditContent(updatedContent);
    
    onSave({
      ...editFields,
      hourly_rate: editFields.hourly_rate ? Number(editFields.hourly_rate) : null,
      hours_per_week: editFields.hours_per_week !== "" ? Number(editFields.hours_per_week) : null,
      contract_content: updatedContent,
    });
    setIsEditing(false);
  };

  const statusCfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG['Concept'];

  const quillModules = {
    toolbar: [
      [{ 'header': [2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ]
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                <span className="truncate">{employee ? `${employee.first_name} ${employee.last_name}` : 'Contract'}</span>
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={`${statusCfg.bg} ${statusCfg.text} text-xs`}>
                  {contract.status}
                </Badge>
                <span className="text-xs text-slate-500">{contract.contract_number}</span>
                <span className="text-xs text-slate-500">• {contract.contract_type}</span>
              </div>
            </div>
            {isAdmin && !isEditing && contract.status !== 'Actief' && (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="shrink-0">
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Bewerken
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => {
                  setIsEditing(false);
                  setEditContent(plainTextToHtml(contract.contract_content || ""));
                  setEditFields({
                    hourly_rate: contract.hourly_rate || "",
                    salary_scale: contract.salary_scale || "",
                    hours_per_week: contract.hours_per_week ?? "",
                    function_title: contract.function_title || "",
                    start_date: contract.start_date || "",
                    end_date: contract.end_date || "",
                    status: contract.status || "Concept",
                    is_verlenging: contract.is_verlenging || false,
                    oorspronkelijke_indienst_datum: contract.oorspronkelijke_indienst_datum || "",
                    verlenging_nummer: contract.verlenging_nummer || "",
                    proeftijd: contract.proeftijd || "1 maand proeftijd",
                  });
                }}>
                  <X className="w-3.5 h-3.5 mr-1" /> Annuleren
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Opslaan
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={viewTab} onValueChange={setViewTab} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 sm:px-6 pt-2 shrink-0">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="contract" className="text-xs sm:text-sm">
                <FileText className="w-3.5 h-3.5 mr-1 hidden sm:block" />
                Contract
              </TabsTrigger>
              <TabsTrigger value="analyse" className="text-xs sm:text-sm" onClick={() => {
                if (!conflictAnalysis && !loadingConflicts) onAnalyze?.('conflict_analysis');
              }}>
                <Shield className="w-3.5 h-3.5 mr-1 hidden sm:block" />
                Analyse
              </TabsTrigger>
              <TabsTrigger value="samenvatting" className="text-xs sm:text-sm" onClick={() => {
                if (!clauseSummary && !loadingSummary) onAnalyze?.('clause_summary');
              }}>
                <BookOpen className="w-3.5 h-3.5 mr-1 hidden sm:block" />
                Samenvatting
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
            <TabsContent value="contract" className="mt-4 space-y-4">
              {/* Editable contract fields */}
              {isEditing ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 space-y-3">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Contractgegevens bewerken</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Functie</Label>
                      <Input
                        value={editFields.function_title}
                        onChange={(e) => setEditFields({ ...editFields, function_title: e.target.value })}
                        placeholder="Bijv. Pakketbezorger"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <TableProperties className="w-3 h-3" /> Loonschaal
                      </Label>
                      <Select
                        value={selectedScale}
                        onValueChange={(v) => {
                          setSelectedScale(v);
                          setSelectedStep("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kies schaal..." />
                        </SelectTrigger>
                        <SelectContent>
                          {scales.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Trede</Label>
                      <Select
                        value={selectedStep}
                        onValueChange={(v) => {
                          setSelectedStep(v);
                          handleScaleStepSelect(selectedScale, v);
                        }}
                        disabled={!selectedScale}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={selectedScale ? "Kies trede..." : "Kies eerst schaal"} />
                        </SelectTrigger>
                        <SelectContent>
                          {stepsForScale.map(t => (
                            <SelectItem key={t.id} value={String(t.step)}>
                              {t.step == -1 ? 'Min' : `Trede ${t.step}`} — €{t.hourly_rate.toFixed(2)}/u
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Loonschaal (resultaat)</Label>
                      <Input
                        value={editFields.salary_scale}
                        onChange={(e) => setEditFields({ ...editFields, salary_scale: e.target.value })}
                        placeholder="Wordt automatisch ingevuld"
                        className="bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Uurloon (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editFields.hourly_rate}
                        onChange={(e) => setEditFields({ ...editFields, hourly_rate: e.target.value })}
                        placeholder="Wordt automatisch ingevuld"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Uren per week</Label>
                      <Input
                        type="number"
                        value={editFields.hours_per_week}
                        onChange={(e) => setEditFields({ ...editFields, hours_per_week: e.target.value })}
                        placeholder="0 voor oproep"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Startdatum</Label>
                      <Input
                        type="date"
                        value={editFields.start_date}
                        onChange={(e) => setEditFields({ ...editFields, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Einddatum</Label>
                      <Input
                        type="date"
                        value={editFields.end_date}
                        onChange={(e) => setEditFields({ ...editFields, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  {/* Verlenging / eerder in dienst */}
                  <div className="border-t border-amber-200 pt-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="is_verlenging"
                        checked={editFields.is_verlenging}
                        onCheckedChange={(checked) => {
                          const newFields = { ...editFields, is_verlenging: !!checked };
                          if (checked) {
                            newFields.proeftijd = "Geen proeftijd";
                          } else {
                            newFields.proeftijd = "1 maand proeftijd";
                            newFields.oorspronkelijke_indienst_datum = "";
                            newFields.verlenging_nummer = "";
                          }
                          setEditFields(newFields);
                        }}
                      />
                      <Label htmlFor="is_verlenging" className="text-sm font-medium cursor-pointer">
                        Werknemer is oorspronkelijk eerder in dienst getreden
                      </Label>
                    </div>

                    {editFields.is_verlenging && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 ml-7">
                        <div className="space-y-1">
                          <Label className="text-xs">Oorspronkelijke indienst datum</Label>
                          <Input
                            type="date"
                            value={editFields.oorspronkelijke_indienst_datum}
                            onChange={(e) => setEditFields({ ...editFields, oorspronkelijke_indienst_datum: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Verlenging</Label>
                          <Select
                            value={editFields.verlenging_nummer}
                            onValueChange={(v) => setEditFields({ ...editFields, verlenging_nummer: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Kies verlenging..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1e verlenging">1e verlenging</SelectItem>
                              <SelectItem value="2e verlenging">2e verlenging</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Proeftijd</Label>
                          <Input value="Geen proeftijd" disabled className="bg-slate-100 text-slate-500" />
                        </div>
                      </div>
                    )}

                    {!editFields.is_verlenging && (
                      <div className="ml-7">
                        <div className="space-y-1 max-w-xs">
                          <Label className="text-xs">Proeftijd</Label>
                          <Input value="1 maand proeftijd" disabled className="bg-slate-100 text-slate-500" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={editFields.status} onValueChange={(v) => setEditFields({ ...editFields, status: v })}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Concept', 'TerOndertekening', 'Ondertekend', 'Actief', 'Verlopen', 'Beëindigd'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs">Functie</p>
                      <p className="font-medium">{contract.function_title || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Loonschaal</p>
                      <p className="font-medium">{contract.salary_scale || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Uurloon</p>
                      <p className="font-medium">{contract.hourly_rate ? `€${contract.hourly_rate.toFixed(2)}` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Uren/week</p>
                      <p className="font-medium">{contract.hours_per_week ?? '-'}u</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Startdatum</p>
                      <p className="font-medium">{contract.start_date || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Einddatum</p>
                      <p className="font-medium">{contract.end_date || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contract text */}
              {isEditing ? (
                <div className="border rounded-lg bg-white">
                  <ReactQuill
                    value={editContent}
                    onChange={setEditContent}
                    modules={quillModules}
                    className="contract-editor"
                    placeholder="Contracttekst..."
                  />
                  <style>{`
                    .contract-editor .ql-container {
                      min-height: 400px;
                      max-height: 50vh;
                      overflow-y: auto;
                      font-family: Georgia, 'Times New Roman', serif;
                      font-size: 14px;
                      line-height: 1.8;
                    }
                    .contract-editor .ql-editor {
                      padding: 24px;
                    }
                    .contract-editor .ql-editor h3 {
                      font-weight: 700;
                      margin-top: 1.5em;
                      margin-bottom: 0.5em;
                      font-size: 1.05em;
                      color: #1e293b;
                    }
                    .contract-editor .ql-editor p {
                      margin-bottom: 0.5em;
                    }
                  `}</style>
                </div>
              ) : (
                <div className="border rounded-lg bg-white">
                  <div
                    className="p-4 sm:p-6 lg:p-8 prose prose-sm sm:prose max-w-none contract-view"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif", lineHeight: '1.8' }}
                  >
                    {contract.contract_content ? (
                      <div dangerouslySetInnerHTML={{ __html: plainTextToHtml(contract.contract_content) }} />
                    ) : (
                      <p className="text-slate-400 italic">Geen contracttekst beschikbaar.</p>
                    )}
                  </div>
                  <style>{`
                    .contract-view h3 {
                      font-weight: 700;
                      margin-top: 1.5em;
                      margin-bottom: 0.5em;
                      font-size: 1.05em;
                      color: #1e293b;
                      border-bottom: 1px solid #e2e8f0;
                      padding-bottom: 4px;
                    }
                    .contract-view p {
                      margin-bottom: 0.4em;
                      color: #334155;
                    }
                    @media (max-width: 640px) {
                      .contract-view { font-size: 14px; line-height: 1.7; }
                      .contract-view h3 { font-size: 15px; }
                    }
                  `}</style>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analyse" className="mt-4">
              <ConflictAnalysisPanel analysis={conflictAnalysis} isLoading={loadingConflicts} />
              {!conflictAnalysis && !loadingConflicts && (
                <div className="text-center py-8">
                  <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm mb-3">Analyseer dit contract op conflicten</p>
                  <Button onClick={() => onAnalyze?.('conflict_analysis')} className="bg-blue-600 hover:bg-blue-700">
                    <Sparkles className="w-4 h-4 mr-2" /> Start Analyse
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="samenvatting" className="mt-4">
              <ClauseSummaryPanel summary={clauseSummary} isLoading={loadingSummary} />
              {!clauseSummary && !loadingSummary && (
                <div className="text-center py-8">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm mb-3">Genereer een samenvatting van alle clausules</p>
                  <Button onClick={() => onAnalyze?.('clause_summary')} className="bg-purple-600 hover:bg-purple-700">
                    <Sparkles className="w-4 h-4 mr-2" /> Genereer Samenvatting
                  </Button>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}