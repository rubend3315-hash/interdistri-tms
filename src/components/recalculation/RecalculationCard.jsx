import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function RecalculationCard({ title, description, useCases, impacts, type }) {
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleExecute = async () => {
    setLoading(true);
    setResult(null);
    const response = await base44.functions.invoke("recalculate", {
      type,
      from_date: fromDate,
      to_date: toDate,
    });
    setResult(response.data);
    setLoading(false);
  };

  return (
    <Card className="overflow-hidden">
      <div className="bg-slate-800 text-white px-5 py-3 font-semibold text-sm">
        {title}
      </div>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Beschrijving */}
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">Beschrijving</p>
            <p className="text-sm text-slate-700">{description}</p>
          </div>

          {/* Gebruik bij */}
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">Gebruik bij</p>
            <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
              {useCases.map((uc, i) => (
                <li key={i}>{uc}</li>
              ))}
            </ul>
          </div>

          {/* Van invloed op */}
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">Van invloed op</p>
            <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
              {impacts.map((imp, i) => (
                <li key={i}>{imp}</li>
              ))}
            </ul>
          </div>

          {/* Herberekening uitvoeren */}
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 mb-1">Herberekening uitvoeren</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-8">Van:</span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-8">Tot:</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              onClick={handleExecute}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {loading ? "Bezig..." : "Uitvoeren"}
            </Button>

            {result && (
              <div className={`text-xs p-2 rounded ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                <div className="flex items-center gap-1 mb-1">
                  {result.success ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  <span className="font-semibold">{result.success ? "Voltooid" : "Fout"}</span>
                </div>
                <p>{result.message || result.error}</p>
                {result.updated !== undefined && (
                  <p className="mt-1">{result.updated} van {result.total} bijgewerkt</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}