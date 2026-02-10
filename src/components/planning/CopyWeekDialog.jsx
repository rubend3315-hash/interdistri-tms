import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, AlertCircle, Loader2 } from "lucide-react";

export default function CopyWeekDialog({ open, onOpenChange, currentWeek, currentYear, onCopy }) {
  const [targetWeek, setTargetWeek] = useState(currentWeek + 1);
  const [targetYear, setTargetYear] = useState(currentYear);
  const [multiWeek, setMultiWeek] = useState(false);
  const [numberOfWeeks, setNumberOfWeeks] = useState(1);
  const [includeRoutes, setIncludeRoutes] = useState(true);
  const [includeVehicles, setIncludeVehicles] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [isCopying, setIsCopying] = useState(false);

  React.useEffect(() => {
    if (open) {
      setTargetWeek(currentWeek + 1 > 52 ? 1 : currentWeek + 1);
      setTargetYear(currentWeek + 1 > 52 ? currentYear + 1 : currentYear);
      setMultiWeek(false);
      setNumberOfWeeks(1);
      setIsCopying(false);
    }
  }, [open, currentWeek, currentYear]);

  const handleCopy = async () => {
    setIsCopying(true);
    const options = { includeRoutes, includeVehicles, includeNotes };
    
    if (multiWeek) {
      // Copy to multiple consecutive weeks
      for (let i = 0; i < numberOfWeeks; i++) {
        let week = targetWeek + i;
        let yr = targetYear;
        if (week > 52) {
          week = week - 52;
          yr = yr + 1;
        }
        await onCopy(week, yr, options);
      }
    } else {
      await onCopy(targetWeek, targetYear, options);
    }
    
    setIsCopying(false);
    onOpenChange(false);
  };

  const getTargetWeeksPreview = () => {
    const weeks = [];
    for (let i = 0; i < numberOfWeeks; i++) {
      let week = targetWeek + i;
      let yr = targetYear;
      if (week > 52) {
        week = week - 52;
        yr = yr + 1;
      }
      weeks.push(`Week ${week} (${yr})`);
    }
    return weeks;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Planning kopiëren
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900 font-medium">
              Bron: Week {currentWeek} ({currentYear})
            </p>
          </div>

          {/* Target */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Doelweek</Label>
              <Input
                type="number"
                min="1"
                max="52"
                value={targetWeek}
                onChange={(e) => setTargetWeek(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>Jaar</Label>
              <Input
                type="number"
                min="2024"
                max="2030"
                value={targetYear}
                onChange={(e) => setTargetYear(parseInt(e.target.value) || currentYear)}
              />
            </div>
          </div>

          {/* Multi-week option */}
          <div className="space-y-3 border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="multiWeek"
                checked={multiWeek}
                onCheckedChange={setMultiWeek}
              />
              <Label htmlFor="multiWeek" className="font-normal cursor-pointer">
                Kopieer naar meerdere weken
              </Label>
            </div>
            {multiWeek && (
              <div className="space-y-2 ml-6">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Aantal weken:</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={numberOfWeeks}
                    onChange={(e) => setNumberOfWeeks(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-20"
                  />
                </div>
                <div className="text-xs text-slate-500 bg-slate-50 rounded-md p-2 max-h-24 overflow-y-auto">
                  {getTargetWeeksPreview().map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Copy options */}
          <div className="space-y-2 border rounded-lg p-3">
            <Label className="text-sm font-medium text-slate-700">Wat kopiëren?</Label>
            <div className="space-y-2 ml-1">
              <div className="flex items-center gap-2">
                <Checkbox id="incShifts" checked disabled />
                <Label htmlFor="incShifts" className="font-normal text-sm cursor-pointer text-slate-500">
                  Dienstcodes (altijd)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="incRoutes" checked={includeRoutes} onCheckedChange={setIncludeRoutes} />
                <Label htmlFor="incRoutes" className="font-normal text-sm cursor-pointer">Routes</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="incVehicles" checked={includeVehicles} onCheckedChange={setIncludeVehicles} />
                <Label htmlFor="incVehicles" className="font-normal text-sm cursor-pointer">Voertuigen</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="incNotes" checked={includeNotes} onCheckedChange={setIncludeNotes} />
                <Label htmlFor="incNotes" className="font-normal text-sm cursor-pointer">Opmerkingen</Label>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Bestaande planning in de doelweek(en) wordt overschreven.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isCopying}>
              Annuleren
            </Button>
            <Button className="flex-1 bg-blue-900" onClick={handleCopy} disabled={isCopying}>
              {isCopying ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kopiëren...</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" /> Kopiëren {multiWeek ? `(${numberOfWeeks}x)` : ''}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}