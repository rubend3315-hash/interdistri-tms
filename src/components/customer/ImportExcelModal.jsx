import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2 } from "lucide-react";

export default function ImportExcelModal({ open, onOpenChange, customerId, customerArticles }) {
  const [file, setFile] = useState(null);
  const [importName, setImportName] = useState("");
  const [parseResult, setParseResult] = useState(null);
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

        <div className="space-y-4">
          {!parseResult ? (
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
                <Label className="text-base font-semibold">Kolomselectie</Label>
                <p className="text-xs text-slate-500">Selecteer welke kolommen u wilt importeren</p>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-lg">
                  {parseResult.columns.map(column => (
                    <div key={column} className="flex items-center gap-2">
                      <Checkbox
                        id={`col-${column}`}
                        checked={selectedColumns.has(column)}
                        onCheckedChange={() => toggleColumn(column)}
                      />
                      <label 
                        htmlFor={`col-${column}`}
                        className="text-sm cursor-pointer flex-1 truncate"
                      >
                        {column}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

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

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                resetModal();
                onOpenChange(false);
              }}
            >
              {parseResult ? "Annuleren" : "Sluiten"}
            </Button>
            {parseResult && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !importName || selectedColumns.size === 0}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importeren...
                  </>
                ) : (
                  "Importeren"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}