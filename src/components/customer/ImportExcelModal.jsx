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
import { validateImportData } from "@/components/utils/validateImportData";

export default function ImportExcelModal({ open, onOpenChange, customerId, customerArticles }) {
  const [file, setFile] = useState(null);
  const [importName, setImportName] = useState("");
  const [parseResult, setParseResult] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidation, setShowValidation] = useState(false);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-imports', customerId] });
      resetModal();
      onOpenChange(false);
    }
  });

  const resetModal = () => {
    setFile(null);
    setImportName("");
    setParseResult(null);
    setValidationErrors([]);
    setShowValidation(false);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Excel bestand importeren</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex flex-col max-h-[calc(100vh-200px)]">
          <div className="flex-1 overflow-y-auto space-y-4">
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
                <div className="overflow-x-auto overflow-y-auto max-h-48 border rounded-lg">
                  <table className="w-full min-w-max text-xs">
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
                              {row[col]}
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

          {!showValidation && parseResult && (
            <div className="flex justify-end gap-3 pt-4">
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
            </div>
          )}
          {!showValidation && !parseResult && (
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  resetModal();
                  onOpenChange(false);
                }}
              >
                Sluiten
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}