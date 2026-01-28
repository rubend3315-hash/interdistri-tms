import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, BarChart3, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function ImportSummary({ importData, validationErrors, onClose, onViewData }) {
  const errorCount = validationErrors?.length || 0;
  const successRows = importData.total_rows - errorCount;

  return (
    <div className="space-y-4">
      {/* Success Header */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-emerald-900">Import voltooid!</h3>
              <p className="text-sm text-emerald-700 mt-1">
                {importData.import_name} is succesvol opgeslagen
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Totaal rijen</p>
              <p className="text-3xl font-bold text-slate-900">{importData.total_rows}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-emerald-600 mb-1">Succesvol</p>
              <p className="text-3xl font-bold text-emerald-700">{successRows}</p>
              <p className="text-xs text-emerald-600 mt-1">({Math.round((successRows / importData.total_rows) * 100)}%)</p>
            </div>
          </CardContent>
        </Card>

        {errorCount > 0 && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs text-red-600 mb-1">Fouten</p>
                <p className="text-3xl font-bold text-red-700">{errorCount}</p>
                <p className="text-xs text-red-600 mt-1">({Math.round((errorCount / importData.total_rows) * 100)}%)</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Import Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Importgegevens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Bestandsnaam</p>
              <p className="font-medium text-slate-900">{importData.file_name}</p>
            </div>
            <div>
              <p className="text-slate-500">Import naam</p>
              <p className="font-medium text-slate-900">{importData.import_name}</p>
            </div>
            <div>
              <p className="text-slate-500">Importdatum</p>
              <p className="font-medium text-slate-900">
                {format(new Date(importData.import_date), 'dd-MM-yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Status</p>
              <p className="font-medium text-slate-900">{importData.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {importData.data && importData.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Kolommen ({Object.keys(importData.data[0]).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.keys(importData.data[0]).map(col => (
                <span key={col} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm">
                  {col}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Errors */}
      {errorCount > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-900">
              <AlertCircle className="w-4 h-4" />
              Validatiefouten ({errorCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {validationErrors.slice(0, 5).map((error, idx) => (
                <div key={idx} className="text-xs text-red-800 bg-white rounded p-2">
                  <p className="font-semibold">Rij {error.row}:</p>
                  <ul className="list-disc list-inside ml-1">
                    {error.errors.slice(0, 2).map((err, errIdx) => (
                      <li key={errIdx} className="truncate">{err}</li>
                    ))}
                    {error.errors.length > 2 && (
                      <li>+{error.errors.length - 2} meer...</li>
                    )}
                  </ul>
                </div>
              ))}
              {errorCount > 5 && (
                <p className="text-xs text-red-600 text-center py-2">+{errorCount - 5} meer rijen met fouten...</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose}>
          Sluiten
        </Button>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={onViewData}
        >
          Gegevens bekijken
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}