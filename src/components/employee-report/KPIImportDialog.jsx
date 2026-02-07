import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, CheckCircle } from "lucide-react";
import { getYear } from "date-fns";
import * as XLSX from "xlsx";

function parsePercentage(val) {
  if (val == null || val === "") return null;
  // If xlsx already parsed it as a number (0-1 range)
  if (typeof val === "number") return val;
  // If it's a string like "99,85%" or "99.85%"
  const str = String(val).replace('%', '').replace(',', '.').trim();
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  // If value > 1, it's a percentage like 99.85 → convert to 0.9985
  return num > 1 ? num / 100 : num;
}

export default function KPIImportDialog({ open, onOpenChange, customerId, onImportComplete }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [year, setYear] = useState(String(getYear(new Date())));
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json(sheet);

    if (!jsonRows || jsonRows.length === 0) {
      setResult({ error: "Geen data gevonden in het Excel bestand." });
      setImporting(false);
      return;
    }

    // Get week from first row
    const weekFromFile = parseInt(jsonRows[0]["Week"]);
    if (!weekFromFile) {
      setResult({ error: "Kolom 'Week' niet gevonden in het bestand." });
      setImporting(false);
      return;
    }

    const records = jsonRows.map(row => ({
      customer_id: customerId || "",
      zmedcid: String(row["zmedcid"] || ""),
      medewerker_naam: row["Medewerker"] || "",
      week: parseInt(row["Week"]) || weekFromFile,
      year: parseInt(year),
      tvi_dag: parsePercentage(row["TVI Dag"]),
      tvi_avond: parsePercentage(row["TVI Avond"]),
      uitreiklocatie: parsePercentage(row["Uitreiklocatie"]),
      vr_distributie: parsePercentage(row["Vr Distributie"]),
      scankwaliteit: parsePercentage(row["Scankwaliteit"]),
      pba_bezorgers: parsePercentage(row["PBA bezorgers"]),
      hitrate: parsePercentage(row["Hitrate"]),
    })).filter(r => r.medewerker_naam);

    if (records.length === 0) {
      setResult({ error: "Geen geldige medewerker rijen gevonden. Controleer de kolomnamen." });
      setImporting(false);
      return;
    }

    // Delete existing records for same week/year to avoid duplicates
    const existing = await base44.entities.EmployeeKPI.filter({ week: weekFromFile, year: parseInt(year) });
    for (const e of existing) {
      await base44.entities.EmployeeKPI.delete(e.id);
    }

    await base44.entities.EmployeeKPI.bulkCreate(records);

    setResult({ success: true, count: records.length, week: weekFromFile });
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ['employee-kpi'] });
    // Notify parent of the imported week so the page can auto-select it
    if (onImportComplete) onImportComplete(weekFromFile, parseInt(year));
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>KPI Excel importeren</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Jaar</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[getYear(new Date()) - 1, getYear(new Date()), getYear(new Date()) + 1].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Excel bestand</Label>
            <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-sm">
              <Upload className="w-4 h-4 text-slate-500" />
              {file ? file.name : "Selecteer Excel bestand (.xlsx)"}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => setFile(e.target.files[0])} />
            </label>
          </div>

          {result?.error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{result.error}</div>
          )}
          {result?.success && (
            <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {result.count} medewerker KPI's geïmporteerd voor week {result.week}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>Sluiten</Button>
            <Button onClick={handleImport} disabled={!file || importing}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Importeren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}