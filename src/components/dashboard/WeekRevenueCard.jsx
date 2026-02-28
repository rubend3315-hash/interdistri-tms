import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { getISOWeek, getYear, startOfWeek, endOfWeek, addWeeks, subWeeks, format } from "date-fns";

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
  if (d <= 0) d += 1440;
  return Math.max(0, d);
}

/** Get active price for article at a given date */
function getArticlePrice(article, refDate) {
  if (!article?.price_rules?.length) return 0;
  const valid = article.price_rules
    .filter(r => new Date(r.start_date) <= refDate && (!r.end_date || new Date(r.end_date) >= refDate))
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  return valid.length > 0 ? valid[0].price : 0;
}

/**
 * Build per-customer data: hours, km, revenue (hours*rate + km*kmRate + PostNL import revenue)
 */
function buildWeekData(entries, trips, spws, custList, projList, imports, articles, refDate) {
  const customerMap = {};
  const custNameMap = {};
  custList.forEach(c => { custNameMap[c.id] = c.company_name; });

  const projCustMap = {};
  projList.forEach(p => { if (p.customer_id) projCustMap[p.id] = p.customer_id; });

  // Build article lookup per customer: { custId: { hourRate, kmRate } }
  const rateMap = {};
  custList.forEach(c => {
    const custArticles = articles.filter(a => a.customer_id === c.id);
    const hourArt = custArticles.find(a => {
      const d = (a.description || '').toLowerCase();
      return d.includes('uur') || d.includes('hour');
    });
    const kmArt = custArticles.find(a => {
      const d = (a.description || '').toLowerCase();
      return d.includes('km') || d.includes('kilometer');
    });
    rateMap[c.id] = {
      hourRate: hourArt ? getArticlePrice(hourArt, refDate) : 0,
      kmRate: kmArt ? getArticlePrice(kmArt, refDate) : 0,
    };
  });

  // Index trips/spw by time_entry_id
  const tripsByTE = {};
  trips.forEach(t => { const k = t.time_entry_id; if (k) { (tripsByTE[k] = tripsByTE[k] || []).push(t); } });
  const spwsByTE = {};
  spws.forEach(s => { const k = s.time_entry_id; if (k) { (spwsByTE[k] = spwsByTE[k] || []).push(s); } });

  // Also aggregate km per customer from ALL trips (not just linked to time entries)
  const kmByCustomer = {};
  trips.forEach(t => {
    const custId = t.customer_id || projCustMap[t.project_id];
    if (!custId || !custNameMap[custId]) return;
    const km = t.total_km || (t.end_km && t.start_km ? t.end_km - t.start_km : 0);
    if (km > 0) kmByCustomer[custId] = (kmByCustomer[custId] || 0) + km;
  });

  // Process approved TimeEntries → allocate hours to customers
  const approved = entries.filter(te => te.status === "Goedgekeurd");

  for (const te of approved) {
    const totalServiceMinutes = te.total_hours ? te.total_hours * 60 : 0;
    if (totalServiceMinutes <= 0) continue;

    const teTrips = tripsByTE[te.id] || [];
    const teSpws = spwsByTE[te.id] || [];
    const custMinutes = {};

    teTrips.forEach(t => {
      const custId = t.customer_id || projCustMap[t.project_id];
      if (!custId || !custNameMap[custId]) return;
      custMinutes[custId] = (custMinutes[custId] || 0) + durationMin(t.departure_time || t.start_time, t.arrival_time || t.end_time);
    });

    teSpws.forEach(s => {
      const custId = s.customer_id || projCustMap[s.project_id];
      if (!custId || !custNameMap[custId]) return;
      custMinutes[custId] = (custMinutes[custId] || 0) + durationMin(s.start_time, s.end_time);
    });

    const custIds = Object.keys(custMinutes);
    if (custIds.length === 0) continue;

    const totalSpecificMinutes = Object.values(custMinutes).reduce((s, v) => s + v, 0);

    for (const cid of custIds) {
      const allocatedHours = custIds.length === 1
        ? totalServiceMinutes / 60
        : (totalSpecificMinutes > 0 ? (custMinutes[cid] / totalSpecificMinutes) * totalServiceMinutes : 0) / 60;

      if (!customerMap[cid]) {
        customerMap[cid] = { name: custNameMap[cid], hours: 0, km: 0, revenue: 0, entries: 0 };
      }
      customerMap[cid].hours += allocatedHours;
      customerMap[cid].entries += 1;
    }
  }

  // Merge km into customerMap and calculate revenue
  for (const cid of Object.keys(kmByCustomer)) {
    if (!customerMap[cid]) {
      customerMap[cid] = { name: custNameMap[cid], hours: 0, km: 0, revenue: 0, entries: 0 };
    }
    customerMap[cid].km = kmByCustomer[cid];
  }

  // Calculate revenue: hours * hourRate + km * kmRate
  for (const cid of Object.keys(customerMap)) {
    const rates = rateMap[cid] || { hourRate: 0, kmRate: 0 };
    customerMap[cid].revenue += customerMap[cid].hours * rates.hourRate + customerMap[cid].km * rates.kmRate;
  }

  // PostNL import revenue (additive, based on import data)
  const postNLCustomer = custList.find(c => c.company_name?.toLowerCase().includes("postnl"));
  if (postNLCustomer && imports.length > 0) {
    if (!customerMap[postNLCustomer.id]) {
      customerMap[postNLCustomer.id] = { name: postNLCustomer.company_name, hours: 0, km: 0, revenue: 0, entries: 0 };
    }
    const custArticles = articles.filter(a => a.customer_id === postNLCustomer.id);
    const stopArticle = custArticles.find(a => a.description?.toLowerCase().includes("stop"));
    const stukArticle = custArticles.find(a => a.description?.toLowerCase().includes("stuk") || a.description?.toLowerCase().includes("pakket"));
    const stopPrice = getArticlePrice(stopArticle, refDate);
    const stukPrice = getArticlePrice(stukArticle, refDate);
    imports.forEach(r => {
      const data = r.data || {};
      const stops = Number(data["Aantal tijdens route - stops"]) || 0;
      const stuks = Number(data["Geleverde stops"]) || Number(data["Aantal stuks afgehaald/ gecollecteerd"]) || 0;
      customerMap[postNLCustomer.id].revenue += stops * stopPrice + stuks * stukPrice;
    });
  }

  return customerMap;
}

