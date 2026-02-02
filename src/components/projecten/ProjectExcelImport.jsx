import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Trash2, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ValidatieRulesManager from './ValidatieRulesManager';
import { DataValidator } from './DataValidation';

export default function ProjectExcelImport({ projectFilter, customerId }) {
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [starttijdShift, setStarttijdShift] = useState('');
  const [validatieRegels, setValidatieRegels] = useState([]);
  const [validatieResultaten, setValidatieResultaten] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!selectedProject) {
      setSelectedProject('PakketDistributie');
    }
  }, []);

  const { data: existingImports = [] } = useQuery({
    queryKey: ['postNLImportResults', projectFilter],
    queryFn: async () => {
      const data = await base44.entities.PostNLImportResult.list();
      return data;
    },
    select: (data) => {
      if (!projectFilter) return data;
      const projectIds = projecten.map(p => p.id);
      return data.filter(i => projectIds.includes(i.project_id));
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

       // Auto-trigger conversion to RapportageRit
        try {
          // Need to refetch to get full data since bulkCreate may not return everything
          const refreshedImports = await base44.entities.PostNLImportResult.list();
          const today = new Date().toISOString().split('T')[0];
          const todayRecords = refreshedImports.filter(r => {
            return r.bestandsnaam === file?.name && r.import_datum === today;
          });

          const result = await base44.functions.invoke('createRapportageRitsFromImports', {
            records: todayRecords,
            customerId
          });

          toast.success(`Data opgeslagen en ${result.data.count} ritten geconverteerd`);
          queryClient.invalidateQueries({ queryKey: ['rapportageRitten'] });
        } catch (error) {
          console.error('Conversion error:', error);
          toast.success('Data opgeslagen (conversie volgt automatisch)');
        }

       setExtractedData(null);
       setFile(null);
       setStarttijdShift('');
     },
    onError: (error) => {
      toast.error('Fout bij opslaan: ' + error.message);
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

  const handleExtract = async () => {
    if (!file) {
      toast.error('Selecteer eerst een bestand');
      return;
    }

    setIsExtracting(true);
    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
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
        toast.error('Kon "Depot" rij niet vinden');
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
        toast.error('Geen data gevonden');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const duplicates = jsonData.filter(newRecord =>
        existingImports.some(existing =>
          existing.import_datum === today &&
          existing.ritnaam === (newRecord['Ritnaam'] || '') &&
          JSON.stringify(existing.data) === JSON.stringify(newRecord)
        )
      );

      if (duplicates.length > 0) {
        toast.error(`${duplicates.length} dubbele rij(en) vandaag gedetecteerd`);
        return;
      }

      const recordsToAdd = jsonData.map(filteredData => ({
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

      setExtractedData({ rows: recordsToAdd });
      saveDataMutation.mutate(recordsToAdd);
    } catch (error) {
      toast.error('Fout: ' + error.message);
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
          <Input
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
          />
          {file && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileSpreadsheet className="w-4 h-4" />
              {file.name}
            </div>
          )}
          <Button
            onClick={handleExtract}
            disabled={!file || isExtracting}
            className="bg-[#1a237e]"
          >
            {isExtracting ? 'Bezig...' : 'Extraheren & Opslaan'}
          </Button>
        </CardContent>
      </Card>

      {extractedData && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800">✓ {extractedData.rows.length} rijen met alle kolommen gereed voor opslag in database</p>
          </CardContent>
        </Card>
      )}

      {existingImports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Geïmporteerde data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleExportPDFEmail} className="w-full">
              <FileJson className="w-4 h-4 mr-2" />
              Exporteer als PDF via Email
            </Button>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Starttijd</TableHead>
                  <TableHead>Bestand</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingImports.map(imp => (
                  <TableRow key={imp.id}>
                    <TableCell>{imp.data?.['Datum'] || '-'}</TableCell>
                    <TableCell>{imp.ritnaam || '-'}</TableCell>
                    <TableCell>{imp.starttijd_shift || '-'}</TableCell>
                    <TableCell>{imp.bestandsnaam}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteImportMutation.mutate(imp.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}