import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BreakRecalcCard() {
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [includeConcept, setIncludeConcept] = useState(true);
  const [includeIngediend, setIncludeIngediend] = useState(true);
  const [result, setResult] = useState(null);

  const handleExecute = async () => {
    const statuses = [];
    if (includeConcept) statuses.push("Concept");
    if (includeIngediend) statuses.push("Ingediend");
    if (statuses.length === 0) return;

    setLoading(true);
    setResult(null);
    const response = await base44.functions.invoke("recalcBreaks", {
      statuses,
      dry_run: dryRun,
    });
    setResult(response.data);
    setLoading(false);
  };

  return (
    <Card className="overflow-hidden border-amber-200">
      <div className="bg-amber-700 text-white px-5 py-3 font-semibold text-sm flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Pauze herberekenen (CAO-staffel)
      </div>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Beschrijving */}
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">Beschrijving</p>
            <p className="text-sm text-slate-700">
              Herberekent de pauze van alle nog niet goedgekeurde diensten op basis van de actuele pauze-staffel.
              Alleen diensten met <strong>automatische pauze</strong> (niet handmatig) worden aangepast.
            </p>
          </div>

          {/* Gebruik bij */}
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">Gebruik bij</p>
            <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
              <li>Wijziging in de pauze-staffel (HRM Instellingen)</li>
              <li>Foutieve pauzes bij openstaande diensten</li>
              <li>Migratie naar nieuw pauze-systeem</li>
            </ul>
          </div>

          {/* Wat wordt bijgewerkt */}
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">Wat wordt bijgewerkt</p>
            <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
              <li>break_minutes (pauze in minuten)</li>
              <li>break_staffel_id (toegepaste regel)</li>
              <li>calculated_dienst_minutes (bruto duur)</li>
              <li>total_hours (netto uren)</li>
            </ul>
          </div>

          {/* Uitvoeren */}
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 mb-1">Herberekening uitvoeren</p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={includeConcept} onCheckedChange={setIncludeConcept} />
                <span className="text-sm text-slate-700">Concept</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={includeIngediend} onCheckedChange={setIncludeIngediend} />
                <span className="text-sm text-slate-700">Ingediend</span>
              </label>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={dryRun} onCheckedChange={setDryRun} />
              <span className="text-sm text-amber-700 font-medium">Dry run (alleen simuleren)</span>
            </label>

            <Button
              size="sm"
              className={`w-full ${dryRun ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
              onClick={handleExecute}
              disabled={loading || (!includeConcept && !includeIngediend)}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {loading ? "Bezig..." : dryRun ? "Simuleren" : "Definitief uitvoeren"}
            </Button>

            {result && (
              <div className={`text-xs p-3 rounded-lg ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <div className="flex items-center gap-1 mb-2">
                  {result.success ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                  <span className="font-semibold text-slate-800">{result.success ? (result.dry_run ? "Simulatie voltooid" : "Herberekening voltooid") : "Fout"}</span>
                </div>
                {result.summary && (
                  <div className="space-y-1 text-slate-700">
                    <div className="flex justify-between"><span>Kandidaten:</span><span className="font-medium">{result.summary.total_candidates}</span></div>
                    <div className="flex justify-between"><span>Aangepast:</span><span className="font-medium text-green-700">{result.summary.updated}</span></div>
                    <div className="flex justify-between"><span>Ongewijzigd:</span><span className="font-medium">{result.summary.unchanged}</span></div>
                    <div className="flex justify-between"><span>Handmatig (overgeslagen):</span><span className="font-medium text-blue-600">{result.summary.skipped_manual}</span></div>
                    {result.summary.errors > 0 && (
                      <div className="flex justify-between"><span>Fouten:</span><span className="font-medium text-red-600">{result.summary.errors}</span></div>
                    )}
                  </div>
                )}
                {result.dry_run && result.summary?.updated > 0 && (
                  <p className="mt-2 text-amber-700 font-medium">⚠️ Dit was een simulatie — schakel 'dry run' uit om definitief uit te voeren.</p>
                )}
                {/* Detail tabel */}
                {result.details?.length > 0 && (
                  <div className="mt-3 max-h-48 overflow-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-1">Datum</th>
                          <th className="text-left py-1">Status</th>
                          <th className="text-right py-1">Dienst</th>
                          <th className="text-right py-1">Oud</th>
                          <th className="text-center py-1"></th>
                          <th className="text-right py-1">Nieuw</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.details.map((d, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-0.5">{d.date}</td>
                            <td><Badge variant="outline" className="text-[9px] py-0">{d.status}</Badge></td>
                            <td className="text-right">{d.dienst_hours}u</td>
                            <td className="text-right text-red-600">{d.old_break}m</td>
                            <td className="text-center"><ArrowRight className="w-3 h-3 text-slate-400 inline" /></td>
                            <td className="text-right text-green-700 font-medium">{d.new_break}m</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}