export default function WeekRevenueCard() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { weekNum, yearNum, weekStartStr, weekEndStr, prevWeekNum, prevYearNum, prevWeekStartStr, prevWeekEndStr, refDate } = useMemo(() => {
    const base = addWeeks(new Date(), weekOffset);
    const ws = startOfWeek(base, { weekStartsOn: 1 });
    const we = endOfWeek(base, { weekStartsOn: 1 });
    const pws = subWeeks(ws, 1);
    const pwe = subWeeks(we, 1);
    return {
      weekNum: getISOWeek(ws),
      yearNum: getYear(ws),
      weekStartStr: format(ws, "yyyy-MM-dd"),
      weekEndStr: format(we, "yyyy-MM-dd"),
      prevWeekNum: getISOWeek(pws),
      prevYearNum: getYear(pws),
      prevWeekStartStr: format(pws, "yyyy-MM-dd"),
      prevWeekEndStr: format(pwe, "yyyy-MM-dd"),
      refDate: ws,
    };
  }, [weekOffset]);

  // Data queries
  const { data: customers = [], isLoading: l1 } = useQuery({
    queryKey: ["dashboard-customers"],
    queryFn: () => base44.entities.Customer.filter({ status: "Actief" }),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: () => base44.entities.Project.filter({ status: "Actief" }),
  });
  const { data: articles = [] } = useQuery({
    queryKey: ["dashboard-articles"],
    queryFn: () => base44.entities.Article.filter({ status: "Actief" }),
  });

  // Current week
  const { data: curTE = [], isLoading: l2 } = useQuery({
    queryKey: ["wrc-te", weekNum, yearNum],
    queryFn: () => base44.entities.TimeEntry.filter({ week_number: weekNum, year: yearNum }),
  });
  const { data: curTrips = [], isLoading: l3 } = useQuery({
    queryKey: ["wrc-trips", weekStartStr, weekEndStr],
    queryFn: () => base44.entities.Trip.filter({ date: { $gte: weekStartStr, $lte: weekEndStr } }),
  });
  const { data: curSpws = [], isLoading: l4 } = useQuery({
    queryKey: ["wrc-spw", weekStartStr, weekEndStr],
    queryFn: () => base44.entities.StandplaatsWerk.filter({ date: { $gte: weekStartStr, $lte: weekEndStr } }),
  });
  const { data: curImports = [] } = useQuery({
    queryKey: ["wrc-imports", weekStartStr, weekEndStr],
    queryFn: async () => {
      const all = await base44.entities.PostNLImportResult.filter({ datum: { $gte: weekStartStr, $lte: weekEndStr } });
      // fallback: filter by data.Datum if datum field isn't set
      if (all.length === 0) {
        const raw = await base44.entities.PostNLImportResult.list("-created_date", 500);
        return raw.filter(r => {
          const d = r.datum || r.data?.Datum;
          return d && d >= weekStartStr && d <= weekEndStr;
        });
      }
      return all;
    },
  });

  // Previous week (for delta)
  const { data: prevTE = [] } = useQuery({
    queryKey: ["wrc-te", prevWeekNum, prevYearNum],
    queryFn: () => base44.entities.TimeEntry.filter({ week_number: prevWeekNum, year: prevYearNum }),
  });
  const { data: prevTrips = [] } = useQuery({
    queryKey: ["wrc-trips", prevWeekStartStr, prevWeekEndStr],
    queryFn: () => base44.entities.Trip.filter({ date: { $gte: prevWeekStartStr, $lte: prevWeekEndStr } }),
  });
  const { data: prevSpws = [] } = useQuery({
    queryKey: ["wrc-spw", prevWeekStartStr, prevWeekEndStr],
    queryFn: () => base44.entities.StandplaatsWerk.filter({ date: { $gte: prevWeekStartStr, $lte: prevWeekEndStr } }),
  });
  const { data: prevImports = [] } = useQuery({
    queryKey: ["wrc-imports", prevWeekStartStr, prevWeekEndStr],
    queryFn: async () => {
      const all = await base44.entities.PostNLImportResult.filter({ datum: { $gte: prevWeekStartStr, $lte: prevWeekEndStr } });
      if (all.length === 0) {
        const raw = await base44.entities.PostNLImportResult.list("-created_date", 500);
        return raw.filter(r => {
          const d = r.datum || r.data?.Datum;
          return d && d >= prevWeekStartStr && d <= prevWeekEndStr;
        });
      }
      return all;
    },
  });

  const isLoading = l1 || l2 || l3 || l4;

  const { customerData, totals } = useMemo(() => {
    if (isLoading) return { customerData: [], totals: null };

    const curMap = buildWeekData(curTE, curTrips, curSpws, customers, projects, curImports, articles, refDate);
    const prevMap = buildWeekData(prevTE, prevTrips, prevSpws, customers, projects, prevImports, articles, subWeeks(refDate, 1));

    const merged = Object.entries(curMap)
      .filter(([, v]) => v.hours > 0 || v.km > 0 || v.revenue > 0)
      .map(([id, cur]) => {
        const prev = prevMap[id] || { hours: 0, km: 0, revenue: 0, entries: 0 };
        const curRate = cur.hours > 0 ? cur.revenue / cur.hours : 0;
        return {
          id, name: cur.name,
          hours: cur.hours, km: cur.km, revenue: cur.revenue, rate: curRate, entries: cur.entries,
          hoursDelta: cur.hours - prev.hours,
          hoursPct: prev.hours > 0 ? ((cur.hours - prev.hours) / prev.hours) * 100 : null,
          kmDelta: cur.km - prev.km,
          revenueDelta: cur.revenue - prev.revenue,
          revenuePct: prev.revenue > 0 ? ((cur.revenue - prev.revenue) / prev.revenue) * 100 : null,
        };
      })
      .sort((a, b) => (b.revenue + b.hours) - (a.revenue + a.hours));

    const curTotH = merged.reduce((s, c) => s + c.hours, 0);
    const curTotKm = merged.reduce((s, c) => s + c.km, 0);
    const curTotR = merged.reduce((s, c) => s + c.revenue, 0);
    const prevTotH = Object.values(prevMap).reduce((s, c) => s + c.hours, 0);
    const prevTotKm = Object.values(prevMap).reduce((s, c) => s + c.km, 0);
    const prevTotR = Object.values(prevMap).reduce((s, c) => s + c.revenue, 0);

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
  }, [customers, projects, articles, curTE, prevTE, curTrips, prevTrips, curSpws, prevSpws, curImports, prevImports, isLoading, refDate]);

  const isCurrentWeek = weekOffset === 0;

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-1 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Omzet & Uren per Klant
          </CardTitle>
          <div className="flex items-center gap-1">
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
        </p>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        {isLoading ? (
          <div className="space-y-1.5">{[1, 2, 3].map(i => <Skeleton key={i} className="h-6" />)}</div>
        ) : customerData.length === 0 ? (
          <p className="text-[11px] text-slate-400 text-center py-3">Geen klantdata deze week</p>
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
                    <td className="py-0.5 px-1 text-right text-slate-700">{c.revenue > 0 ? `€${fmt(c.revenue)}` : "—"}</td>
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