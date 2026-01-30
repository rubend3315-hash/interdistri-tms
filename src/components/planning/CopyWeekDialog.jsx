import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";

export default function CopyWeekDialog({ open, onOpenChange, currentWeek, currentYear, onCopy }) {
  const [targetWeek, setTargetWeek] = useState(currentWeek + 1);
  const [targetYear, setTargetYear] = useState(currentYear);

  const handleCopy = () => {
    onCopy(targetWeek, targetYear);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planning kopiëren</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              Planning van week {currentWeek} ({currentYear}) kopiëren naar:
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Doelweek</Label>
              <Input
                type="number"
                min="1"
                max="53"
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
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button className="flex-1 bg-blue-900" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Kopiëren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}