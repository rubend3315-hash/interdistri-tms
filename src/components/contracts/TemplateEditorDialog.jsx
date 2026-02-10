import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, FileText } from "lucide-react";
import ReactQuill from "react-quill";

const quillModules = {
  toolbar: [
    [{ 'header': [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['clean']
  ]
};

export default function TemplateEditorDialog({ open, onOpenChange, template, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contract_type: "Vast",
    description: "",
    template_content: "",
    is_default: false,
    status: "Actief"
  });

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name || "",
        contract_type: template.contract_type || "Vast",
        description: template.description || "",
        template_content: template.template_content || "",
        is_default: template.is_default || false,
        status: template.status || "Actief"
      });
    } else {
      setForm({
        name: "",
        contract_type: "Vast",
        description: "",
        template_content: "",
        is_default: false,
        status: "Actief"
      });
    }
  }, [template, open]);

  const handleSave = async () => {
    setSaving(true);
    if (template?.id) {
      await base44.entities.ContractTemplate.update(template.id, form);
    } else {
      await base44.entities.ContractTemplate.create(form);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            {template?.id ? "Sjabloon Bewerken" : "Nieuw Sjabloon"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Naam</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Bijv. Standaard Vast Contract"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contracttype</Label>
              <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vast">Vast</SelectItem>
                  <SelectItem value="Tijdelijk">Tijdelijk</SelectItem>
                  <SelectItem value="Oproep">Oproep</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Actief">Actief</SelectItem>
                  <SelectItem value="Inactief">Inactief</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Beschrijving (optioneel)</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Korte beschrijving..."
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Sjabloon Inhoud (HTML met placeholders)</Label>
            <div className="border rounded-lg bg-white">
              <ReactQuill
                value={form.template_content}
                onChange={(val) => setForm({ ...form, template_content: val })}
                modules={quillModules}
                className="template-editor"
                placeholder="Voer hier de contracttekst in met placeholders zoals {{fullName}}, {{startDatum}}, etc."
              />
              <style>{`
                .template-editor .ql-container {
                  min-height: 350px;
                  max-height: 50vh;
                  overflow-y: auto;
                  font-family: Georgia, 'Times New Roman', serif;
                  font-size: 14px;
                  line-height: 1.8;
                }
                .template-editor .ql-editor {
                  padding: 24px;
                }
                .template-editor .ql-editor h3 {
                  font-weight: 700;
                  margin-top: 1.5em;
                  margin-bottom: 0.5em;
                  font-size: 1.05em;
                  color: #1e293b;
                }
              `}</style>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={saving || !form.name || !form.template_content}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {template?.id ? "Bijwerken" : "Opslaan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}