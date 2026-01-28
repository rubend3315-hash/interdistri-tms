import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Zap, AlertCircle } from "lucide-react";
import ReportViewer from "./ReportViewer";

export default function ReportGenerator({ imports, articles }) {
  const [reportType, setReportType] = useState("summary");
  const [selectedImportId, setSelectedImportId] = useState("");
  const [customCriteria, setCustomCriteria] = useState("");
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getFilteredData = () => {
    if (!selectedImportId) {
      return imports.flatMap(imp => imp.data);
    }
    const selected = imports.find(imp => imp.id === selectedImportId);
    return selected ? selected.data : [];
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = getFilteredData();
      
      if (data.length === 0) {
        setError("Geen data beschikbaar voor rapportage");
        setIsLoading(false);
        return;
      }

      const response = await base44.functions.invoke('generateReport', {
        data,
        criteria: {
          type: reportType,
          period: selectedImportId || 'all',
          customCriteria,
          articleCount: articles?.length || 0
        }
      });

      setReport(response.data.report);
    } catch (err) {
      setError("Fout bij het genereren van rapport: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generator Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Rapport Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Rapporttype</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Samenvatting</SelectItem>
                  <SelectItem value="detailed">Gedetailleerd</SelectItem>
                  <SelectItem value="custom">Aangepast</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Import selecteren</label>
              <Select value={selectedImportId} onValueChange={setSelectedImportId}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle imports" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Alle imports</SelectItem>
                  {imports.map(imp => (
                    <SelectItem key={imp.id} value={imp.id}>
                      {imp.import_name} ({imp.data?.length} rijen)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {reportType === "custom" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Aangepaste criteria</label>
              <Textarea
                placeholder="Beschrijf welke informatie je wilt analyseren..."
                value={customCriteria}
                onChange={(e) => setCustomCriteria(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <Button
            onClick={handleGenerateReport}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? "Genereren..." : "Rapport genereren met AI"}
          </Button>
        </CardContent>
      </Card>

      {/* Report Viewer */}
      <ReportViewer 
        report={report}
        isLoading={isLoading}
        onRegenerate={handleGenerateReport}
      />
    </div>
  );
}