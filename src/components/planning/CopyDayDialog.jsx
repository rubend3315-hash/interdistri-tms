import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Copy } from "lucide-react";

export default function CopyDayDialog({ open, onOpenChange, sourceDay, availableDays, onCopy }) {
  const [selectedDays, setSelectedDays] = useState([]);

  const handleToggleDay = (day) => {
    setSelectedDays(prev => {
      if (prev.some(d => d.toISOString() === day.toISOString())) {
        return prev.filter(d => d.toISOString() !== day.toISOString());
      }
      return [...prev, day];
    });
  };

  const handleCopy = () => {
    if (selectedDays.length > 0) {
      onCopy(sourceDay, selectedDays);
      setSelectedDays([]);
      onOpenChange(false);
    }
  };

  const targetDays = availableDays.filter(d => d.toISOString() !== sourceDay?.toISOString());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Dag Kopiëren
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {sourceDay && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900">
                Kopieer van: {format(sourceDay, "EEEE d MMMM yyyy", { locale: nl })}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">Kopieer naar:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {targetDays.map((day) => (
                <div key={day.toISOString()} className="flex items-center gap-2">
                  <Checkbox
                    id={day.toISOString()}
                    checked={selectedDays.some(d => d.toISOString() === day.toISOString())}
                    onCheckedChange={() => handleToggleDay(day)}
                  />
                  <label
                    htmlFor={day.toISOString()}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {format(day, "EEEE d MMMM", { locale: nl })}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSelectedDays([]);
                onOpenChange(false);
              }}
            >
              Annuleren
            </Button>
            <Button
              className="flex-1 bg-blue-900"
              onClick={handleCopy}
              disabled={selectedDays.length === 0}
            >
              <Copy className="w-4 h-4 mr-2" />
              Kopiëren ({selectedDays.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}