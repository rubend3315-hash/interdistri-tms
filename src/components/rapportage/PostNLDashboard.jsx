import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Download, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

const PERIOD_OPTIONS = {
  week: 'Deze week',
  month: 'Deze maand',
  quarter: 'Dit kwartaal',
  year: 'Dit jaar',
  custom: 'Aangepast'
};


export default function PostNLDashboard({ customerId }) {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Load saved default columns on mount
  React.useEffect(() => {
    if (currentUser?.postnl_default_columns && selectedColumns.length === 0) {
      setSelectedColumns(currentUser.postnl_default_columns);
    }
  }, [currentUser]);

  const handleSaveDefaultColumns = async () => {
    try {
      setIsSaving(true);
      await base44.auth.updateMe({
        postnl_default_columns: selectedColumns
      });
      toast.success('Standaard kolommen opgeslagen');
    } catch (error) {
      toast.error('Fout bij opslaan: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getPeriodDates = () => {
    const now = new Date();
    let startDate, endDate;

    switch (selectedPeriod) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) return null;
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        break;
      default:
        return null;
    }

    return { startDate, endDate };
  };

  const { data: rapportageRitten = [] } = useQuery({
    queryKey: ['rapportageRitten', selectedPeriod, customStartDate, customEndDate],
    queryFn: async () => {
      try {
        const result = await base44.entities.PostNLImportResult.list();
        if (!Array.isArray(result)) return [];
        
        const periodDates = getPeriodDates();
        
        const flattened = [];
        result.forEach(item => {
          if (item.data && typeof item.data === 'object') {
            const innerData = item.data.data || item.data;
            if (innerData && typeof innerData === 'object') {
              let shouldInclude = true;
              
              // Filter op datum als periode is ingesteld
              if (periodDates && innerData['Datum']) {
                try {
                  const rowDate = new Date(innerData['Datum']);
                  if (isNaN(rowDate.getTime())) {
                    shouldInclude = true;
                  } else {
                    shouldInclude = rowDate >= periodDates.startDate && rowDate <= periodDates.endDate;
                  }
                } catch {
                  shouldInclude = true;
                }
              }
              
              if (shouldInclude) {
                flattened.push({
                  ...innerData,
                  'Starttijd shift': item.starttijd_shift || '',
                  _importId: item.id
                });
              }
            }
            }
            });

            // Remove duplicates based on key fields
            const seen = new Set();
            const unique = flattened.filter(row => {
            const key = `${row['Datum']}_${row['Chauffeur']}_${row['Ritnaam']}_${row['Starttijd shift']}_${row['Vrijgegeven']}`;
            if (seen.has(key)) {
            return false;
            }
            seen.add(key);
            return true;
            });

            console.log('Fetched rapportageRitten:', unique.length, '(removed', flattened.length - unique.length, 'duplicates)');
            return unique;
      } catch (error) {
        console.error('Failed to fetch PostNLImportResult:', error);
        return [];
      }
    },
    staleTime: 0
  });

  const { data: excelColumnsData = {} } = useQuery({
    queryKey: ['excelColumns'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getExcelColumns', {});
        return response.data;
      } catch (error) {
        console.error('Failed to fetch columns:', error);
        return {};
      }
    },
    staleTime: 0
  });

  const allColumns = useMemo(() => {
    if (!excelColumnsData.columns || !Array.isArray(excelColumnsData.columns)) {
      return [];
    }

    return excelColumnsData.columns.map(key => ({
      key,
      label: key.replace(/_/g, ' '),
      category: 'Gegevens'
    }));
  }, [excelColumnsData]);

  const filteredColumns = useMemo(() => {
    if (!searchTerm) return allColumns;
    return allColumns.filter(col => 
      col.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allColumns]);

  const columnsByCategory = useMemo(() => {
    const grouped = {};
    filteredColumns.forEach(col => {
      if (!grouped[col.category]) {
        grouped[col.category] = [];
      }
      grouped[col.category].push(col);
    });
    return grouped;
  }, [filteredColumns]);

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Header
      doc.setFontSize(16);
      doc.text('PostNL Rapportage', 14, 15);
      doc.setFontSize(9);
      doc.text(`Periode: ${PERIOD_OPTIONS[selectedPeriod]}`, 14, 22);
      doc.text(`Gegenereerd: ${new Date().toLocaleDateString('nl-NL')}`, 14, 27);
      doc.text(`Totaal records: ${rapportageRitten.length}`, 14, 32);

      // Calculate column widths
      const margin = 6;
      const availableWidth = pageWidth - (margin * 2);
      const columnWidth = Math.max(availableWidth / selectedColumns.length, 18);
      const minLineHeight = 10;
      
      const columns = selectedColumns.map(col => {
        const colDef = allColumns.find(c => c.key === col);
        return colDef?.label || col;
      });

      let y = 40;

      // Draw header with auto height
      let maxHeaderLines = 1;
      const headerTexts = columns.map(col => {
        const wrapped = doc.splitTextToSize(col, columnWidth - 4);
        maxHeaderLines = Math.max(maxHeaderLines, wrapped.length);
        return wrapped;
      });

      const headerHeight = Math.max(16, maxHeaderLines * 3.5 + 6);

      doc.setFillColor(37, 99, 235);
      doc.rect(margin, y, availableWidth, headerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      
      columns.forEach((col, idx) => {
        const x = margin + (idx * columnWidth) + 2;
        const wrapped = doc.splitTextToSize(col, columnWidth - 4);
        const startY = y + 4;
        wrapped.forEach((line, lineIdx) => {
          doc.text(line, x, startY + (lineIdx * 3.5));
        });
      });

      y += headerHeight;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');

      // Draw rows with text wrapping
      rapportageRitten.forEach((item, rowIdx) => {
        // Calculate row height based on wrapped text
        let maxLines = 1;
        const cellTexts = selectedColumns.map(col => {
          const value = item[col];
          const text = value !== null && value !== undefined ? String(value) : '-';
          const wrapped = doc.splitTextToSize(text, columnWidth - 4);
          maxLines = Math.max(maxLines, wrapped.length);
          return wrapped;
        });

        const rowHeight = Math.max(minLineHeight, maxLines * 4.5 + 3);

        if (y + rowHeight > pageHeight - 20) {
          doc.addPage();
          y = 14;
        }

        // Alternate row colors
        if (rowIdx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, availableWidth, rowHeight, 'F');
        }

        // Draw cells with wrapped text
        selectedColumns.forEach((col, idx) => {
          const x = margin + (idx * columnWidth);
          if (idx > 0) {
            doc.setDrawColor(220, 220, 220);
            doc.line(x, y, x, y + rowHeight);
          }

          doc.text(cellTexts[idx], x + 2, y + 4);
        });

        y += rowHeight;
      });

      doc.save(`PostNL_Rapportage_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF geëxporteerd');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Fout bij exporteren: ' + error.message);
    }
  };

  const toggleColumn = (key) => {
    if (selectedColumns.includes(key)) {
      setSelectedColumns(selectedColumns.filter(c => c !== key));
    } else {
      setSelectedColumns([...selectedColumns, key]);
    }
  };

  const selectAll = () => {
    setSelectedColumns(allColumns.map(c => c.key));
  };

  const clearAll = () => {
    setSelectedColumns([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">PostNL Rapportage</h2>
          <p className="text-xs text-slate-500">Ritten en bezorgdata voor PostNL</p>
        </div>
        <Button 
          onClick={handleExportPDF}
          disabled={rapportageRitten.length === 0 || selectedColumns.length === 0}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Periode Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 py-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Periode</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERIOD_OPTIONS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Van</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Tot</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Kolommen Selectie ({selectedColumns.length}/{allColumns.length})</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSaveDefaultColumns}
                disabled={selectedColumns.length === 0 || isSaving}
              >
                {isSaving ? 'Opslaan...' : 'Opslaan als standaard'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowColumnSelector(!showColumnSelector)}>
                {showColumnSelector ? 'Verbergen' : 'Weergeven'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showColumnSelector && (
          <CardContent className="space-y-2 py-3">
            <div className="space-y-1">
              <Input
                placeholder="Zoeken in kolommen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Alles selecteren
                </Button>
                <Button size="sm" variant="outline" onClick={clearAll}>
                  Alles deselecteren
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {Object.entries(columnsByCategory).map(([category, cols]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-slate-700 mb-1">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {cols.map(col => (
                      <div key={col.key} className="flex items-center gap-2">
                        <Checkbox
                          id={col.key}
                          checked={selectedColumns.includes(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        <label htmlFor={col.key} className="text-sm cursor-pointer">{col.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rapportagegegevens</CardTitle>
        </CardHeader>
        <CardContent>
          {rapportageRitten.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">Geen rapportages beschikbaar</p>
              <p className="text-xs text-slate-400 mt-1">Klant: PostNL | Totaal records: {rapportageRitten.length}</p>
            </div>
          ) : selectedColumns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">Selecteer minstens één kolom</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-slate-50">
                        <tr>
                          {selectedColumns.map(col => (
                            <th key={col} className="text-left py-2 px-3 font-medium text-slate-700 text-sm">
                              {allColumns.find(c => c.key === col)?.label || col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rapportageRitten.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-slate-50">
                            {selectedColumns.map(col => (
                              <td key={col} className="py-2 px-3 text-slate-600 text-sm">
                                {item[col] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}