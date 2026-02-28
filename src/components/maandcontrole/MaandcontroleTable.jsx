import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

function fmt(n) {
  return (n || 0).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function DiffBadge({ pct }) {
  const abs = Math.abs(pct || 0);
  if (abs === 0) return <Badge className="bg-emerald-100 text-emerald-700 text-[10px] gap-1"><CheckCircle className="w-3 h-3" />0%</Badge>;
  if (abs < 5) return <Badge className="bg-amber-100 text-amber-700 text-[10px] gap-1"><AlertTriangle className="w-3 h-3" />{(pct || 0).toFixed(1)}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 text-[10px] gap-1"><XCircle className="w-3 h-3" />{(pct || 0).toFixed(1)}%</Badge>;
}

export default function MaandcontroleTable({ summaries, onRowClick }) {
  if (summaries.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        Geen data voor deze maand
      </div>
    );
  }

  const sorted = [...summaries].sort((a, b) => (b.calculated_revenue || 0) - (a.calculated_revenue || 0));

  const totals = sorted.reduce((acc, s) => ({
    hours: acc.hours + (s.total_hours || 0),
    km: acc.km + (s.total_km || 0),
    calcRev: acc.calcRev + (s.calculated_revenue || 0),
    invRev: acc.invRev + (s.invoiced_revenue || 0),
    diff: acc.diff + (s.difference_amount || 0),
  }), { hours: 0, km: 0, calcRev: 0, invRev: 0, diff: 0 });

  const totalPct = totals.invRev > 0
    ? ((totals.calcRev - totals.invRev) / totals.invRev) * 100
    : (totals.calcRev > 0 ? 100 : 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider">
            <th className="text-left py-2.5 px-4 font-medium">Klant</th>
            <th className="text-right py-2.5 px-3 font-medium">Uren</th>
            <th className="text-right py-2.5 px-3 font-medium">Km</th>
            <th className="text-right py-2.5 px-3 font-medium">Berekend</th>
            <th className="text-right py-2.5 px-3 font-medium">Gefactureerd</th>
            <th className="text-right py-2.5 px-3 font-medium">Verschil €</th>
            <th className="text-center py-2.5 px-3 font-medium">Verschil %</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(s => (
            <tr
              key={s.id}
              className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer transition-colors"
              onClick={() => onRowClick(s)}
            >
              <td className="py-2 px-4 font-medium text-slate-800">{s.customer_name}</td>
              <td className="py-2 px-3 text-right text-slate-700">{fmt(s.total_hours)}</td>
              <td className="py-2 px-3 text-right text-slate-600">{(s.total_km || 0) > 0 ? fmt(s.total_km) : "—"}</td>
              <td className="py-2 px-3 text-right text-slate-700">€{fmt(s.calculated_revenue)}</td>
              <td className="py-2 px-3 text-right text-slate-700">{(s.invoiced_revenue || 0) > 0 ? `€${fmt(s.invoiced_revenue)}` : "—"}</td>
              <td className="py-2 px-3 text-right">
                <span className={
                  (s.difference_amount || 0) > 0 ? "text-emerald-600" :
                  (s.difference_amount || 0) < 0 ? "text-red-600" : "text-slate-400"
                }>
                  {(s.difference_amount || 0) !== 0 ? `€${fmt(s.difference_amount)}` : "—"}
                </span>
              </td>
              <td className="py-2 px-3 text-center">
                <DiffBadge pct={s.difference_percentage} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-700 text-xs">
            <td className="py-2.5 px-4">Totaal</td>
            <td className="py-2.5 px-3 text-right">{fmt(totals.hours)}</td>
            <td className="py-2.5 px-3 text-right">{totals.km > 0 ? fmt(totals.km) : "—"}</td>
            <td className="py-2.5 px-3 text-right">€{fmt(totals.calcRev)}</td>
            <td className="py-2.5 px-3 text-right">{totals.invRev > 0 ? `€${fmt(totals.invRev)}` : "—"}</td>
            <td className="py-2.5 px-3 text-right">
              <span className={totals.diff > 0 ? "text-emerald-600" : totals.diff < 0 ? "text-red-600" : "text-slate-400"}>
                {totals.diff !== 0 ? `€${fmt(totals.diff)}` : "—"}
              </span>
            </td>
            <td className="py-2.5 px-3 text-center">
              <DiffBadge pct={totalPct} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}