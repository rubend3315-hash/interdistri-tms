import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Upload, FileText, CheckCircle2, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DOC_TYPES = [
  { value: "Paspoort", label: "Paspoort" },
  { value: "Identiteitsbewijs", label: "ID-kaart" },
  { value: "Rijbewijs", label: "Rijbewijs" },
];

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function StepIdDocument({ employeeData, onboardingData, onChange, onNext, onBack }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const idDoc = onboardingData?.id_document || {};
  const hasDoc = !!(idDoc.file_uri || idDoc.file_url);

  const fullName = `${employeeData.first_name || ""} ${employeeData.prefix ? employeeData.prefix + " " : ""}${employeeData.last_name || ""}`.trim();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Alleen PDF, JPG en PNG bestanden zijn toegestaan.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Bestand mag maximaal 10MB zijn.");
      return;
    }

    const docType = idDoc.document_type || "Identiteitsbewijs";

    setUploading(true);
    try {
      // SECURITY: Upload naar private storage
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

      // Direct Document entity aanmaken
      const doc = await base44.entities.Document.create({
        name: `ID Document - ${fullName || "Medewerker"}`,
        document_type: docType,
        file_uri,
        file_url: null,
        encrypted: true,
        source: "onboarding",
        linked_employee_id: onboardingData?._temp_employee_id || employeeData?.id || null,
        linked_entity_name: fullName || null,
        notes: `Bron: onboarding`,
        status: "Actief",
      });

      onChange(prev => ({
        ...prev,
        id_document: {
          ...prev.id_document,
          file_uri,
          file_url: null,
          file_name: file.name,
          document_type: docType,
          encrypted: true,
          document_id: doc.id,
        },
      }));
      toast.success("Document veilig geüpload!");
    } catch (err) {
      toast.error("Upload mislukt: " + (err.message || "Onbekende fout"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    // Verwijder Document entity als die bestaat
    if (idDoc.document_id) {
      try {
        await base44.entities.Document.delete(idDoc.document_id);
      } catch (_) {}
    }
    onChange(prev => ({
      ...prev,
      id_document: { ...prev.id_document, file_uri: null, file_url: null, file_name: null, encrypted: false, document_id: null },
    }));
  };

  const handleTypeChange = async (value) => {
    onChange(prev => ({
      ...prev,
      id_document: { ...prev.id_document, document_type: value },
    }));
    // Update Document entity als die al bestaat
    if (idDoc.document_id) {
      try {
        await base44.entities.Document.update(idDoc.document_id, { document_type: value });
      } catch (_) {}
    }
  };

  const handleBsnToggle = async (checked) => {
    const containsBsn = !!checked;
    onChange(prev => ({
      ...prev,
      id_document: { ...prev.id_document, contains_bsn: containsBsn },
    }));
    // Update Document notes
    if (idDoc.document_id) {
      try {
        await base44.entities.Document.update(idDoc.document_id, {
          notes: `Bron: onboarding${containsBsn ? ' — BSN zichtbaar op document' : ''}`,
        });
      } catch (_) {}
    }
  };

  const handleNext = () => {
    if (!hasDoc) {
      toast.error("Upload eerst een identiteitsdocument om door te gaan.");
      return;
    }
    if (!idDoc.document_type) {
      toast.error("Selecteer het type document.");
      return;
    }
    onNext();
  };

  return (
    <div className="max-w-[880px] mx-auto space-y-4">
      <section className="border rounded-lg p-5 bg-white space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Identiteitsdocument</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload het ID-document van {fullName || "de medewerker"}. Dit wordt veilig opgeslagen en is alleen toegankelijk voor bevoegde medewerkers.
          </p>
        </div>

        {/* Document type */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Type document *</Label>
          <Select value={idDoc.document_type || ""} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-64 text-sm">
              <SelectValue placeholder="Selecteer type..." />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload area */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Document uploaden *</Label>
          {hasDoc ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 truncate">{idDoc.file_name || "Document geüpload"}</p>
                <p className="text-xs text-green-600">Type: {idDoc.document_type || "—"} — Privé opgeslagen</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={handleRemove}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-sm text-blue-600">Uploaden...</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400" />
                  <p className="text-sm text-slate-600">Klik om een bestand te selecteren</p>
                  <p className="text-xs text-slate-400">PDF, JPG of PNG — max 10MB</p>
                </>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* BSN checkbox */}
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Checkbox
            id="contains_bsn"
            checked={!!idDoc.contains_bsn}
            onCheckedChange={handleBsnToggle}
            className="mt-0.5"
          />
          <div>
            <label htmlFor="contains_bsn" className="text-sm font-medium text-amber-800 cursor-pointer">
              BSN zichtbaar op document
            </label>
            <p className="text-xs text-amber-600 mt-0.5">
              Vink aan als het BSN-nummer zichtbaar is op het geüploade document. Dit wordt geregistreerd voor compliance-doeleinden.
            </p>
          </div>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
          <FileText className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
          <div>
            <p className="font-medium text-slate-600">Beveiligingsbeleid</p>
            <p className="mt-0.5">
              Het document wordt veilig opgeslagen in privé-storage. Delen met loonadministratie gebeurt uitsluitend via een beveiligde downloadlink (geen e-mailbijlage).
            </p>
          </div>
        </div>
      </section>

      {/* Validation warning */}
      {!hasDoc && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Een identiteitsdocument is verplicht om de onboarding af te ronden.
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="h-8 text-xs">
          <ChevronLeft className="w-4 h-4 mr-1" /> Vorige
        </Button>
        <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
          Volgende: Verklaringen <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}