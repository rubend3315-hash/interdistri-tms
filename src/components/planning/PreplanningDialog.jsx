import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Zap, AlertTriangle } from "lucide-react";

export default function PreplanningDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
  employeesWithoutShift = []
}) {
  const [fallbackShift, setFallbackShift] = useState("Dag");

  const handleGenerate = () => {
    onGenerate({ fallbackShift });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Voorplanning Genereren</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Elke medewerker wordt ingepland op zijn/haar <strong>standaard shift</strong> (ingesteld op de stamkaart).
            Dagen die al ingepland zijn worden <strong>niet</strong> overschreven.
          </p>

          {employeesWithoutShift.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-800">
                  <p className="font-medium mb-1">{employeesWithoutShift.length} medewerker(s) zonder standaard shift:</p>
                  <p className="text-amber-700">{employeesWithoutShift.slice(0, 5).map(e => `${e.first_name} ${e.last_name}`).join(', ')}{employeesWithoutShift.length > 5 ? ` en ${employeesWithoutShift.length - 5} meer...` : ''}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-[140px_1fr] items-center gap-4">
            <Label>Fallback shift:</Label>
            <Select value={fallbackShift} onValueChange={setFallbackShift}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dag">Dag</SelectItem>
                <SelectItem value="Avond">Avond</SelectItem>
                <SelectItem value="Nacht">Nacht</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-slate-500">
            Medewerkers zonder standaard shift worden op de fallback shift gezet.
            Je kunt de standaard shift per medewerker instellen via de stamkaart.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Annuleren
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-1" />
                  Genereer Voorplanning
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}