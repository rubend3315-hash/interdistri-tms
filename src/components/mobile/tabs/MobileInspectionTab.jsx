import React, { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, AlertTriangle, Camera, Upload, X, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const MAX_PHOTOS = 5;

const CHECKS = [
  { key: 'exterior_clean', label: 'Exterieur schoon' },
  { key: 'interior_clean', label: 'Interieur schoon' },
  { key: 'lights_working', label: 'Verlichting werkt' },
  { key: 'tires_ok', label: 'Banden OK' },
  { key: 'brakes_ok', label: 'Remmen OK' },
  { key: 'oil_level_ok', label: 'Oliepeil OK' },
  { key: 'windshield_ok', label: 'Voorruit OK' },
  { key: 'mirrors_ok', label: 'Spiegels OK' },
  { key: 'first_aid_kit', label: 'EHBO-kit' },
  { key: 'fire_extinguisher', label: 'Brandblusser' },
  { key: 'warning_triangle', label: 'Gevarendriehoek' },
  { key: 'safety_vest', label: 'Veiligheidsvest' },
];

export default function MobileInspectionTab({ inspectionData, setInspectionData, vehicles, currentEmployee }) {
  const queryClient = useQueryClient();
  const cameraRef = useRef(null);
  const uploadRef = useRef(null);

  const createInspectionMutation = useMutation({
    mutationFn: (data) => base44.entities.VehicleInspection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Inspectie ingediend');
    }
  });

  const handleFileUpload = async (file) => {
    if (!file) return;
    if ((inspectionData.damage_photos || []).length >= MAX_PHOTOS) {
      toast.error(`Maximaal ${MAX_PHOTOS} foto's`);
      return;
    }
    const result = await base44.integrations.Core.UploadFile({ file });
    setInspectionData(prev => ({
      ...prev,
      damage_photos: [...(prev.damage_photos || []), result.file_url]
    }));
  };

  const removePhoto = (idx) => {
    setInspectionData(prev => ({
      ...prev,
      damage_photos: prev.damage_photos.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="-mx-4 flex flex-col min-h-[calc(100vh-160px)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-blue-600" />
          Voertuiginspectie
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-3 space-y-4">
        {/* Vehicle + mileage */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] text-slate-500">Voertuig *</Label>
            <Select value={inspectionData.vehicle_id} onValueChange={(v) => setInspectionData({ ...inspectionData, vehicle_id: v })}>
              <SelectTrigger className="h-[44px] bg-white"><SelectValue placeholder="Kies voertuig" /></SelectTrigger>
              <SelectContent>
                {(vehicles || []).map(v => <SelectItem key={v.id} value={v.id}>{v.license_plate} - {v.brand}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-slate-500">Kilometerstand</Label>
            <Input type="number" className="h-[44px] bg-white" value={inspectionData.mileage} onChange={(e) => setInspectionData({ ...inspectionData, mileage: e.target.value })} />
          </div>
        </div>

        {/* Checklist */}
        <div className="grid grid-cols-2 gap-2">
          {CHECKS.map(item => (
            <label key={item.key} className={`flex items-center gap-2 px-3 h-[44px] rounded-xl border cursor-pointer ${inspectionData[item.key] ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <input type="checkbox" checked={inspectionData[item.key]} onChange={(e) => setInspectionData({ ...inspectionData, [item.key]: e.target.checked })} className="sr-only" />
              <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${inspectionData[item.key] ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                {inspectionData[item.key] ? '✓' : '✗'}
              </span>
              <span className="text-[12px] text-slate-700">{item.label}</span>
            </label>
          ))}
        </div>

        {/* Damage toggle */}
        <label className="flex items-center gap-3 px-3 h-[44px] rounded-xl border border-amber-200 bg-amber-50 cursor-pointer">
          <input type="checkbox" checked={inspectionData.damage_present} onChange={(e) => setInspectionData({ ...inspectionData, damage_present: e.target.checked })} className="sr-only" />
          <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${inspectionData.damage_present ? 'bg-amber-500 text-white' : 'bg-slate-300 text-white'}`}>
            {inspectionData.damage_present ? '!' : ''}
          </span>
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-[12px] font-medium text-amber-700">Schade aanwezig</span>
        </label>

        {/* Damage details */}
        {inspectionData.damage_present && (
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] text-slate-500">Schade omschrijving *</Label>
              <Textarea value={inspectionData.damage_description} onChange={(e) => setInspectionData({ ...inspectionData, damage_description: e.target.value })} rows={2} placeholder="Beschrijf de schade..." className="text-sm bg-white" />
            </div>

            {/* Camera + upload buttons */}
            <div>
              <Label className="text-[11px] text-slate-500 mb-1.5 block">Foto's ({(inspectionData.damage_photos || []).length}/{MAX_PHOTOS})</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  disabled={(inspectionData.damage_photos || []).length >= MAX_PHOTOS}
                  className="flex-1 h-[44px] rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-[12px] font-medium flex items-center justify-center gap-1.5 active:bg-blue-100 disabled:opacity-40"
                >
                  <Camera className="w-4 h-4" /> Foto maken
                </button>
                <button
                  type="button"
                  onClick={() => uploadRef.current?.click()}
                  disabled={(inspectionData.damage_photos || []).length >= MAX_PHOTOS}
                  className="flex-1 h-[44px] rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-[12px] font-medium flex items-center justify-center gap-1.5 active:bg-slate-100 disabled:opacity-40"
                >
                  <Upload className="w-4 h-4" /> Uploaden
                </button>
              </div>
              {/* Hidden inputs */}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { handleFileUpload(e.target.files?.[0]); e.target.value = ''; }} />
              <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleFileUpload(e.target.files?.[0]); e.target.value = ''; }} />
            </div>

            {/* Photo thumbnails */}
            {(inspectionData.damage_photos || []).length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {inspectionData.damage_photos.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                    <img src={url} alt={`Schade ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <Label className="text-[11px] text-slate-500">Opmerkingen</Label>
          <Textarea value={inspectionData.notes || ""} onChange={(e) => setInspectionData({ ...inspectionData, notes: e.target.value })} rows={2} placeholder="Extra opmerkingen..." className="text-sm bg-white" />
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 left-0 right-0 bg-white pt-2 pb-1 px-4 border-t border-slate-100">
        <button
          type="button"
          onClick={() => {
            createInspectionMutation.mutate({
              ...inspectionData,
              employee_id: currentEmployee?.id,
              date: format(new Date(), 'yyyy-MM-dd'),
              time: format(new Date(), 'HH:mm'),
              mileage: inspectionData.mileage ? Number(inspectionData.mileage) : null,
              damage_photos: inspectionData.damage_photos || [],
              status: inspectionData.damage_present ? 'Actie vereist' : 'Goedgekeurd'
            });
          }}
          disabled={!inspectionData.vehicle_id || createInspectionMutation.isPending}
          className={`w-full h-[48px] rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all ${
            inspectionData.vehicle_id && !createInspectionMutation.isPending
              ? 'bg-blue-600 text-white active:bg-blue-700'
              : 'bg-slate-200 text-slate-400'
          }`}
        >
          <Send className="w-4 h-4" />
          {createInspectionMutation.isPending ? 'Bezig...' : 'Inspectie indienen'}
        </button>
      </div>
    </div>
  );
}