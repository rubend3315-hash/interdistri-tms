import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Zap } from "lucide-react";

export default function PreplanningDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating
}) {
  const [shiftType, setShiftType] = useState("Dag");

  const handleGenerate = () => {
    onGenerate({ defaultShift: shiftType });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Voorplanning Genereren</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Vul de planning voor de huidige week automatisch in op basis van de weekroosters van medewerkers. 
            Dagen die al ingepland zijn worden <strong>niet</strong> overschreven.
          </p>

          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <Label>Standaard shift:</Label>
            <Select value={shiftType} onValueChange={setShiftType}>
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
            De geselecteerde shift wordt ingevuld op werkdagen volgens het contractrooster van elke medewerker.
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