import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function ReportViewer({ report, isLoading, onRegenerate }) {
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    quality: true,
    trends: true,
    recommendations: true,
    metrics: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const parseReportContent = (content) => {
    const sections = {};
    const lines = content.split('\n');
    let currentSection = null;
    let currentContent = [];

    lines.forEach(line => {
      if (line.includes('Executive Summary')) currentSection = 'summary';
      else if (line.includes('Data Quality')) currentSection = 'quality';
      else if (line.includes('Trends')) currentSection = 'trends';
      else if (line.includes('Recommendations')) currentSection = 'recommendations';
      else if (line.includes('Key Metrics')) currentSection = 'metrics';
      else if (currentSection && line.trim()) currentContent.push(line);

      if (line.includes(':') && !line.startsWith('-') && currentSection) {
        if (sections[currentSection]) {
          sections[currentSection] += '\n' + line;
        } else {
          sections[currentSection] = line;
        }
      }
    });

    return sections;
  };

  const sections = parseReportContent(report || '');

  const exportReport = () => {
    const text = `GEGENEREERD RAPPORT\n${format(new Date(), 'dd MMMM yyyy', { locale: nl })}\n\n${report}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-${Date.now()}.txt`;
    a.click();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-slate-600">Rapport wordt gegenereerd...</p>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">Geen rapport gegenereerd. Selecteer criteria en genereer een rapport.</p>
        </CardContent>
      </Card>
    );
  }

  const sectionConfig = {
    summary: { title: 'Executive Summary', icon: '📊', color: 'bg-blue-50' },
    quality: { title: 'Data Kwaliteit', icon: '✓', color: 'bg-green-50' },
    trends: { title: 'Trends & Patronen', icon: '📈', color: 'bg-purple-50' },
    recommendations: { title: 'Aanbevelingen', icon: '💡', color: 'bg-orange-50' },
    metrics: { title: 'Sleutelmetrieken', icon: '📊', color: 'bg-slate-50' }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Geanalyseerd Rapport</h3>
          <p className="text-xs text-slate-500 mt-1">
            Gegenereerd op {format(new Date(), 'dd MMM yyyy HH:mm', { locale: nl })}
          </p>
        </div>
        <Button 
          onClick={exportReport}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Exporteren
        </Button>
      </div>

      <div className="grid gap-3">
        {Object.entries(sectionConfig).map(([key, config]) => (
          <Card key={key} className={config.color}>
            <button
              onClick={() => toggleSection(key)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-opacity-75 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{config.icon}</span>
                <CardTitle className="text-base">{config.title}</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {expandedSections[key] ? '−' : '+'}
              </Badge>
            </button>
            
            {expandedSections[key] && (
              <CardContent className="pt-0 pb-4">
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {sections[key] || 'Geen gegevens beschikbaar'}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Button 
        onClick={onRegenerate}
        variant="outline"
        className="w-full gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Rapport opnieuw genereren
      </Button>
    </div>
  );
}