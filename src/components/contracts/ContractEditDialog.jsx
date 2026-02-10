import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText, Save, Pencil, X, Loader2, TableProperties
} from "lucide-react";
import ReactQuill from "react-quill";

const STATUS_CONFIG = {
  'Concept': { bg: 'bg-slate-100', text: 'text-slate-700' },
  'TerOndertekening': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'Ondertekend': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Actief': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'Verlopen': { bg: 'bg-red-100', text: 'text-red-700' },
  'Beëindigd': { bg: 'bg-slate-100', text: 'text-slate-700' }
};

function ensureHtml(text) {
  if (!text) return "";
  
  // Already proper HTML - return as-is
  const htmlTagCount = (text.match(/<\/?(?:p|h[1-6]|div|br|ul|ol|li|table)\b/gi) || []).length;
  if (htmlTagCount > 5) return text;
  
  // Extract any trailing HTML block (like signature div) and process the rest as plain text
  let trailingHtml = "";
  const divMatch = text.match(/(<div\s+style=[\s\S]*<\/div>)\s*$/);
  let plainPart = text;
  if (divMatch) {
    trailingHtml = divMatch[1];
    plainPart = text.substring(0, text.indexOf(divMatch[1]));
  }
  
  // Convert plain text to HTML line by line
  const lines = plainPart.split('\n');
  let html = '';
  
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    
    if (!line) {
      html += '<br/>';
      continue;
    }
    
    if (/^ARBEIDSOVEREENKOMST/.test(line)) {
      html += `<h2>${line}</h2>`;
      continue;
    }
    
    if (/^Artikel\s+\d+/i.test(line)) {
      html += `<h3>${line}</h3>`;
      continue;
    }
    
    if (/^\d+\.\t/.test(line) || /^\t/.test(rawLine)) {
      html += `<p class="indent">${line}</p>`;
      continue;
    }
    
    html += `<p>${line}</p>`;
  }
  
  return html + trailingHtml;
}

export default function ContractEditDialog({
  open,
  onOpenChange,
  contract,
  employee,
  isAdmin,
  onSave,
  saving
}) {

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
      setEditContent(ensureHtml(contract.contract_content || ""));
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
      const formattedRate = `€${Number(editFields.hourly_rate).toFixed(2)}`;
      updated = updated.replace(
        /uurloon[:\s]*\[NOG IN TE VULLEN\]/gi,
        `uurloon ${formattedRate}`
      );
      updated = updated.replace(
        /bruto\s+uurloon[:\s]*\[NOG IN TE VULLEN\]/gi,
        `bruto uurloon ${formattedRate}`
      );
      // "overeenkomst [NOG IN TE VULLEN] bruto per" pattern (salaris artikel)
      updated = updated.replace(
        /overeenkomst\s+\[NOG IN TE VULLEN\]\s+bruto\s+per/gi,
        `overeenkomst ${formattedRate} bruto per`
      );
      // Generic: "aanvangssalaris ... [NOG IN TE VULLEN] bruto"
      updated = updated.replace(
        /aanvangssalaris[^[]*\[NOG IN TE VULLEN\]/gi,
        `aanvangssalaris bedraagt ten tijde van het aangaan van deze overeenkomst ${formattedRate}`
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
    // Einddatum replacement
    if (editFields.end_date) {
      const endDateObj = new Date(editFields.end_date + 'T12:00:00');
      const endDateFormatted = endDateObj.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
      updated = updated.replace(
        /op\s+\[NOG IN TE VULLEN\]\s+zonder\s+dat/gi,
        `op ${endDateFormatted} zonder dat`
      );
      updated = updated.replace(
        /einddatum\)\s*\./gi,
        `${endDateFormatted}).`
      );
      updated = updated.replace(
        /eindigt[^.]*\[NOG IN TE VULLEN\]/gi,
        `eindigt derhalve van rechtswege op ${endDateFormatted}`
      );
      // Also handle generic "per (einddatum)" pattern
      updated = updated.replace(
        /per\s*\(einddatum\)/gi,
        `per ${endDateFormatted}`
      );
    }

    // Startdatum replacement
    if (editFields.start_date) {
      const startDateObj = new Date(editFields.start_date + 'T12:00:00');
      const startDateFormatted = startDateObj.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
      updated = updated.replace(
        /vangt aan op\s+\[NOG IN TE VULLEN\]/gi,
        `vangt aan op ${startDateFormatted}`
      );
    }

    // Duur in maanden berekenen
    if (editFields.start_date && editFields.end_date) {
      const startD = new Date(editFields.start_date);
      const endD = new Date(editFields.end_date);
      const months = (endD.getFullYear() - startD.getFullYear()) * 12 + (endD.getMonth() - startD.getMonth());
      if (months > 0) {
        updated = updated.replace(
          /duur van\s+\[NOG IN TE VULLEN\]\s+maanden/gi,
          `duur van ${months} maanden`
        );
      }
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
                  setEditContent(ensureHtml(contract.contract_content || ""));
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

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="mt-4 space-y-4">
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
                    <div>
                      <p className="text-slate-400 text-xs">Proeftijd</p>
                      <p className="font-medium">{contract.proeftijd || '-'}</p>
                    </div>
                    {contract.is_verlenging && (
                      <>
                        <div>
                          <p className="text-slate-400 text-xs">Verlenging</p>
                          <p className="font-medium">{contract.verlenging_nummer || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Oorspronkelijk in dienst</p>
                          <p className="font-medium">{contract.oorspronkelijke_indienst_datum || '-'}</p>
                        </div>
                      </>
                    )}
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
                    className="p-4 sm:p-6 lg:p-8 contract-view"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif", lineHeight: '1.8' }}
                  >
                    {contract.contract_content ? (
                      <div dangerouslySetInnerHTML={{ __html: ensureHtml(contract.contract_content) }} />
                    ) : (
                      <p className="text-slate-400 italic">Geen contracttekst beschikbaar.</p>
                    )}
                  </div>
                  <style>{`
                    .contract-view h2 {
                      font-size: 1.2em;
                      font-weight: bold;
                      margin: 0.8em 0 0.5em 0;
                      text-align: center;
                      color: #1e293b;
                    }
                    .contract-view h3 {
                      font-weight: 700;
                      margin: 1.5em 0 0.3em 0;
                      font-size: 1.05em;
                      color: #1e293b;
                      border-bottom: 1px solid #e2e8f0;
                      padding-bottom: 4px;
                    }
                    .contract-view p {
                      margin: 0.3em 0;
                      color: #334155;
                    }
                    .contract-view p.indent {
                      margin-left: 1.5em;
                    }
                    .contract-view br {
                      display: block;
                      content: "";
                      margin: 0.3em 0;
                    }
                    @media (max-width: 640px) {
                      .contract-view { font-size: 14px; line-height: 1.7; }
                      .contract-view h3 { font-size: 15px; }
                    }
                  `}</style>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}