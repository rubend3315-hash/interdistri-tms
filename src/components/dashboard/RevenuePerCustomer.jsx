import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";
import { getISOWeek, getYear, startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

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
  if (pct === null) return <span className="text-slate-300">—</span>;
  if (pct === 0) return <span className="text-slate-300">0%</span>;
  const pos = pct > 0;
  return (
    <span className={pos ? "text-emerald-600" : "text-red-500"}>
      {pos ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

// Calculate minutes from HH:MM time strings
function timeToMin(t) {
  if (!t || typeof t !== "string") return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

function durationMin(start, end) {
  const s = timeToMin(start), e = timeToMin(end);
  if (s === null || e === null) return 0;
  let d = e - s;
  if (d <= 0) d += 1440; // overnight
  return Math.max(0, d);
}

/**
 * Build per-customer hour allocation for a set of TimeEntries,
 * using Trips and StandplaatsWerk as the source of customer mapping.
 *
 * Returns: { [customerId]: { name, hours, entries, revenue } }
 */
function buildAllocationMap(entries, trips, spws, custList, projList, imports, articles) {
  const customerMap = {};
  const custNameMap = {};
  custList.forEach((c) => { custNameMap[c.id] = c.company_name; });

  const projCustMap = {};
  projList.forEach((p) => { if (p.customer_id) projCustMap[p.id] = p.customer_id; });

  // Index trips and spws by time_entry_id
  const tripsByTE = {};
  trips.forEach((t) => {
    const key = t.time_entry_id;
    if (!key) return;
    if (!tripsByTE[key]) tripsByTE[key] = [];
    tripsByTE[key].push(t);
  });

  const spwsByTE = {};
  spws.forEach((s) => {
    const key = s.time_entry_id;
    if (!key) return;
    if (!spwsByTE[key]) spwsByTE[key] = [];
    spwsByTE[key].push(s);
  });

  // Process each approved TimeEntry
  const approved = entries.filter((te) => te.status === "Goedgekeurd");

  for (const te of approved) {
    const totalServiceMinutes = te.total_hours ? te.total_hours * 60 : 0;
    if (totalServiceMinutes <= 0) continue;

    const teTrips = tripsByTE[te.id] || [];
    const teSpws = spwsByTE[te.id] || [];

    // Collect customer minutes from trips + spw
    const custMinutes = {}; // customerId → minutes

    teTrips.forEach((t) => {
      const custId = t.customer_id || projCustMap[t.project_id];
      if (!custId || !custNameMap[custId]) return;
      const mins = durationMin(t.departure_time || t.start_time, t.arrival_time || t.end_time);
      custMinutes[custId] = (custMinutes[custId] || 0) + mins;
    });

    teSpws.forEach((s) => {
      const custId = s.customer_id || projCustMap[s.project_id];
      if (!custId || !custNameMap[custId]) return;
      const mins = durationMin(s.start_time, s.end_time);
      custMinutes[custId] = (custMinutes[custId] || 0) + mins;
    });

    const custIds = Object.keys(custMinutes);
    if (custIds.length === 0) continue; // no customer linked → skip

    // Calculate allocation
    const totalSpecificMinutes = Object.values(custMinutes).reduce((s, v) => s + v, 0);
    const allocations = [];

    for (const cid of custIds) {
      let allocatedHours;
      if (custIds.length === 1) {
        allocatedHours = totalServiceMinutes / 60;
      } else {
        const factor = totalSpecificMinutes > 0 ? custMinutes[cid] / totalSpecificMinutes : 0;
        allocatedHours = (factor * totalServiceMinutes) / 60;
      }

      if (!customerMap[cid]) {
        customerMap[cid] = { name: custNameMap[cid], hours: 0, revenue: 0, entries: 0 };
      }
      customerMap[cid].hours += allocatedHours;
      customerMap[cid].entries += 1;

      allocations.push({ customerId: cid, name: custNameMap[cid], minutes: custMinutes[cid], allocatedHours: Math.round(allocatedHours * 100) / 100 });
    }

    console.debug("CUSTOMER_ALLOCATION", { timeEntryId: te.id, totalServiceMinutes, custIds: custIds.length, allocations });
  }

  // PostNL revenue from imports
  const postNLCustomer = custList.find((c) => c.company_name?.toLowerCase().includes("postnl"));
  if (postNLCustomer) {
    if (!customerMap[postNLCustomer.id]) {
      customerMap[postNLCustomer.id] = { name: postNLCustomer.company_name, hours: 0, revenue: 0, entries: 0 };
    }
    const custArticles = articles.filter((a) => a.customer_id === postNLCustomer.id);
    const getPrice = (article) => {
      if (!article?.price_rules?.length) return 0;
      const now = new Date();
      const valid = article.price_rules
        .filter((r) => new Date(r.start_date) <= now && (!r.end_date || new Date(r.end_date) >= now))
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      return valid.length > 0 ? valid[0].price : 0;
    };
    const stopArticle = custArticles.find((a) => a.description?.toLowerCase().includes("stop"));
    const stukArticle = custArticles.find((a) => a.description?.toLowerCase().includes("stuk") || a.description?.toLowerCase().includes("pakket"));
    const stopPrice = getPrice(stopArticle);
    const stukPrice = getPrice(stukArticle);
    imports.forEach((r) => {
      const data = r.data || {};
      const stops = Number(data["Aantal tijdens route - stops"]) || 0;
      const stuks = Number(data["Geleverde stops"]) || Number(data["Aantal stuks afgehaald/ gecollecteerd"]) || 0;
      customerMap[postNLCustomer.id].revenue += stops * stopPrice + stuks * stukPrice;
    });
  }

  return customerMap;
}

export default function RevenuePerCustomer() {
  const today = new Date();
  const currentWeek = getISOWeek(today);
  const currentYear = getYear(today);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const prevWeekStart = subWeeks(weekStart, 1);
  const prevWeekEnd = subWeeks(weekEnd, 1);
  const prevWeek = getISOWeek(prevWeekStart);
  const prevYear = getYear(prevWeekStart);

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const prevWeekStartStr = format(prevWeekStart, "yyyy-MM-dd");
  const prevWeekEndStr = format(prevWeekEnd, "yyyy-MM-dd");

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["dashboard-customers"],
    queryFn: () => base44.entities.Customer.filter({ status: "Actief" }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: () => base44.entities.Project.filter({ status: "Actief" }),
  });

  // Current week entries
  const { data: timeEntries = [], isLoading: loadingTE } = useQuery({
    queryKey: ["dashboard-te-week", currentWeek, currentYear],
    queryFn: () => base44.entities.TimeEntry.filter({ week_number: currentWeek, year: currentYear }),
  });

  // Previous week entries
  const { data: prevTimeEntries = [], isLoading: loadingPrevTE } = useQuery({
    queryKey: ["dashboard-te-week", prevWeek, prevYear],
    queryFn: () => base44.entities.TimeEntry.filter({ week_number: prevWeek, year: prevYear }),
  });

  // Trips for current + prev week (by date range)
  const { data: trips = [], isLoading: loadingTrips } = useQuery({
    queryKey: ["dashboard-trips-week", weekStartStr, weekEndStr],
    queryFn: async () => {
      const all = await base44.entities.Trip.list("-date", 500);
      return all.filter((t) => t.date >= weekStartStr && t.date <= weekEndStr);
    },
  });

  const { data: prevTrips = [] } = useQuery({
    queryKey: ["dashboard-trips-week", prevWeekStartStr, prevWeekEndStr],
    queryFn: async () => {
      const all = await base44.entities.Trip.list("-date", 500);
      return all.filter((t) => t.date >= prevWeekStartStr && t.date <= prevWeekEndStr);
    },
  });

  // StandplaatsWerk for current + prev week
  const { data: spws = [], isLoading: loadingSpws } = useQuery({
    queryKey: ["dashboard-spw-week", weekStartStr, weekEndStr],
    queryFn: async () => {
      const all = await base44.entities.StandplaatsWerk.list("-date", 500);
      return all.filter((s) => s.date >= weekStartStr && s.date <= weekEndStr);
    },
  });

  const { data: prevSpws = [] } = useQuery({
    queryKey: ["dashboard-spw-week", prevWeekStartStr, prevWeekEndStr],
    queryFn: async () => {
      const all = await base44.entities.StandplaatsWerk.list("-date", 500);
      return all.filter((s) => s.date >= prevWeekStartStr && s.date <= prevWeekEndStr);
    },
  });

  const { data: importResults = [], isLoading: loadingImports } = useQuery({
    queryKey: ["dashboard-imports-week", weekStartStr, weekEndStr],
    queryFn: async () => {
      const all = await base44.entities.PostNLImportResult.list("-created_date", 500);
      return all.filter((r) => {
        const d = r.datum || r.data?.Datum;
        return d && d >= weekStartStr && d <= weekEndStr;
      });
    },
  });

  const { data: prevImportResults = [] } = useQuery({
    queryKey: ["dashboard-imports-week", prevWeekStartStr, prevWeekEndStr],
    queryFn: async () => {
      const all = await base44.entities.PostNLImportResult.list("-created_date", 500);
      return all.filter((r) => {
        const d = r.datum || r.data?.Datum;
        return d && d >= prevWeekStartStr && d <= prevWeekEndStr;
      });
    },
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["dashboard-articles"],
    queryFn: () => base44.entities.Article.filter({ status: "Actief" }),
  });

  const isLoading = loadingCustomers || loadingTE || loadingPrevTE || loadingTrips || loadingSpws || loadingImports;

  const { customerData, totals } = useMemo(() => {
    if (isLoading) return { customerData: [], totals: null };

    const currentMap = buildAllocationMap(timeEntries, trips, spws, customers, projects, importResults, articles);
    const prevMap = buildAllocationMap(prevTimeEntries, prevTrips, prevSpws, customers, projects, prevImportResults, articles);

    console.log("[RevenuePerCustomer] Current week customers:", Object.entries(currentMap).map(([id, v]) => ({ id, name: v.name, hours: v.hours.toFixed(1) })));

    const merged = Object.entries(currentMap)
      .filter(([id, v]) => v.hours > 0 || v.revenue > 0 || (prevMap[id] && (prevMap[id].hours > 0 || prevMap[id].revenue > 0)))
      .map(([id, cur]) => {
        const prev = prevMap[id] || { hours: 0, revenue: 0, entries: 0 };
        const curRate = cur.hours > 0 ? cur.revenue / cur.hours : 0;
        const prevRate = prev.hours > 0 ? prev.revenue / prev.hours : 0;
        return {
          id,
          name: cur.name,
          entries: cur.entries,
          hours: cur.hours,
          revenue: cur.revenue,
          rate: curRate,
          hoursDelta: cur.hours - prev.hours,
          hoursPct: prev.hours > 0 ? ((cur.hours - prev.hours) / prev.hours) * 100 : null,
          revenueDelta: cur.revenue - prev.revenue,
          revenuePct: prev.revenue > 0 ? ((cur.revenue - prev.revenue) / prev.revenue) * 100 : null,
          rateDelta: curRate - prevRate,
          ratePct: prevRate > 0 ? ((curRate - prevRate) / prevRate) * 100 : null,
        };
      })
      .filter((c) => c.hours > 0 || c.revenue > 0)
      .sort((a, b) => b.revenue + b.hours - (a.revenue + a.hours));

    const curTotalH = merged.reduce((s, c) => s + c.hours, 0);
    const curTotalR = merged.reduce((s, c) => s + c.revenue, 0);
    const curTotalRate = curTotalH > 0 ? curTotalR / curTotalH : 0;

    const prevTotalH = Object.values(prevMap).reduce((s, c) => s + c.hours, 0);
    const prevTotalR = Object.values(prevMap).reduce((s, c) => s + c.revenue, 0);
    const prevTotalRate = prevTotalH > 0 ? prevTotalR / prevTotalH : 0;

    return {
      customerData: merged,
      totals: {
        hours: curTotalH,
        revenue: curTotalR,
        rate: curTotalRate,
        hoursDelta: curTotalH - prevTotalH,
        hoursPct: prevTotalH > 0 ? ((curTotalH - prevTotalH) / prevTotalH) * 100 : null,
        revenueDelta: curTotalR - prevTotalR,
        revenuePct: prevTotalR > 0 ? ((curTotalR - prevTotalR) / prevTotalR) * 100 : null,
        rateDelta: curTotalRate - prevTotalRate,
        ratePct: prevTotalRate > 0 ? ((curTotalRate - prevTotalRate) / prevTotalRate) * 100 : null,
      },
    };
  }, [customers, projects, timeEntries, prevTimeEntries, trips, prevTrips, spws, prevSpws, importResults, prevImportResults, articles, isLoading]);

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-1 px-4 pt-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          Omzet & Uren per Klant — Wk {currentWeek}
        </CardTitle>
        <p className="text-[10px] text-slate-400 mt-0.5">Δ t.o.v. wk {prevWeek} · ritten & standplaatswerk</p>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        {isLoading ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        ) : customerData.length === 0 ? (
          <p className="text-[11px] text-slate-400 text-center py-3">Geen klantdata deze week</p>
        ) : (
          <div className="max-h-[260px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[9px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="text-left py-1 pr-1 font-medium">Klant</th>
                  <th className="text-right py-1 px-1 font-medium">Uren</th>
                  <th className="text-right py-1 px-1 font-medium">Δ</th>
                  <th className="text-right py-1 px-1 font-medium">Omzet</th>
                  <th className="text-right py-1 pl-1 font-medium">€/uur</th>
                </tr>
              </thead>
              <tbody>
                {customerData.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50/80 hover:bg-slate-50/40" title={c.hoursPct !== null ? `Uren ${c.hoursPct > 0 ? '+' : ''}${c.hoursPct?.toFixed(1)}% | Omzet ${c.revenuePct > 0 ? '+' : ''}${c.revenuePct?.toFixed(1) || '—'}%` : ''}>
                    <td className="py-0.5 pr-1 font-medium text-slate-800 truncate max-w-[130px]">{c.name}</td>
                    <td className="py-0.5 px-1 text-right text-slate-700">{c.hours.toFixed(1)}</td>
                    <td className="py-0.5 px-1 text-right"><DeltaVal value={c.hoursDelta} /></td>
                    <td className="py-0.5 px-1 text-right text-slate-700">€{fmt(c.revenue)}</td>
                    <td className="py-0.5 pl-1 text-right text-slate-600">€{fmt(c.rate)}</td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t border-slate-200 text-slate-600 font-medium text-[10px]">
                    <td className="py-1 pr-1">Totaal</td>
                    <td className="py-1 px-1 text-right">{totals.hours.toFixed(1)}</td>
                    <td className="py-1 px-1 text-right"><DeltaVal value={totals.hoursDelta} /></td>
                    <td className="py-1 px-1 text-right">€{fmt(totals.revenue)}</td>
                    <td className="py-1 pl-1 text-right">€{fmt(totals.rate)}</td>
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