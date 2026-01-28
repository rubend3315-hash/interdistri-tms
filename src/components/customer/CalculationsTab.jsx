import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

export default function CalculationsTab({ imports, customerArticles }) {
  const [selectedImportId, setSelectedImportId] = useState("");
  const [quantityColumn, setQuantityColumn] = useState("");
  const [priceColumn, setPriceColumn] = useState("");
  const [articleColumn, setArticleColumn] = useState("");
  const [calculations, setCalculations] = useState([]);

  const selectedImport = imports.find(i => i.id === selectedImportId);
  const columns = selectedImport && selectedImport.data && selectedImport.data.length > 0
    ? Object.keys(selectedImport.data[0])
    : [];

  const calculateRevenue = () => {
    if (!selectedImport || !quantityColumn || !priceColumn) return;

    const calculated = selectedImport.data.map((row, idx) => {
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

  if (imports.length === 0) {
    return (
      <Card className="p-12 text-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Geen imports beschikbaar</h3>
        <p className="text-slate-500 mt-1">Importeer eerst een Excel bestand op het Imports tabblad.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Import Selectie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import selecteren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Select value={selectedImportId || ""} onValueChange={(v) => setSelectedImportId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer een import" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecteer import</SelectItem>
              {imports.map(imp => (
                <SelectItem key={imp.id} value={imp.id}>
                  {imp.import_name} ({imp.total_rows} rijen)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Kolom Koppeling */}
      {selectedImport && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Kolom koppelingen voor berekening</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-900">Hoeveelheid kolom</label>
                <Select value={quantityColumn || "none"} onValueChange={(v) => setQuantityColumn(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecteer kolom</SelectItem>
                    {columns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-900">Prijs kolom</label>
                <Select value={priceColumn || "none"} onValueChange={(v) => setPriceColumn(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecteer kolom</SelectItem>
                    {columns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-900">Artikel kolom</label>
                <Select value={articleColumn || "none"} onValueChange={(v) => setArticleColumn(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optioneel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Niet selecteren</SelectItem>
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
      )}

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

      {/* Berekeningen Tabel */}
      {calculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Berekende gegevens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Hoeveelheid</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Prijs</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">Totaal</th>
                    {articleColumn && (
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Artikel</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {calculations.map((calc, idx) => (
                    <tr key={idx} className="border-t hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-600 font-medium">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-600">{calc.quantity}</td>
                      <td className="px-3 py-2 text-slate-600">€{calc.price.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        €{calc.totalAmount.toFixed(2)}
                      </td>
                      {articleColumn && (
                        <td className="px-3 py-2 text-slate-600">{calc.articleName || '-'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}