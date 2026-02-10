import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Plus, Pencil, Trash2, Copy, Star, StarOff
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import TemplateEditorDialog from "../components/contracts/TemplateEditorDialog";

const TYPE_COLORS = {
  "Vast": "bg-emerald-100 text-emerald-700",
  "Vast Nul Uren": "bg-teal-100 text-teal-700",
  "Tijdelijk": "bg-blue-100 text-blue-700",
  "Tijdelijk Nul Uren": "bg-indigo-100 text-indigo-700"
};

export default function ContractTemplates() {
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deleteTemplate, setDeleteTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['contractTemplates'],
    queryFn: () => base44.entities.ContractTemplate.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContractTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
      setDeleteTemplate(null);
    }
  });

  const toggleDefaultMutation = useMutation({
    mutationFn: async ({ id, contract_type, currentDefault }) => {
      // If setting as default, unset other defaults for same type
      if (!currentDefault) {
        const sameTypeDefaults = templates.filter(t => t.contract_type === contract_type && t.is_default && t.id !== id);
        for (const t of sameTypeDefaults) {
          await base44.entities.ContractTemplate.update(t.id, { is_default: false });
        }
      }
      await base44.entities.ContractTemplate.update(id, { is_default: !currentDefault });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contractTemplates'] })
  });

  const handleNew = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDuplicate = (template) => {
    setEditingTemplate({
      ...template,
      id: undefined,
      name: `${template.name} (kopie)`,
      is_default: false
    });
    setShowEditor(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
    setShowEditor(false);
    setEditingTemplate(null);
  };

  const grouped = {
    "Vast": templates.filter(t => t.contract_type === 'Vast'),
    "Vast Nul Uren": templates.filter(t => t.contract_type === 'Vast Nul Uren'),
    "Tijdelijk": templates.filter(t => t.contract_type === 'Tijdelijk'),
    "Tijdelijk Nul Uren": templates.filter(t => t.contract_type === 'Tijdelijk Nul Uren'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contract Sjablonen</h1>
          <p className="text-slate-500 mt-1">Beheer sjablonen voor arbeidscontracten</p>
        </div>
        <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nieuw Sjabloon
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Beschikbare placeholders in sjablonen:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs font-mono">
          {['{{fullName}}','{{geboortedatum}}','{{adres}}','{{postcode}}','{{woonplaats}}','{{trede}}','{{uurloon}}','{{startDatum}}','{{eindDatum}}','{{duurTekst}}','{{ondertekeningDatum}}','{{functie}}','{{afdeling}}','{{proeftijd}}','{{inDienstDatum}}','{{urenPerWeek}}'].map(p => (
            <span key={p} className="bg-blue-100 rounded px-1 py-0.5">{p}</span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>Nog geen sjablonen. Maak je eerste sjabloon aan of importeer de standaard sjablonen.</p>
            <Button onClick={handleNew} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" /> Sjabloon Aanmaken
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([type, items]) => items.length > 0 && (
          <div key={type} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Badge className={TYPE_COLORS[type]}>{type}</Badge>
              <span className="text-slate-400 text-sm font-normal">({items.length} sjablonen)</span>
            </h2>
            {items.map(template => (
              <Card key={template.id} className={template.is_default ? "border-blue-300 bg-blue-50/30" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{template.name}</h3>
                        {template.is_default && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">Standaard</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {template.status}
                        </Badge>
                      </div>
                      {template.description && (
                        <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={template.is_default ? "Standaard verwijderen" : "Instellen als standaard"}
                        onClick={() => toggleDefaultMutation.mutate({
                          id: template.id,
                          contract_type: template.contract_type,
                          currentDefault: template.is_default
                        })}
                      >
                        {template.is_default ? <Star className="w-4 h-4 text-blue-600 fill-blue-600" /> : <StarOff className="w-4 h-4 text-slate-400" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(template)}>
                        <Copy className="w-4 h-4 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(template)}>
                        <Pencil className="w-4 h-4 text-slate-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteTemplate(template)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}

      <TemplateEditorDialog
        open={showEditor}
        onOpenChange={setShowEditor}
        template={editingTemplate}
        onSaved={handleSaved}
      />

      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sjabloon verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je sjabloon "{deleteTemplate?.name}" wilt verwijderen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate(deleteTemplate.id)}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}