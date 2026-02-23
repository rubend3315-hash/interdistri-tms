import React, { useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";

const presets = [
  { label: "Vandaag", getValue: () => { const d = format(new Date(), 'yyyy-MM-dd'); return { start: d, end: d }; } },
  { label: "Deze week", getValue: () => ({ start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd') }) },
  { label: "Vorige week", getValue: () => { const d = subDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 1); return { start: format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd') }; } },
  { label: "Deze maand", getValue: () => ({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: "Vorige maand", getValue: () => { const d = subDays(startOfMonth(new Date()), 1); return { start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd') }; } },
];

export default function ExportDialog({ open, onOpenChange }) {
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [exporting, setExporting] = useState(false);

  const applyPreset = (presetLabel) => {
    const preset = presets.find(p => p.label === presetLabel);
    if (preset) {
      const { start, end } = preset.getValue();
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportTimeAndTrips', {
        start_date: startDate,
        end_date: endDate,
      });
      
      const { file_base64, filename } = response.data;
      
      // Decode base64 to binary
      const byteCharacters = atob(file_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      onOpenChange(false);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exporteer Tijdregistratie & Ritten</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Snelkeuze periode</Label>
            <Select onValueChange={applyPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Kies een periode..." />
              </SelectTrigger>
              <SelectContent>
                {presets.map(p => (
                  <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Van</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tot en met</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Het Excel-bestand bevat twee tabbladen: Tijdregistratie en Ritten.
            Per medewerker één regel per dag.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleExport}
              disabled={exporting || !startDate || !endDate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {exporting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporteren...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Exporteer Excel</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}