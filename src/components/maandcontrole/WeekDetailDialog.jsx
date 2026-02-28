import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, CheckCircle, AlertTriangle } from "lucide-react";

function fmt(n) {
  return (n || 0).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getWeeksForMonth(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const startMonday = new Date(firstDay);
  const dow = startMonday.getDay() || 7;
  startMonday.setDate(startMonday.getDate() - dow + 1);
  if (startMonday.getMonth() !== month - 1 || startMonday.getFullYear() !== year) {
    startMonday.setDate(startMonday.getDate() + 7);
  }
  const d = new Date(startMonday);
  while (d.getMonth() === month - 1 && d.getFullYear() === year) {
    const thursday = new Date(d);
    thursday.setDate(thursday.getDate() + 3);
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const isoWeek = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
    const isoYear = thursday.getFullYear();
    weeks.push({ week: isoWeek, year: isoYear });
    d.setDate(d.getDate() + 7);
  }
  return weeks;
}

export default function WeekDetailDialog({ open, onOpenChange, summary, year, month }) {
  const customerId = summary?.customer_id;
  const weeksInMonth = React.useMemo(() => getWeeksForMonth(year, month), [year, month]);

  const { data: weeklyData = [], isLoading } = useQuery({
    queryKey: ["week-detail", customerId, year, month],
    queryFn: async () => {
      let all = [];
      for (const w of weeksInMonth) {
        const data = await base44.entities.WeeklyCustomerSummary.filter({
          customer_id: customerId,
          year: w.year,
          week_number: w.week,
        });
        all = all.concat(data);
      }
      return all.sort((a, b) => a.week_number - b.week_number);
    },
    enabled: open && !!customerId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Weekdetail — {summary?.customer_name}
            {summary?.locked && <Lock className="w-4 h-4 text-amber-500" />}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8" />)}</div>
        ) : weeklyData.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Geen wekelijkse data gevonden</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider">
                  <th className="text-left py-2 px-3 font-medium">Week</th>
                  <th className="text-right py-2 px-3 font-medium">Uren</th>
                  <th className="text-right py-2 px-3 font-medium">Km</th>
                  <th className="text-right py-2 px-3 font-medium">Uur omzet</th>
                  <th className="text-right py-2 px-3 font-medium">Km omzet</th>
                  <th className="text-right py-2 px-3 font-medium">Overig</th>
                  <th className="text-right py-2 px-3 font-medium">Totaal</th>
                  <th className="text-center py-2 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {weeklyData.map(w => (
                  <tr key={w.id} className="border-t border-slate-100">
                    <td className="py-2 px-3 font-medium text-slate-800">
                      Wk {String(w.week_number).padStart(2, '0')}
                      {w.locked && <Lock className="w-3 h-3 inline ml-1 text-amber-500" />}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700">{fmt(w.total_hours)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{(w.total_km || 0) > 0 ? fmt(w.total_km) : "—"}</td>
                    <td className="py-2 px-3 text-right text-slate-700">€{fmt(w.hour_revenue)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{(w.km_revenue || 0) > 0 ? `€${fmt(w.km_revenue)}` : "—"}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{(w.other_revenue || 0) > 0 ? `€${fmt(w.other_revenue)}` : "—"}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-800">€{fmt(w.calculated_revenue)}</td>
                    <td className="py-2 px-3 text-center">
                      {w.aggregation_status === 'ERROR' ? (
                        <Badge className="bg-red-100 text-red-700 text-[10px]"><AlertTriangle className="w-3 h-3 mr-0.5" />Error</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle className="w-3 h-3 mr-0.5" />OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-xs text-slate-700">
                  <td className="py-2 px-3">Totaal</td>
                  <td className="py-2 px-3 text-right">{fmt(weeklyData.reduce((s, w) => s + (w.total_hours || 0), 0))}</td>
                  <td className="py-2 px-3 text-right">{fmt(weeklyData.reduce((s, w) => s + (w.total_km || 0), 0))}</td>
                  <td className="py-2 px-3 text-right">€{fmt(weeklyData.reduce((s, w) => s + (w.hour_revenue || 0), 0))}</td>
                  <td className="py-2 px-3 text-right">€{fmt(weeklyData.reduce((s, w) => s + (w.km_revenue || 0), 0))}</td>
                  <td className="py-2 px-3 text-right">€{fmt(weeklyData.reduce((s, w) => s + (w.other_revenue || 0), 0))}</td>
                  <td className="py-2 px-3 text-right">€{fmt(weeklyData.reduce((s, w) => s + (w.calculated_revenue || 0), 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {weeklyData.length > 0 && weeklyData[0]?.hour_rate_used > 0 && (
          <p className="text-[10px] text-slate-400 mt-2">
            Tarieven: €{weeklyData[0].hour_rate_used}/uur
            {weeklyData[0].km_rate_used > 0 && `, €${weeklyData[0].km_rate_used}/km`}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}