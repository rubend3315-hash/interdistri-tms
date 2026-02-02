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
import jsPDF from 'jspdf';

const PERIOD_OPTIONS = {
  week: 'Deze week',
  month: 'Deze maand',
  quarter: 'Dit kwartaal',
  year: 'Dit jaar',
  custom: 'Aangepast'
};

const ALL_COLUMNS = [
  { key: 'ritnaam', label: 'Ritnaam', category: 'Basis' },
  { key: 'datum', label: 'Datum', category: 'Basis' },
  { key: 'chauffeur', label: 'Chauffeur', category: 'Basis' },
  { key: 'project_naam', label: 'Project', category: 'Basis' },
  { key: 'week', label: 'Week', category: 'Basis' },
  { key: 'status', label: 'Status', category: 'Basis' },
  { key: 'totaal_rit', label: 'Totaal Rit Tijd', category: 'Tijden' },
  { key: 'besteltijd_norm', label: 'Besteltijd Norm', category: 'Tijden' },
  { key: 'besteltijd_bruto', label: 'Besteltijd Bruto', category: 'Tijden' },
  { key: 'besteltijd_netto', label: 'Besteltijd Netto', category: 'Tijden' },
  { key: 'geen_scan_15min', label: 'Geen Scan >15min', category: 'Kwaliteit' },
  { key: 'aantal_vrijgave_stops', label: 'Vrijgave Stops', category: 'Stops' },
  { key: 'aantal_vrijgave_stuks', label: 'Vrijgave Stuks', category: 'Stops' },
  { key: 'aantal_afgeleverd_stops', label: 'Afgeleverd Stops', category: 'Bezorging' },
  { key: 'aantal_afgeleverd_stuks', label: 'Afgeleverd Stuks', category: 'Bezorging' },
  { key: 'aantal_pba_bezorgd', label: 'PBA Bezorgd', category: 'Bezorging' },
  { key: 'aantal_afgehaald_collecteerd', label: 'Afgehaald/Collecteerd', category: 'Bezorging' },
];

export default function PostNLDashboard({ customerId }) {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedColumns, setSelectedColumns] = useState(['ritnaam', 'datum', 'aantal_vrijgave_stops', 'aantal_pba_bezorgd']);
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const { data: rapportageRitten = [] } = useQuery({
    queryKey: ['rapportageRitten', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      try {
        const result = await base44.entities.RapportageRit.filter({ klant_id: customerId });
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Failed to fetch RapportageRit:', error);
        return [];
      }
    },
    enabled: !!customerId,
    staleTime: 0
  });

  const filteredColumns = useMemo(() => {
    if (!searchTerm) return ALL_COLUMNS;
    return ALL_COLUMNS.filter(col => 
      col.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

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
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text('PostNL Rapportage', 20, 20);
      doc.setFontSize(10);
      doc.text(`Periode: ${PERIOD_OPTIONS[selectedPeriod]}`, 20, 30);
      doc.text(`Gegenereerd: ${new Date().toLocaleDateString('nl-NL')}`, 20, 38);

      const startY = 50;
      const columns = selectedColumns.map(col => {
        const colDef = ALL_COLUMNS.find(c => c.key === col);
        return colDef?.label || col;
      });

      const rows = rapportageRitten.map(item => 
        selectedColumns.map(col => item[col] || '-')
      );

      doc.autoTable({
        head: [columns],
        body: rows,
        startY: startY,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [26, 35, 126], textColor: 255 }
      });

      doc.save('PostNL_Rapportage.pdf');
      toast.success('PDF geëxporteerd');
    } catch (error) {
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
    setSelectedColumns(ALL_COLUMNS.map(c => c.key));
  };

  const clearAll = () => {
    setSelectedColumns([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">PostNL Rapportage</h2>
          <p className="text-sm text-slate-500">Ritten en bezorgdata voor PostNL</p>
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Periode</label>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Kolommen Selectie ({selectedColumns.length}/{ALL_COLUMNS.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowColumnSelector(!showColumnSelector)}>
              {showColumnSelector ? 'Verbergen' : 'Weergeven'}
            </Button>
          </div>
        </CardHeader>
        {showColumnSelector && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
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

            <div className="space-y-4">
              {Object.entries(columnsByCategory).map(([category, cols]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">{category}</h4>
                  <div className="grid grid-cols-2 gap-3">
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
                      <th key={col} className="text-left py-2 px-3 font-medium text-slate-700">
                        {ALL_COLUMNS.find(c => c.key === col)?.label || col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rapportageRitten.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      {selectedColumns.map(col => (
                        <td key={col} className="py-2 px-3 text-slate-600">
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