import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const PERIOD_OPTIONS = {
  week: 'Deze week',
  month: 'Deze maand',
  quarter: 'Dit kwartaal',
  year: 'Dit jaar',
  custom: 'Aangepast'
};

export default function PostNLDashboard({ customerId }) {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedColumns, setSelectedColumns] = useState(['ritNaam', 'datum', 'aantal_stops', 'totaal_omzet']);

  const { data: rapportageRitten = [] } = useQuery({
    queryKey: ['rapportageRitten'],
    queryFn: () => base44.entities.RapportageRit.list()
  });

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(16);
      doc.text('PostNL Rapportage', 20, 20);
      doc.setFontSize(10);
      doc.text(`Periode: ${PERIOD_OPTIONS[selectedPeriod]}`, 20, 30);
      doc.text(`Gegenereerd: ${new Date().toLocaleDateString('nl-NL')}`, 20, 38);

      // Table
      const startY = 50;
      const columns = selectedColumns.map(col => {
        const labels = {
          ritNaam: 'Ritnaam',
          datum: 'Datum',
          aantal_stops: 'Stops',
          totaal_omzet: 'Omzet (€)',
          starttijd: 'Starttijd'
        };
        return labels[col] || col;
      });

      const rows = postNLData.map(item => 
        selectedColumns.map(col => {
          if (col === 'totaal_omzet' && typeof item.data?.totaal_omzet === 'number') {
            return item.data.totaal_omzet.toFixed(2);
          }
          return item.data?.[col] || item[col] || '-';
        })
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

  const availableColumns = [
    { key: 'ritNaam', label: 'Ritnaam' },
    { key: 'datum', label: 'Datum' },
    { key: 'aantal_stops', label: 'Aantal Stops' },
    { key: 'totaal_omzet', label: 'Totaal Omzet' },
    { key: 'starttijd', label: 'Starttijd' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">PostNL Rapportage</h2>
          <p className="text-sm text-slate-500">Ritten en bezorgdata voor PostNL</p>
        </div>
        <Button 
          onClick={handleExportPDF}
          disabled={postNLData.length === 0}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {/* Periode Filter */}
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

      {/* Kolommen Selectie */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Kolommen</CardTitle>
          <Button variant="outline" size="sm">
            Selecteren
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {availableColumns.map(col => (
              <label key={col.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col.key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedColumns([...selectedColumns, col.key]);
                    } else {
                      setSelectedColumns(selectedColumns.filter(c => c !== col.key));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">{col.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rapportagegegevens */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rapportagegegevens</CardTitle>
        </CardHeader>
        <CardContent>
          {postNLData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">Geen rapportages beschikbaar</p>
              <p className="text-xs text-slate-400 mt-1">Klant: PostNL | Totaal records: 0 | Gefilterd: 0</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    {selectedColumns.map(col => (
                      <th key={col} className="text-left py-2 px-3 font-medium text-slate-700">
                        {availableColumns.find(c => c.key === col)?.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {postNLData.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      {selectedColumns.map(col => (
                        <td key={col} className="py-2 px-3 text-slate-600">
                          {col === 'totaal_omzet' && typeof item.data?.totaal_omzet === 'number'
                            ? '€ ' + item.data.totaal_omzet.toFixed(2)
                            : item.data?.[col] || item[col] || '-'
                          }
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