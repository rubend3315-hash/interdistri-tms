import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Download, Search } from "lucide-react";

export default function ImportDataTable({ importData, onDelete, searchTerm = "", columnFilters = {} }) {

  const columns = importData.data && importData.data.length > 0
    ? Object.keys(importData.data[0])
    : [];

  // Get unique values for each column
  const getUniqueValues = (col) => {
    return [...new Set(importData.data.map(row => row[col]))].sort();
  };

  // Filter data based on search and column filters
  const filteredData = importData.data.filter(row => {
    // Search term filter - search across all columns
    const matchesSearch = searchTerm === "" || columns.some(col =>
      String(row[col]).toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Column filters
    const matchesFilters = Object.keys(columnFilters).every(col => {
      const filterValue = columnFilters[col];
      if (!filterValue) return true;
      return String(row[col]) === filterValue;
    });

    return matchesSearch && matchesFilters;
  });

  const exportToCSV = () => {
    const headers = columns.join(',');
    const rows = filteredData.map(row =>
      columns.map(col => `"${row[col]}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importData.import_name}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Data Tabel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gegevens ({filteredData.length} rijen)</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exporteren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(importData.id)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
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
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-slate-500">
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}