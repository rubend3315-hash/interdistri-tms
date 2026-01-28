import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, X } from "lucide-react";

export default function ImportDataTable({ importData, customerArticles, onDelete }) {
  const [quantityColumn, setQuantityColumn] = useState("");
  const [priceColumn, setPriceColumn] = useState("");
  const [articleColumn, setArticleColumn] = useState("");
  const [calculations, setCalculations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState({});

  const columns = importData.data && importData.data.length > 0 
    ? Object.keys(importData.data[0]) 
    : [];

  // Get unique values for each column (for filters)
  const getUniqueValues = (colName) => {
    return [...new Set(importData.data.map(row => row[colName]).filter(v => v !== null && v !== undefined))].sort();
  };

  // Filter and search data
  const filteredData = useMemo(() => {
    return importData.data.filter(row => {
      // Search filter - searches all columns
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = columns.some(col => 
          String(row[col]).toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }

      // Column filters
      for (const [colName, filterValue] of Object.entries(columnFilters)) {
        if (filterValue && filterValue !== "") {
          if (String(row[colName]).toLowerCase() !== filterValue.toLowerCase()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [importData.data, searchTerm, columnFilters, columns]);

  const calculateRevenue = () => {
    if (!quantityColumn || !priceColumn) return;

    const calculated = filteredData.map((row, idx) => {
      const quantity = parseFloat(row[quantityColumn]) || 0;
      const price = parseFloat(row[priceColumn]) || 0;
      const totalAmount = quantity * price;

      let articleMatch = null;
      if (articleColumn && customerArticles) {
        const articleName = row[articleColumn];
        articleMatch = customerArticles.find(a => 
          a.name?.toLowerCase() === articleName?.toLowerCase()
        );
      }

      return {
        rowIndex: idx,
        quantity,
        price,
        totalAmount,
        articleMatch: articleMatch?.id,
        articleName: articleMatch?.name
      };
    });

    setCalculations(calculated);
  };

  const getTotalRevenue = () => {
    return calculations.reduce((sum, calc) => sum + (calc.totalAmount || 0), 0).toFixed(2);
  };

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
      {/* Kolom Koppeling */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">Kolom Koppelingen voor Berekening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900">Hoeveelheid kolom</label>
              <Select value={quantityColumn} onValueChange={setQuantityColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900">Prijs kolom</label>
              <Select value={priceColumn} onValueChange={setPriceColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900">Artikel kolom</label>
              <Select value={articleColumn} onValueChange={setArticleColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Optioneel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>-- Geen --</SelectItem>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={calculateRevenue}
            className="bg-blue-600 hover:bg-blue-700 w-full"
            disabled={!quantityColumn || !priceColumn}
          >
            Berekeningen uitvoeren
          </Button>
        </CardContent>
      </Card>

      {/* Resultaten */}
      {calculations.length > 0 && (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader>
            <CardTitle className="text-base">Berekeningen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-emerald-600">Aantal rijen</p>
                <p className="text-2xl font-bold text-emerald-700">{calculations.length}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600">Totale omzet</p>
                <p className="text-2xl font-bold text-emerald-700">€{getTotalRevenue()}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600">Gem. bedrag per regel</p>
                <p className="text-2xl font-bold text-emerald-700">
                  €{(getTotalRevenue() / calculations.length).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Tabel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gegevens ({importData.total_rows} rijen)</CardTitle>
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
                  {calculations.length > 0 && (
                    <>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Hoeveelheid</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Prijs</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Totaal</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {importData.data.map((row, idx) => {
                  const calculation = calculations[idx];
                  return (
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
                      {calculation && (
                        <>
                          <td className="px-3 py-2 text-slate-600">{calculation.quantity}</td>
                          <td className="px-3 py-2 text-slate-600">€{calculation.price.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">
                            €{calculation.totalAmount.toFixed(2)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}