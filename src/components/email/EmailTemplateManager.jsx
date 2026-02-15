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
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import ReactQuill from "react-quill";

const emptyTemplate = {
  name: "",
  subject: "",
  body: "",
  reply_to: "info@interdistri.nl",
  category: "Algemeen",
  is_active: true,
};

const categories = ["Algemeen", "HR", "Planning", "Contract", "Overig"];

export default function EmailTemplateManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState(emptyTemplate);
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

  const categoryColor = {
    Algemeen: "bg-slate-100 text-slate-700",
    HR: "bg-blue-100 text-blue-700",
    Planning: "bg-green-100 text-green-700",
    Contract: "bg-purple-100 text-purple-700",
    Overig: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">E-mail Sjablonen</h2>
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
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-slate-900 truncate">{t.name}</h3>
                    <Badge className={categoryColor[t.category] || categoryColor.Algemeen}>
                      {t.category || "Algemeen"}
                    </Badge>
                    {!t.is_active && <Badge variant="outline" className="text-slate-400">Inactief</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 truncate">Onderwerp: {t.subject}</p>
                  {t.reply_to && (
                    <p className="text-xs text-slate-400">Reply-To: {t.reply_to}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Sjabloon verwijderen?")) deleteMutation.mutate(t.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
              <Label>Inhoud *</Label>
              <ReactQuill
                value={form.body}
                onChange={(value) => setForm({ ...form, body: value })}
                style={{ minHeight: 200 }}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={closeDialog}>Annuleren</Button>
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
    </div>
  );
}