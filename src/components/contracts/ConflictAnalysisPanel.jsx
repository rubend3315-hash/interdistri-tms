import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Info, XCircle, Shield, Loader2 } from "lucide-react";

const ernstConfig = {
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-700" },
  waarschuwing: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700" },
  fout: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700" },
};

const riskConfig = {
  laag: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  gemiddeld: { color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  hoog: { color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function ConflictAnalysisPanel({ analysis, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-sm text-slate-500">AI analyseert het contract...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const risk = riskConfig[analysis.risk_level] || riskConfig.laag;
  const RiskIcon = risk.icon;
  const conflicts = analysis.conflicts || [];

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            AI Conflictanalyse
          </CardTitle>
          <Badge className={risk.color}>
            <RiskIcon className="w-3 h-3 mr-1" />
            Risico: {analysis.risk_level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        {analysis.samenvatting && (
          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{analysis.samenvatting}</p>
        )}

        {/* Conflicts */}
        {conflicts.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Geen conflicten gevonden</span>
          </div>
        ) : (
          <div className="space-y-2">
            {conflicts.map((conflict, idx) => {
              const config = ernstConfig[conflict.ernst] || ernstConfig.info;
              const Icon = config.icon;
              return (
                <div key={idx} className={`border rounded-lg p-3 ${config.bg}`}>
                  <div className="flex items-start gap-2">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${config.badge} text-xs`}>{conflict.ernst}</Badge>
                        <span className="text-xs text-slate-500">{conflict.categorie}</span>
                      </div>
                      <p className="text-sm text-slate-800">{conflict.beschrijving}</p>
                      {conflict.aanbeveling && (
                        <p className="text-xs text-slate-600 mt-1.5 bg-white/60 rounded px-2 py-1">
                          💡 {conflict.aanbeveling}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Missing clauses */}
        {analysis.ontbrekende_clausules?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 mb-2">ONTBREKENDE CLAUSULES:</p>
            <div className="flex flex-wrap gap-1">
              {analysis.ontbrekende_clausules.map((clause, idx) => (
                <Badge key={idx} variant="outline" className="text-xs border-red-200 text-red-600">
                  {clause}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}