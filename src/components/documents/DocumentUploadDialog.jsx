import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";

const DOCUMENT_TYPES = [
  "Rijbewijs", "Code 95", "VCA Certificaat", "NIWO Vergunning",
  "APK Keuring", "Verzekeringsbewijs", "Identiteitsbewijs",
  "Arbeidsovereenkomst", "Tachograafkaart", "ADR Certificaat",
  "Kentekenbewijs", "Overig"
];

export default function DocumentUploadDialog({ open, onOpenChange, employees = [], vehicles = [], editDocument = null }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(editDocument || {
    name: "",
    document_type: "",
    file_url: "",
    linked_employee_id: "",
    linked_vehicle_id: "",
    linked_entity_name: "",
    expiry_date: "",
    notes: "",
    status: "Actief"
  });

  React.useEffect(() => {
    if (editDocument) {
      setForm(editDocument);
    } else {
      setForm({
        name: "", document_type: "", file_url: "", linked_employee_id: "",
        linked_vehicle_id: "", linked_entity_name: "", expiry_date: "", notes: "", status: "Actief"
      });
    }
  }, [editDocument, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editDocument?.id) {
        return base44.entities.Document.update(editDocument.id, data);
      }
      return base44.entities.Document.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      onOpenChange(false);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, file_url }));
    setUploading(false);
  };

  const handleLinkChange = (type, value) => {
    if (type === "employee") {
      const emp = employees.find(e => e.id === value);
      setForm(prev => ({
        ...prev,
        linked_employee_id: value,
        linked_vehicle_id: "",
        linked_entity_name: emp ? `${emp.first_name} ${emp.last_name}` : ""
      }));
    } else {
      const veh = vehicles.find(v => v.id === value);
      setForm(prev => ({
        ...prev,
        linked_vehicle_id: value,
        linked_employee_id: "",
        linked_entity_name: veh ? `${veh.license_plate} - ${veh.brand} ${veh.model || ''}` : ""
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editDocument ? "Document bewerken" : "Document uploaden"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Documentnaam *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={form.document_type} onValueChange={v => setForm(p => ({ ...p, document_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecteer type" /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Bestand</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-sm flex-1">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-slate-500" />}
                {form.file_url ? "Bestand vervangen" : "Bestand kiezen"}
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
              {form.file_url && (
                <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  Bekijken
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Gekoppeld aan medewerker</Label>
              <Select value={form.linked_employee_id || "none"} onValueChange={v => handleLinkChange("employee", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Geen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {employees.filter(e => e.status === 'Actief').sort((a,b) => a.last_name.localeCompare(b.last_name)).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gekoppeld aan voertuig</Label>
              <Select value={form.linked_vehicle_id || "none"} onValueChange={v => handleLinkChange("vehicle", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Geen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {vehicles.sort((a,b) => a.license_plate.localeCompare(b.license_plate)).map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.license_plate} - {v.brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vervaldatum</Label>
              <Input type="date" value={form.expiry_date || ""} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Actief">Actief</SelectItem>
                  <SelectItem value="Verlopen">Verlopen</SelectItem>
                  <SelectItem value="Gearchiveerd">Gearchiveerd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Opmerkingen</Label>
            <Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit" disabled={saveMutation.isPending || !form.name || !form.document_type}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editDocument ? "Opslaan" : "Uploaden"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}