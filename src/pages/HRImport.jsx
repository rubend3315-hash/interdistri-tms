import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Link2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  ArrowLeft,
  Info
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import HRImportUploader from "../components/import/HRImportUploader";
import HRImportPreview from "../components/import/HRImportPreview";

export default function HRImport() {
  const [extractedData, setExtractedData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const importMutation = useMutation({
    mutationFn: async (records) => {
      return base44.entities.Employee.bulkCreate(records);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setImportResult({
        success: true,
        count: Array.isArray(data) ? data.length : 1,
      });
      setExtractedData(null);
    },
    onError: (error) => {
      setImportResult({ success: false, error: error.message });
    },
  });

  const handleDataExtracted = (rows, name) => {
    setExtractedData(rows);
    setFileName(name);
    setImportResult(null);
  };

  const handleImport = (records) => {
    if (records.length === 0) return;
    importMutation.mutate(records);
  };

  const handleReset = () => {
    setExtractedData(null);
    setFileName("");
    setImportResult(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Employees")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">HR Import</h1>
            <p className="text-slate-500">
              Importeer personeelsgegevens uit Loket.nl of ander HR-systeem
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <Users className="w-4 h-4 mr-1" />
          {employees.length} medewerkers in systeem
        </Badge>
      </div>

      {/* Success/Error messages */}
      {importResult && (
        <Alert
          className={
            importResult.success
              ? "bg-emerald-50 border-emerald-200"
              : "bg-red-50 border-red-200"
          }
        >
          {importResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
          <AlertDescription
            className={
              importResult.success ? "text-emerald-800" : "text-red-800"
            }
          >
            {importResult.success ? (
              <div className="flex items-center justify-between">
                <span>
                  <strong>{importResult.count} medewerker(s)</strong>{" "}
                  succesvol geïmporteerd!
                </span>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Nieuwe import
                </Button>
              </div>
            ) : (
              <span>Import mislukt: {importResult.error}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="excel">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="excel">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel / CSV Import
          </TabsTrigger>
          <TabsTrigger value="api">
            <Link2 className="w-4 h-4 mr-2" />
            Loket.nl API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="excel" className="space-y-4">
          {!extractedData ? (
            <>
              <HRImportUploader
                onDataExtracted={handleDataExtracted}
                isProcessing={importMutation.isPending}
              />

              <Alert className="bg-blue-50 border-blue-200">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Tip:</strong> Exporteer vanuit Loket.nl via{" "}
                  <em>Medewerkers → Exporteren → Excel</em>. Het systeem
                  herkent automatisch de kolommen en mapt ze naar de juiste
                  velden. Kolommen die niet herkend worden, worden overgeslagen.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-900">{fileName}</p>
                    <p className="text-sm text-slate-500">
                      {extractedData.length} rijen gevonden
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleReset}>
                  Ander bestand
                </Button>
              </div>

              <HRImportPreview
                data={extractedData}
                existingEmployees={employees}
                onImport={handleImport}
                isImporting={importMutation.isPending}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-blue-600" />
                Loket.nl API Koppeling
              </CardTitle>
              <CardDescription>
                Synchroniseer personeelsgegevens automatisch met Loket.nl
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Binnenkort beschikbaar</strong> — De directe
                  API-koppeling met Loket.nl wordt momenteel voorbereid. Hiervoor
                  heb je een API-token nodig van Loket.nl.
                </AlertDescription>
              </Alert>

              <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-slate-900">
                  Wat de API-koppeling straks biedt:
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span>Automatisch synchroniseren van personeelsgegevens</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span>Wijzigingen in Loket.nl direct doorvoeren</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span>Contractgegevens en loonschalen importeren</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span>Dagelijkse automatische sync instellen</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-slate-700 mb-2">
                    Voorbereiden:
                  </h4>
                  <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1">
                    <li>
                      Log in op{" "}
                      <span className="font-medium">Loket.nl</span> als
                      beheerder
                    </li>
                    <li>
                      Ga naar <em>Instellingen → API-toegang</em>
                    </li>
                    <li>Genereer een API-token</li>
                    <li>Bewaar de token voor wanneer de koppeling klaar is</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}