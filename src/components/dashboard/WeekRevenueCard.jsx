import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronLeft, ChevronRight, RefreshCw, Lock } from "lucide-react";
import { getISOWeek, getYear, startOfWeek, endOfWeek, addWeeks, subWeeks, format } from "date-fns";

// Spotta customer ID (Netwerk VSP B.V. = statutair, Spotta = handelsnaam)
const SPOTTA_CUSTOMER_ID = "697a3ffb9e5ab8044383b8ff";

function fmt(n) {
  return n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function DeltaVal({ value, prefix = "" }) {
  if (value === 0) return <span className="text-slate-300">—</span>;
  const pos = value > 0;
  return (
    <span className={pos ? "text-emerald-500/80" : "text-red-400/80"}>
      {pos ? "+" : ""}{prefix}{fmt(Math.abs(value))}
    </span>
  );
}

function DeltaPct({ pct }) {
  if (pct === null || pct === undefined) return <span className="text-slate-300">—</span>;
  if (pct === 0) return <span className="text-slate-300">0%</span>;
  const pos = pct > 0;
  return (
    <span className={pos ? "text-emerald-600" : "text-red-500"}>
      {pos ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

export default function WeekRevenueCard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [recalculating, setRecalculating] = useState(false);

  const { weekNum, yearNum, weekStartStr, weekEndStr, prevWeekNum, prevYearNum } = useMemo(() => {
    const base = addWeeks(new Date(), weekOffset);
    const ws = startOfWeek(base, { weekStartsOn: 1 });
    const we = endOfWeek(base, { weekStartsOn: 1 });
    const pws = subWeeks(ws, 1);
    return {
      weekNum: getISOWeek(ws),
      yearNum: getYear(ws),
      weekStartStr: format(ws, "yyyy-MM-dd"),
      weekEndStr: format(we, "yyyy-MM-dd"),
      prevWeekNum: getISOWeek(pws),
      prevYearNum: getYear(pws),
    };
  }, [weekOffset]);

  // Read pre-computed summaries
  const { data: curSummaries = [], isLoading: l1, refetch } = useQuery({
    queryKey: ["wcs", yearNum, weekNum],
    queryFn: () => base44.entities.WeeklyCustomerSummary.filter({ year: yearNum, week_number: weekNum }),
  });

  const { data: prevSummaries = [], isLoading: l2 } = useQuery({
    queryKey: ["wcs", prevYearNum, prevWeekNum],
    queryFn: () => base44.entities.WeeklyCustomerSummary.filter({ year: prevYearNum, week_number: prevWeekNum }),
  });

  // Spotta invoice revenue: factuurweek = werkweek + 1 (Spotta factureert week 9 voor werk in week 8)
  const spottaPeriod = `${yearNum}-${String(weekNum + 1).padStart(2, '0')}`;
  const prevSpottaPeriod = `${prevYearNum}-${String(prevWeekNum + 1).padStart(2, '0')}`;

  const { data: spottaInvoices = [], isLoading: l3 } = useQuery({
    queryKey: ["spotta-inv", SPOTTA_CUSTOMER_ID],
    queryFn: () => base44.entities.SpottaInvoice.filter({ customer_id: SPOTTA_CUSTOMER_ID }),
  });

  const spottaInvoiceIds = useMemo(() => spottaInvoices.map(i => i.id).sort().join(','), [spottaInvoices]);
  const { data: spottaLines = [], isLoading: l4 } = useQuery({
    queryKey: ["spotta-lines", SPOTTA_CUSTOMER_ID, spottaInvoiceIds],
    queryFn: async () => {
      // Fetch per invoice (default limit=50 is too low for 70+ lines per invoice)
      const allLines = [];
      for (const inv of spottaInvoices) {
        const lines = await base44.entities.SpottaInvoiceLine.filter(
          { invoice_id: inv.id }, '-created_date', 200
        );
        allLines.push(...lines);
      }
      return allLines;
    },
    enabled: spottaInvoices.length > 0,
  });

  // Calculate Spotta revenue per week from invoice lines (excl. depot handling)
  const spottaRevenueByWeek = useMemo(() => {
    const invPeriodMap = {};
    spottaInvoices.forEach(inv => { invPeriodMap[inv.id] = inv.description_period; });

    const weekMap = {};
    spottaLines.forEach(line => {
      const period = invPeriodMap[line.invoice_id];
      if (!period) return;
      weekMap[period] = (weekMap[period] || 0) + (line.total_price || 0);
    });
    return weekMap;
  }, [spottaInvoices, spottaLines]);

  const isLoading = l1 || l2 || l3 || l4;
  const isLocked = curSummaries.some(s => s.locked);
  const isCurrentWeek = weekOffset === 0;

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await base44.functions.invoke('recalculateWeeklySummaries', { year: yearNum, week_number: weekNum });
      await refetch();
    } finally {
      setRecalculating(false);
    }
  };

  const { customerData, totals } = useMemo(() => {
    if (isLoading) return { customerData: [], totals: null };

    const prevMap = {};
    prevSummaries.forEach(s => { prevMap[s.customer_id] = s; });

    // Spotta invoice-based revenue for current and previous week
    const spottaCurRevenue = spottaRevenueByWeek[spottaPeriod] || 0;
    const spottaPrevRevenue = spottaRevenueByWeek[prevSpottaPeriod] || 0;

    const merged = curSummaries
      .filter(s => s.total_hours > 0 || s.total_km > 0 || s.calculated_revenue > 0)
      .map(s => {
        const prev = prevMap[s.customer_id] || { total_hours: 0, total_km: 0, calculated_revenue: 0 };
        // For Spotta: use invoice-based revenue instead of calculated
        const isSpotta = s.customer_id === SPOTTA_CUSTOMER_ID;
        const revenue = isSpotta ? spottaCurRevenue : s.calculated_revenue;
        const prevRevenue = isSpotta ? spottaPrevRevenue : prev.calculated_revenue;
        const rate = s.total_hours > 0 ? revenue / s.total_hours : 0;
        return {
          id: s.customer_id,
          name: s.customer_name,
          hours: s.total_hours,
          km: s.total_km,
          revenue,
          rate,
          hoursDelta: s.total_hours - prev.total_hours,
          hoursPct: prev.total_hours > 0 ? ((s.total_hours - prev.total_hours) / prev.total_hours) * 100 : null,
          kmDelta: s.total_km - prev.total_km,
          revenueDelta: revenue - prevRevenue,
          revenuePct: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
          invoiceBased: isSpotta, // flag for display
        };
      })
      .sort((a, b) => (b.revenue + b.hours) - (a.revenue + a.hours));

    const curTotH = merged.reduce((s, c) => s + c.hours, 0);
    const curTotKm = merged.reduce((s, c) => s + c.km, 0);
    const curTotR = merged.reduce((s, c) => s + c.revenue, 0);
    const prevTotH = prevSummaries.reduce((s, c) => s + (c.total_hours || 0), 0);
    const prevTotKm = prevSummaries.reduce((s, c) => s + (c.total_km || 0), 0);
    const prevTotR = prevSummaries.reduce((s, c) => s + (c.calculated_revenue || 0), 0);

    return {
      customerData: merged,
      totals: {
        hours: curTotH, km: curTotKm, revenue: curTotR,
        rate: curTotH > 0 ? curTotR / curTotH : 0,
        hoursDelta: curTotH - prevTotH,
        hoursPct: prevTotH > 0 ? ((curTotH - prevTotH) / prevTotH) * 100 : null,
        kmDelta: curTotKm - prevTotKm,
        revenueDelta: curTotR - prevTotR,
        revenuePct: prevTotR > 0 ? ((curTotR - prevTotR) / prevTotR) * 100 : null,
      },
    };
  }, [curSummaries, prevSummaries, isLoading]);

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-1 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Omzet & Uren per Klant
            {isLocked && <Lock className="w-3 h-3 text-amber-500" title="Week vergrendeld" />}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="h-6 w-6"
              onClick={handleRecalculate}
              disabled={recalculating || isLocked}
              title="Herbereken"
            >
              <RefreshCw className={`w-3 h-3 ${recalculating ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(o => o - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button
              className="text-xs font-medium text-slate-700 hover:text-blue-600 px-1.5 min-w-[70px] text-center"
              onClick={() => setWeekOffset(0)}
              title="Naar huidige week"
            >
              Wk {String(weekNum).padStart(2, '0')} · {yearNum}
            </button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(o => o + 1)} disabled={isCurrentWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {weekStartStr} — {weekEndStr} · Δ t.o.v. wk {String(prevWeekNum).padStart(2, '0')}
          {curSummaries[0]?.last_calculated && (
            <span className="ml-1">· berekend {new Date(curSummaries[0].last_calculated).toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
          )}
        </p>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        {isLoading ? (
          <div className="space-y-1.5">{[1, 2, 3].map(i => <Skeleton key={i} className="h-6" />)}</div>
        ) : customerData.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-[11px] text-slate-400">Geen data voor deze week</p>
            <Button variant="outline" size="sm" className="mt-2 text-xs h-7" onClick={handleRecalculate} disabled={recalculating}>
              <RefreshCw className={`w-3 h-3 mr-1.5 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Berekenen...' : 'Berekenen'}
            </Button>
          </div>
        ) : (
          <div className="max-h-[280px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[9px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="text-left py-1 pr-1 font-medium">Klant</th>
                  <th className="text-right py-1 px-1 font-medium">Uren</th>
                  <th className="text-right py-1 px-1 font-medium">Δ</th>
                  <th className="text-right py-1 px-1 font-medium">Km</th>
                  <th className="text-right py-1 px-1 font-medium">Omzet</th>
                  <th className="text-right py-1 pl-1 font-medium">€/u</th>
                </tr>
              </thead>
              <tbody>
                {customerData.map(c => (
                  <tr key={c.id} className="border-b border-slate-50/80 hover:bg-slate-50/40"
                    title={`Uren Δ ${c.hoursPct !== null ? (c.hoursPct > 0 ? '+' : '') + c.hoursPct.toFixed(1) + '%' : '—'} | Omzet Δ ${c.revenuePct !== null ? (c.revenuePct > 0 ? '+' : '') + c.revenuePct.toFixed(1) + '%' : '—'}`}
                  >
                    <td className="py-0.5 pr-1 font-medium text-slate-800 truncate max-w-[110px]">{c.name}</td>
                    <td className="py-0.5 px-1 text-right text-slate-700">{c.hours.toFixed(1)}</td>
                    <td className="py-0.5 px-1 text-right"><DeltaVal value={c.hoursDelta} /></td>
                    <td className="py-0.5 px-1 text-right text-slate-600">{c.km > 0 ? c.km.toLocaleString("nl-NL") : "—"}</td>
                    <td className="py-0.5 px-1 text-right text-slate-700" title={c.invoiceBased ? "Bron: Spotta factuur (excl. depot)" : ""}>
                      {c.revenue > 0 ? `€${fmt(c.revenue)}` : "—"}
                      {c.invoiceBased && c.revenue > 0 && <span className="text-[8px] text-blue-400 ml-0.5">F</span>}
                    </td>
                    <td className="py-0.5 pl-1 text-right text-slate-600">{c.rate > 0 ? `€${fmt(c.rate)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t border-slate-200 text-slate-600 font-medium text-[10px]">
                    <td className="py-1 pr-1">Totaal</td>
                    <td className="py-1 px-1 text-right">{totals.hours.toFixed(1)}</td>
                    <td className="py-1 px-1 text-right"><DeltaVal value={totals.hoursDelta} /></td>
                    <td className="py-1 px-1 text-right">{totals.km > 0 ? totals.km.toLocaleString("nl-NL") : "—"}</td>
                    <td className="py-1 px-1 text-right">{totals.revenue > 0 ? `€${fmt(totals.revenue)}` : "—"}</td>
                    <td className="py-1 pl-1 text-right">{totals.rate > 0 ? `€${fmt(totals.rate)}` : "—"}</td>
                  </tr>
                  <tr className="text-[9px] text-slate-400">
                    <td className="py-0.5 pr-1">Δ vorige wk</td>
                    <td className="py-0.5 px-1 text-right"><DeltaPct pct={totals.hoursPct} /></td>
                    <td className="py-0.5 px-1 text-right"></td>
                    <td className="py-0.5 px-1 text-right"><DeltaVal value={totals.kmDelta} /></td>
                    <td className="py-0.5 px-1 text-right"><DeltaPct pct={totals.revenuePct} /></td>
                    <td className="py-0.5 pl-1"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}