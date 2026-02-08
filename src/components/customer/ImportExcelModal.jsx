import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { validateImportData } from "@/components/utils/validateImportData";
import ImportSummary from "@/components/customer/ImportSummary";

// Functie om Excel datum (getal) naar DD-MM-JJJJ te converteren
const formatExcelDate = (value) => {
  if (!value) return value;
  
  // Als het al een string is die lijkt op een datum, return as-is
  if (typeof value === 'string') {
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(value) || /^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
      return value;
    }
  }
  
  // Als het een getal is, converteer Excel datum
  if (typeof value === 'number') {
    // Excel datums zijn getallen (dagen sinds 1900-01-01)
    if (value > 30000 && value < 50000) {
      try {
        // Excel epoch is 1900-01-01, JavaScript epoch is 1970-01-01
        const excelDate = new Date((value - 25569) * 86400 * 1000);
        if (!isNaN(excelDate.getTime())) {
          return format(excelDate, 'dd-MM-yyyy');
        }
      } catch (e) {
        return value;
      }
    }
  }
  
  return value;
};

export default function ImportExcelModal({ open, onOpenChange, customerId, customerArticles }) {
  const [file, setFile] = useState(null);
  const [importName, setImportName] = useState("");
  const [starttijdShift, setStarttijdShift] = useState("");
  const [parseResult, setParseResult] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidation, setShowValidation] = useState(false);
  const [successImport, setSuccessImport] = useState(null);
  const [existingImports, setExistingImports] = useState([]);
  const queryClient = useQueryClient();

  const [existingRitKeys, setExistingRitKeys] = useState(new Set());
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Fetch existing imports and existing PostNLImportResult keys for duplicate check
  React.useEffect(() => {
    if (open && customerId) {
      base44.entities.CustomerImport.filter({ customer_id: customerId })
        .then(setExistingImports);
      
      // Build a set of ritnaam||datum keys from existing PostNLImportResult records
      setLoadingExisting(true);
      (async () => {
        const keys = new Set();
        let skip = 0;
        const pageSize = 5000;
        while (true) {
          const batch = await base44.entities.PostNLImportResult.list('-created_date', pageSize, skip);
          for (const item of batch) {
            const ritnaam = item.data?.ritnaam || item.data?.data?.['Ritnaam'] || '';
            const datum = item.data?.datum || item.data?.data?.['Datum'] || '';
            if (ritnaam && datum) keys.add(`${ritnaam}||${datum}`);
          }
          if (batch.length < pageSize) break;
          skip += pageSize;
        }
        setExistingRitKeys(keys);
        setLoadingExisting(false);
      })();
    }
  }, [open, customerId]);

  const parseMutation = useMutation({
    mutationFn: async (file) => {
      // Parse Excel client-side using xlsx library
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true, raw: false, defval: '' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel bestand bevat geen sheets');
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

      if (allRows.length === 0) {
        throw new Error('Excel sheet is leeg');
      }

      // Find header row containing "Depot"
      let headerRowIndex = -1;
      let headerRow = [];
      for (let i = 0; i < allRows.length; i++) {
        const firstCell = allRows[i][0];
        if (firstCell && firstCell.toString().toLowerCase().includes('depot')) {
          headerRowIndex = i;
          headerRow = allRows[i].map((cell, idx) => cell ? cell.toString().trim() : `__EMPTY_${idx}`);
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('Header rij met "Depot" niet gevonden');
      }

      // Find data start (skip empty rows after header)
      let dataStartIndex = headerRowIndex + 1;
      while (dataStartIndex < allRows.length) {
        const hasValue = allRows[dataStartIndex].some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '');
        if (hasValue) break;
        dataStartIndex++;
      }

      // Parse data rows
      const rawData = [];
      for (let i = dataStartIndex; i < allRows.length; i++) {
        const row = allRows[i];
        const hasValue = row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '');
        if (!hasValue) break;
        
        const firstCell = row[0] ? row[0].toString().trim() : '';
        if (firstCell.toLowerCase().includes('totaal') || !firstCell) continue;

        const rowObj = {};
        headerRow.forEach((colName, idx) => {
          const value = row[idx];
          rowObj[colName] = value === null || value === undefined ? '' : typeof value === 'string' ? value.trim() : value;
        });
        rawData.push(rowObj);
      }

      if (rawData.length === 0) {
        throw new Error('Geen data rijen gevonden');
      }

      // Filter empty columns
      const filteredColumns = headerRow.filter(colName =>
        rawData.some(row => {
          const value = row[colName];
          return value !== null && value !== undefined && value !== '' && (typeof value !== 'string' || value.trim() !== '');
        })
      );

      return {
        success: true,
        fileName: file.name,
        columns: filteredColumns,
        preview: rawData.slice(0, 100),
        totalRows: rawData.length,
        rawData: rawData
      };
    },
    onSuccess: (data) => {
      setParseResult(data);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Check for duplicate import by filename (filename is always unique)
      const isDuplicateFile = existingImports.some(imp => {
        return imp.file_name === file.name;
      });
      
      if (isDuplicateFile) {
        setValidationErrors([{
          row: 0,
          errors: [`Dit bestand (${file.name}) is al eerder geïmporteerd. Dubbele imports zijn niet toegestaan.`]
        }]);
        setShowValidation(true);
        throw new Error('Dubbele import gedetecteerd');
      }

      // Validate data before saving
      const errors = validateImportData(parseResult.rawData, parseResult.columns);
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        setShowValidation(true);
        throw new Error('Validatiefouten gevonden');
      }

      // Add Starttijd shift to all data rows
      const dataWithStarttijd = parseResult.rawData.map(row => ({
        ...row,
        'Starttijd shift': starttijdShift
      }));

      return base44.entities.CustomerImport.create({
        customer_id: customerId,
        import_name: importName,
        import_date: new Date().toISOString(),
        file_name: file.name,
        column_mapping: {},
        data: dataWithStarttijd,
        total_rows: dataWithStarttijd.length,
        calculated_data: [],
        status: 'Concept'
      });
    },
    onSuccess: (createdImport) => {
      queryClient.invalidateQueries({ queryKey: ['customer-imports', customerId] });
      setSuccessImport({
        ...createdImport,
        validationErrors: validationErrors
      });
      setShowValidation(false);
    }
  });

  const resetModal = () => {
    setFile(null);
    setImportName("");
    setStarttijdShift("");
    setParseResult(null);
    setValidationErrors([]);
    setShowValidation(false);
    setSuccessImport(null);
  };

  const handleFileChange = (e) => {
   const selectedFile = e.target.files?.[0];
   if (selectedFile) {
     setFile(selectedFile);
     setImportName(selectedFile.name);
     parseMutation.mutate(selectedFile);
   }
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-auto max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Excel bestand importeren</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden gap-4">
          <div className="overflow-y-auto space-y-4 flex-1 min-h-0">
          {successImport ? (
            <ImportSummary
              importData={successImport}
              validationErrors={successImport.validationErrors}
              onClose={() => {
                resetModal();
                onOpenChange(false);
              }}
              onViewData={() => {
                resetModal();
                onOpenChange(false);
              }}
            />
          ) : showValidation ? (
            <>
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-6">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900 mb-2">
                        ⚠️ {validationErrors.length} rij(en) bevat/bevatten fouten
                      </p>
                      <p className="text-xs text-amber-800 mb-3">
                        Controleer de volgende problemen voordat u doorgaat:
                      </p>
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {validationErrors.map((error, idx) => (
                          <div key={idx} className="text-xs text-amber-800 bg-white rounded p-3 border border-amber-100">
                            <p className="font-semibold text-amber-900 mb-1">📍 Rij {error.row}:</p>
                            <ul className="space-y-1">
                              {error.errors.map((err, errIdx) => (
                                <li key={errIdx} className="flex gap-2">
                                  <span className="text-amber-600">•</span>
                                  <span>{err}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2 text-xs text-slate-600 bg-slate-50 rounded p-3">
                <p><strong>💡 Tips:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Datums moeten in het formaat DD-MM-YYYY zijn</li>
                  <li>Tijden moeten in het formaat HH:MM zijn (bijv: 08:30)</li>
                  <li>Aantallen en afstanden moeten getallen zijn</li>
                  <li>Vereiste velden (Datum, Depot) mogen niet leeg zijn</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowValidation(false)}
                >
                  Vorige
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importeren...
                    </>
                  ) : (
                    "Toch importeren"
                  )}
                </Button>
              </div>
            </>
          ) : !parseResult ? (
           <>
             <div className="space-y-2">
               <Label>Import naam</Label>
               <Input
                 placeholder="Bijv: Januariverkoop, Q1 Rapport"
                 value={importName}
                 onChange={(e) => setImportName(e.target.value)}
               />
             </div>

             <div className="space-y-2">
               <Label>Starttijd shift *</Label>
               <Input
                 type="time"
                 value={starttijdShift}
                 onChange={(e) => setStarttijdShift(e.target.value)}
                 placeholder="bijv: 08:10"
               />
             </div>

             <div className="space-y-2">
               <Label>Excel bestand</Label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    disabled={parseMutation.isPending}
                    className="hidden"
                    id="excel-input"
                  />
                  <label htmlFor="excel-input" className="cursor-pointer block">
                    {parseMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span>Bestand wordt verwerkt...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-slate-400" />
                        <span className="text-sm font-medium">Klik om bestand te selecteren</span>
                        <span className="text-xs text-slate-500">of sleep het hier heen</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-blue-900">
                    <strong>{parseResult.totalRows}</strong> rijen gevonden in {parseResult.fileName}
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Gegevensvoorbeeld</Label>
                <div className="overflow-x-auto border rounded-lg" style={{ height: "600px" }}>
                    <table className="w-full text-xs">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        {parseResult.columns.map(col => (
                          <th 
                            key={col} 
                            className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.preview.map((row, idx) => (
                        <tr key={idx} className="border-t hover:bg-slate-50">
                          {parseResult.columns.map(col => (
                            <td 
                              key={`${idx}-${col}`} 
                              className="px-3 py-2 text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs"
                            >
                              {formatExcelDate(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          </div>

          <div className="border-t pt-4 flex justify-end gap-3">
           {showValidation ? (
             <>
               <Button 
                 variant="outline" 
                 onClick={() => setShowValidation(false)}
               >
                 Vorige
               </Button>
               <Button 
                 className="bg-blue-600 hover:bg-blue-700"
                 onClick={() => saveMutation.mutate()}
                 disabled={saveMutation.isPending}
               >
                 {saveMutation.isPending ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Importeren...
                   </>
                 ) : (
                   "Toch importeren"
                 )}
               </Button>
             </>
           ) : parseResult ? (
             <>
               <Button 
                 variant="outline" 
                 onClick={() => {
                   resetModal();
                   onOpenChange(false);
                 }}
               >
                 Annuleren
               </Button>
               <Button 
                 className="bg-blue-600 hover:bg-blue-700"
                 onClick={() => saveMutation.mutate()}
                 disabled={saveMutation.isPending || !importName || !starttijdShift}
               >
                 {saveMutation.isPending ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Valideren...
                   </>
                 ) : (
                   "Importeren"
                 )}
               </Button>
             </>
           ) : (
             <Button 
               variant="outline" 
               onClick={() => {
                 resetModal();
                 onOpenChange(false);
               }}
             >
               Sluiten
             </Button>
           )}
           </div>
           </div>
           </DialogContent>
    </Dialog>
  );
}