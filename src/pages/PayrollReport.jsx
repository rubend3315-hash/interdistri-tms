import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Eye, Loader2, Code, FileJson, Cloud } from "lucide-react";
import { toast } from "sonner";

export default function PayrollReport() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultDate = yesterday.toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [loadingJson, setLoadingJson] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [loadingAzure, setLoadingAzure] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  const isAdminOrHr = user?.role === 'admin' || ['ADMIN', 'HR_ADMIN'].includes(user?.business_role);

  const downloadBase64File = (base64, fileName, mimeType = 'application/json') => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = async () => {
    setLoadingJson(true);
    try {
      const response = await base44.functions.invoke('downloadDailyPayrollReportJson', { date: selectedDate });
      const { fileBase64, fileName } = response.data;
      downloadBase64File(fileBase64, fileName);
      toast.success(`JSON payload gedownload: ${fileName}`);
    } catch (err) {
      toast.error(`Fout bij downloaden JSON: ${err.message}`);
    } finally {
      setLoadingJson(false);
    }
  };

  const handleDownloadSchema = async () => {
    setLoadingSchema(true);
    try {
      const response = await base44.functions.invoke('downloadDailyPayrollSchema', {});
      const { fileBase64, fileName } = response.data;
      downloadBase64File(fileBase64, fileName);
      toast.success(`JSON schema gedownload: ${fileName}`);
    } catch (err) {
      toast.error(`Fout bij downloaden schema: ${err.message}`);
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleTestAzure = async () => {
    setLoadingAzure(true);
    try {
      const response = await base44.functions.invoke('sendDailyPayrollReportToAzure', { date: selectedDate });
      const data = response.data;
      if (data.error === 'AZURE_NOT_CONFIGURED') {
        toast.info('Azure integratie nog niet geconfigureerd (dry-run).', {
          description: `${data.employeeCount} medewerkers gevonden voor ${selectedDate}`,
        });
      } else if (data.success) {
        toast.success(`Azure push geslaagd (HTTP ${data.azureStatusCode})`, {
          description: `${data.employeeCount} medewerkers verstuurd`,
        });
      } else {
        toast.error(`Azure push mislukt: ${data.error}`, {
          description: data.details || '',
        });
      }
    } catch (err) {
      toast.error(`Fout bij Azure test: ${err.message}`);
    } finally {
      setLoadingAzure(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setLastResult(null);
    try {
      const response = await base44.functions.invoke("generateDailyPayrollReport", {
        date: selectedDate,
      });

      const { fileBase64, fileName } = response.data;

      const byteCharacters = atob(fileBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setLastResult({ url, fileName });

      // Open preview
      window.open(url, "_blank");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!lastResult) return;
    const link = document.createElement("a");
    link.href = lastResult.url;
    link.download = lastResult.fileName;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dagrapport Loonadministratie</h1>
        <p className="text-slate-500 mt-1">
          Genereer een PDF dagrapport met tijdregistratie, ritten en standplaatswerk per medewerker.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Rapport genereren
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Datum</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Alleen medewerkers met registraties op deze datum worden opgenomen.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={loading || !selectedDate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              {loading ? "Bezig met genereren..." : "Rapport genereren"}
            </Button>

            {lastResult && (
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Downloaden
              </Button>
            )}
          </div>

          {lastResult && (
            <p className="text-sm text-green-600 font-medium">
              ✓ Rapport gegenereerd: {lastResult.fileName}
            </p>
          )}
        </CardContent>
      </Card>

        {isAdminOrHr && (
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-slate-600" />
                Developer & Integratie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadJson}
                  disabled={loadingJson || !selectedDate}
                >
                  {loadingJson ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileJson className="w-4 h-4 mr-2" />}
                  Download JSON payload
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDownloadSchema}
                  disabled={loadingSchema}
                >
                  {loadingSchema ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  Download JSON schema
                </Button>

                <Button
                  variant="outline"
                  onClick={handleTestAzure}
                  disabled={loadingAzure || !selectedDate}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {loadingAzure ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Cloud className="w-4 h-4 mr-2" />}
                  Test Azure push
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                JSON payload en Azure push gebruiken de geselecteerde datum hierboven.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      );
      }