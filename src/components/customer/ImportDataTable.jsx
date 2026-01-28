import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Download } from "lucide-react";

export default function ImportDataTable({ imports, onDelete, periodType = "all", selectedDate = "", startDate = "", endDate = "" }) {
  // Collect all data from all imports
  const allData = imports.flatMap(importData => 
    importData.data.map(row => ({
      ...row,
      _importId: importData.id,
      _importName: importData.import_name,
      _importDate: importData.import_date
    }))
  );

  const columns = allData.length > 0
    ? Object.keys(allData[0]).filter(col => !col.startsWith('_'))
    : [];

  // Filter data based on period selection
  const filteredData = allData.filter(row => {
    if (periodType === "all") return true;

    const importDate = new Date(row._importDate).toISOString().split('T')[0];

    if (periodType === "day") {
      return importDate === selectedDate;
    }

    if (periodType === "week") {
      const selected = new Date(selectedDate);
      const dayOfWeek = selected.getDay();
      const weekStart = new Date(selected);
      weekStart.setDate(selected.getDate() - dayOfWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const importDateObj = new Date(importDate);
      return importDateObj >= weekStart && importDateObj <= weekEnd;
    }

    if (periodType === "period") {
      return importDate >= startDate && importDate <= endDate;
    }

    return true;
  });

  const exportToCSV = () => {
    const headers = [...columns, 'Import'].join(',');
    const rows = filteredData.map(row =>
      [...columns.map(col => `"${row[col]}"`), `"${row._importName}"`].join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exports.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gegevens ({filteredData.length} rijen)</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exporteren
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">#</th>
                {columns.map(col => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Import</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-3 py-8 text-center text-slate-500">
                    Geen rijen gevonden
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={idx} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600 font-medium">{idx + 1}</td>
                    {columns.map(col => (
                      <td
                        key={`${idx}-${col}`}
                        className="px-3 py-2 text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs"
                      >
                        {row[col]}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap text-xs font-medium">
                      {row._importName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}