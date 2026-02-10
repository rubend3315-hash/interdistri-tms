import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { getYear } from "date-fns";
import { useQuery } from "@tanstack/react-query";
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

  // Fetch PakketDistributie employees for validation
  const { data: pdEmployees = [] } = useQuery({
    queryKey: ['pd-employees-validation'],
    queryFn: () => base44.entities.Employee.filter({ department: 'PakketDistributie', status: 'Actief' }),
  });

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      let buffer;
      try {
        buffer = await file.arrayBuffer();
      } catch (e) {
        setResult({ error: "Kan het bestand niet lezen. Controleer of het bestand geldig is en probeer opnieuw." });
        setImporting(false);
        return;
      }

      let workbook;
      try {
        workbook = XLSX.read(buffer, { type: "array" });
      } catch (e) {
        setResult({ error: "Het bestand kon niet worden geopend als Excel-bestand. Zorg dat het een geldig .xlsx of .xls bestand is." });
        setImporting(false);
        return;
      }

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setResult({ error: "Het Excel-bestand bevat geen werkbladen." });
        setImporting(false);
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(sheet);

      if (!jsonRows || jsonRows.length === 0) {
        setResult({ error: "Geen data gevonden in het Excel bestand. Het eerste werkblad is leeg." });
        setImporting(false);
        return;
      }

      // Validate required columns
      const firstRow = jsonRows[0];
      const requiredColumns = ["Week", "Medewerker"];
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));
      if (missingColumns.length > 0) {
        const availableCols = Object.keys(firstRow).join(', ');
        setResult({ 
          error: `Verplichte kolom(men) niet gevonden: ${missingColumns.join(', ')}. Gevonden kolommen: ${availableCols}` 
        });
        setImporting(false);
        return;
      }

      // Get week from first row
      const weekFromFile = parseInt(firstRow["Week"]);
      if (!weekFromFile || weekFromFile < 1 || weekFromFile > 53) {
        setResult({ error: `Ongeldig weeknummer in het bestand: "${firstRow["Week"]}". Verwacht een getal tussen 1 en 53.` });
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
        setResult({ error: `Geen geldige rijen gevonden. Het bestand bevat ${jsonRows.length} rij(en), maar geen enkele heeft een waarde in de kolom "Medewerker".` });
        setImporting(false);
        return;
      }

      // Delete existing records for same week/year to avoid duplicates
      const existing = await base44.entities.EmployeeKPI.filter({ week: weekFromFile, year: parseInt(year) });
      let deletedCount = 0;
      if (existing.length > 0) {
        await Promise.all(existing.map(e => base44.entities.EmployeeKPI.delete(e.id)));
        deletedCount = existing.length;
      }

      // BulkCreate in batches of 20 to avoid timeouts
      const batchSize = 20;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await base44.entities.EmployeeKPI.bulkCreate(batch);
      }

      // Validate imported names against PakketDistributie employees
      const pdNames = pdEmployees.map(e => {
        const last = (e.last_name || '').trim();
        const first = (e.first_name || '').trim();
        const initial = first ? first.charAt(0) + '.' : '';
        return [
          `${last} ${initial}`.trim().toLowerCase(),
          `${initial} ${last}`.trim().toLowerCase(),
          `${last} ${first}`.trim().toLowerCase(),
          `${first} ${last}`.trim().toLowerCase(),
          last.toLowerCase(),
        ];
      });

      const unmatchedNames = records
        .map(r => r.medewerker_naam)
        .filter(name => {
          const n = name.toLowerCase().trim();
          return !pdNames.some(variations => variations.some(v => v === n || n.includes(v) || v.includes(n)));
        });

      setResult({ 
        success: true, 
        count: records.length, 
        week: weekFromFile, 
        unmatchedNames,
        deletedCount 
      });
      queryClient.invalidateQueries({ queryKey: ['employee-kpi'] });
      if (onImportComplete) onImportComplete(weekFromFile, parseInt(year));
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.message || String(err);
      setResult({ 
        error: `Import mislukt: ${errorMsg}. Controleer het bestand en probeer opnieuw.` 
      });
    } finally {
      setImporting(false);
    }
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
            <div className="space-y-2">
              <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {result.count} medewerker KPI's geïmporteerd voor week {result.week}
              </div>
              {result.unmatchedNames?.length > 0 && (
                <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    {result.unmatchedNames.length} naam/namen niet gevonden in afdeling PakketDistributie:
                  </div>
                  <ul className="list-disc ml-6 mt-1 space-y-0.5">
                    {result.unmatchedNames.map(n => <li key={n}>{n}</li>)}
                  </ul>
                </div>
              )}
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