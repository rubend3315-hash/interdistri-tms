import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText, FileUp } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import ConfirmDialog from "@/components/ConfirmDialog";

const statusColors = {
  "Actief": "bg-emerald-100 text-emerald-700",
  "Verlopen": "bg-red-100 text-red-700",
  "Opgezegd": "bg-slate-100 text-slate-700",
};

export default function LeaseTab({ vehicle }) {
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formData, setFormData] = useState({
    lease_company: "", contract_number: "", start_date: "", end_date: "",
    monthly_cost: "", mileage_limit: "", excess_km_cost: "",
    document_url: "", notes: "", status: "Actief"
  });
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['leaseContracts', vehicle.id],
    queryFn: () => base44.entities.LeaseContract.filter({ vehicle_id: vehicle.id })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaseContract.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaseContracts', vehicle.id] });
      setShowForm(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeaseContract.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaseContracts', vehicle.id] })
  });

  const resetForm = () => {
    setFormData({
      lease_company: "", contract_number: "", start_date: "", end_date: "",
      monthly_cost: "", mileage_limit: "", excess_km_cost: "",
      document_url: "", notes: "", status: "Actief"
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, document_url: file_url }));
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      vehicle_id: vehicle.id,
      monthly_cost: formData.monthly_cost ? Number(formData.monthly_cost) : null,
      mileage_limit: formData.mileage_limit ? Number(formData.mileage_limit) : null,
      excess_km_cost: formData.excess_km_cost ? Number(formData.excess_km_cost) : null,
    });
  };

  const sorted = [...records].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-slate-900">Leasecontracten</h3>
          <Badge variant="secondary">{records.length} contracten</Badge>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 gap-1">
          <Plus className="w-3.5 h-3.5" />
          Toevoegen
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded-xl p-4 space-y-4 bg-slate-50">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Leasemaatschappij *</Label>
              <Input value={formData.lease_company} onChange={(e) => setFormData({ ...formData, lease_company: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Contractnummer</Label>
              <Input value={formData.contract_number} onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Startdatum *</Label>
              <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Einddatum</Label>
              <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Actief">Actief</SelectItem>
                  <SelectItem value="Verlopen">Verlopen</SelectItem>
                  <SelectItem value="Opgezegd">Opgezegd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Maandbedrag (€)</Label>
              <Input type="number" step="0.01" value={formData.monthly_cost} onChange={(e) => setFormData({ ...formData, monthly_cost: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Km-limiet / jaar</Label>
              <Input type="number" value={formData.mileage_limit} onChange={(e) => setFormData({ ...formData, mileage_limit: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Meer-km kosten (€/km)</Label>
              <Input type="number" step="0.01" value={formData.excess_km_cost} onChange={(e) => setFormData({ ...formData, excess_km_cost: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Leasecontract uploaden</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileUpload} disabled={uploading} />
              {uploading && <span className="text-sm text-slate-500">Uploaden...</span>}
              {formData.document_url && <Badge className="bg-emerald-100 text-emerald-700">Geüpload</Badge>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Opmerkingen</Label>
            <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>Annuleren</Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Laden...</p>
      ) : sorted.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <FileUp className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm">Geen leasecontracten geregistreerd</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(record => {
            const daysLeft = record.end_date ? differenceInDays(new Date(record.end_date), new Date()) : null;
            return (
              <div key={record.id} className="flex items-center justify-between border rounded-lg p-3 bg-white hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">{record.lease_company}</span>
                      <Badge className={statusColors[record.status] || "bg-slate-100 text-slate-700"}>{record.status}</Badge>
                      {record.contract_number && <Badge variant="outline">{record.contract_number}</Badge>}
                      {daysLeft != null && daysLeft <= 90 && daysLeft >= 0 && record.status === "Actief" && (
                        <Badge className="bg-amber-100 text-amber-700">Verloopt over {daysLeft} dagen</Badge>
                      )}
                      {daysLeft != null && daysLeft < 0 && record.status === "Actief" && (
                        <Badge variant="destructive">Verlopen</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-1">
                      <span>{format(new Date(record.start_date), "d MMM yyyy", { locale: nl })}</span>
                      {record.end_date && <span>– {format(new Date(record.end_date), "d MMM yyyy", { locale: nl })}</span>}
                      {record.monthly_cost != null && <span className="font-medium text-slate-700">€{record.monthly_cost.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} /mnd</span>}
                      {record.mileage_limit != null && <span>{record.mileage_limit.toLocaleString()} km/jaar</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {record.document_url && (
                    <a href={record.document_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700">
                        <FileText className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700"
                    onClick={() => setConfirmDelete({ id: record.id })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
        title="Leasecontract verwijderen"
        description="Weet je zeker dat je dit leasecontract wilt verwijderen?"
        onConfirm={() => {
          if (confirmDelete?.id) deleteMutation.mutate(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}