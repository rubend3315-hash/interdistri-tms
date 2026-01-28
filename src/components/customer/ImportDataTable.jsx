import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const convertExcelDate = (excelDate) => {
  try {
    if (typeof excelDate === 'string') {
      // If it's already a string date, convert to DD-MM-YYYY
      const date = new Date(excelDate);
      if (isNaN(date.getTime())) {
        return excelDate;
      }
      return format(date, 'dd-MM-yyyy', { locale: nl });
    }
    
    if (typeof excelDate === 'number') {
      // Excel date numbers (days since Jan 1, 1900)
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + excelDate * 86400000);
      if (isNaN(date.getTime())) {
        return excelDate;
      }
      return format(date, 'dd-MM-yyyy', { locale: nl });
    }
    
    return excelDate;
  } catch (error) {
    return excelDate;
  }
};

export default function ImportDataTable({ imports, onDelete, periodType = "all", selectedDate = "", startDate = "", endDate = "" }) {
  // Collect all data from all imports
  const allData = imports.flatMap(importData => 
    importData.data.map(row => ({
      ...row,
      _importId: importData.id,
      _importName: importData.import_name,
      _importDate: convertExcelDate(importData.import_date)
    }))
  );

  // Remove duplicates based on actual data (excluding metadata)
  const uniqueData = Array.from(
    new Map(
      allData.map(row => {
        const dataKey = JSON.stringify(
          Object.keys(row)
            .filter(k => !k.startsWith('_'))
            .sort()
            .reduce((obj, key) => ({ ...obj, [key]: row[key] }), {})
        );
        return [dataKey, row];
      })
    ).values()
  );

  const columns = uniqueData.length > 0
    ? Object.keys(uniqueData[0]).filter(col => !col.startsWith('_'))
    : [];

  // Filter data based on period selection
  const datumCol = columns.find(col => col.toLowerCase() === 'datum');
  
  const filteredData = uniqueData
    .filter(row => {
      if (periodType === "all") return true;
      if (!datumCol || !row[datumCol]) return false;

      const rowDate = convertExcelDate(row[datumCol]);

      if (periodType === "day") {
        // Convert selectedDate (YYYY-MM-DD) to DD-MM-YYYY for comparison
        const formattedSelectedDate = format(new Date(selectedDate), 'dd-MM-yyyy', { locale: nl });
        return rowDate === formattedSelectedDate;
      }

      if (periodType === "week") {
        const selected = new Date(selectedDate);
        const dayOfWeek = selected.getDay();
        const weekStart = new Date(selected);
        weekStart.setDate(selected.getDate() - dayOfWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const rowDateObj = new Date(rowDate);
        return rowDateObj >= weekStart && rowDateObj <= weekEnd;
      }

      if (periodType === "period") {
        const formattedStart = format(new Date(startDate), 'dd-MM-yyyy', { locale: nl });
        const formattedEnd = format(new Date(endDate), 'dd-MM-yyyy', { locale: nl });
        return rowDate >= formattedStart && rowDate <= formattedEnd;
      }

      return true;
    })
    .sort((a, b) => {
      if (datumCol && a[datumCol] && b[datumCol]) {
        const dateA = new Date(a[datumCol]);
        const dateB = new Date(b[datumCol]);
        return dateB - dateA; // Newest first
      }
      return 0;
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
                         {typeof row[col] === 'number' && (row[col] > 30000 && row[col] < 50000) 
                           ? convertExcelDate(row[col])
                           : row[col]}
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