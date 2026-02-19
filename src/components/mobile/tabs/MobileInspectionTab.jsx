import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, AlertTriangle, Camera, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function MobileInspectionTab({ inspectionData, setInspectionData, vehicles, currentEmployee }) {
  const queryClient = useQueryClient();

  const createInspectionMutation = useMutation({
    mutationFn: (data) => base44.entities.VehicleInspection.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspections'] })
  });

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            Voertuiginspectie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Voertuig</Label>
              <Select value={inspectionData.vehicle_id} onValueChange={(v) => setInspectionData({ ...inspectionData, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Kies voertuig" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.license_plate} - {v.brand}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kilometerstand</Label>
              <Input type="number" value={inspectionData.mileage} onChange={(e) => setInspectionData({ ...inspectionData, mileage: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CHECKS.map(item => (
              <label key={item.key} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${inspectionData[item.key] ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <input type="checkbox" checked={inspectionData[item.key]} onChange={(e) => setInspectionData({ ...inspectionData, [item.key]: e.target.checked })} className="sr-only" />
                <span className={`w-5 h-5 rounded flex items-center justify-center text-xs ${inspectionData[item.key] ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {inspectionData[item.key] ? '✓' : '✗'}
                </span>
                <span className="text-xs">{item.label}</span>
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 p-2 rounded-lg border bg-amber-50 border-amber-200 cursor-pointer">
            <input type="checkbox" checked={inspectionData.damage_present} onChange={(e) => setInspectionData({ ...inspectionData, damage_present: e.target.checked })} className="sr-only" />
            <span className={`w-5 h-5 rounded flex items-center justify-center text-xs ${inspectionData.damage_present ? 'bg-amber-500 text-white' : 'bg-slate-300'}`}>
              {inspectionData.damage_present ? '!' : ''}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Schade aanwezig</span>
          </label>

          {inspectionData.damage_present && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Schade omschrijving</Label>
                <Textarea value={inspectionData.damage_description} onChange={(e) => setInspectionData({ ...inspectionData, damage_description: e.target.value })} rows={2} placeholder="Beschrijf de schade..." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Foto's van schade</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" capture="environment" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const uploadResult = await base44.integrations.Core.UploadFile({ file });
                      setInspectionData({ ...inspectionData, damage_photos: [...inspectionData.damage_photos, uploadResult.file_url] });
                    }
                    e.target.value = '';
                  }} className="text-xs" />
                  <Camera className="w-5 h-5 text-blue-600 flex-shrink-0" />
                </div>
                {inspectionData.damage_photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {inspectionData.damage_photos.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt={`Schade ${idx + 1}`} className="w-full h-20 object-cover rounded-lg border-2 border-slate-200" />
                        <button onClick={() => setInspectionData({ ...inspectionData, damage_photos: inspectionData.damage_photos.filter((_, i) => i !== idx) })} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              createInspectionMutation.mutate({
                ...inspectionData,
                employee_id: currentEmployee?.id,
                date: format(new Date(), 'yyyy-MM-dd'),
                time: format(new Date(), 'HH:mm'),
                mileage: inspectionData.mileage ? Number(inspectionData.mileage) : null,
                damage_photos: inspectionData.damage_photos,
                status: inspectionData.damage_present ? 'Actie vereist' : 'Goedgekeurd'
              });
            }}
            disabled={!inspectionData.vehicle_id || createInspectionMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            Inspectie indienen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}