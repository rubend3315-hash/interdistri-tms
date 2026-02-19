import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, FileText, Eye, Copy, Info } from "lucide-react";

const emptyTemplate = {
  name: "",
  template_key: "",
  subject: "",
  body: "",
  reply_to: "info@interdistri.nl",
  category: "Algemeen",
  is_active: true,
};

const categories = ["Algemeen", "HR", "Planning", "Contract", "Overig"];

const TEMPLATE_KEY_OPTIONS = [
  { value: "welkomstmail", label: "Welkomstmail", description: "Wordt verstuurd bij het uitnodigen van een nieuwe medewerker" },
  { value: "stamkaart", label: "Stamkaart naar loonadministratie", description: "Stamkaart gegevens naar de loonadministratie" },
  { value: "contract_ter_ondertekening", label: "Contract ter ondertekening", description: "E-mail naar medewerker om contract te tekenen" },
  { value: "contract_ondertekend_door_medewerker", label: "Contract ondertekend door medewerker", description: "Notificatie naar management dat medewerker heeft getekend" },
  { value: "contract_geactiveerd", label: "Contract geactiveerd", description: "Bevestiging naar medewerker dat contract actief is" },
  { value: "dienst_afgekeurd", label: "Dienst afgekeurd", description: "Notificatie naar medewerker bij afkeuring tijdregistratie" },
  { value: "contract_herinnering", label: "Contract herinnering", description: "Herinnering bij verlopen contract" },
  { value: "nieuw_document", label: "Nieuw document", description: "Notificatie bij nieuw HR-document" },
  { value: "algemeen", label: "Algemeen", description: "Vrij sjabloon voor handmatig gebruik" },
];

const categoryColor = {
  Algemeen: "bg-slate-100 text-slate-700",
  HR: "bg-blue-100 text-blue-700",
  Planning: "bg-green-100 text-green-700",
  Contract: "bg-purple-100 text-purple-700",
  Overig: "bg-amber-100 text-amber-700",
};

const PLACEHOLDER_HELP = {
  welkomstmail: ["{{naam}}", "{{email}}"],
  stamkaart: ["{{naam}}", "{{geboortedatum}}", "{{bsn}}", "{{adres}}", "{{iban}}", "{{afdeling}}", "{{functie}}", "{{contract_type}}", "{{uren_per_week}}", "{{loonschaal}}", "{{uurloon}}", "{{loonheffingskorting}}", "{{id_document_nummer}}", "{{id_document_geldig}}"],
  contract_ter_ondertekening: ["{{naam}}", "{{contractnummer}}", "{{contract_type}}", "{{startdatum}}", "{{einddatum}}", "{{functie}}"],
  contract_ondertekend_door_medewerker: ["{{naam}}", "{{contractnummer}}", "{{admin_naam}}"],
  contract_geactiveerd: ["{{naam}}", "{{contractnummer}}"],
  dienst_afgekeurd: ["{{naam}}", "{{datum}}", "{{starttijd}}", "{{eindtijd}}", "{{pauze}}", "{{totaal_uren}}", "{{reden}}", "{{link}}"],
  contract_herinnering: ["{{naam}}", "{{contractnummer}}", "{{einddatum}}", "{{dagen_tot_verloop}}"],
  nieuw_document: ["{{naam}}", "{{document_naam}}", "{{document_type}}", "{{vervaldatum}}"],
  algemeen: ["{{naam}}"],
};

export default function EmailTemplateManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState(emptyTemplate);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["emailTemplates"],
    queryFn: () => base44.entities.EmailTemplate.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmailTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emailTemplates"] }),
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingTemplate(null);
    setForm(emptyTemplate);
  };

  const openEdit = (template) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      template_key: template.template_key || "",
      subject: template.subject,
      body: template.body,
      reply_to: template.reply_to || "info@interdistri.nl",
      category: template.category || "Algemeen",
      is_active: template.is_active !== false,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handlePreview = (template) => {
    setPreviewHtml(template.body);
    setShowPreview(true);
  };

  const getKeyLabel = (key) => {
    return TEMPLATE_KEY_OPTIONS.find(o => o.value === key)?.label || key || "—";
  };

  const currentPlaceholders = PLACEHOLDER_HELP[form.template_key] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">E-mail Sjablonen</h2>
          <p className="text-sm text-slate-500">Beheer de HTML opmaak van alle systeem-e-mails</p>
        </div>
        <Button
          onClick={() => { setForm(emptyTemplate); setShowDialog(true); }}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nieuw sjabloon
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nog geen sjablonen aangemaakt</p>
            <p className="text-xs text-slate-400 mt-1">Maak sjablonen aan om de e-mails van het systeem aan te passen.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium text-slate-900 truncate">{t.name}</h3>
                    <Badge className={categoryColor[t.category] || categoryColor.Algemeen}>
                      {t.category || "Algemeen"}
                    </Badge>
                    {t.template_key && (
                      <Badge variant="outline" className="text-xs">
                        {getKeyLabel(t.template_key)}
                      </Badge>
                    )}
                    {!t.is_active && <Badge variant="outline" className="text-slate-400">Inactief</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 truncate">Onderwerp: {t.subject}</p>
                </div>
                <div className="flex gap-1 ml-4">
                  <Button size="sm" variant="ghost" onClick={() => handlePreview(t)} title="Voorbeeld">
                    <Eye className="w-4 h-4 text-slate-500" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)} title="Bewerken">
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Sjabloon verwijderen?")) deleteMutation.mutate(t.id);
                    }}
                    title="Verwijderen"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Sjabloon bewerken" : "Nieuw sjabloon"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Naam *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Bijv. Welkomstmail"
                />
              </div>
              <div className="space-y-2">
                <Label>Categorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gekoppelde systeemfunctie</Label>
              <Select value={form.template_key || "_none"} onValueChange={(v) => setForm({ ...form, template_key: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer systeemfunctie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Geen koppeling —</SelectItem>
                  {TEMPLATE_KEY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.template_key && (
                <p className="text-xs text-slate-500">
                  {TEMPLATE_KEY_OPTIONS.find(o => o.value === form.template_key)?.description}
                </p>
              )}
            </div>

            {currentPlaceholders.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Beschikbare placeholders</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Gebruik deze in het onderwerp of de inhoud. Ze worden automatisch vervangen door de echte waarden.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {currentPlaceholders.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => navigator.clipboard.writeText(p)}
                          className="px-2 py-0.5 bg-white border border-blue-200 rounded text-xs text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Klik om te kopiëren"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Onderwerp *</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="E-mail onderwerp"
              />
            </div>

            <div className="space-y-2">
              <Label>Antwoordadres (Reply-To)</Label>
              <Input
                value={form.reply_to}
                onChange={(e) => setForm({ ...form, reply_to: e.target.value })}
                placeholder="bijv. info@interdistri.nl"
              />
            </div>

            <div className="space-y-2">
              <Label>Inhoud * (HTML)</Label>
              <ReactQuill
                value={form.body}
                onChange={(value) => setForm({ ...form, body: value })}
                style={{ minHeight: 250 }}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={closeDialog}>Annuleren</Button>
              <Button
                variant="outline"
                onClick={() => { setPreviewHtml(form.body); setShowPreview(true); }}
              >
                <Eye className="w-4 h-4 mr-2" />
                Voorbeeld
              </Button>
              <Button
                onClick={handleSave}
                disabled={!form.name || !form.subject || !form.body || createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending || updateMutation.isPending ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>E-mail voorbeeld</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}