import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Gauge, History, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function MileageCalibrationDialog({ open, onOpenChange, vehicle, userName }) {
  const [newMileage, setNewMileage] = useState("");
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const calibrateMutation = useMutation({
    mutationFn: async () => {
      const oldMileage = vehicle.current_mileage || 0;
      const calibrationEntry = {
        date: new Date().toISOString(),
        old_mileage: oldMileage,
        new_mileage: Number(newMileage),
        reason: reason,
        calibrated_by: userName || "Onbekend"
      };
      const history = [...(vehicle.mileage_calibration_history || []), calibrationEntry];
      return base44.entities.Vehicle.update(vehicle.id, {
        current_mileage: Number(newMileage),
        mileage_calibration_history: history
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setNewMileage("");
      setReason("");
      onOpenChange(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMileage || !reason.trim()) return;
    calibrateMutation.mutate();
  };

  if (!vehicle) return null;

  const history = vehicle.mileage_calibration_history || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-600" />
            KM-stand IJking — {vehicle.license_plate}
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 bg-slate-50 rounded-lg mb-4">
          <p className="text-sm text-slate-600">Huidige km-stand</p>
          <p className="text-2xl font-bold text-slate-900">
            {vehicle.current_mileage ? vehicle.current_mileage.toLocaleString() : "0"} km
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nieuwe km-stand *</Label>
            <Input
              type="number"
              value={newMileage}
              onChange={(e) => setNewMileage(e.target.value)}
              placeholder="Voer de werkelijke km-stand in"
              required
              min={0}
            />
            {newMileage && vehicle.current_mileage && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                Verschil: <span className={Number(newMileage) > vehicle.current_mileage ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                  {Number(newMileage) > vehicle.current_mileage ? "+" : ""}{(Number(newMileage) - vehicle.current_mileage).toLocaleString()} km
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reden ijking *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Bijv. fysieke controle teller, afwijking geconstateerd bij keuring, correctie na foutieve invoer..."
              rows={2}
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={calibrateMutation.isPending || !newMileage || !reason.trim()}
            >
              {calibrateMutation.isPending ? "Opslaan..." : "IJken"}
            </Button>
          </div>
        </form>

        {history.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <History className="w-4 h-4" />
              IJkingsgeschiedenis
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...history].reverse().map((entry, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">
                      {entry.date ? format(new Date(entry.date), "d MMM yyyy HH:mm", { locale: nl }) : "-"}
                    </span>
                    <Badge variant="outline" className="text-xs">{entry.calibrated_by}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 font-medium">
                    <span className="text-slate-600">{entry.old_mileage?.toLocaleString()} km</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-900">{entry.new_mileage?.toLocaleString()} km</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{entry.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}