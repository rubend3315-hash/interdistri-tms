import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Trash2, FileJson, Loader2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ValidatieRulesManager from './ValidatieRulesManager';
import { DataValidator } from './DataValidation';
import ImportLogViewer from '@/components/customer/ImportLogViewer';

export default function ProjectExcelImport({ projectFilter, customerId }) {
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [starttijdShift, setStarttijdShift] = useState('');
  const [validatieRegels, setValidatieRegels] = useState([]);
  const [validatieResultaten, setValidatieResultaten] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [activeTab, setActiveTab] = useState('import');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!selectedProject) {
      setSelectedProject('PakketDistributie');
    }
  }, []);

  // Build a Set of existing ritnaam||datum||chauffeur keys for fast duplicate detection
  const { data: existingImportKeys = new Set() } = useQuery({
    queryKey: ['postNLImportKeys'],
    queryFn: async () => {
      const keys = new Set();
      let skip = 0;
      const pageSize = 5000;
      while (true) {
        const batch = await base44.entities.PostNLImportResult.list('-created_date', pageSize, skip);
        for (const item of batch) {
          const ritnaam = item.data?.ritnaam || item.data?.data?.['Ritnaam'] || '';
          const datum = item.data?.datum || item.data?.data?.['Datum'] || '';
          const chauffeur = item.data?.data?.['Chauffeur'] || '';
          if (ritnaam && datum) keys.add(`${ritnaam}||${datum}||${chauffeur}`);
        }
        if (batch.length < pageSize) break;
        skip += pageSize;
      }
      return keys;
    }
  });

  // Also keep a list for the logs tab
  const { data: existingImports = [] } = useQuery({
    queryKey: ['postNLImportResults', projectFilter],
    queryFn: async () => {
      const allResults = [];
      let skip = 0;
      const pageSize = 5000;
      while (true) {
        const batch = await base44.entities.PostNLImportResult.list('-created_date', pageSize, skip);
        allResults.push(...batch);
        if (batch.length < pageSize) break;
        skip += pageSize;
      }
      return allResults;
    }
  });

  const saveDataMutation = useMutation({
    mutationFn: async (records) => {
      const postNLRecords = await base44.entities.PostNLImportResult.bulkCreate(records);
      
      // Also create CustomerImport record for history
      const customerImportRecord = {
        customer_id: customerId,
        import_name: file.name,
        file_name: file.name,
        column_mapping: {},
        data: records.map(r => r.data),
        total_rows: records.length,
        status: 'Verwerkt'
      };
      
      await base44.entities.CustomerImport.create(customerImportRecord);
      return postNLRecords;
    },
    onSuccess: async (createdRecords) => {
       queryClient.invalidateQueries({ queryKey: ['postNLImportResults'] });
       queryClient.invalidateQueries({ queryKey: ['customer-imports', customerId] });

       const skipped = extractedData?.skippedDuplicates || 0;
       const warnings = extractedData?.warnings || [];
       let conversionCount = 0;

       // Auto-trigger conversion to RapportageRit
        try {
          const refreshedImports = await base44.entities.PostNLImportResult.list();
          const today = new Date().toISOString().split('T')[0];
          const todayRecords = refreshedImports.filter(r => {
            return r.bestandsnaam === file?.name && r.import_datum === today;
          });

          const result = await base44.functions.invoke('processPostNLImportToRapportage', {
            project_id: selectedProject,
            project_naam: 'PakketDistributie',
            klant_id: customerId,
            import_data: todayRecords.map(r => r.data || r)
          });

          conversionCount = result.data?.count || 0;
          queryClient.invalidateQueries({ queryKey: ['rapportageRitten'] });
        } catch (error) {
          console.error('Conversion error:', error);
        }

       setImportResult({
         success: true,
         totalImported: createdRecords?.length || extractedData?.rows?.length || 0,
         skippedDuplicates: skipped,
         warnings,
         conversionCount,
         fileName: file?.name
       });

       setExtractedData(null);
       setFile(null);
       setStarttijdShift('');
     },
    onError: (error) => {
      setImportResult({
        success: false,
        error: `Fout bij opslaan in database: ${error.message}`
      });
    }
  });

  const deleteImportMutation = useMutation({
    mutationFn: (id) => base44.entities.PostNLImportResult.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postNLImportResults'] });
      toast.success('Import verwijderd');
    }
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedData(null);
    }
  };

  const validateRows = (jsonData) => {
  const warnings = [];
  const errors = [];
  const requiredFields = ['Depot', 'Datum', 'Chauffeur', 'Ritnaam'];

  jsonData.forEach((row, idx) => {
    const rowNum = idx + 1;

    // Check required fields
    requiredFields.forEach(field => {
      if (!row[field] || String(row[field]).trim() === '') {
        errors.push({ row: rowNum, field, message: `${field} is leeg` });
      }
    });

    // Validate date format
    const datum = row['Datum'];
    if (datum) {
      const dateMatch = String(datum).match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (!dateMatch) {
        errors.push({ row: rowNum, field: 'Datum', message: `Ongeldig datumformaat: "${datum}" (verwacht: DD-MM-YYYY)` });
      } else {
        const d = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
        if (isNaN(d.getTime()) || d.getFullYear() < 2020 || d.getFullYear() > 2030) {
          errors.push({ row: rowNum, field: 'Datum', message: `Ongeldige datum: "${datum}"` });
        }
      }
    }

    // Validate week number
    const week = row['Week'];
    if (week && (Number(week) < 1 || Number(week) > 53)) {
      warnings.push({ row: rowNum, field: 'Week', message: `Ongeldig weeknummer: ${week}` });
    }

    // Validate that stops/stuks are numbers
    ['Aantal afgeleverd - stops', 'Aantal afgeleverd - stuks'].forEach(field => {
      const val = row[field];
      if (val !== '' && val !== undefined && isNaN(Number(val))) {
        warnings.push({ row: rowNum, field, message: `${field} is geen getal: "${val}"` });
      }
    });
  });

  return { errors, warnings };
  };

  const handleExtract = async () => {
  if (!file) {
    toast.error('Selecteer eerst een bestand');
    return;
  }
  if (!starttijdShift) {
    toast.error('Voer eerst een starttijd shift in');
    return;
  }

  setIsExtracting(true);
  setImportResult(null);
  try {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      toast.error('Excel bestand bevat geen sheets');
      return;
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    if (!worksheet['!ref']) {
      toast.error('Excel sheet is leeg');
      return;
    }

    const range = XLSX.utils.decode_range(worksheet['!ref']);

    let headerRowIndex = -1;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: 0 });
      const cell = worksheet[cellAddress];
      const cellValue = cell ? XLSX.utils.format_cell(cell) : '';
      if (cellValue.toLowerCase().includes('depot')) {
        headerRowIndex = R;
        break;
      }
    }

    if (headerRowIndex === -1) {
      setImportResult({
        success: false,
        error: 'Kon header rij met "Depot" niet vinden. Controleer of het bestand het juiste PostNL Realisatie formaat heeft.'
      });
      return;
    }

    const allData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' });
    const jsonData = allData.filter(row => {
      const firstValue = Object.values(row)[0];
      return firstValue && !String(firstValue).toLowerCase().includes('totaal');
    }).map(row => {
      const convertedRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'number' && value > 30000 && value < 60000) {
          const date = new Date((value - 25569) * 86400 * 1000);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          convertedRow[key] = `${day}-${month}-${year}`;
        } else {
          convertedRow[key] = value;
        }
      }
      return convertedRow;
    });

    if (jsonData.length === 0) {
      setImportResult({
        success: false,
        error: 'Geen data rijen gevonden na de header. Controleer of het bestand data bevat.'
      });
      return;
    }

    // Validate data
    const { errors: validationErrors, warnings } = validateRows(jsonData);

    if (validationErrors.length > 0) {
      setImportResult({
        success: false,
        error: `${validationErrors.length} validatiefout(en) gevonden`,
        validationErrors,
        warnings,
        totalRows: jsonData.length
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Check duplicates using the key Set (ritnaam||datum||chauffeur)
    const newRows = [];
    const duplicateCount = { value: 0 };
    
    for (const newRecord of jsonData) {
      const key = `${newRecord['Ritnaam'] || ''}||${newRecord['Datum'] || ''}||${newRecord['Chauffeur'] || ''}`;
      if (existingImportKeys.has(key)) {
        duplicateCount.value++;
      } else {
        newRows.push(newRecord);
      }
    }

    if (newRows.length === 0 && duplicateCount.value > 0) {
      setImportResult({
        success: false,
        error: `Alle ${duplicateCount.value} rijen zijn al eerder geïmporteerd (dubbele data).`,
        duplicateCount: duplicateCount.value,
        totalRows: jsonData.length
      });
      return;
    }

    const recordsToAdd = newRows.map(filteredData => ({
      project_id: selectedProject,
      project_naam: 'PakketDistributie',
      klant_naam: 'PostNL',
      ritnaam: filteredData['Ritnaam'] || '',
      datum: filteredData['Datum'] || '',
      starttijd_shift: starttijdShift,
      import_datum: today,
      bestandsnaam: file.name,
      data: filteredData
    }));

    setExtractedData({ rows: recordsToAdd, skippedDuplicates: duplicates.length, warnings });
    saveDataMutation.mutate(recordsToAdd);
  } catch (error) {
    setImportResult({
      success: false,
      error: `Fout bij verwerken: ${error.message}`
    });
  } finally {
    setIsExtracting(false);
  }
  };

  const handleValidateData = () => {
    if (!extractedData) {
      toast.error('Geen data om te valideren');
      return;
    }

    if (validatieRegels.length === 0) {
      toast.warning('Geen validatieregels ingesteld');
      return;
    }

    const resultaten = DataValidator.validateBatch(extractedData.rows, validatieRegels);
    setValidatieResultaten(resultaten);

    const invalidCount = resultaten.filter(r => !r.valid).length;
    if (invalidCount > 0) {
      toast.error(`${invalidCount} rij(en) bevatten fouten`);
    } else {
      toast.success('Alle rijen zijn geldig');
    }
  };

  const handleExportPDFEmail = async () => {
    if (existingImports.length === 0) {
      toast.error('Geen data om te exporteren');
      return;
    }
    try {
      const firstImport = existingImports[0];
      const projectName = firstImport?.project_naam?.replace(/\s+/g, '-') || 'rapport';
      const datum = firstImport?.data?.['Datum'] || new Date().toISOString().split('T')[0];

      await base44.functions.invoke('exportPDFToEmail', {
        imports: existingImports,
        projectName,
        datum,
        email: null
      });

      toast.success('Rapport verzonden via e-mail');
    } catch (error) {
      toast.error('Fout bij verzenden: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="w-4 h-4" />
            Importeren
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Import Logs
            {existingImports.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{existingImports.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 mb-4">
                <Label>Project</Label>
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm font-medium">PakketDistributie</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Starttijd Shift *</Label>
                <Input
                  type="time"
                  value={starttijdShift}
                  onChange={(e) => setStarttijdShift(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="postnl-file-input"
                />
                <label htmlFor="postnl-file-input" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-sm font-medium">Klik om bestand te selecteren</span>
                  <p className="text-xs text-slate-500 mt-1">.xlsx of .csv (PostNL Realisatie formaat)</p>
                </label>
              </div>
              {file && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 rounded p-3 border border-blue-200">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{file.name}</span>
                </div>
              )}
              <Button
                onClick={handleExtract}
                disabled={!file || isExtracting || !starttijdShift}
                className="bg-[#1a237e] w-full"
              >
                {isExtracting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Bestand verwerken...</>
                ) : saveDataMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opslaan in database...</>
                ) : (
                  'Valideren & Importeren'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Import Result Feedback */}
          {importResult && (
            <Card className={importResult.success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  {importResult.success ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    {importResult.success ? (
                      <>
                        <h3 className="font-semibold text-emerald-900">Import succesvol!</h3>
                        <div className="mt-2 space-y-1 text-sm text-emerald-800">
                          <p>✓ <strong>{importResult.totalImported}</strong> ritten geïmporteerd uit "{importResult.fileName}"</p>
                          {importResult.skippedDuplicates > 0 && (
                            <p className="text-amber-700">⚠ {importResult.skippedDuplicates} dubbele rij(en) overgeslagen</p>
                          )}
                          {importResult.conversionCount > 0 && (
                            <p>✓ {importResult.conversionCount} ritten geconverteerd naar rapportage</p>
                          )}
                          {importResult.warnings?.length > 0 && (
                            <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                              <p className="text-xs font-semibold text-amber-800 mb-1">⚠ {importResult.warnings.length} waarschuwing(en):</p>
                              <ul className="text-xs text-amber-700 space-y-0.5">
                                {importResult.warnings.slice(0, 5).map((w, i) => (
                                  <li key={i}>Rij {w.row}: {w.message}</li>
                                ))}
                                {importResult.warnings.length > 5 && (
                                  <li>... en {importResult.warnings.length - 5} meer</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-red-900">Import mislukt</h3>
                        <p className="text-sm text-red-800 mt-1">{importResult.error}</p>
                        
                        {importResult.validationErrors?.length > 0 && (
                          <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
                            {importResult.validationErrors.slice(0, 10).map((err, i) => (
                              <div key={i} className="text-xs bg-white border border-red-100 rounded p-2 text-red-800">
                                <strong>Rij {err.row}</strong> — {err.field}: {err.message}
                              </div>
                            ))}
                            {importResult.validationErrors.length > 10 && (
                              <p className="text-xs text-red-600 text-center">... en {importResult.validationErrors.length - 10} meer fout(en)</p>
                            )}
                          </div>
                        )}
                        
                        {importResult.duplicateCount > 0 && (
                          <p className="text-sm text-red-700 mt-2">
                            {importResult.duplicateCount} van {importResult.totalRows} rijen zijn al eerder geïmporteerd.
                          </p>
                        )}
                        
                        <div className="mt-3 text-xs text-red-700 bg-red-100 rounded p-2">
                          <p className="font-semibold mb-1">💡 Tips:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            <li>Controleer of het bestand het juiste PostNL Realisatie formaat heeft</li>
                            <li>De eerste kolom moet "Depot" bevatten in de header</li>
                            <li>Datums moeten in DD-MM-YYYY formaat zijn</li>
                            <li>Elk rit moet een Chauffeur en Ritnaam bevatten</li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImportResult(null)}
                    className="text-slate-400"
                  >
                    ✕
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <ImportLogViewer
            imports={existingImports}
            onDelete={deleteImportMutation.mutate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}