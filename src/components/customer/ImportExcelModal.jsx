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
  const [parseResult, setParseResult] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidation, setShowValidation] = useState(false);
  const [successImport, setSuccessImport] = useState(null);
  const queryClient = useQueryClient();

  const parseMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('customerId', customerId);
      const response = await base44.functions.invoke('parseExcelImport', { file, customerId });
      return response.data;
    },
    onSuccess: (data) => {
      setParseResult(data);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate data before saving
      const errors = validateImportData(parseResult.rawData, parseResult.columns);
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        setShowValidation(true);
        throw new Error('Validatiefouten gevonden');
      }

      return base44.entities.CustomerImport.create({
        customer_id: customerId,
        import_name: importName,
        import_date: new Date().toISOString(),
        file_name: file.name,
        column_mapping: {},
        data: parseResult.rawData,
        total_rows: parseResult.rawData.length,
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
    }
  });

  const resetModal = () => {
    setFile(null);
    setImportName("");
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
          {showValidation ? (
            <>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-6">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-900 mb-3">
                        {validationErrors.length} rij(en) met validatiefouten
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {validationErrors.map((error, idx) => (
                          <div key={idx} className="text-xs text-red-800 bg-white rounded p-2">
                            <p className="font-semibold">Rij {error.row}:</p>
                            <ul className="list-disc list-inside ml-1">
                              {error.errors.map((err, errIdx) => (
                                <li key={errIdx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                 disabled={saveMutation.isPending || !importName}
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