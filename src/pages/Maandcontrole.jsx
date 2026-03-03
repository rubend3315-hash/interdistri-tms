import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, CheckCircle, AlertTriangle } from "lucide-react";
import MaandcontroleFilters from "../components/maandcontrole/MaandcontroleFilters";
import MaandcontroleTable from "../components/maandcontrole/MaandcontroleTable";
import WeekDetailDialog from "../components/maandcontrole/WeekDetailDialog";

export default function Maandcontrole() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [recalculating, setRecalculating] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);

  const { data: summaries = [], isLoading, refetch } = useQuery({
    queryKey: ["monthly-control", year, month],
    queryFn: () => base44.entities.MonthlyCustomerSummary.filter({ year, month }),
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const isLocked = summaries.some(s => s.locked);
  const aggStatus = summaries.length > 0
    ? (summaries.some(s => s.aggregation_status === "ERROR") ? "ERROR" : "OK")
    : null;

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await base44.functions.invoke("recalculateMonthlyCustomerSummary", { year, month });
      await refetch();
    } finally {
      setRecalculating(false);
    }
  };

  const lastCalc = summaries
    .filter(s => s.last_calculated)
    .sort((a, b) => new Date(b.last_calculated) - new Date(a.last_calculated))[0]?.last_calculated;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Maandcontrole</h1>
          <p className="text-sm text-slate-500">Maandelijkse financiële controle per klant</p>
        </div>
        {aggStatus && (
          <Badge className={aggStatus === "OK" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
            {aggStatus === "OK" ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
            {aggStatus}
          </Badge>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 px-5 pt-4">
          <MaandcontroleFilters
            year={year}
            month={month}
            onYearChange={setYear}
            onMonthChange={setMonth}
            isLocked={isLocked}
            onRecalculate={handleRecalculate}
            recalculating={recalculating}
          />
          {lastCalc && (
            <p className="text-[10px] text-slate-400 mt-2">
              Laatste berekening: {new Date(lastCalc).toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}
            </div>
          ) : (
            <MaandcontroleTable
              summaries={summaries}
              onRowClick={setSelectedSummary}
            />
          )}
        </CardContent>
      </Card>

      <WeekDetailDialog
        open={!!selectedSummary}
        onOpenChange={open => { if (!open) setSelectedSummary(null); }}
        summary={selectedSummary}
        year={year}
        month={month}
      />
    </div>
  );
}