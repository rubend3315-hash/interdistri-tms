import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, CheckCircle, AlertTriangle } from "lucide-react";
import { getISOWeek, getYear, startOfWeek } from "date-fns";

export default function AggregationStatusWidget() {
  const now = new Date();
  const ws = startOfWeek(now, { weekStartsOn: 1 });
  const curWeek = getISOWeek(ws);
  const curYear = getYear(ws);
  const curMonth = now.getMonth() + 1;

  const { data: weeklySummaries = [], isLoading: l1 } = useQuery({
    queryKey: ["agg-status-weekly", curYear, curWeek],
    queryFn: () => base44.entities.WeeklyCustomerSummary.filter({ year: curYear, week_number: curWeek }),
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: monthlySummaries = [], isLoading: l2 } = useQuery({
    queryKey: ["agg-status-monthly", curYear, curMonth],
    queryFn: () => base44.entities.MonthlyCustomerSummary.filter({ year: curYear, month: curMonth }),
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const isLoading = l1 || l2;

  const weeklyStatus = weeklySummaries.length > 0
    ? (weeklySummaries.some(s => s.aggregation_status === 'ERROR') ? 'ERROR' : 'OK')
    : 'EMPTY';

  const monthlyStatus = monthlySummaries.length > 0
    ? (monthlySummaries.some(s => s.aggregation_status === 'ERROR') ? 'ERROR' : 'OK')
    : 'EMPTY';

  const lastCalc = weeklySummaries
    .filter(s => s.last_aggregation_at)
    .sort((a, b) => new Date(b.last_aggregation_at) - new Date(a.last_aggregation_at))[0]?.last_aggregation_at;

  function StatusBadge({ status }) {
    if (status === 'OK') return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle className="w-3 h-3 mr-1" />OK</Badge>;
    if (status === 'ERROR') return <Badge className="bg-red-100 text-red-700 text-[10px]"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
    return <Badge variant="outline" className="text-[10px] text-slate-400">Geen data</Badge>;
  }

  if (isLoading) return <Skeleton className="h-20 rounded-xl" />;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-1 px-4 pt-3">
        <CardTitle className="text-xs flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          Aggregatie Status
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-1">
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Week {curWeek}:</span>
            <StatusBadge status={weeklyStatus} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Maand {curMonth}:</span>
            <StatusBadge status={monthlyStatus} />
          </div>
        </div>
        {lastCalc && (
          <p className="text-[9px] text-slate-400 mt-1">
            Laatste berekening: {new Date(lastCalc).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}