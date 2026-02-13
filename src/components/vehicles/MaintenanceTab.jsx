import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, FileText, Wrench, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const maintenanceTypes = [
  "Kleine beurt", "Grote beurt", "APK", "Bandenwissel",
  "Reparatie", "Tachograaf", "Carrosserie", "Overig"
];

const typeColors = {
  "Kleine beurt": "bg-blue-100 text-blue-700",
  "Grote beurt": "bg-indigo-100 text-indigo-700",
  "APK": "bg-emerald-100 text-emerald-700",
  "Bandenwissel": "bg-amber-100 text-amber-700",
  "Reparatie": "bg-red-100 text-red-700",
  "Tachograaf": "bg-purple-100 text-purple-700",
  "Carrosserie": "bg-orange-100 text-orange-700",
  "Overig": "bg-slate-100 text-slate-700",
};

export default function MaintenanceTab({ vehicle }) {
  const [showForm, setShowForm] = useState(false);
  const [sortField, setSortField] = useState("date"); // "date" or "mileage"
  const [formData, setFormData] = useState({
    date: "", maintenance_type: "", description: "",
    garage_name: "", cost: "", mileage_at_service: "",
    invoice_url: "", notes: ""
  });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['vehicleMaintenance', vehicle.id],
    queryFn: () => base44.entities.VehicleMaintenance.filter({ vehicle_id: vehicle.id })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VehicleMaintenance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleMaintenance', vehicle.id] });
      setShowForm(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VehicleMaintenance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleMaintenance', vehicle.id] });
    }
  });

  const resetForm = () => {
    setFormData({
      date: "", maintenance_type: "", description: "",
      garage_name: "", cost: "", mileage_at_service: "",
      invoice_url: "", notes: ""
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, invoice_url: file_url }));
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      vehicle_id: vehicle.id,
      cost: formData.cost ? Number(formData.cost) : null,
      mileage_at_service: formData.mileage_at_service ? Number(formData.mileage_at_service) : null,
    });
  };

  const sorted = [...records].sort((a, b) => {
    if (sortField === "mileage") {
      return (b.mileage_at_service || 0) - (a.mileage_at_service || 0);
    }
    return new Date(b.date) - new Date(a.date);
  });

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-slate-900">Onderhoudsbeurten</h3>
          <Badge variant="secondary">{records.length} registraties</Badge>
          {totalCost > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700">Totaal: €{totalCost.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortField(sortField === "date" ? "mileage" : "date")}
            className="gap-1"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortField === "date" ? "Op datum" : "Op km-stand"}
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 gap-1">
            <Plus className="w-3.5 h-3.5" />
            Toevoegen
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded-xl p-4 space-y-4 bg-slate-50">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Datum *</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Type onderhoud *</Label>
              <Select value={formData.maintenance_type} onValueChange={(v) => setFormData({ ...formData, maintenance_type: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                <SelectContent>
                  {maintenanceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Km-stand</Label>
              <Input type="number" value={formData.mileage_at_service} onChange={(e) => setFormData({ ...formData, mileage_at_service: e.target.value })} placeholder="Optioneel" />
            </div>
            <div className="space-y-2">
              <Label>Kosten (€)</Label>
              <Input type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Garage / werkplaats</Label>
              <Input value={formData.garage_name} onChange={(e) => setFormData({ ...formData, garage_name: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Omschrijving</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Factuur uploaden</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} disabled={uploading} />
              {uploading && <span className="text-sm text-slate-500">Uploaden...</span>}
              {formData.invoice_url && <Badge className="bg-emerald-100 text-emerald-700">Geüpload</Badge>}
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

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-slate-500">Laden...</p>
      ) : sorted.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Wrench className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm">Geen onderhoudsbeurten geregistreerd</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(record => (
            <div key={record.id} className="flex items-center justify-between border rounded-lg p-3 bg-white hover:bg-slate-50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900">{record.maintenance_type}</span>
                    <Badge className={typeColors[record.maintenance_type] || "bg-slate-100 text-slate-700"}>
                      {format(new Date(record.date), "d MMM yyyy", { locale: nl })}
                    </Badge>
                    {record.mileage_at_service != null && (
                      <Badge variant="outline">{record.mileage_at_service.toLocaleString()} km</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-1">
                    {record.description && <span>{record.description}</span>}
                    {record.garage_name && <span>• {record.garage_name}</span>}
                    {record.cost != null && <span className="font-medium text-slate-700">€{record.cost.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {record.invoice_url && (
                  <a href={record.invoice_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700">
                      <FileText className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => {
                    if (confirm('Onderhoudsbeurt verwijderen?')) deleteMutation.mutate(record.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}